import { describe, expect, it } from "vitest";
import { getOraclePrompt, ORACLE_DEEP_ADDENDUM } from "../oracle-prompts";

const ALL_SLUGS = [
  "prologue-zhougong", "ch01-laozi", "ch02-confucius", "ch03-sunzi", "ch04-zhuangzi",
  "ch05-mencius", "ch06-mozi", "ch07-zhuxi", "ch08-zhangzai", "ch09-huineng", "ch10-wangyangming",
];

describe("getOraclePrompt deep mode (Pro)", () => {
  it("free/base config is unchanged — no addendum, original maxWords", () => {
    const before = getOraclePrompt("prologue-zhougong");
    expect(before?.maxWords).toBe(800);
    expect(getOraclePrompt("prologue-zhougong")?.system).not.toContain("DEEP READING MODE");
    for (const slug of ALL_SLUGS) {
      expect(getOraclePrompt(slug)?.system).not.toContain("DEEP READING MODE");
    }
  });

  it("deep mode appends exactly the exported addendum and doubles maxWords", () => {
    const base = getOraclePrompt("ch01-laozi");
    const deep = getOraclePrompt("ch01-laozi", { deep: true });
    expect(deep?.system).toBe(base?.system + ORACLE_DEEP_ADDENDUM);
    expect(deep?.maxWords).toBe((base?.maxWords ?? 0) * 2);
  });

  it("deep mode works for all 11 philosophers; unknown slug still null; no-opts call unchanged", () => {
    for (const slug of ALL_SLUGS) {
      const base = getOraclePrompt(slug);
      const deep = getOraclePrompt(slug, { deep: true });
      expect(deep).not.toBeNull();
      expect(deep?.maxWords).toBe(base!.maxWords * 2);
    }
    expect(getOraclePrompt("nope", { deep: true })).toBeNull();
    expect(getOraclePrompt("ch02-confucius")).toEqual(getOraclePrompt("ch02-confucius", undefined));
  });
});
