import { describe, expect, it } from "vitest";
import {
  FOLLOWUP_TURN_LIMIT,
  FOLLOWUP_CONTEXT_TURNS,
  FOLLOWUP_QUESTION_MAX_CHARS,
  FOLLOWUP_MAX_WORDS,
  validateFollowupQuestion,
  buildFollowupGrounding,
  buildFollowupCastBlock,
} from "../consult-followup";

const CAST = { mode: "cast" as const, hexagramNumber: 1, changingLines: [1], transformedNumber: 44 };

describe("constants", () => {
  it("matches the approved design", () => {
    expect(FOLLOWUP_TURN_LIMIT).toBe(20);
    expect(FOLLOWUP_CONTEXT_TURNS).toBe(8);
    expect(FOLLOWUP_QUESTION_MAX_CHARS).toBe(500);
    expect(FOLLOWUP_MAX_WORDS).toBe(400);
  });
});

describe("validateFollowupQuestion", () => {
  it("trims and accepts normal questions", () => {
    expect(validateFollowupQuestion("  why? ")).toBe("why?");
  });
  it("rejects non-strings, empty, and >500 chars", () => {
    expect(validateFollowupQuestion(42)).toBeNull();
    expect(validateFollowupQuestion("   ")).toBeNull();
    expect(validateFollowupQuestion("x".repeat(501))).toBeNull();
    expect(validateFollowupQuestion("x".repeat(500))).toBe("x".repeat(500));
  });
});

describe("buildFollowupCastBlock", () => {
  it("renders server-resolved names, changing line, and the anti-recast override", () => {
    const block = buildFollowupCastBlock(CAST);
    expect(block).toContain("Hexagram 1");
    expect(block).toContain("Qian");
    expect(block).toContain("Hexagram 44");
    expect(block).toContain("never cast");
  });
  it("accepts a static cast without a transformed hexagram", () => {
    const block = buildFollowupCastBlock({ mode: "cast", hexagramNumber: 2, changingLines: [] });
    expect(block).toContain("static");
  });
});

describe("buildFollowupGrounding", () => {
  const turns = Array.from({ length: 10 }, (_, i) => ({
    question: `Q${i}`,
    answer: `A${i}`,
  }));

  it("embeds original question, reading, cast block, and the guardrails", () => {
    const g = buildFollowupGrounding({
      originalQuestion: "about my career",
      cast: CAST,
      originalReading: "TRADITIONAL TEACHING … the full original text",
      turns,
    });
    expect(g).toContain("about my career");
    expect(g).toContain("the full original text");
    expect(g).toContain("never cast");
    expect(g).toContain("interpretation");
    expect(g).toContain("no deterministic predictions");
    expect(g).toContain("no medical, legal, or financial advice");
    expect(g).toContain(`${FOLLOWUP_MAX_WORDS} words`);
  });

  it("keeps only the most recent FOLLOWUP_CONTEXT_TURNS turns", () => {
    const g = buildFollowupGrounding({
      originalQuestion: "q",
      cast: CAST,
      originalReading: "r",
      turns,
    });
    expect(g).toContain("Q9");
    expect(g).not.toContain("Q0");
    expect(g).not.toContain("Q1");
  });

  it("omits the turns block entirely when there are no prior turns", () => {
    const g = buildFollowupGrounding({ originalQuestion: "q", cast: CAST, originalReading: "r", turns: [] });
    expect(g).not.toContain("earlier turns");
  });
});
