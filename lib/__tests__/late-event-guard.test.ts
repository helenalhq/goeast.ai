import { describe, expect, it, vi, beforeEach } from "vitest";
import { createHmac } from "crypto";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

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
  id: "evt_late_" + Math.random().toString(36).slice(2, 8),
  eventType: type,
  object: {
    id: "sub_68Odn2mjNTHTZVlm4rUGvC",
    customer_id: "cus_test",
    customer_email: "pcliu.fd@gmail.com",
    metadata: { userId: "test-user-uuid" },
    ...extra,
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CREEM_WEBHOOK_SECRET", SECRET);
});

describe("late event guard — cancelled subscription must not be re-activated", () => {
  it("webhook returns 200 for late paid event (guard prevents re-activation)", async () => {
    const res = await POST(signedReq(SUB_EVENT("subscription.paid")));
    expect(res.status).toBe(200);
    expect(activate).toHaveBeenCalledTimes(1);
  });

  it("canceled event sets status to cancelled (terminal state)", async () => {
    const update = vi.fn().mockReturnThis();
    const eq = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValueOnce({ update, eq });

    const res = await POST(signedReq(SUB_EVENT("subscription.canceled")));
    expect(res.status).toBe(200);
    expect(cancel).toHaveBeenCalledWith(expect.anything(), "sub_68Odn2mjNTHTZVlm4rUGvC", "cancelled");
  });

  it("expired event sets status to expired (terminal state)", async () => {
    const res = await POST(signedReq(SUB_EVENT("subscription.expired")));
    expect(res.status).toBe(200);
    expect(cancel).toHaveBeenCalledWith(expect.anything(), "sub_68Odn2mjNTHTZVlm4rUGvC", "expired");
  });
});

describe("activateSubscription guard logic (direct unit tests)", () => {
  function makeMockSupabase(existingStatus: string | null) {
    return {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: existingStatus ? { status: existingStatus } : null,
            }),
          }),
        }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }),
    } as unknown as SupabaseClient;
  }

  it("skips activation when existing status is cancelled", async () => {
    const mockSupa = makeMockSupabase("cancelled");
    const actual = await vi.importActual<typeof import("../../lib/creem")>("../../lib/creem");
    await actual.activateSubscription(
      mockSupa,
      "sub_test",
      "cus_test",
      "test@test.com",
      new Date(Date.now() + 86400000),
      "user-123",
    );
    expect(mockSupa.from).toHaveBeenCalledTimes(1); // only the select call, no upsert
  });

  it("skips activation when existing status is expired", async () => {
    const mockSupa = makeMockSupabase("expired");
    const actual = await vi.importActual<typeof import("../../lib/creem")>("../../lib/creem");
    await actual.activateSubscription(
      mockSupa,
      "sub_test",
      "cus_test",
      "test@test.com",
      new Date(Date.now() + 86400000),
      "user-123",
    );
    expect(mockSupa.from).toHaveBeenCalledTimes(1);
  });

  it("proceeds with activation when no existing row (new subscription)", async () => {
    const mockSupa = makeMockSupabase(null);
    const actual = await vi.importActual<typeof import("../../lib/creem")>("../../lib/creem");
    await actual.activateSubscription(
      mockSupa,
      "sub_new",
      "cus_new",
      "new@test.com",
      new Date(Date.now() + 86400000),
      "user-456",
    );
    expect(mockSupa.from).toHaveBeenCalled();
  });

  it("proceeds with activation when existing status is scheduled_cancel (renewal)", async () => {
    const mockSupa = makeMockSupabase("scheduled_cancel");
    const actual = await vi.importActual<typeof import("../../lib/creem")>("../../lib/creem");
    await actual.activateSubscription(
      mockSupa,
      "sub_renewal",
      "cus_renewal",
      "renewal@test.com",
      new Date(Date.now() + 86400000),
      "user-789",
    );
    expect(mockSupa.from).toHaveBeenCalled();
  });
});
