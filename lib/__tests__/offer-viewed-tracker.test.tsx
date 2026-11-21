// @vitest-environment jsdom
import React from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import OfferViewedTracker from "@/app/pricing/offer-viewed-tracker";
import { logEvent } from "@/lib/analytics";

vi.mock("@/lib/analytics", () => ({ logEvent: vi.fn() }));

let visibility: DocumentVisibilityState;
let intersect: (fullyVisible: boolean) => void;

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  visibility = "visible";
  vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibility);
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback: IntersectionObserverCallback) {
      intersect = (fullyVisible) => callback([{
        isIntersecting: fullyVisible,
        intersectionRatio: fullyVisible ? 1 : 0,
      } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
    }
    observe() {}
    disconnect() {}
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function mountOffer() {
  return render(
    <OfferViewedTracker offerId="pro_monthly">
      <button>Upgrade to Pro</button>
      <p>$4.99/month</p>
    </OfferViewedTracker>,
  );
}

describe("pricing offer impression", () => {
  it("does not count on mount or while outside the viewport, and counts once on view", () => {
    mountOffer();
    expect(logEvent).not.toHaveBeenCalled();
    intersect(false);
    expect(logEvent).not.toHaveBeenCalled();
    intersect(true);
    intersect(false);
    intersect(true);
    expect(logEvent).toHaveBeenCalledExactlyOnceWith("offer_viewed", {
      offer_id: "pro_monthly", channel: "web", path: "pricing",
    });
  });

  it("does not count a background tab until foreground and still in view", () => {
    visibility = "hidden";
    mountOffer();
    expect(logEvent).not.toHaveBeenCalled();
    intersect(true);
    expect(logEvent).not.toHaveBeenCalled();
    intersect(false);
    visibility = "visible";
    document.dispatchEvent(new Event("visibilitychange"));
    expect(logEvent).not.toHaveBeenCalled();
    intersect(true);
    expect(logEvent).toHaveBeenCalledTimes(1);
  });

  it("deduplicates remount and allows a later same-tab journey", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_000);
    mountOffer();
    expect(logEvent).not.toHaveBeenCalled();
    intersect(true);
    cleanup();
    mountOffer();
    intersect(true);
    expect(logEvent).toHaveBeenCalledTimes(1);
    cleanup();
    vi.mocked(Date.now).mockReturnValue(1_000 + 31 * 60_000);
    mountOffer();
    intersect(true);
    expect(logEvent).toHaveBeenCalledTimes(2);
  });
});
