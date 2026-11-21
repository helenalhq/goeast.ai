import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import type { NextRequest } from "next/server";

const { db } = vi.hoisted(() => ({ db: { from: vi.fn() } }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => db }));

import { POST } from "../../app/api/webhooks/creem/route";

const SECRET = "offline-webhook-fixture";
const EXPIRY = "2027-01-03T00:00:00.000Z";
const SUB = "sub_offline";
const ROWS = new Map<string, Record<string, unknown>>();
let fail: "read" | "write" | "throw" | "profile" | "owner" | "lifecycle" | undefined;
let writeAccepted: number;
let beforeUpdate: (() => void) | undefined;

const deliveryResponse = (type = "checkout.completed", extra: Record<string, unknown> = {}) => {
  const body = JSON.stringify({
    id: "evt_offline",
    eventType: type,
    object: {
      id: type === "checkout.completed" ? "ch_offline" : SUB,
      ...(type === "checkout.completed"
        ? { subscription: { id: SUB, current_period_end_date: EXPIRY }, order: { status: "paid", type: "recurring", amount_paid: 499, transaction: "tran_first" } }
        : { current_period_end_date: EXPIRY }),
      mode: "test",
      customer_email: "fixture@example.invalid",
      metadata: fail === "profile" || fail === "owner" ? {} : { userId: "fixture-owner" },
      ...extra,
    },
  });
  return POST(new Request("http://localhost/api/webhooks/creem", {
    method: "POST",
    headers: { "creem-signature": createHmac("sha256", SECRET).update(body).digest("hex") },
    body,
  }) as unknown as NextRequest);
};

