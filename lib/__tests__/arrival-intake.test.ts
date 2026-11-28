import { describe, expect, it } from "vitest";
import { lookupFlight, lookupHotels, examples, readyForReview, makeDemoQuote, DEMO_EMAIL } from "../arrival-intake";

describe("synthetic arrival intake", () => {
  it("distinguishes airport-window and dated airline results, using Shanghai arrival dates", () => {
    expect(lookupFlight(examples.late)).toMatchObject({ kind: "matched", flight: { terminal: "T2", source: "airport", time: "23:35" } });
    expect(lookupFlight(examples.day)).toMatchObject({ kind: "matched", flight: { terminal: "T1", source: "airport", time: "13:10" } });
    expect(lookupFlight(examples.codeshare)).toMatchObject({ kind: "needs-carrier", outsideWindow: true });
    expect(lookupFlight({...examples.codeshare, carrier: "  Demo Pacific  "})).toMatchObject({ kind: "matched", flight: { terminal: "T2", source: "schedule", time: "00:35" } });
    expect(lookupFlight({...examples.codeshare, date: "2026-12-04", carrier: "Demo Pacific"})).toEqual({ kind: "outside-window" });
  });
  it("never guesses the airport or terminal from generic or missing evidence", () => {
    expect(lookupFlight(examples.otherAirport)).toEqual({ kind: "outside-scope" });
    expect(lookupFlight(examples.uncertain)).toEqual({ kind: "unverified-terminal", outsideWindow: true });
    expect(lookupFlight({...examples.day, number: "AA99"})).toEqual({kind: "not-found"});
    expect(lookupFlight(examples.unavailable)).toEqual({kind: "source-unavailable"});
  });
  it("normalizes user text but requires an exact selected property when names are shared", () => {
    expect(lookupFlight({...examples.late, number:" dx   246 "}).kind).toBe("matched");
    const matches = lookupHotels("  bund   garden  ");
    expect(matches).toHaveLength(2);
    expect(readyForReview(lookupFlight(examples.late), matches, "")).toBe(false);
    expect(readyForReview(lookupFlight(examples.late), matches, matches[0].id)).toBe(true);
    expect(readyForReview(lookupFlight(examples.otherAirport), matches, matches[0].id)).toBe(false);
    expect(lookupHotels("")).toHaveLength(0);
  });
  it("sets a synthetic disclaimer-ready quote only for eligible and timely trips", () => {
    const late = lookupFlight(examples.late);
    expect(late.kind).toBe("matched");
    if(late.kind !== "matched") return;
    expect(makeDemoQuote(late.flight, "")).toBeNull();
    expect(makeDemoQuote(late.flight,"x@example.test")).toBeNull();
    expect(makeDemoQuote(late.flight, DEMO_EMAIL)).toMatchObject({ price: "US$12.90" });
    expect(makeDemoQuote({...late.flight, departure:"2026-11-28T12:45:00+08:00"},DEMO_EMAIL)).toBeNull();
    expect(makeDemoQuote(late.flight, DEMO_EMAIL, 2)).toBeNull();
  });
});
