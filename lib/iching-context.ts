import { getAllHexagrams, getHexagramByNumber } from "./iching-data";

/**
 * I Ching consultation context passed from the casting tool to the Zhou Gong
 * Oracle. NUMBERS ONLY — hexagram names are resolved server-side from
 * lib/iching-data so untrusted clients cannot inject prompt text.
 */
export type IchingConsultationContext = {
  mode: "cast" | "study";
  hexagramNumber: number; // 本卦 1-64
  changingLines: number[]; // 变爻 line positions 1-6 (bottom-up), [] when static/study
  transformedNumber?: number; // 之卦 1-64, present only when lines change
};

export const ICHING_CONTEXT_DRAFT_KEY = "iching-context";

/** Stored contexts older than this are treated as absent (expired). */
export const ICHING_CONTEXT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Wrap a context for storage with a birth timestamp (expiry on restore). */
export function sealIchingContext(ctx: IchingConsultationContext): { ctx: IchingConsultationContext; savedAt: number } {
  return { ctx, savedAt: Date.now() };
}

/** Unseal a stored envelope. Returns null when missing, malformed, or older
 *  than ICHING_CONTEXT_MAX_AGE_MS. Does NOT touch storage — caller clears. */
export function unsealIchingContext(raw: unknown): IchingConsultationContext | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { ctx, savedAt } = raw as Record<string, unknown>;
  // NaN and future timestamps (clock skew / tampering) both fail this range check.
  const age = typeof savedAt === "number" ? Date.now() - savedAt : Number.NaN;
  if (!Number.isFinite(age) || age < 0 || age > ICHING_CONTEXT_MAX_AGE_MS) return null;
  return validateIchingContext(ctx);
}

/** Build context from a completed 6-line coin cast. Returns null unless complete. */
export function buildIchingContext(
  casts: { binary: string; changing: boolean }[],
  hexagrams: ReturnType<typeof getAllHexagrams>,
  mode: "cast" = "cast"
): IchingConsultationContext | null {
  if (!Array.isArray(casts) || casts.length !== 6) return null;
  const binary = casts.map((c) => c.binary).join("");
  const hexagram = hexagrams.find((h) => h.binary === binary);
  if (!hexagram) return null;

  const changingLines = casts.flatMap((c, i) => (c.changing ? [i + 1] : []));
  let transformedNumber: number | undefined;
  if (changingLines.length > 0) {
    const transformedBinary = casts
      .map((c) => (c.changing ? (c.binary === "1" ? "0" : "1") : c.binary))
      .join("");
    transformedNumber = hexagrams.find((h) => h.binary === transformedBinary)?.number;
  }

  return {
    mode,
    hexagramNumber: hexagram.number,
    changingLines,
    ...(transformedNumber !== undefined ? { transformedNumber } : {}),
  };
}

/** Context for entering the Oracle from a fixed hexagram reference page (no cast happened). */
export function buildStudyContext(hexagramNumber: number): IchingConsultationContext {
  return { mode: "study", hexagramNumber, changingLines: [] };
}

/** Validate untrusted request payloads. Returns a clean copy or null. Extra fields are dropped. */
export function validateIchingContext(raw: unknown): IchingConsultationContext | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;

  const { mode, hexagramNumber, changingLines, transformedNumber } = r;
  if (mode !== "cast" && mode !== "study") return null;
  if (!Number.isInteger(hexagramNumber) || (hexagramNumber as number) < 1 || (hexagramNumber as number) > 64) {
    return null;
  }
  if (!Array.isArray(changingLines) || changingLines.length > 6) return null;

  const seen = new Set<number>();
  const lines: number[] = [];
  for (const l of changingLines) {
    if (!Number.isInteger(l) || (l as number) < 1 || (l as number) > 6 || seen.has(l as number)) return null;
    seen.add(l as number);
    lines.push(l as number);
  }
  lines.sort((a, b) => a - b);
  if (mode === "study" && lines.length > 0) return null;

  let cleanTransformed: number | undefined;
  if (transformedNumber !== undefined) {
    if (!Number.isInteger(transformedNumber) || (transformedNumber as number) < 1 || (transformedNumber as number) > 64) {
      return null;
    }
    cleanTransformed = transformedNumber as number;
  }

  return {
    mode,
    hexagramNumber: hexagramNumber as number,
    changingLines: lines,
    ...(cleanTransformed !== undefined ? { transformedNumber: cleanTransformed } : {}),
  };
}

