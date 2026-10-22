import { describe, expect, it } from "vitest";
import { getAllHexagrams } from "../iching-data";
import {
  buildIchingContext,
  buildStudyContext,
  validateIchingContext,
  buildIchingContextBlock,
  sealIchingContext,
  unsealIchingContext,
  type IchingConsultationContext,
} from "../iching-context";

const HEXAGRAMS = getAllHexagrams();
const yang = { values: [3, 3, 3] as [number, number, number], line: 7, binary: "1", changing: false };
const oldYang = { values: [3, 3, 3] as [number, number, number], line: 9, binary: "1", changing: true };
const oldYin = { values: [2, 2, 2] as [number, number, number], line: 6, binary: "0", changing: true };

describe("buildIchingContext", () => {
  it("static cast: hexagram 1, no changing lines, no transformed", () => {
    const ctx = buildIchingContext([yang, yang, yang, yang, yang, yang], HEXAGRAMS);
    expect(ctx).toEqual({ mode: "cast", hexagramNumber: 1, changingLines: [] });
  });

  it("changing line flips to the transformed hexagram", () => {
    const ctx = buildIchingContext([oldYang, yang, yang, yang, yang, yang], HEXAGRAMS);
    expect(ctx?.hexagramNumber).toBe(1);
    expect(ctx?.changingLines).toEqual([1]);
    const transformed = HEXAGRAMS.find((h) => h.number === ctx?.transformedNumber);
    // bottom line changing on all-yang: data decides the target — assert consistency, not a hard-coded slug
    expect(transformed).toBeDefined();
    expect(transformed?.number).not.toBe(1);
  });

  it("multiple changing lines are ordered bottom-up", () => {
    const ctx = buildIchingContext([yang, oldYang, yang, oldYin, yang, yang], HEXAGRAMS);
    expect(ctx?.changingLines).toEqual([2, 4]);
  });

  it("returns null for incomplete or unknown casts", () => {
    expect(buildIchingContext([yang], HEXAGRAMS)).toBeNull();
    expect(buildIchingContext([], HEXAGRAMS)).toBeNull();
  });
});

describe("buildStudyContext", () => {
  it("study mode has no changing lines", () => {
    expect(buildStudyContext(6)).toEqual({ mode: "study", hexagramNumber: 6, changingLines: [] });
  });
});

describe("validateIchingContext (server-side, untrusted input)", () => {
  it("accepts a well-formed cast context and normalizes line order", () => {
    expect(validateIchingContext({ mode: "cast", hexagramNumber: 1, changingLines: [3, 1], transformedNumber: 44 }))
      .toEqual({ mode: "cast", hexagramNumber: 1, changingLines: [1, 3], transformedNumber: 44 });
  });

  it("accepts study context only without changing lines", () => {
    expect(validateIchingContext({ mode: "study", hexagramNumber: 6, changingLines: [] })).toEqual({
      mode: "study", hexagramNumber: 6, changingLines: [],
    });
    expect(validateIchingContext({ mode: "study", hexagramNumber: 6, changingLines: [2] })).toBeNull();
  });

  it("rejects out-of-range numbers, dup lines, bad mode, non-objects", () => {
    expect(validateIchingContext({ mode: "cast", hexagramNumber: 0, changingLines: [] })).toBeNull();
    expect(validateIchingContext({ mode: "cast", hexagramNumber: 65, changingLines: [] })).toBeNull();
    expect(validateIchingContext({ mode: "cast", hexagramNumber: 1.5, changingLines: [] })).toBeNull();
    expect(validateIchingContext({ mode: "cast", hexagramNumber: 1, changingLines: [0] })).toBeNull();
    expect(validateIchingContext({ mode: "cast", hexagramNumber: 1, changingLines: [2, 2] })).toBeNull();
    expect(validateIchingContext({ mode: "evil", hexagramNumber: 1, changingLines: [] })).toBeNull();
    expect(validateIchingContext(null)).toBeNull();
    expect(validateIchingContext("x")).toBeNull();
  });

  it("drops injected extra fields (names never trusted from client)", () => {
    expect(
      validateIchingContext({ mode: "cast", hexagramNumber: 1, changingLines: [], hexagramName: "INJECTED" })
    ).toEqual({ mode: "cast", hexagramNumber: 1, changingLines: [] });
  });

  it("rejects invalid transformedNumber when present", () => {
    expect(validateIchingContext({ mode: "cast", hexagramNumber: 1, changingLines: [1], transformedNumber: 99 })).toBeNull();
  });
});