beforeEach(() => {
  ROWS.clear();
  fail = undefined;
  writeAccepted = 0;
  beforeUpdate = undefined;
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-21T07:00:00.000Z"));
  vi.stubEnv("CREEM_WEBHOOK_SECRET", SECRET);
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  db.from.mockImplementation((table: string) => {
    if (table === "profiles") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => fail === "profile"
              ? { data: null, error: { message: "offline profile read failure" } }
              : { data: null, error: null },
          }),
        }),
      };
    }
    expect(table).toBe("subscriptions");
    return {
      select: () => ({
        eq: (column: string, value: string) => ({
          ...(column === "customer_email" ? {
            not: () => ({
              limit: () => ({
                maybeSingle: async () => fail === "owner"
                  ? { data: null, error: { message: "offline owner read failure" } }
                  : { data: null, error: null },
              }),
            }),
          } : {}),
          maybeSingle: async () => {
            if (fail === "throw") throw new Error("offline read exception");
            return fail === "read"
              ? { data: null, error: { message: "offline read failure" } }
              : { data: ROWS.get(value), error: null };
          },
        }),
      }),
      upsert: (row: Record<string, unknown>, options: { onConflict: string; ignoreDuplicates: boolean }) => ({
        select: () => ({ maybeSingle: async () => {
          if (fail === "write") return { error: { message: "offline write failure" } };
          expect(options).toEqual({ onConflict: "creem_subscription_id", ignoreDuplicates: true });
          const key = String(row.creem_subscription_id);
          if (ROWS.has(key)) return { data: null, error: null };
          writeAccepted++;
          ROWS.set(key, row);
          return { data: { creem_subscription_id: key }, error: null };
        } }),
      }),
      update: (patch: Record<string, unknown>) => ({
        eq: (_column: string, value: string) => {
          if (!("expires_at" in patch)) {
            if (fail === "lifecycle") return Promise.resolve({ error: { message: "offline update failure" } });
            const row = ROWS.get(value);
            if (row) ROWS.set(value, { ...row, ...patch });
            return Promise.resolve({ error: null });
          }
          return { eq: (_statusColumn: string, status: string) => {
            const matchExpiry = (_expiryColumn: string, expiry: string | null) => ({
              select: () => ({ maybeSingle: async () => {
                if (fail === "write") return { error: { message: "offline write failure" } };
                beforeUpdate?.();
                const row = ROWS.get(value);
                if (!row || row.status !== status || (row.expires_at ?? null) !== expiry) return { data: null, error: null };
                writeAccepted++;
                ROWS.set(value, { ...row, ...patch });
                return { data: { creem_subscription_id: value }, error: null };
              } }),
            });
            return { eq: matchExpiry, is: matchExpiry };
          } };
        },
      }),
    };
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("Creem webhook: failure acknowledgement and offline recovery", () => {
  it.each(["read", "write", "throw", "profile", "owner"] as const)("returns 503 for a transient activation %s failure without false delivery", async (kind) => {
    fail = kind;
    expect((await deliveryResponse()).status).toBe(503);
    expect(ROWS.size).toBe(0);
    const logs = vi.mocked(console.log).mock.calls.map((args) => args.join(" ")).join("\n");
    expect(logs).toContain("payment_confirmed");
    expect(logs).toContain("delivery_failed");
    expect(logs).not.toContain("delivery_succeeded");
  });

  it("recovers after the same signed event is replayed and preserves one grant with the provider expiry", async () => {
    fail = "write";
    const failed = await deliveryResponse();
    expect(ROWS.size).toBe(0);
    fail = undefined;
    expect((await deliveryResponse()).status).toBe(200);
    vi.setSystemTime(new Date("2026-11-22T07:00:00.000Z"));
    expect((await deliveryResponse()).status).toBe(200);
    expect(ROWS.size).toBe(1);
    expect(ROWS.get(SUB)).toMatchObject({ user_id: "fixture-owner", status: "active", expires_at: EXPIRY });
    expect(failed.status).toBe(503);
  });

  it("uses the exact nested checkout period end rather than a conflicting top-level date", async () => {
    expect((await deliveryResponse("checkout.completed", { current_period_end_date: "2027-02-01T00:00:00Z" })).status).toBe(200);
    expect(ROWS.get(SUB)?.expires_at).toBe(EXPIRY);
  });

  it.each([false, true])("reports one initial payment with correlatable provider charge ID, either order (paid first: %s)", async (paidFirst) => {
    const paid = () => deliveryResponse("subscription.paid", {
      last_transaction: { id: "tran_first", status: "paid", amount_paid: 499 },
    });
    if (paidFirst) await paid();
    await deliveryResponse();
    await deliveryResponse("subscription.active");
    if (!paidFirst) await paid();
    const logs = vi.mocked(console.log).mock.calls.flat().filter((v) => typeof v === "string" && v.startsWith("{")).map((v) => JSON.parse(v));
    expect(logs.filter((v) => v.event === "payment_confirmed")).toEqual([
      expect.objectContaining({ kind: "first", transaction_id: "tran_first", env: "test" }),
    ]);
    expect(logs.filter((v) => v.event === "subscription_payment_observed")).toEqual([
      expect.objectContaining({ transaction_id: "tran_first", env: "test" }),
    ]);
    expect(logs).not.toContainEqual(expect.objectContaining({ kind: "renewal" }));
    expect(ROWS.size).toBe(1);
    expect(writeAccepted).toBe(1);
  });

  it("does not grant Pro from a one-time checkout without a subscription", async () => {
    const result = await deliveryResponse("checkout.completed", {
      subscription: null, order: { status: "paid", type: "onetime", transaction: "tran_other" },
    });
    expect(result.status).toBe(200);
    expect(ROWS.size).toBe(0);
  });

  it("never lets late old-period or incomplete signals shorten or extend the renewed entitlement", async () => {
    const renewalExpiry = "2027-02-03T00:00:00.000Z";
    await deliveryResponse();
    const originalActivation = ROWS.get(SUB)?.activated_at;
    vi.setSystemTime(new Date("2026-12-15T07:00:00.000Z"));
    await deliveryResponse("subscription.paid", {
      current_period_end_date: renewalExpiry,
      last_transaction: { id: "tran_renewed", status: "paid", amount_paid: 499 },
    });
    vi.setSystemTime(new Date("2027-01-15T07:00:00.000Z"));
    expect((await deliveryResponse()).status).toBe(200);
    expect((await deliveryResponse("subscription.active", { current_period_end_date: null })).status).toBe(200);
    expect(writeAccepted).toBe(2);
    expect(ROWS.get(SUB)).toMatchObject({ expires_at: renewalExpiry, activated_at: originalActivation });
  });

  it("returns 503 when a cancellation wins a concurrent write, and preserves it on retry", async () => {
    await deliveryResponse();
    beforeUpdate = () => {
      const current = ROWS.get(SUB);
      ROWS.set(SUB, { ...current, status: "cancelled" });
    };
    const renew = () => deliveryResponse("subscription.paid", { current_period_end_date: "2027-02-03T00:00:00Z" });
    expect((await renew()).status).toBe(503);
    beforeUpdate = undefined;
    expect((await renew()).status).toBe(200);
    expect(ROWS.get(SUB)).toMatchObject({ status: "cancelled", expires_at: EXPIRY });
    expect(writeAccepted).toBe(1);
  });

  it("does not create a grant when its signed payload supplies no valid period end", async () => {
    expect((await deliveryResponse("checkout.completed", { subscription: { id: SUB } })).status).toBe(503);
    expect(ROWS.size).toBe(0);
  });

  it("acknowledges a terminal-state replay without granting or overwriting the subscription", async () => {
    const row = { status: "cancelled", expires_at: EXPIRY, user_id: "fixture-owner" };
    ROWS.set(SUB, row);
    expect((await deliveryResponse()).status).toBe(200);
    expect(writeAccepted).toBe(0);
    expect(ROWS.get(SUB)).toEqual(row);
  });

  it.each([
    ["subscription.scheduled_cancel", "scheduled_cancel"],
    ["subscription.canceled", "cancelled"],
    ["subscription.expired", "expired"],
  ])("returns 503 when %s fails and applies on replay", async (eventType, status) => {
    ROWS.set(SUB, { status: "active", expires_at: EXPIRY, user_id: "fixture-owner" });
    fail = "lifecycle";
    expect((await deliveryResponse(eventType)).status).toBe(503);
    expect(ROWS.get(SUB)?.status).toBe("active");
    expect(vi.mocked(console.log).mock.calls.flat().join(" ")).not.toContain("subscription_cancelled");
    fail = undefined;
    expect((await deliveryResponse(eventType)).status).toBe(200);
    expect(ROWS.get(SUB)?.status).toBe(status);
  });
});
