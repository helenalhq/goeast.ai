import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const getUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser } }),
}));

// The route captures CREEM_API_KEY / CREEM_PRODUCT_ID as module-level constants,
// so they must be set BEFORE the module is imported.
process.env.CREEM_API_KEY = "test-key";
process.env.CREEM_PRODUCT_ID = "prod_test";

const { POST } = await import("../../app/api/checkout/route");

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function req() {
  // NextRequest provides request.nextUrl which the route reads for the success_url base.
  return new NextRequest("http://localhost/api/checkout", { method: "POST" });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("/api/checkout", () => {
  it("401 when logged out", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(req() as never);
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("creates a Creem checkout with userId metadata and returns the url", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u-9", email: "a@b.c" } } });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ checkout_url: "https://pay.example/x" }),
    });
    const res = await POST(req() as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.checkoutUrl).toBe("https://pay.example/x");
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/v1/checkouts");
    const payload = JSON.parse(init.body);
    expect(payload.metadata.userId).toBe("u-9");
    expect(payload.success_url).toContain("/account");
  });

  it("passes the provider error through without crashing", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u-9", email: "a@b.c" } } });
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ error: "boom" }),
      json: async () => ({ error: "boom" }),
    });
    const res = await POST(req() as never);
    // Route maps any provider !ok to 502 with a generic message (real behavior).
    expect(res.status).toBe(502);
  });

  it("network failure → non-2xx, no crash", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u-9", email: "a@b.c" } } });
    fetchMock.mockRejectedValue(new Error("network down"));
    const res = await POST(req() as never);
    // Route catches fetch errors and returns 502 (real behavior).
    expect(res.status).toBeGreaterThanOrEqual(500);
  });
});
