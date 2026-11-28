import { describe, expect, it } from "vitest";
import { advance, getPlan, sample } from "../arrival-preview";

describe("Shanghai arrival rehearsal", () => {
  it("needs matching payment, and repeated notices do not duplicate work", () => {
    const order = advance(sample("t2"), "apply");
    expect(advance(order, "prepare")).toBe(order);
    expect(advance(order, "wrongPayment")).toBe(order);
    const paid = advance(order, "paid");
    expect(advance(paid, "paid")).toBe(paid);
    const draft = advance(paid, "prepare");
    expect(draft.phase).toBe("review");
    expect(advance(draft, "delivered")).toBe(draft);
    const delivered = advance(advance(draft, "approve"), "delivered");
    expect(delivered.phase).toBe("delivered");
    expect(advance(delivered, "delivered")).toBe(delivered);
  });
  it("uses distinct terminal evidence and does not copy the night note into a day plan", () => {
    expect(getPlan(sample("t2"))?.route).toContain("Gate 25");
    expect(getPlan(sample("t1"))?.route).toContain("Gate 12");
    expect(getPlan(sample("t1"))?.route).not.toContain("Gate 25");
    expect(getPlan(sample("day"))?.rail).toBeNull();
  });
  it("holds when no terminal or hotel is confirmed", () => {
    for (const scenario of ["unknown", "ambiguous"] as const) {
      const paid = advance(advance(sample(scenario), "apply"), "paid");
      const held = advance(paid, "prepare");
      expect(held.phase).toBe("hold");
      expect(getPlan(held)).toBeNull();
      expect(advance(held, "approve")).toBe(held);
    }
  });
  it("invalidates approval after a change and blocks canceled orders", () => {
    let order = sample("t2");
    for (const event of ["apply", "paid", "prepare", "approve"] as const) order = advance(order, event);
    const updated = advance(order, "changed");
    expect(updated.revision).toBe(2);
    expect(updated.phase).toBe("paid");
    expect(advance(updated, "delivered")).toBe(updated);
    const canceled = advance(order, "canceled");
    expect(advance(canceled, "delivered")).toBe(canceled);
  });
});
