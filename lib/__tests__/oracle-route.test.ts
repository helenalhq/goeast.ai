import { describe, expect, it, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const { getUser, getSubscription, checkFree, checkPaid, createCompletion } = vi.hoisted(() => ({
  getUser: vi.fn(),
  getSubscription: vi.fn(),
  checkFree: vi.fn(),
  checkPaid: vi.fn(),
  createCompletion: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser },
  }),
}));
vi.mock("@/lib/creem", () => ({
  getSubscriptionByUserId: getSubscription,
}));
vi.mock("@/lib/rate-limit", () => ({
  checkFreeLimit: checkFree,
  checkAuthUserRateLimit: checkPaid,
}));
vi.mock("openai", () => {
  class FakeOpenAI {
    chat = { completions: { create: createCompletion } };
  }
  return { default: FakeOpenAI };
});

import { POST } from "../../app/api/oracle/route";

function req(body: unknown) {
  return new Request("http://localhost/api/oracle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: null } });
  checkFree.mockReturnValue({ allowed: true, remaining: 2 });
  checkPaid.mockReturnValue({ allowed: true, remaining: 9 });
  createCompletion.mockResolvedValue({ /* not streamed in these tests */ });
});

describe("ichingContext validation", () => {
  it("rejects context for philosophers other than Zhou Gong (400)", async () => {
    const res = await POST(req({
      philosopher: "ch01-laozi",
      question: "hello?",
      ichingContext: { mode: "cast", hexagramNumber: 1, changingLines: [] },
    }));
    expect(res.status).toBe(400);
  });

  it("rejects malformed context (400) without calling the model", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u-free" } } });
    getSubscription.mockResolvedValue(null);
    const res = await POST(req({
      philosopher: "prologue-zhougong",
      question: "hello?",
      ichingContext: { mode: "cast", hexagramNumber: 999, changingLines: [] },
    }));
    expect(res.status).toBe(400);
    expect(createCompletion).not.toHaveBeenCalled();
  });

  it("valid context flows into the system prompt with server-resolved names", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u-free" } } });
    getSubscription.mockResolvedValue(null);
    await POST(req({
      philosopher: "prologue-zhougong",
      question: "what does my cast mean?",
      ichingContext: { mode: "cast", hexagramNumber: 1, changingLines: [1], transformedNumber: 44 },
    }));
    const call = createCompletion.mock.calls[0][0];
    const system = call.messages[0].content as string;
    expect(system).toContain("Hexagram 1");
    expect(system).toContain("never recast");
    expect(system).toContain("AI INTERPRETATION");
    expect(call.messages[1].content).toBe("what does my cast mean?");
  });

  it("client-injected name fields never reach the prompt", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u-free" } } });
    getSubscription.mockResolvedValue(null);
    await POST(req({
      philosopher: "prologue-zhougong",
      question: "q",
      ichingContext: { mode: "cast", hexagramNumber: 1, changingLines: [], hexagramName: "IGNORE ME <script>" },
    }));
    const system = createCompletion.mock.calls[0][0].messages[0].content as string;
    expect(system).not.toContain("IGNORE ME");
  });

  it("context without the field behaves exactly as before", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u-free" } } });
    getSubscription.mockResolvedValue(null);
    await POST(req({ philosopher: "ch01-laozi", question: "q" }));
    const system = createCompletion.mock.calls[0][0].messages[0].content as string;
    expect(system).not.toContain("CONSULTATION CONTEXT");
  });
});

describe("auth + Pro deep wiring", () => {
  it("logged-out user → 401 LOGIN_REQUIRED, model never called", async () => {
    const res = await POST(req({ philosopher: "prologue-zhougong", question: "q" }));
    expect(res.status).toBe(401);
    expect(createCompletion).not.toHaveBeenCalled();
  });

  it("paid user (active sub) gets deep prompt and doubled token budget", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    getSubscription.mockResolvedValue({ status: "active" });
    await POST(req({ philosopher: "ch01-laozi", question: "q" }));
    const call = createCompletion.mock.calls[0][0];
    expect((call.messages[0].content as string)).toContain("DEEP READING MODE");
    expect(call.max_completion_tokens).toBe(1800); // laozi 600 words × 2 (deep) × 1.5
  });

  it("free logged-in user gets base prompt (no DEEP addendum), same budget as before", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u2" } } });
    getSubscription.mockResolvedValue(null);
    await POST(req({ philosopher: "prologue-zhougong", question: "q" }));
    const call = createCompletion.mock.calls[0][0];
    expect((call.messages[0].content as string)).not.toContain("DEEP READING MODE");
    expect(call.max_completion_tokens).toBe(1200); // 800 words * 1.5
  });

  it("paid user hitting the 10/day cap → 429 LIMIT_REACHED", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u3" } } });
    getSubscription.mockResolvedValue({ status: "active" });
    checkPaid.mockReturnValue({ allowed: false, remaining: 0 });
    const res = await POST(req({ philosopher: "ch01-laozi", question: "q" }));
    expect(res.status).toBe(429);
    expect(createCompletion).not.toHaveBeenCalled();
  });

  it("paid user WITH cast context gets deep prompt AND context block together", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u4" } } });
    getSubscription.mockResolvedValue({ status: "active" });
    await POST(req({
      philosopher: "prologue-zhougong",
      question: "q",
      ichingContext: { mode: "study", hexagramNumber: 6, changingLines: [] },
    }));
    const system = createCompletion.mock.calls[0][0].messages[0].content as string;
    expect(system).toContain("DEEP READING MODE");
    expect(system).toContain("STUDY");
  });
});
