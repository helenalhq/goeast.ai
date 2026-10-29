import { describe, expect, it } from "vitest";
import { getAllHexagrams, getHexagramByNumber } from "../iching-data";
import { buildIchingContext } from "../iching-context";

const HEXAGRAMS = getAllHexagrams();

// Helper: build casts for a specific hexagram with specific changing lines
function makeCasts(binary: string, changingLines: number[]) {
  return binary.split("").map((b, i) => ({
    binary: b,
    changing: changingLines.includes(i + 1),
  }));
}

describe("hexagram transformation (变卦) computation", () => {
  it("static cast (no changing lines) has no transformedNumber", () => {
    const qian = getHexagramByNumber(1)!; // all yang
    const casts = makeCasts(qian.binary, []);
    const ctx = buildIchingContext(casts, HEXAGRAMS);
    expect(ctx?.hexagramNumber).toBe(1);
    expect(ctx?.changingLines).toEqual([]);
    expect(ctx?.transformedNumber).toBeUndefined();
  });

  it("Qian (1) with line 1 changing transforms to Gou (44)", () => {
    const qian = getHexagramByNumber(1)!;
    const casts = makeCasts(qian.binary, [1]);
    const ctx = buildIchingContext(casts, HEXAGRAMS);
    expect(ctx?.hexagramNumber).toBe(1);
    expect(ctx?.changingLines).toEqual([1]);
    expect(ctx?.transformedNumber).toBeDefined();
    const transformed = getHexagramByNumber(ctx!.transformedNumber!);
    expect(transformed?.slug).toBe("gou"); // 天风姤
  });

  it("Qian (1) with all 6 lines changing transforms to Kun (2)", () => {
    const qian = getHexagramByNumber(1)!;
    const casts = makeCasts(qian.binary, [1, 2, 3, 4, 5, 6]);
    const ctx = buildIchingContext(casts, HEXAGRAMS);
    expect(ctx?.hexagramNumber).toBe(1);
    expect(ctx?.transformedNumber).toBe(2); // all yang → all yin
  });

  it("Kun (2) with line 5 changing transforms correctly", () => {
    const kun = getHexagramByNumber(2)!;
    const casts = makeCasts(kun.binary, [5]);
    const ctx = buildIchingContext(casts, HEXAGRAMS);
    expect(ctx?.hexagramNumber).toBe(2);
    expect(ctx?.changingLines).toEqual([5]);
    expect(ctx?.transformedNumber).toBeDefined();
    // Verify: flip line 5 of Kun's binary, look up the result
    const expectedBinary = kun.binary
      .split("")
      .map((b, i) => (i === 4 ? (b === "1" ? "0" : "1") : b))
      .join("");
    const expected = HEXAGRAMS.find((h) => h.binary === expectedBinary);
    expect(ctx?.transformedNumber).toBe(expected?.number);
  });

  it("every hexagram with every single changing line produces a valid transformed hexagram", () => {
    const failures: string[] = [];
    for (const hex of HEXAGRAMS) {
      for (let line = 1; line <= 6; line++) {
        const casts = makeCasts(hex.binary, [line]);
        const ctx = buildIchingContext(casts, HEXAGRAMS);
        if (!ctx?.transformedNumber) {
          failures.push(`${hex.name} (${hex.number}) line ${line}`);
        } else {
          const transformed = getHexagramByNumber(ctx.transformedNumber);
          if (!transformed) {
            failures.push(`${hex.name} line ${line} → invalid number ${ctx.transformedNumber}`);
          }
        }
      }
    }
    // All 64 hexagrams × 6 lines = 384 combinations should all produce valid results
    expect(failures).toEqual([]);
  });

  it("multiple changing lines are listed in order", () => {
    const qian = getHexagramByNumber(1)!;
    const casts = makeCasts(qian.binary, [3, 5]);
    const ctx = buildIchingContext(casts, HEXAGRAMS);
    expect(ctx?.changingLines).toEqual([3, 5]);
    expect(ctx?.transformedNumber).toBeDefined();
  });

  it("cast with unknown binary returns null", () => {
    const casts = makeCasts("XXXXXX", [1]); // invalid binary
    const ctx = buildIchingContext(casts, HEXAGRAMS);
    expect(ctx).toBeNull();
  });
});
