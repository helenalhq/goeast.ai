/**
 * Synastry result storage for the /ziwei/synastry flow. Mirrors
 * consult-session.ts: results live in sessionStorage (survive refresh in
 * the same tab) and, when the user is logged in, are mirrored to the
 * synastry_results table for cross-session restore.
 */

import { loadDraft, saveDraft } from "./draft";
import type { RelationshipType } from "./ziwei-synastry";

export type SynastryPersonInput = {
  birthDate: string;
  birthHour: number | null;
  gender: "male" | "female";
};

/** Minimal shape of the iztro astrolabe JSON we render on the result page. */
export type SynastryPalace = {
  name: string;
  heavenlyStem?: string;
  earthlyBranch?: string;
  majorStars?: { name: string; brightness?: string; mutagen?: string }[];
  minorStars?: { name: string; type?: string }[];
};

export type SynastryChart = {
  palaces?: SynastryPalace[];
  fiveElementsClass?: string;
  soul?: string;
  body?: string;
  zodiac?: string;
  [key: string]: unknown;
};

export type SynastryResult = {
  sessionId: string;
  personA: SynastryPersonInput;
  personB: SynastryPersonInput;
  relationshipType: RelationshipType;
  language: string;
  chartA: SynastryChart | null;
  chartB: SynastryChart | null;
  aiResponse: string;
  completedAt: string;
  persistedToAccount?: boolean;
};

export function synastryResultKey(sessionId: string): string {
  return `synastry:result:${sessionId}`;
}

export function newSynastrySessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function saveSynastryResult(result: SynastryResult): void {
  saveDraft(synastryResultKey(result.sessionId), result);
}

export function loadSynastryResult(sessionId: string | null): SynastryResult | null {
  if (!sessionId) return null;
  const raw = loadDraft<SynastryResult>(synastryResultKey(sessionId));
  return validateSynastryResult(raw) ? raw : null;
}

/** Shape check so a malformed entry can't crash the result page. */
export function validateSynastryResult(raw: unknown): raw is SynastryResult {
  if (typeof raw !== "object" || raw === null) return false;
  const r = raw as Record<string, unknown>;
  return (
    typeof r.sessionId === "string" &&
    r.sessionId.length > 0 &&
    typeof r.aiResponse === "string" &&
    typeof r.completedAt === "string" &&
    typeof r.relationshipType === "string"
  );
}

/** Fire-and-forget persist to the account DB. Never throws. */
export async function persistSynastryResult(result: SynastryResult): Promise<boolean> {
  try {
    const res = await fetch("/api/synastry/result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: result.sessionId,
        personA: result.personA,
        personB: result.personB,
        relationshipType: result.relationshipType,
        language: result.language,
        chartA: result.chartA,
        chartB: result.chartB,
        aiResponse: result.aiResponse,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
