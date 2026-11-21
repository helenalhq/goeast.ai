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

const deliveryResponse = (type = "checkout.completed") => {
  const body = JSON.stringify({
    id: "evt_offline",
    eventType: type,
    object: {
      id: type === "checkout.completed" ? "ch_offline" : SUB,
      subscription: { id: SUB, current_period_end_date: EXPIRY },
      current_period_end_date: EXPIRY,
      customer_email: "fixture@example.invalid",
      metadata: fail === "profile" || fail === "owner" ? {} : { userId: "fixture-owner" },
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
      upsert: async (row: Record<string, unknown>, options: { onConflict: string }) => {
        if (fail === "write") return { error: { message: "offline write failure" } };
        expect(options.onConflict).toBe("creem_subscription_id");
        writeAccepted++;
        ROWS.set(String(row.creem_subscription_id), row);
        return { error: null };
      },
      update: (patch: Record<string, unknown>) => ({
        eq: async (_column: string, value: string) => {
          if (fail === "lifecycle") return { error: { message: "offline update failure" } };
          const row = ROWS.get(value);
          if (row) ROWS.set(value, { ...row, ...patch });
          return { error: null };
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
