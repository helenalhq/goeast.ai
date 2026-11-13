import { describe, expect, it } from "vitest";
import { getAllHexagrams, getHexagramByNumber } from "../iching-data";
import { buildIchingContext, buildIchingContextBlock, classicalTextBlock } from "../iching-context";
import { buildFollowupGrounding } from "../consult-followup";
import { parseConsultResponse } from "../consult-session";

/**
 * INDEPENDENT collated fixture — transcribed from:
 *   Wikipedia, "List of hexagrams of the I Ching" (King Wen order),
 *   https://en.wikipedia.org/wiki/List_of_hexagrams_of_the_I_Ching
 *   (CC BY-SA 4.0), fetched 2026-11-13. The page gives, per hexagram, the
 *   inner (lower) and outer (upper) trigram. Binaries below are DERIVED from
 *   those trigrams (never copied from the file under test).
 *
 * Convention kept from the codebase (and asserted below): binary[0] is the
 * INITIAL (bottom) line; lines read bottom-up. Trigram bits (bottom-up):
 * Qian 111, Dui 110, Li 101, Zhen 100, Xun 011, Kan 010, Gen 001, Kun 000.
 *
 * Cross-checks used during collation: the trigram composition also matches
 * the traditional Chinese names (e.g. 恆 = 雷風恆 = Zhen above Xun below).
 */
const CANON_TRIGRAMS: ReadonlyArray<readonly [number, string, string, string]> = [
  // [number, nameZh, lower, upper]
  [1, "乾", "Qian", "Qian"], [2, "坤", "Kun", "Kun"], [3, "屯", "Zhen", "Kan"],
  [4, "蒙", "Kan", "Gen"], [5, "需", "Qian", "Kan"], [6, "讼", "Kan", "Qian"],
  [7, "师", "Kan", "Kun"], [8, "比", "Kun", "Kan"], [9, "小畜", "Qian", "Xun"],
  [10, "履", "Dui", "Qian"], [11, "泰", "Qian", "Kun"], [12, "否", "Kun", "Qian"],
  [13, "同人", "Li", "Qian"], [14, "大有", "Qian", "Li"], [15, "谦", "Gen", "Kun"],
  [16, "豫", "Kun", "Zhen"], [17, "随", "Zhen", "Dui"], [18, "蛊", "Xun", "Gen"],
  [19, "临", "Dui", "Kun"], [20, "观", "Kun", "Xun"], [21, "噬嗑", "Zhen", "Li"],
  [22, "贲", "Li", "Gen"], [23, "剥", "Kun", "Gen"], [24, "复", "Zhen", "Kun"],
  [25, "无妄", "Zhen", "Qian"], [26, "大畜", "Qian", "Gen"], [27, "颐", "Zhen", "Gen"],
  [28, "大过", "Xun", "Dui"], [29, "坎", "Kan", "Kan"], [30, "离", "Li", "Li"],
  [31, "咸", "Gen", "Dui"], [32, "恒", "Xun", "Zhen"], [33, "遁", "Gen", "Qian"],
  [34, "大壮", "Qian", "Zhen"], [35, "晋", "Kun", "Li"], [36, "明夷", "Li", "Kun"],
  [37, "家人", "Li", "Xun"], [38, "睽", "Dui", "Li"], [39, "蹇", "Gen", "Kan"],
  [40, "解", "Kan", "Zhen"], [41, "损", "Dui", "Gen"], [42, "益", "Zhen", "Xun"],
  [43, "夬", "Qian", "Dui"], [44, "姤", "Xun", "Qian"], [45, "萃", "Kun", "Dui"],
  [46, "升", "Xun", "Kun"], [47, "困", "Kan", "Dui"], [48, "井", "Xun", "Kan"],
  [49, "革", "Li", "Dui"], [50, "鼎", "Xun", "Li"], [51, "震", "Zhen", "Zhen"],
  [52, "艮", "Gen", "Gen"], [53, "渐", "Gen", "Xun"], [54, "归妹", "Dui", "Zhen"],
  [55, "丰", "Li", "Zhen"], [56, "旅", "Gen", "Li"], [57, "巽", "Xun", "Xun"],
  [58, "兑", "Dui", "Dui"], [59, "涣", "Kan", "Xun"], [60, "节", "Dui", "Kan"],
  [61, "中孚", "Dui", "Xun"], [62, "小过", "Gen", "Zhen"], [63, "既济", "Li", "Kan"],
  [64, "未济", "Kan", "Li"],
];

