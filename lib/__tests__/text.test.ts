import { describe, expect, it } from "vitest";
import { clipText } from "../text";

describe("clipText", () => {
  it("returns short text unchanged", () => {
    expect(clipText("short text", 20)).toBe("short text");
  });

  it("prefers the last full sentence that fits", () => {
    expect(clipText("First sentence. Second sentence. Third.", 22)).toBe("First sentence.");
  });

  it("falls back to a word boundary with ellipsis when no sentence fits", () => {
    expect(clipText("One two three four five six seven", 13)).toBe("One two three…");
  });

  it("never cuts mid-word", () => {
    const out = clipText("internationalization is a long word here", 15);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toMatch(/internationa[^…]/);
  });

  it("keeps Chinese text intact when short", () => {
    expect(clipText("紫微斗数合盘分析", 20)).toBe("紫微斗数合盘分析");
  });

  it("ends on a whole word when the window boundary lands after one", () => {
    expect(clipText("one two three four", 13)).toBe("one two three…");
  });

  it("degrades to a bare ellipsis when a single word exceeds the budget", () => {
    expect(clipText("internationalization", 5)).toBe("…");
  });
});
