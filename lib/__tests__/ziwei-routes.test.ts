import { describe, expect, it, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const { getUser, getSubscription, checkUsage, createCompletion } = vi.hoisted(() => ({
  getUser: vi.fn(),
  getSubscription: vi.fn(),
  checkUsage: vi.fn(),
  createCompletion: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser },
  }),
}));
vi.mock("@/lib/creem", () => ({
  getSubscriptionByUserId: getSubscription,
  hasActiveProEntitlement: vi.fn().mockImplementation(async (_supabase: unknown, userId: string) => {
    const sub = await getSubscription(userId);
    if (!sub) return false;
    const statusOk = sub.status === "active" || sub.status === "scheduled_cancel";
    if (!statusOk) return false;
    if (sub.expires_at) {
      const expiresAt = new Date(sub.expires_at).getTime();
      if (Number.isNaN(expiresAt)) return false;
      if (Date.now() > expiresAt + 48 * 60 * 60 * 1000) return false;
    } else {
      return false;
    }
    return true;
  }),
}));
vi.mock("@/lib/rate-limit", () => ({
  FREE_TIER_LIMIT: 3,
  PRO_TIER_LIMIT: 10,
  checkAndIncrementUsage: checkUsage,
}));
vi.mock("openai", () => {
  class FakeOpenAI {
    chat = { completions: { create: createCompletion } };
  }
  return { default: FakeOpenAI };
});

import { POST as interpretPOST } from "../../app/api/ziwei/interpret/route";
import { POST as synastryPOST } from "../../app/api/ziwei/synastry/route";

function req(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

const interpretBody = {
  birthDate: "1990-05-20",
  birthHour: 3,
  gender: "male",
  language: "en",
};

const synastryBody = {
  personA: { birthDate: "1990-05-20", birthHour: 3, gender: "male" },
  personB: { birthDate: "1992-08-15", birthHour: 6, gender: "female" },
  relationshipType: "romantic",
  language: "en",
};

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: null } });
  getSubscription.mockResolvedValue(null);
  checkUsage.mockImplementation(async () => ({ allowed: true, remaining: 2, currentCount: 1 }));
  createCompletion.mockResolvedValue({}); // tests stop before streaming
});

describe("ziwei interpret deep mode", () => {
  it("free user: base prompt (no DEEP), base budget", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u-free" } } });
    getSubscription.mockResolvedValue(null);
    await interpretPOST(req("http://localhost/api/ziwei/interpret", interpretBody));
    const call = createCompletion.mock.calls[0][0];
    expect(call.messages[0].content as string).not.toContain("DEEP READING");
    expect(call.max_completion_tokens).toBe(3000);
  });

  it("paid user: deep prompt + doubled budget", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u-paid" } } });
    getSubscription.mockResolvedValue({ status: "active", expires_at: new Date(Date.now() + 30*86400000).toISOString() });
    await interpretPOST(req("http://localhost/api/ziwei/interpret", interpretBody));
    const call = createCompletion.mock.calls[0][0];
    expect(call.messages[0].content as string).toContain("DEEP READING MODE");
    expect(call.max_completion_tokens).toBe(6000);
  });
});

describe("ziwei synastry deep mode", () => {
  it("free user: base prompt (no DEEP), base budget", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u-free" } } });
    getSubscription.mockResolvedValue(null);
    await synastryPOST(req("http://localhost/api/ziwei/synastry", synastryBody));
    const call = createCompletion.mock.calls[0][0];
    expect(call.messages[0].content as string).not.toContain("DEEP READING");
    expect(call.max_completion_tokens).toBe(4000);
  });

  it("paid user: deep prompt + doubled budget", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u-paid" } } });
    getSubscription.mockResolvedValue({ status: "active", expires_at: new Date(Date.now() + 30*86400000).toISOString() });
    await synastryPOST(req("http://localhost/api/ziwei/synastry", synastryBody));
    const call = createCompletion.mock.calls[0][0];
    expect(call.messages[0].content as string).toContain("DEEP READING MODE");
    expect(call.max_completion_tokens).toBe(8000);
  });
});
