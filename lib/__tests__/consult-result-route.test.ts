import { describe, expect, it, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const { getUser, fromDb } = vi.hoisted(() => ({ getUser: vi.fn(), fromDb: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser }, from: fromDb }),
}));

import { PATCH as patchResult, GET as getResult } from "../../app/api/consult/result/route";

/** update payload recorder — the route chains .update(obj).eq().eq().select() */
let lastUpdatePayload: Record<string, unknown> | null = null;
let updateRows: unknown[] = [{ session_id: "s1" }];

function req(body: unknown) {
  return new Request("http://localhost/api/consult/result", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  lastUpdatePayload = null;
  updateRows = [{ session_id: "s1" }];
  getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
  fromDb.mockImplementation((table: string) => {
    if (table !== "consult_results") throw new Error("unexpected table " + table);
    const chain: Record<string, unknown> = {};
    chain.select = () => chain;
    chain.eq = () => chain;
    chain.maybeSingle = async () => ({
      data: { session_id: "s1", user_id: "u1", question: "q", context: {}, cast_data: {}, ai_response: "r", created_at: "2026-01-01", next_step: null, action_status: "in_progress", review_note: "note" },
    });
    chain.update = (payload: Record<string, unknown>) => {
      lastUpdatePayload = payload;
      return chain;
    };
    // .update(...).select() at the END is awaited → { data: rows }
    Object.defineProperty(chain, "then", {
      value: async (resolve: (v: unknown) => unknown) => resolve({ data: updateRows, error: null }),
    });
    return chain;
  });
});

describe("PATCH ownership + partial updates", () => {
  it("logged-out → 401", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await patchResult(req({ sessionId: "s1", nextStep: "x" }));
    expect(res.status).toBe(401);
  });

  it("missing sessionId → 400", async () => {
    const res = await patchResult(req({ nextStep: "x" }));
    expect(res.status).toBe(400);
  });

  it("nextStep-only PATCH must NOT touch action_status or review_note", async () => {
    const res = await patchResult(req({ sessionId: "s1", nextStep: "write 15 minutes" }));
    expect(res.status).toBe(200);
    expect(lastUpdatePayload).toMatchObject({ next_step: "write 15 minutes" });
    expect(lastUpdatePayload).not.toHaveProperty("action_status");
    expect(lastUpdatePayload).not.toHaveProperty("review_note");
  });

  it("actionStatus valid → persisted; no other content fields touched", async () => {
    const res = await patchResult(req({ sessionId: "s1", actionStatus: "done" }));
    expect(res.status).toBe(200);
    expect(lastUpdatePayload).toMatchObject({ action_status: "done" });
    expect(lastUpdatePayload).not.toHaveProperty("next_step");
    expect(lastUpdatePayload).not.toHaveProperty("review_note");
  });

  it("reviewNote saved, trimmed; empty string clears it", async () => {
    const res = await patchResult(req({ sessionId: "s1", reviewNote: "  did it, felt calm  " }));
    expect(res.status).toBe(200);
    expect(lastUpdatePayload).toMatchObject({ review_note: "did it, felt calm" });
    await patchResult(req({ sessionId: "s1", reviewNote: "" }));
    expect(lastUpdatePayload).toMatchObject({ review_note: "" });
  });

  it("actionStatus outside the enum → 400, nothing written", async () => {
    const res = await patchResult(req({ sessionId: "s1", actionStatus: "finished!" }));
    expect(res.status).toBe(400);
    expect(lastUpdatePayload).toBeNull();
  });

  it("reviewNote over 1000 chars → 400", async () => {
    const res = await patchResult(req({ sessionId: "s1", reviewNote: "x".repeat(1001) }));
    expect(res.status).toBe(400);
  });

  it("0 rows matched (someone else's report / missing) → 404, no false success", async () => {
    updateRows = [];
    const res = await patchResult(req({ sessionId: "someone-elses", actionStatus: "done" }));
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("not") });
  });

  it("update returning a DB error → 500", async () => {
    fromDb.mockImplementation(() => {
      const chain: Record<string, unknown> = {};
      chain.eq = () => chain;
      chain.update = () => chain;
      chain.select = () => chain;
      Object.defineProperty(chain, "then", {
        value: async (resolve: (v: unknown) => unknown) => resolve({ data: null, error: { message: "boom" } }),
      });
      return chain;
    });
    const res = await patchResult(req({ sessionId: "s1", actionStatus: "done" }));
    expect(res.status).toBe(500);
  });
});

describe("GET returns the new fields", () => {
  it("maps snake_case columns to camelCase", async () => {
    const res = await getResult(new Request("http://localhost/api/consult/result?session_id=s1") as unknown as NextRequest);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.result.actionStatus).toBe("in_progress");
    expect(json.result.reviewNote).toBe("note");
  });

  it("logged-out → 401", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await getResult(new Request("http://localhost/api/consult/result?session_id=s1") as unknown as NextRequest);
    expect(res.status).toBe(401);
  });
});
