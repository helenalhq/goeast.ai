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
vi.mock("@/lib/creem", () => ({ hasActiveProEntitlement: async () => false }));
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

import { POST } from "../../app/api/synastry/followup/route";

const CHART = {
  fiveElementsClass: "木三局",
  soul: "贪狼",
  body: "天同",
  zodiac: "寅",
  palaces: [
    { name: "命宫", heavenlyStem: "戊", earthlyBranch: "寅", majorStars: [{ name: "太阳", brightness: "得" }] },
    { name: "夫妻宫", heavenlyStem: "壬", earthlyBranch: "申", majorStars: [] },
  ],
};

const ROMANTIC_REPORT = {
  session_id: "s1",
  user_id: "u1",
  relationship_type: "romantic",
  person_a: { birthDate: "1995-01-01", birthHour: 2, gender: "female" },
  person_b: { birthDate: "1993-07-20", birthHour: 8, gender: "male" },
  language: "both",
  chart_a: CHART,
  chart_b: CHART,
  ai_response: "the original synastry report text",
};

function tableMock(state: {
  report?: unknown; reportError?: unknown;
  turns?: unknown[]; turnError?: unknown;
  insertError?: unknown; insertCalls?: unknown[];
  replayRow?: unknown; upsertResult?: unknown; upsertError?: unknown; upsertCalls?: Array<{ row: Record<string, unknown> }>;
}) {
  state.insertCalls = state.insertCalls || [];
  state.upsertCalls = state.upsertCalls || [];
  return (name: string) => {
    if (name === "synastry_results") {
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.maybeSingle = async () => ({ data: state.report ?? null, error: state.reportError ?? null });
      return chain;
    }
    if (name === "synastry_followups") {
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.order = async () => ({ data: state.turns ?? [], error: state.turnError ?? null });
      chain.maybeSingle = async () => ({ data: state.replayRow ?? null });
      chain.insert = async (payload: unknown) => {
        state.insertCalls!.push(payload);
        return { error: state.insertError ?? null };
      };
      const up: Record<string, unknown> = {};
      up.select = () => up;
      up.maybeSingle = async () => ({ data: state.upsertResult ?? null, error: state.upsertError ?? null });
      // NON-async like supabase-js builders (route chains .select().maybeSingle() synchronously)
      chain.upsert = (row: Record<string, unknown>) => {
        state.upsertCalls!.push({ row });
        return up;
      };
      return chain;
    }
    throw new Error("unexpected table " + name);
  };
}

function req(body: unknown) {
  return new Request("http://localhost/api/synastry/followup", {
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

let lastState: Record<string, unknown> = {};

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
  const state = { report: ROMANTIC_REPORT };
  lastState = state;
  fromDb.mockImplementation(tableMock(state));
  checkUsage.mockResolvedValue({ allowed: true, remaining: 2, currentCount: 1 });
  refund.mockResolvedValue({ refunded: true });
  createCompletion.mockResolvedValue(sseChunks("a grounded relationship answer"));
});

async function readSse(res: Response): Promise<{ full: string; saveFailed: boolean; replay: boolean }> {
  const text = await res.text();
  let full = "";
  let saveFailed = false;
  let replay = false;
  for (const line of text.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    const payload = line.slice(6).trim();
    if (payload === "[DONE]") continue;
    try {
      const parsed = JSON.parse(payload);
      if (parsed.replay) replay = true;
      if (parsed.content) full += parsed.content;
      if (parsed.saveFailed) saveFailed = true;
    } catch { /* skip */ }
  }
  return { full, saveFailed, replay };
}

describe("POST validation + scope", () => {
  it("logged-out → 401 LOGIN_REQUIRED, model never called", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(req({ sessionId: "s1", question: "why?" }));
    expect(res.status).toBe(401);
    expect(createCompletion).not.toHaveBeenCalled();
  });

  it("missing/invalid question → 400", async () => {
    expect((await POST(req({ sessionId: "s1", question: "" }))).status).toBe(400);
    expect(createCompletion).not.toHaveBeenCalled();
  });

  it("someone else's report → 404, no existence leak, no model call", async () => {
    fromDb.mockImplementation(tableMock({ report: null }));
    const res = await POST(req({ sessionId: "someone-elses", question: "why?" }));
    expect(res.status).toBe(404);
    expect(createCompletion).not.toHaveBeenCalled();
  });

  it("non-romantic report → 422 RELATIONSHIP_TYPE_UNSUPPORTED (V1 scope, server-enforced)", async () => {
    fromDb.mockImplementation(tableMock({ report: { ...ROMANTIC_REPORT, relationship_type: "business" } }));
    const res = await POST(req({ sessionId: "s1", question: "why?" }));
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ code: "RELATIONSHIP_TYPE_UNSUPPORTED" });
    expect(createCompletion).not.toHaveBeenCalled();
    expect(checkUsage).not.toHaveBeenCalled();
  });

  it("report missing recorded charts → 422 REPORT_DATA_MISSING, charge refunded, not guessed", async () => {
    fromDb.mockImplementation(tableMock({ report: { ...ROMANTIC_REPORT, chart_a: null } }));
    const res = await POST(req({ sessionId: "s1", question: "why?" }));
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ code: "REPORT_DATA_MISSING" });
    expect(refund).toHaveBeenCalledWith("u1");
    expect(createCompletion).not.toHaveBeenCalled();
  });

  it("20 existing turns → 429 FOLLOWUP_LIMIT_REACHED before charging", async () => {
    fromDb.mockImplementation(tableMock({
      report: ROMANTIC_REPORT,
      turns: Array.from({ length: 20 }, (_, i) => ({ id: String(i), question: "q", answer: "a", turn_index: i + 1, created_at: "2026-01-01" })),
    }));
    const res = await POST(req({ sessionId: "s1", question: "why?" }));
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ code: "FOLLOWUP_LIMIT_REACHED" });
    expect(checkUsage).not.toHaveBeenCalled();
  });

  it("daily quota exhausted → 429 LIMIT_REACHED", async () => {
    checkUsage.mockResolvedValue({ allowed: false, remaining: 0, currentCount: 3 });
    const res = await POST(req({ sessionId: "s1", question: "why?" }));
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ code: "LIMIT_REACHED" });
    expect(createCompletion).not.toHaveBeenCalled();
  });
});