const BITS: Record<string, string> = {
  Qian: "111", Dui: "110", Li: "101", Zhen: "100",
  Xun: "011", Kan: "010", Gen: "001", Kun: "000",
};

const canonBinary = (lower: string, upper: string) => BITS[lower] + BITS[upper];

const all = getAllHexagrams();

describe("collated 64-hexagram table (independent fixture)", () => {

  it("has exactly 64 entries numbered 1..64 in King Wen order", () => {
    expect(all).toHaveLength(64);
    expect(all.map((h) => h.number)).toEqual(CANON_TRIGRAMS.map((c) => c[0]));
  });

  it.each(CANON_TRIGRAMS)("hexagram %i (%s): name, trigram labels, and binary match the collated table", (num, nameZh, lower, upper) => {
    const h = getHexagramByNumber(num);
    expect(h, `hexagram ${num} resolvable`).toBeTruthy();
    expect(h!.name_zh).toBe(nameZh);
    expect(h!.lower_trigram).toBe(lower);
    expect(h!.upper_trigram).toBe(upper);
    expect(h!.binary).toBe(canonBinary(lower, upper));
  });

  it("all 64 binaries are unique (cast lookup is unambiguous)", () => {
    expect(new Set(all.map((h) => h.binary)).size).toBe(64);
  });

  it("internal consistency: labels agree with the binary they label (binary[0] = bottom line)", () => {
    const byBits = Object.fromEntries(Object.entries(BITS).map(([k, v]) => [v, k]));
    for (const h of all) {
      expect(byBits[h.binary.slice(0, 3)], `${h.number} lower`).toBe(h.lower_trigram);
      expect(byBits[h.binary.slice(3, 6)], `${h.number} upper`).toBe(h.upper_trigram);
    }
  });

  it("the previously-swapped pairs are now correct (5/6, 11/12, 21/22, 35/36)", () => {
    expect(getHexagramByNumber(5)!.binary).toBe("111010"); // 需 水天需
    expect(getHexagramByNumber(6)!.binary).toBe("010111"); // 讼 天水讼
    expect(getHexagramByNumber(11)!.binary).toBe("111000"); // 泰 地天泰
    expect(getHexagramByNumber(12)!.binary).toBe("000111"); // 否 天地否
    expect(getHexagramByNumber(21)!.binary).toBe("100101"); // 噬嗑 火雷噬嗑
    expect(getHexagramByNumber(22)!.binary).toBe("101001"); // 贲 山火贲
    expect(getHexagramByNumber(35)!.binary).toBe("000101"); // 晋 火地晋
    expect(getHexagramByNumber(36)!.binary).toBe("101000"); // 明夷 地火明夷
  });
});

describe("changing-line → transformed hexagram regressions (buildIchingContext)", () => {
  const cast = (bits: string, changing: number[]) =>
    bits.split("").map((b, i) => ({ binary: b, changing: changing.includes(i + 1) }));

  it("恒 (32) with changing line 3 → 解 (40) — the public example cast", () => {
    const ctx = buildIchingContext(cast("011100", [3]), all);
    expect(ctx).toMatchObject({ hexagramNumber: 32, changingLines: [3], transformedNumber: 40 });
  });

  it("static cast (乾 1, no changing lines) → no transformed hexagram", () => {
    const ctx = buildIchingContext(cast("111111", []), all);
    expect(ctx).toMatchObject({ hexagramNumber: 1, changingLines: [] });
    expect(ctx!.transformedNumber).toBeUndefined();
  });

  it("multiple changing lines: 剥 (23) lines 1–5 changing → 乾 (1)", () => {
    const ctx = buildIchingContext(cast("000001", [1, 2, 3, 4, 5]), all);
    expect(ctx).toMatchObject({ hexagramNumber: 23, changingLines: [1, 2, 3, 4, 5], transformedNumber: 1 });
  });

  it("泰 (11) all six lines changing → 否 (12) — exercises the corrected binaries", () => {
    const ctx = buildIchingContext(cast("111000", [1, 2, 3, 4, 5, 6]), all);
    expect(ctx).toMatchObject({ hexagramNumber: 11, transformedNumber: 12 });
  });
});

