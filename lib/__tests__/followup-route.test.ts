import { describe, expect, it, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const { getUser, fromDb, checkUsage, refund, createCompletion } = vi.hoisted(() => ({
  getUser: vi.fn(),
  fromDb: vi.fn(),
  checkUsage: vi.fn(),
  refund: vi.fn(),
  createCompletion: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser }, from: fromDb }),
}));
vi.mock("@/lib/creem", () => ({
  hasActiveProEntitlement: async () => false,
}));
vi.mock("@/lib/rate-limit", () => ({
  FREE_TIER_LIMIT: 3,
  PRO_TIER_LIMIT: 10,
  checkAndIncrementUsage: checkUsage,
  refundUsage: refund,
}));
vi.mock("openai", () => {
  class FakeOpenAI {
    chat = { completions: { create: createCompletion } };
  }
  return { default: FakeOpenAI };
});

import { POST, GET } from "../../app/api/consult/followup/route";

const GOOD_CAST = { mode: "cast", hexagramNumber: 1, changingLines: [1], transformedNumber: 44 };

function tableMock(state: { report?: unknown; reportError?: unknown; turns?: unknown[]; turnError?: unknown; insertError?: unknown; insertCalls?: unknown[] }) {
  state.insertCalls = state.insertCalls || [];
  return (name: string) => {
    if (name === "consult_results") {
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.maybeSingle = async () => ({ data: state.report ?? null, error: state.reportError ?? null });
      return chain;
    }
    if (name === "consult_followups") {
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.order = async () => ({ data: state.turns ?? [], error: state.turnError ?? null });
      chain.insert = async (payload: unknown) => {
        state.insertCalls!.push(payload);
        return { error: state.insertError ?? null };
      };
      return chain;
    }
    throw new Error("unexpected table " + name);
  };
}

function req(body: unknown) {
  return new Request("http://localhost/api/consult/followup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

function sseChunks(text: string) {
  return {
    async *[Symbol.asyncIterator]() {
      yield { choices: [{ delta: { content: text } }] };
    },
  };
}

let lastState: { insertCalls?: unknown[] } = {};

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
  checkUsage.mockResolvedValue({ allowed: true, remaining: 2, currentCount: 1 });
  refund.mockResolvedValue({ refunded: true });
  createCompletion.mockResolvedValue(sseChunks("a thoughtful answer"));
  const state = {
    report: { session_id: "s1", user_id: "u1", question: "orig q", cast_data: GOOD_CAST, ai_response: "orig reading" },
  };
  lastState = state;
  fromDb.mockImplementation(tableMock(state));
});

async function readSse(res: Response): Promise<{ full: string; saveFailed: boolean }> {
  const text = await res.text();
  let full = "";
  let saveFailed = false;
  for (const line of text.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    const payload = line.slice(6).trim();
    if (payload === "[DONE]") continue;
    try {
      const parsed = JSON.parse(payload);
      if (parsed.content) full += parsed.content;
      if (parsed.saveFailed) saveFailed = true;
    } catch { /* skip */ }
  }
  return { full, saveFailed };
}

describe("POST validation matrix (model never called)", () => {
  it("logged-out → 401 LOGIN_REQUIRED", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(req({ sessionId: "s1", question: "why?" }));
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ code: "LOGIN_REQUIRED" });
    expect(createCompletion).not.toHaveBeenCalled();
  });

  it("missing/invalid question → 400", async () => {
    expect((await POST(req({ sessionId: "s1", question: "" }))).status).toBe(400);
    expect((await POST(req({ sessionId: "s1", question: 5 }))).status).toBe(400);
    expect((await POST(req({ question: "why?" }))).status).toBe(400);
    expect(createCompletion).not.toHaveBeenCalled();
  });

  it("report not found OR owned by someone else → 404 (same response, no existence leak)", async () => {
    fromDb.mockImplementation(tableMock({ report: null }));
    const res = await POST(req({ sessionId: "someone-elses", question: "why?" }));
    expect(res.status).toBe(404);
    expect(createCompletion).not.toHaveBeenCalled();
  });

  it("cast_data missing/malformed → 422 REPORT_DATA_MISSING, model not called", async () => {
    fromDb.mockImplementation(tableMock({ report: { session_id: "s1", user_id: "u1", question: "q", cast_data: {}, ai_response: "r" } }));
    const res = await POST(req({ sessionId: "s1", question: "why?" }));
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ code: "REPORT_DATA_MISSING" });
    expect(createCompletion).not.toHaveBeenCalled();
  });

  it("20 existing turns → 429 FOLLOWUP_LIMIT_REACHED before charging", async () => {
    fromDb.mockImplementation(tableMock({
      report: { session_id: "s1", user_id: "u1", question: "q", cast_data: GOOD_CAST, ai_response: "r" },
      turns: Array.from({ length: 20 }, (_, i) => ({ id: String(i), question: "q", answer: "a", turn_index: i + 1, created_at: "2026-01-01" })),
    }));
    const res = await POST(req({ sessionId: "s1", question: "why?" }));
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ code: "FOLLOWUP_LIMIT_REACHED" });
    expect(checkUsage).not.toHaveBeenCalled();
    expect(createCompletion).not.toHaveBeenCalled();
  });

  it("daily quota exhausted → 429 LIMIT_REACHED, no turn inserted", async () => {
    checkUsage.mockResolvedValue({ allowed: false, remaining: 0, currentCount: 3 });
    const res = await POST(req({ sessionId: "s1", question: "why?" }));
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ code: "LIMIT_REACHED" });
    expect(createCompletion).not.toHaveBeenCalled();
  });

  it("turn list DB error → 503 SERVICE_ERROR", async () => {
    fromDb.mockImplementation(tableMock({
      report: { session_id: "s1", user_id: "u1", question: "q", cast_data: GOOD_CAST, ai_response: "r" },
      turnError: { message: "boom" },
    }));
    const res = await POST(req({ sessionId: "s1", question: "why?" }));
    expect(res.status).toBe(503);
    expect(createCompletion).not.toHaveBeenCalled();
  });
});