describe("sealIchingContext / unsealIchingContext (storage envelope)", () => {
  it("sealIchingContext wraps with savedAt ≈ now", () => {
    const before = Date.now();
    const envelope = sealIchingContext({ mode: "cast", hexagramNumber: 1, changingLines: [] });
    const after = Date.now();
    expect(envelope.ctx).toEqual({ mode: "cast", hexagramNumber: 1, changingLines: [] });
    expect(envelope.savedAt).toBeGreaterThanOrEqual(before);
    expect(envelope.savedAt).toBeLessThanOrEqual(after);
  });

  it("unsealIchingContext accepts a fresh envelope and returns the validated ctx", () => {
    const ctx: IchingConsultationContext = { mode: "study", hexagramNumber: 6, changingLines: [] };
    expect(unsealIchingContext(sealIchingContext(ctx))).toEqual(ctx);
  });

  it("rejects a missing or non-number savedAt", () => {
    const ctx = { mode: "study", hexagramNumber: 6, changingLines: [] };
    expect(unsealIchingContext({ ctx })).toBeNull();
    expect(unsealIchingContext({ ctx, savedAt: "123" })).toBeNull();
  });

  it("rejects an envelope older than 24h", () => {
    const ctx = { mode: "study", hexagramNumber: 6, changingLines: [] };
    expect(unsealIchingContext({ ctx, savedAt: Date.now() - 25 * 3600 * 1000 })).toBeNull();
  });

  it("rejects a non-envelope payload (legacy plain ctx) and invalid ctx inside envelope", () => {
    expect(unsealIchingContext({ mode: "study", hexagramNumber: 6, changingLines: [] })).toBeNull();
    expect(unsealIchingContext({ ctx: { mode: "evil", hexagramNumber: 1, changingLines: [] }, savedAt: Date.now() })).toBeNull();
  });
});

describe("buildIchingContextBlock (prompt text, names resolved server-side)", () => {
  it("cast block names hexagram, changing lines, transformed hexagram, and the three-part structure", () => {
    const ctx = buildIchingContext([oldYang, yang, yang, yang, yang, yang], HEXAGRAMS)!;
    const block = buildIchingContextBlock(ctx);
    expect(block).toContain("Hexagram 1");
    expect(block).toContain("Changing lines");
    expect(block).toContain(`Hexagram ${ctx.transformedNumber}`);
    expect(block).toContain("TRADITIONAL TEACHING");
    expect(block).toContain("never recast");
  });

  it("static cast states no changing lines and omits transformed section", () => {
    const block = buildIchingContextBlock({ mode: "cast", hexagramNumber: 2, changingLines: [] });
    expect(block).toContain("static");
    expect(block).not.toContain("Transformed hexagram");
  });

  it("study block forbids inventing changing lines", () => {
    const block = buildIchingContextBlock({ mode: "study", hexagramNumber: 6, changingLines: [] });
    expect(block).toContain("STUDY");
    expect(block).toContain("did NOT cast");
    expect(block).toContain("Do not invent changing lines");
  });

  it("renders a non-empty block for every hexagram 1-64", () => {
    for (const h of HEXAGRAMS) {
      expect(buildIchingContextBlock({ mode: "cast", hexagramNumber: h.number, changingLines: [] })).not.toBe("");
    }
  });
});
