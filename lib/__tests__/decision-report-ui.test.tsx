// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DecisionReportView from "@/components/decision-report/DecisionReportView";
import DecisionReportOffer, { trustedDecisionCheckoutUrl } from "@/app/consult/iching/DecisionReportOffer";
import DecisionReportWalkthrough from "@/app/examples/iching-decision-report/walkthrough/DecisionReportWalkthrough";
import { CAREER_DECISION_SAMPLE } from "@/lib/decision-report-example";

vi.mock("@/lib/analytics", () => ({ logEvent: vi.fn() }));
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), notFound: () => { throw new Error("NEXT_NOT_FOUND"); } }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("decision report UI", () => {
  it("renders the computed original cast, options, source and actionable reflection", () => {
    render(<DecisionReportView report={CAREER_DECISION_SAMPLE} />);
    expect(screen.getByText(/1 · Qian/)).toBeTruthy();
    expect(screen.getByText(/44 · Gou/)).toBeTruthy();
    expect(screen.getByText("初九：潛龍勿用。")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "A seven-day test" })).toBeTruthy();
    expect(screen.getByText("Hypothesis to verify")).toBeTruthy();
    expect(screen.getAllByRole("listitem").filter((item) => item.textContent?.includes("Line "))).toHaveLength(6);
  });

  it("submits the same cast without any client-controlled pricing, and reopens an existing order", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ orderId: "00000000-0000-4000-8000-000000000001" }),
    });
    vi.stubGlobal("fetch", fetcher);
    render(<DecisionReportOffer question="Explore a new job?" casts={CAREER_DECISION_SAMPLE.casts} mode="mock" />);
    expect(screen.getByText("$1.99 USD")).toBeTruthy();
    expect(screen.getByText(/does not renew/i)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/another option/i), { target: { value: "  Stay for now  " } });
    fireEvent.click(screen.getByRole("button", { name: "Continue to one-time checkout" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/account/decision-reports/00000000-0000-4000-8000-000000000001"));
    expect(fetcher.mock.calls[0][0]).toBe("/api/decision-report/checkout");
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
      question: "Explore a new job?",
      casts: CAREER_DECISION_SAMPLE.casts,
      alternative: "Stay for now",
    });
  });

  it("the synthetic walkthrough never purchases or persists anything", () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    render(<DecisionReportWalkthrough report={CAREER_DECISION_SAMPLE} />);
    fireEvent.click(screen.getByRole("button", { name: "Preview a simulated checkout" }));
    expect(screen.getByText(/no real charge/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Simulate payment success" }));
    expect(screen.getByRole("heading", { name: "A seven-day test" })).toBeTruthy();
    expect(fetcher).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });
});

describe("private decision report UI", () => {
  it("does not show a report or note on a refunded order", async () => {
    const order = { id: "00000000-0000-4000-8000-000000000001", mode: "mock", status: "refunded", report: CAREER_DECISION_SAMPLE, actionNote: "private" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => order }));
    const { default: Detail } = await import("@/app/account/decision-reports/[id]/DecisionReportDetail");
    render(<Detail id={order.id} />);
    expect(await screen.findByText(/Access to the paid report was removed/i)).toBeTruthy();
    expect(screen.queryByText(CAREER_DECISION_SAMPLE.question)).toBeNull();
    expect(screen.queryByDisplayValue("private")).toBeNull();
  });

  it("recovers failed generation by opening the same order, never another checkout", async () => {
    const order = { id: "00000000-0000-4000-8000-000000000001", mode: "mock", status: "paid", report: null, actionNote: null };
    const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => order }).mockResolvedValueOnce({
      ok: true, json: async () => ({ ...order, status: "delivered", report: CAREER_DECISION_SAMPLE }),
    });
    vi.stubGlobal("fetch", fetcher);
    const { default: Detail } = await import("@/app/account/decision-reports/[id]/DecisionReportDetail");
    render(<Detail id={order.id} />);
    fireEvent.click(await screen.findByRole("button", { name: "Generate or retry report" }));
    expect(await screen.findByRole("heading", { name: "A seven-day test" })).toBeTruthy();
    expect(fetcher.mock.calls.map(([path]) => path)).toEqual([`/api/decision-report/${order.id}`, `/api/decision-report/${order.id}`]);
    expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({ action: "generate" });
  });
});

describe("synthetic Preview route", () => {
  it("opens only in Preview, ignoring a public env shadow", async () => {
    const { default: WalkthroughPage } = await import("@/app/examples/iching-decision-report/walkthrough/page");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "preview");
    expect(() => WalkthroughPage()).toThrow("NEXT_NOT_FOUND");
    vi.stubEnv("VERCEL_ENV", "preview");
    render(WalkthroughPage());
    expect(screen.getByRole("heading", { name: "Try the decision report flow" })).toBeTruthy();
  });
});

describe("P1 test checkout URL handling", () => {
  it("accepts sandbox checkout links without allowing a production path or arbitrary redirects", () => {
    const testLink = "https://www.creem.io/test/checkout/prod_test123/ch_abcd1234";
    expect(trustedDecisionCheckoutUrl(testLink, "test")).toBe(testLink);
    expect(trustedDecisionCheckoutUrl("https://checkout.creem.io/ch_abcd1234", "test")).toBe("https://checkout.creem.io/ch_abcd1234");
    expect(trustedDecisionCheckoutUrl(testLink.replace("/test", ""), "test")).toBeNull();
    expect(trustedDecisionCheckoutUrl(testLink + "?redirect=https://example.com", "test")).toBeNull();
    expect(trustedDecisionCheckoutUrl(testLink + "#x", "test")).toBeNull();
    expect(trustedDecisionCheckoutUrl(testLink, "mock")).toBeNull();
  });
});
