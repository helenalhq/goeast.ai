import { describe, expect, it, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const { insert, select, update, maybeSingle, mockFrom } = vi.hoisted(() => ({
  insert: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  maybeSingle: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: mockFrom }),
}));

import { POST } from "../../app/api/newsletter/route";

function req(body: unknown) {
  return new Request("http://localhost/api/newsletter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: no existing subscriber, no linked profile, insert succeeds.
  insert.mockResolvedValue({ error: null });
  select.mockReturnValue({
    eq: vi.fn(() => ({ maybeSingle })),
  });
  maybeSingle.mockResolvedValue({ data: null });
  update.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
  mockFrom.mockImplementation(() => ({
    insert,
    select,
    update,
  }));
});

describe("POST /api/newsletter", () => {
  it("400 on invalid email", async () => {
    const res = await POST(req({ email: "nope" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/valid email/i);
  });

  it("400 on missing email", async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
  });

  it("400 on over-length email", async () => {
    const res = await POST(req({ email: "a".repeat(251) + "@x.co" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/too long/i);
  });

  it("inserts a new active subscriber with lowercased email and source", async () => {
    const res = await POST(req({ email: "User@Example.com ", source: "iching_page" }));
    expect(res.status).toBe(200);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "user@example.com",
        source: "iching_page",
        status: "active",
        user_id: null,
      })
    );
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("reactivates a previously unsubscribed row", async () => {
    maybeSingle.mockResolvedValueOnce({
      data: { email: "back@example.com", status: "unsubscribed" },
    });
    const res = await POST(req({ email: "back@example.com" }));
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "active", unsubscribed_at: null })
    );
    const body = await res.json();
    expect(body.message).toBe("Welcome back!");
    expect(insert).not.toHaveBeenCalled();
  });

  it("returns alreadySubscribed true for existing active subscriber", async () => {
    maybeSingle.mockResolvedValueOnce({
      data: { email: "hi@example.com", status: "active" },
    });
    const res = await POST(req({ email: "hi@example.com" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.alreadySubscribed).toBe(true);
  });

  it("23505 race → alreadySubscribed true, 200", async () => {
    insert.mockResolvedValue({ error: { code: "23505", message: "dup" } });
    const res = await POST(req({ email: "race@example.com" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.alreadySubscribed).toBe(true);
  });

  it("insert failure → non-2xx with error, no throw", async () => {
    insert.mockResolvedValue({ error: { message: "boom" } });
    const res = await POST(req({ email: "fail@example.com" }));
    expect(res.status).toBeGreaterThanOrEqual(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it("success message makes no inbox promise", async () => {
    const res = await POST(req({ email: "ok@example.com" }));
    const body = await res.json();
    expect(body.message).not.toMatch(/inbox|confirm/i);
  });
});
