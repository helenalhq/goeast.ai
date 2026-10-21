import { describe, expect, it } from "vitest";
import { getSystemPrompt, ZIWEI_DEEP_ADDENDUM } from "../ziwei-prompts";

describe("getSystemPrompt deep mode", () => {
  it("base prompt unchanged; deep appends the addendum for every language", () => {
    for (const lang of ["en", "zh", "both"] as const) {
      const base = getSystemPrompt(lang);
      const deep = getSystemPrompt(lang, { deep: true });
      expect(deep.startsWith(base)).toBe(true);
      expect(deep).toContain("DEEP READING");
    }
    expect(getSystemPrompt("en")).not.toContain("DEEP READING");
    expect(getSystemPrompt("zh")).not.toContain("DEEP READING");
    expect(typeof ZIWEI_DEEP_ADDENDUM).toBe("string");
  });

  it("keeps the entertainment/reflection disclaimer in deep mode", () => {
    expect(getSystemPrompt("en", { deep: true })).toContain("entertainment");
  });
});
