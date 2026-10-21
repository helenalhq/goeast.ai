import { describe, expect, it, vi, beforeEach } from "vitest";

const { track } = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock("@vercel/analytics", () => ({ track }));

import { logEvent, type AnalyticsEvent } from "../analytics";

describe("logEvent", () => {
  beforeEach(() => vi.resetAllMocks());

  it("forwards the event name with scalar data", () => {
    logEvent("oracle_consult_started", { philosopher: "prologue-zhougong", with_context: true, count: 1 });
    expect(track).toHaveBeenCalledWith("oracle_consult_started", {
      philosopher: "prologue-zhougong",
      with_context: true,
      count: 1,
    });
  });

  it("works with no data", () => {
    logEvent("ziwei_chart_generated");
    expect(track).toHaveBeenCalledWith("ziwei_chart_generated", {});
  });

  it("DROPS non-scalar values (objects/arrays/null cannot hide PII)", () => {
    logEvent("x" as AnalyticsEvent, { leak: { email: "a@b.c" }, arr: ["q"], n: 1, s: "ok", b: false, nil: null } as never);
    expect(track).toHaveBeenCalledWith("x", { n: 1, s: "ok", b: false });
  });

  it("never throws when track fails (UX protection)", () => {
    track.mockImplementation(() => {
      throw new Error("boom");
    });
    expect(() => logEvent("x" as AnalyticsEvent)).not.toThrow();
  });

  it("logs a debug line outside production (local evidence path)", () => {
    const spy = vi.spyOn(console, "debug").mockImplementation(() => {});
    logEvent("x" as AnalyticsEvent, { n: 1 });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