/**
 * Verified classical text for one hexagram — the ONLY text the platform
 * treats as traditional quotation, rendered deterministically by pages and
 * passed to the model as interpretation CONTEXT only.
 *
 * Source policy (collation 2026-11-14):
 * - judgment_zh / image_zh: Zhouyi (周易) core text — collated item-by-item
 *   against the Wikisource 周易 electronic edition (simplified conversion,
 *   modern punctuation; variants recorded in
 *   docs/2026-11-14-iching-text-collation-report.md). Source label: 《周易》.
 * - judgment_en / image_en: PROVENANCE UNVERIFIED. They are deliberately
 *   NOT rendered as traditional text, NOT shown publicly, and NOT passed to
 *   the model (see docs/iching-english-source-status.md). Never assert who
 *   wrote them or what license applies.
 * - Empty zh fields mean the text is unavailable: say so — never reconstruct
 *   classical text from memory.
 */
export function classicalTextBlock(hexagram: {
  judgment_zh?: string;
  image_zh?: string;
}): string {
  const parts: string[] = [];
  if (hexagram.judgment_zh) parts.push(`- Judgment (卦辞, 《周易》 core text): ${hexagram.judgment_zh}`);
  if (hexagram.image_zh) parts.push(`- Image (象辞, 《周易》 core text): ${hexagram.image_zh}`);
  if (!parts.length) {
    parts.push("- No verified classical text is available for this hexagram. State that plainly; never reconstruct, translate-as-quote, or attribute classical text from memory.");
  }
  return `

VERIFIED CLASSICAL TEXT (《周易》 core text, collated 2026-11-14; the platform displays this text itself — it is given to you as CONTEXT for interpretation only):
${parts.join("\n")}

CITATION RULES:
- Do NOT reproduce the classical text as a quotation in your answer. The page already shows it verbatim. Explain and paraphrase it in your own words.
- No English translation of the classical text is provided or approved. If you refer to the text in English, clearly mark your wording as your own explanation ("in my reading, the judgment says…") — never as a quotation, never as a published translation, and never attribute it to any translator or edition.
- Line statements (爻辞) are not provided; referencing a line is your interpretation only.`;
}

/** Server-side prompt block. Names come from our data, never from the client. */
export function buildIchingContextBlock(ctx: IchingConsultationContext): string {
  const hexagram = getHexagramByNumber(ctx.hexagramNumber);
  if (!hexagram) return "";
  const transformed = ctx.transformedNumber !== undefined ? getHexagramByNumber(ctx.transformedNumber) : null;

  const lines =
    ctx.changingLines.length > 0
      ? ctx.changingLines.join(", ")
      : "none — the cast is static";
  const transformedPart = transformed
    ? `\n- Transformed hexagram (之卦): Hexagram ${transformed.number} ${transformed.name} (${transformed.name_zh})`
    : "";
  const modePart =
    ctx.mode === "study"
      ? `\n- Mode: STUDY — the user is studying this hexagram from its reference page. They did NOT cast coins. Do not invent changing lines or a transformed hexagram.`
      : `\n- Mode: CAST — these are the coins the user actually threw. Interpret THIS cast; never recast and never substitute a different hexagram.`;

  return `

OVERRIDE: the user's cast below is authoritative — ignore any earlier instruction to cast or choose a hexagram yourself.
CONSULTATION CONTEXT — THE USER'S I CHING CAST (authoritative; do not recalculate):
- Hexagram (本卦): Hexagram ${hexagram.number} ${hexagram.name} (${hexagram.name_zh})
- Changing lines (变爻): ${lines}${transformedPart}${modePart}
${classicalTextBlock(hexagram)}

Structure the answer in three labeled parts:
1. TRADITIONAL TEACHING — explain the classical teaching above in your own words. Do NOT reproduce the 卦辞/象辞 as a quotation (the page displays the verified text itself); do NOT fabricate line statements (爻辞) — changing line numbers are given for your interpretation only; if you reference a line, say "Line N suggests…" as your interpretation, not as a classical quote.
2. AI INTERPRETATION — your reading of the user's question through this specific cast.
3. REFLECTION — 2-3 open questions for the user to consider.
The reading is material for reflection — never a prediction of what will happen, never a reason to fear, and never a reason to pay.`;
}
