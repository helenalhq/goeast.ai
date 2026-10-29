/**
 * Consultation result storage + AI response parsing for the guided
 * /consult/iching flow. Results live in sessionStorage (survive refresh in
 * the same tab, die with it) — never sent anywhere unless the user shares.
 */

import { loadDraft, saveDraft } from "./draft";
import type { IchingConsultationContext } from "./iching-context";

export type ConsultContext = {
  topic: string;
  stuck: string;
  constraint: string;
};

export type ConsultResult = {
  sessionId: string;
  question: string;
  context: ConsultContext;
  cast: IchingConsultationContext;
  aiResponse: string;
  completedAt: string;
  nextStep?: string;
};

/** Draft shape for the guided-flow wizard (steps 1-3 + final question). */
export type ConsultFlowDraft = {
  topic: string;
  customTopic: string;
  stuck: string;
  constraint: string;
  finalQuestion: string;
  step: number; // 1..3 = wizard, 4 = confirm
};

export const CONSULT_FLOW_DRAFT_KEY = "consult-flow";

export function resultDraftKey(sessionId: string): string {
  return `consult:result:${sessionId}`;
}

export function newSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function saveConsultResult(result: ConsultResult): void {
  saveDraft(resultDraftKey(result.sessionId), result);
}

export function loadConsultResult(sessionId: string | null): ConsultResult | null {
  if (!sessionId) return null;
  const raw = loadDraft<ConsultResult>(resultDraftKey(sessionId));
  return validateConsultResult(raw) ? raw : null;
}

/** Basic shape check so a malformed/tampered entry can't crash the result page. */
export function validateConsultResult(raw: unknown): raw is ConsultResult {
  if (typeof raw !== "object" || raw === null) return false;
  const r = raw as Record<string, unknown>;
  return (
    typeof r.sessionId === "string" &&
    r.sessionId.length > 0 &&
    typeof r.question === "string" &&
    typeof r.aiResponse === "string" &&
    typeof r.completedAt === "string" &&
    typeof r.cast === "object" &&
    r.cast !== null
  );
}

export function saveConsultNextStep(sessionId: string, nextStep: string, result: ConsultResult): void {
  saveDraft(resultDraftKey(sessionId), { ...result, nextStep });
}

// ---------------------------------------------------------------------------
// AI response parsing — split the Oracle's markdown into labeled sections.
// ---------------------------------------------------------------------------

export type ParsedSections = {
  traditional: string;
  interpretation: string;
  reflection: string[];
  deeper: string;
};

type SectionKey = "traditional" | "interpretation" | "reflection" | "deeper";

const SECTION_PATTERNS: Array<{ key: SectionKey; re: RegExp }> = [
  { key: "traditional", re: /^#{0,3}\s*(?:\d+\.\s*)?\**\s*TRADITIONAL TEACHING\s*\**\s*:?$/i },
  { key: "interpretation", re: /^#{0,3}\s*(?:\d+\.\s*)?\**\s*AI INTERPRETATION\s*\**\s*:?$/i },
  { key: "reflection", re: /^#{0,3}\s*(?:\d+\.\s*)?\**\s*REFLECTION\s*\**\s*:?$/i },
  { key: "deeper", re: /^#{0,3}\s*(?:\d+\.\s*)?\**\s*GOING DEEPER\s*\**\s*:?$/i },
];

function keyForLine(line: string): SectionKey | null {
  for (const { key, re } of SECTION_PATTERNS) {
    if (re.test(line.trim())) return key;
  }
  return null;
}

/**
 * Parse the Oracle's markdown into sections by header. Headers vary slightly
 * ("TRADITIONAL TEACHING", "## 1. TRADITIONAL TEACHING", bold variants) so we
 * match loosely. Reflection bullets become a list of strings.
 */
export function parseConsultResponse(markdown: string): ParsedSections {
  const sections: ParsedSections = { traditional: "", interpretation: "", reflection: [], deeper: "" };
  let current: SectionKey | null = null;

  for (const rawLine of markdown.split("\n")) {
    const key = keyForLine(rawLine);
    if (key) {
      current = key;
      continue;
    }
    if (current === "reflection") {
      const bullet = rawLine.trim().replace(/^[-*•]\s*/, "").replace(/^\d+[.)]\s*/, "").trim();
      if (bullet) sections.reflection.push(bullet);
    } else if (current) {
      sections[current] += (sections[current] ? "\n" : "") + rawLine;
    }
  }

  for (const k of ["traditional", "interpretation", "deeper"] as const) {
    sections[k] = sections[k].trim();
  }
  return sections;
}
