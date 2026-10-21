import { describe, expect, it, vi, beforeEach } from "vitest";
import { createHmac } from "crypto";
import type { NextRequest } from "next/server";

const { activate, cancel, mockFrom } = vi.hoisted(() => ({
  activate: vi.fn(),
  cancel: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: mockFrom }),
}));
vi.mock("@/lib/creem", () => ({
  activateSubscription: activate,
  cancelSubscription: cancel,
}));

import { POST } from "../../app/api/webhooks/creem/route";

const SECRET = "whsec_test_123";

function signedReq(event: Record<string, unknown>, secret: string = SECRET) {
  const body = JSON.stringify(event);
  const sig = createHmac("sha256", secret).update(body).digest("hex");
  return new Request("http://localhost/api/webhooks/creem", {
    method: "POST",
    headers: { "content-type": "application/json", "creem-signature": sig },
    body,
  }) as unknown as NextRequest;
}

const SUB_EVENT = (type: string, extra: Record<string, unknown> = {}) => ({
  id: "evt_123",
  eventType: type,
  object: {
    id: "sub_abc",
    customer_id: "cus_1",
    customer_email: "buyer@example.com",
    metadata: { userId: "u-1" },
    ...extra,
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CREEM_WEBHOOK_SECRET", SECRET);
  // scheduled_cancel direct-update chain (only used by that branch)
  mockFrom.mockReturnValue({
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ error: null }),
  });
});

describe("signature enforcement (fail closed)", () => {
  it("activates on a correctly signed checkout.completed", async () => {
    const res = await POST(signedReq(SUB_EVENT("checkout.completed")));
    expect(res.status).toBe(200);
    expect(activate).toHaveBeenCalledTimes(1);
  });

  it("rejects a bad signature (401) and does not activate", async () => {
    const res = await POST(signedReq(SUB_EVENT("checkout.completed"), "wrong-secret"));
    expect(res.status).toBe(401);
    expect(activate).not.toHaveBeenCalled();
  });

  it("rejects when the secret is not configured — fail closed, NEW behavior", async () => {
    vi.stubEnv("CREEM_WEBHOOK_SECRET", "");
    const res = await POST(signedReq(SUB_EVENT("checkout.completed")));
    expect([500, 503]).toContain(res.status);
    expect(activate).not.toHaveBeenCalled();
  });
});

describe("expiry from event (no more hardcoded +30d)", () => {
  it("uses a future current_period_end_date (unix seconds) when present", async () => {
    const future = Math.floor(Date.now() / 1000) + 60 * 86400;
    await POST(signedReq(SUB_EVENT("subscription.paid", { current_period_end_date: future })));
    const expiresArg = activate.mock.calls[0][4];
    expect(expiresArg.getTime()).toBeGreaterThan(Date.now() + 50 * 86400000);
  });

  it("uses an ISO string expiry when that is the field present", async () => {
    const iso = new Date(Date.now() + 45 * 86400000).toISOString();
    await POST(signedReq(SUB_EVENT("subscription.active", { expires_at: iso })));
    expect(activate.mock.calls[0][4].getTime()).toBeGreaterThan(Date.now() + 40 * 86400000);
  });

  it("falls back to +30d when the event carries no usable expiry", async () => {
    await POST(signedReq(SUB_EVENT("subscription.active")));
    const delta = activate.mock.calls[0][4].getTime() - Date.now();
    expect(delta).toBeGreaterThan(29 * 86400000);
    expect(delta).toBeLessThan(31 * 86400000);
  });

  it("ignores a past or garbage expiry and falls back", async () => {
    await POST(signedReq(SUB_EVENT("subscription.paid", { current_period_end_date: "garbage" })));
    const delta = activate.mock.calls[0][4].getTime() - Date.now();
    expect(delta).toBeGreaterThan(29 * 86400000);
  });
});

describe("replay & lifecycle", () => {
  it("replayed identical event re-activates idempotently (upsert semantics, no double billing)", async () => {
    const event = SUB_EVENT("subscription.active");
    await POST(signedReq(event));
    await POST(signedReq(event));
    expect(activate).toHaveBeenCalledTimes(2);
    expect(activate.mock.calls[0].slice(1)).toEqual(activate.mock.calls[1].slice(1));
  });

  it("subscription.canceled routes to cancelSubscription with cancelled", async () => {
    await POST(signedReq(SUB_EVENT("subscription.canceled")));
    expect(cancel).toHaveBeenCalledWith(expect.anything(), "sub_abc", "cancelled");
  });

  it("subscription.expired routes to cancelSubscription with expired", async () => {
    await POST(signedReq(SUB_EVENT("subscription.expired")));
    expect(cancel).toHaveBeenCalledWith(expect.anything(), "sub_abc", "expired");
  });

  it("unknown eventType → 200 without activating", async () => {
    const res = await POST(signedReq(SUB_EVENT("subscription.updated")));
    expect(res.status).toBe(200);
    expect(activate).not.toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
  });
});
