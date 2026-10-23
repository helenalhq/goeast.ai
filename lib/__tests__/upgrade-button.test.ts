// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUpgradeButton } from "../use-upgrade-button";

// Mock the analytics module
vi.mock("@/lib/analytics", () => ({
  logEvent: vi.fn(),
}));

// Mock fetch
const fetchMock = vi.fn();

describe("useUpgradeButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts with loading=false and no error", () => {
    const { result } = renderHook(() => useUpgradeButton("example"));
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("sets loading=true during checkout API call (double-click guard)", async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    fetchMock.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      })
    );

    const { result } = renderHook(() => useUpgradeButton("example"));

    // Start the upgrade
    act(() => {
      result.current.handleUpgrade();
    });

    // While in flight, loading is true and a second call is a no-op
    expect(result.current.loading).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.handleUpgrade(); // second click — should be ignored
    });
    expect(fetchMock).toHaveBeenCalledTimes(1); // still only 1 fetch

    // Resolve the fetch
    await act(async () => {
      resolveFetch({
        ok: true,
        json: async () => ({ checkoutUrl: "https://checkout.example.com" }),
      });
    });
  });

  it("resets loading on API failure — user can retry", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ error: "Payment provider error" }),
    });

    const { result } = renderHook(() => useUpgradeButton("example"));

    await act(async () => {
      await result.current.handleUpgrade();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe("Payment provider error");

    // Retry should work
    fetchMock.mockClear();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ checkoutUrl: "https://checkout.example.com" }),
    });

    await act(async () => {
      await result.current.handleUpgrade();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("resets loading on network error — user can retry", async () => {
    fetchMock.mockRejectedValue(new Error("Network down"));

    const { result } = renderHook(() => useUpgradeButton("pricing"));

    await act(async () => {
      await result.current.handleUpgrade();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe("Payment service unavailable");
  });

  it("resets loading when page is restored from bfcache (pageshow with persisted=true)", async () => {
    // Simulate a successful checkout that navigates away (loading stays true)
    // But navigation is mocked — window.location.href assignment doesn't actually navigate
    const originalHref = window.location.href;
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ checkoutUrl: "https://checkout.creem.io/test" }),
    });

    const { result } = renderHook(() => useUpgradeButton("example"));

    await act(async () => {
      await result.current.handleUpgrade();
    });

    // After a successful checkout redirect, loading stays true
    // (the browser is "navigating away" — we intentionally don't reset)
    expect(result.current.loading).toBe(true);

    // Simulate browser Back: bfcache fires pageshow with persisted=true
    act(() => {
      const pageshowEvent = new PageTransitionEvent("pageshow", {
        persisted: true,
      });
      window.dispatchEvent(pageshowEvent);
    });

    // Loading must be reset so the button is clickable again
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();

    // Restore
    window.location.href = originalHref;
  });

  it("does NOT reset loading on normal pageshow (persisted=false)", () => {
    const { result } = renderHook(() => useUpgradeButton("example"));

    act(() => {
      const pageshowEvent = new PageTransitionEvent("pageshow", {
        persisted: false,
      });
      window.dispatchEvent(pageshowEvent);
    });

    // Normal page load should not affect the state
    expect(result.current.loading).toBe(false);
  });

  it("fires upgrade_clicked analytics event with correct source", async () => {
    const { logEvent } = await import("@/lib/analytics");
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ error: "fail" }),
    });

    const { result } = renderHook(() => useUpgradeButton("account"));

    await act(async () => {
      await result.current.handleUpgrade();
    });

    expect(logEvent).toHaveBeenCalledWith("upgrade_clicked", { from: "account" });
  });
});