describe("POST grounding + guardrails", () => {
  it("grounds in recorded charts + original report, with relationship guardrails", async () => {
    fromDb.mockImplementation(tableMock({
      report: ROMANTIC_REPORT,
      turns: [{ id: "t1", question: "prior turn q", answer: "prior turn a", turn_index: 1, created_at: "2026-01-01" }],
    }));
    const res = await POST(req({ sessionId: "s1", question: "what about our communication?" }));
    expect(res.status).toBe(200);
    const { full, saveFailed } = await readSse(res);
    expect(full).toBe("a grounded relationship answer");
    expect(saveFailed).toBe(false);

    const call = createCompletion.mock.calls[0][0];
    const system = call.messages[0].content as string;
    expect(system).toContain("the original synastry report text"); // original report
    expect(system).toContain("prior turn q");                      // prior turns
    expect(system).toContain("命宫(戊寅): 太阳(得 (De — Gaining))");  // recorded chart serialization
    expect(system).toContain("1995-01-01");                        // recorded birth context
    expect(system).toContain("never recalculate");                 // anti-recast
    expect(system).toContain("NEVER output compatibility percentages"); // no fake scores
    expect(system).toContain("stay together or break up");         // no definitive outcomes
    expect(call.messages[1].content).toBe("what about our communication?");
    expect(lastState.insertCalls).toHaveLength(0); // no turnKey → insert path used only at stream end
  });
});

describe("POST turnKey idempotency", () => {
  const KEY = "11111111-2222-4333-8444-555555555555";

  it("non-UUID turnKey → 400", async () => {
    expect((await POST(req({ sessionId: "s1", question: "why?", turnKey: "nope" }))).status).toBe(400);
  });

  it("saved key, same session → replay stored answer, no charge, no model", async () => {
    fromDb.mockImplementation(tableMock({
      report: ROMANTIC_REPORT,
      replayRow: { id: KEY, session_id: "s1", question: "why?", answer: "the stored answer" },
    }));
    const res = await POST(req({ sessionId: "s1", question: "why?", turnKey: KEY }));
    expect(res.status).toBe(200);
    const { full, replay } = await readSse(res);
    expect(replay).toBe(true);
    expect(full).toBe("the stored answer");
    expect(checkUsage).not.toHaveBeenCalled();
    expect(createCompletion).not.toHaveBeenCalled();
  });

  it("saved key, different session → 400 TURN_KEY_REUSED (no leak)", async () => {
    fromDb.mockImplementation(tableMock({
      report: ROMANTIC_REPORT,
      replayRow: { id: KEY, session_id: "another-report", question: "why?", answer: "secret" },
    }));
    const res = await POST(req({ sessionId: "s1", question: "why?", turnKey: KEY }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "TURN_KEY_REUSED" });
  });

  it("fresh key happy path → upsert carries the client id", async () => {
    const state = { report: ROMANTIC_REPORT, upsertResult: { id: KEY } };
    lastState = state;
    fromDb.mockImplementation(tableMock(state));
    const res = await POST(req({ sessionId: "s1", question: "why?", turnKey: KEY }));
    expect(res.status).toBe(200);
    await readSse(res);
    expect(lastState.upsertCalls).toHaveLength(1);
    expect(lastState.upsertCalls[0].row).toMatchObject({ id: KEY, session_id: "s1", turn_index: 1 });
    expect(refund).not.toHaveBeenCalled();
  });

  it("concurrent twin wins insert → refund this attempt, no saveFailed", async () => {
    const state = { report: ROMANTIC_REPORT, upsertResult: null };
    lastState = state;
    fromDb.mockImplementation(tableMock(state));
    const res = await POST(req({ sessionId: "s1", question: "why?", turnKey: KEY }));
    expect(res.status).toBe(200);
    const { saveFailed } = await readSse(res);
    expect(saveFailed).toBe(false);
    expect(refund).toHaveBeenCalledWith("u1");
  });

  it("upsert error → saveFailed marker, no refund (content delivered)", async () => {
    const state = { report: ROMANTIC_REPORT, upsertError: { message: "rls denied" } };
    lastState = state;
    fromDb.mockImplementation(tableMock(state));
    const res = await POST(req({ sessionId: "s1", question: "why?", turnKey: KEY }));
    const { saveFailed } = await readSse(res);
    expect(saveFailed).toBe(true);
    expect(refund).not.toHaveBeenCalled();
  });
});

describe("POST failure handling", () => {
  it("model create() throws → refund, 500, generic error copy", async () => {
    createCompletion.mockRejectedValue(new Error("azure down"));
    const res = await POST(req({ sessionId: "s1", question: "why?" }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).not.toContain("azure");
    expect(refund).toHaveBeenCalledWith("u1");
  });

  it("empty model stream → refund, no insert", async () => {
    createCompletion.mockResolvedValue(sseChunks(""));
    const res = await POST(req({ sessionId: "s1", question: "why?" }));
    await readSse(res);
    expect(refund).toHaveBeenCalledWith("u1");
    expect(lastState.insertCalls).toHaveLength(0);
  });
});