describe("POST happy path + grounding", () => {
  it("streams the answer, grounds in the DB report, inserts the turn", async () => {
    const state = {
      report: { session_id: "s1", user_id: "u1", question: "orig q", cast_data: GOOD_CAST, ai_response: "orig reading" },
      turns: [{ id: "t1", question: "q1", answer: "a1", turn_index: 1, created_at: "2026-01-01" }],
    };
    lastState = state;
    fromDb.mockImplementation(tableMock(state));
    const res = await POST(req({ sessionId: "s1", question: "what about line 1?" }));
    expect(res.status).toBe(200);
    const { full, saveFailed } = await readSse(res);
    expect(full).toBe("a thoughtful answer");
    expect(saveFailed).toBe(false);

    const call = createCompletion.mock.calls[0][0];
    const system = call.messages[0].content as string;
    expect(system).toContain("orig q");
    expect(system).toContain("orig reading");
    expect(system).toContain("q1");
    expect(system).toContain("never cast a new hexagram");
    expect(system).toContain("no deterministic predictions");
    expect(call.messages[1].content).toBe("what about line 1?");
    expect(call.max_completion_tokens).toBe(600);

    expect(fromDb).toHaveBeenCalledWith("consult_followups");
    expect(state.insertCalls).toHaveLength(1);
    expect(state.insertCalls![0]).toMatchObject({
      session_id: "s1",
      user_id: "u1",
      turn_index: 2,
      question: "what about line 1?",
      answer: "a thoughtful answer",
    });
    expect(refund).not.toHaveBeenCalled();
  });
});

describe("POST failure handling", () => {
  it("model create() throws → refund charged, 500, no insert", async () => {
    createCompletion.mockRejectedValue(new Error("azure down"));
    const res = await POST(req({ sessionId: "s1", question: "why?" }));
    expect(res.status).toBe(500);
    expect(refund).toHaveBeenCalledWith("u1");
  });

  it("empty model stream → refund, no insert, client sees no content", async () => {
    createCompletion.mockResolvedValue(sseChunks(""));
    const res = await POST(req({ sessionId: "s1", question: "why?" }));
    expect(res.status).toBe(200);
    const { full } = await readSse(res);
    expect(full).toBe("");
    expect(refund).toHaveBeenCalledWith("u1");
  });

  it("INSERT fails after a full stream → saveFailed marker, NO refund (content delivered)", async () => {
    fromDb.mockImplementation(tableMock({
      report: { session_id: "s1", user_id: "u1", question: "q", cast_data: GOOD_CAST, ai_response: "r" },
      insertError: { message: "table missing" },
    }));
    const res = await POST(req({ sessionId: "s1", question: "why?" }));
    expect(res.status).toBe(200);
    const { full, saveFailed } = await readSse(res);
    expect(full).toBe("a thoughtful answer");
    expect(saveFailed).toBe(true);
    expect(refund).not.toHaveBeenCalled();
  });

  it("mid-stream model failure → refund + error event, no insert", async () => {
    createCompletion.mockResolvedValue({
      async *[Symbol.asyncIterator]() {
        yield { choices: [{ delta: { content: "partial" } }] };
        throw new Error("connection reset");
      },
    });
    const res = await POST(req({ sessionId: "s1", question: "why?" }));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('"error"');
    expect(refund).toHaveBeenCalledWith("u1");
    expect(lastState.insertCalls).toHaveLength(0);
  });

  it("report lookup DB error → 503", async () => {
    fromDb.mockImplementation(tableMock({ reportError: { message: "outage" } }));
    const res = await POST(req({ sessionId: "s1", question: "why?" }));
    expect(res.status).toBe(503);
    expect(createCompletion).not.toHaveBeenCalled();
  });
});

describe("GET", () => {
  it("lists turns for the owner and reports the cap", async () => {
    fromDb.mockImplementation(tableMock({
      report: { session_id: "s1", user_id: "u1", question: "q", cast_data: GOOD_CAST, ai_response: "r" },
      turns: [{ id: "t1", question: "q1", answer: "a1", turn_index: 1, created_at: "2026-01-01" }],
    }));
    const res = await GET(new Request("http://localhost/api/consult/followup?session_id=s1") as unknown as NextRequest);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.followups).toHaveLength(1);
    expect(json.followups[0]).toMatchObject({ id: "t1", turnIndex: 1 });
    expect(json.count).toBe(1);
    expect(json.limitReached).toBe(false);
  });

  it("other user's report → 404", async () => {
    fromDb.mockImplementation(tableMock({ report: null }));
    const res = await GET(new Request("http://localhost/api/consult/followup?session_id=s1") as unknown as NextRequest);
    expect(res.status).toBe(404);
  });

  it("report lookup DB error → 503", async () => {
    fromDb.mockImplementation(tableMock({ reportError: { message: "outage" } }));
    const res = await GET(new Request("http://localhost/api/consult/followup?session_id=s1") as unknown as NextRequest);
    expect(res.status).toBe(503);
  });

  it("logged-out → 401", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await GET(new Request("http://localhost/api/consult/followup?session_id=s1") as unknown as NextRequest);
    expect(res.status).toBe(401);
  });
});