describe("classical-text citation policy", () => {
  const heng = getHexagramByNumber(32)!;

  it("classicalTextBlock: Chinese core text included verbatim, sourced to 《周易》", () => {
    const block = classicalTextBlock(heng);
    expect(block).toContain(heng.judgment_zh);
    expect(block).toContain(heng.image_zh);
    expect(block).toContain("《周易》");
  });

  it("unverified English NEVER enters the model context — no en fields, no provenance claims", () => {
    const block = classicalTextBlock(heng as never);
    expect(block).not.toContain(heng.judgment_en ?? "");
    expect(block).not.toContain(heng.image_en ?? "");
    expect(block).not.toMatch(/paraphrase by GoEast|written by GoEast|house[- ]authored/i);
    expect(block).not.toMatch(/Wilhelm|Baynes|Legge/i);
  });

  it("model is instructed to EXPLAIN, never to reproduce quotations", () => {
    const block = classicalTextBlock(heng);
    expect(block).toContain("Do NOT reproduce the classical text as a quotation");
    expect(block).toContain("CONTEXT for interpretation only");
  });

  it("missing text → explicit unavailability instruction, never reconstructed", () => {
    const block = classicalTextBlock({ judgment_zh: "", image_zh: "" });
    expect(block).toContain("No verified classical text is available");
    expect(block).toContain("never reconstruct");
  });

  it("oracle context block carries the actual classical text and the explain-don't-quote rule", () => {
    const block = buildIchingContextBlock({ mode: "cast", hexagramNumber: 32, changingLines: [3], transformedNumber: 40 });
    expect(block).toContain(heng.judgment_zh);
    expect(block).toContain("explain the classical teaching above in your own words");
    expect(block).not.toContain(heng.judgment_en ?? "");
  });

  it("follow-up grounding carries the same classical text and attribution rules", () => {
    const g = buildFollowupGrounding({
      originalQuestion: "q",
      cast: { mode: "cast", hexagramNumber: 32, changingLines: [3], transformedNumber: 40 },
      originalReading: "r",
      turns: [],
    });
    expect(g).toContain(heng.judgment_zh);
    expect(g).toContain("never attribute it to any translator");
    expect(g).not.toContain(heng.judgment_en ?? "");
  });

  it("every hexagram has classical text in the database (no silent gaps)", () => {
    for (const h of getAllHexagrams()) {
      expect(h.judgment_zh?.trim().length, `${h.number} ${h.name_zh} judgment_zh`).toBeGreaterThan(0);
      expect(h.image_zh?.trim().length, `${h.number} ${h.name_zh} image_zh`).toBeGreaterThan(0);
    }
  });
});

describe("2026-11-14 zh collation (independent source: Wikisource 周易)", () => {
  it("临 (19) image is the corrected 泽上有地 form (owner-reported, source-verified)", () => {
    expect(getHexagramByNumber(19)!.image_zh).toBe("泽上有地，临；君子以教思无穷，容保民无疆。");
  });

  it("萃 (45) judgment no longer carries the spurious early 亨", () => {
    expect(getHexagramByNumber(45)!.judgment_zh).toBe("萃：王假有庙，利见大人，亨，利贞。用大牲吉，利有攸往。");
  });

  it("履 (10) image uses 辨 (source reading; 辩 recorded as variant)", () => {
    expect(getHexagramByNumber(10)!.image_zh).toBe("上天下泽，履；君子以辨上下，定民志。");
  });

  it("adjudicated variants stay on the received reading: 革 (49) 己日; 既济 (63) 预防", () => {
    expect(getHexagramByNumber(49)!.judgment_zh).toContain("己日乃孚");
    expect(getHexagramByNumber(63)!.image_zh).toContain("预防之");
  });

  it("spot-verified clean items from the source (post-fix state)", () => {
    expect(getHexagramByNumber(1)!.judgment_zh).toBe("乾：元亨利贞。");
    expect(getHexagramByNumber(2)!.image_zh).toBe("地势坤，君子以厚德载物。");
    expect(getHexagramByNumber(32)!.judgment_zh).toBe("恒：亨，无咎，利贞。利有攸往。");
    expect(getHexagramByNumber(32)!.image_zh).toBe("雷风，恒；君子以立不易方。");
    expect(getHexagramByNumber(40)!.judgment_zh).toContain("解：利西南，无所往");
  });

  it("fake model quotations can never render as classical text (classical sections read only from DB fields)", () => {
    // The display contract: ResultView/detail pages render classical text from
    // hexagram.judgment_zh/image_zh only; parseConsultResponse classifies ALL model
    // output (including lookalike quotes) into AI sections.
    const fake = parseConsultResponse("## TRADITIONAL TEACHING\n象曰：泽上有地，fake line the model invented。");
    // Whatever the model wrote stays in the AI-interpreted section...
    expect(fake.traditional).toContain("fake line the model invented");
    // ...and the classical fields the pages render are untouched DB strings:
    expect(getHexagramByNumber(19)!.image_zh).not.toContain("fake");
  });
});
