/**
 * Anonymous cast draft — the free first experience.
 *
 * Persists the user's question AND the six coin results so that refresh and
 * a login round-trip (Google / email OTP, same tab) restore the SAME cast.
 * Explicit re-cast (重新起卦) is the only way a new cast replaces it.
 *
 * Storage: sessionStorage (same browser tab only). Cross-device / other-tab
 * restoration is NOT supported — say so plainly in UI, never fake it.
 *
 * Draft lifetime: CONSULT_CAST_DRAFT_MAX_AGE_MS. An expired cast is surfaced
 * to the user with a re-cast prompt — never silently re-rolled.
 *
 * Nothing here is sent over the network, logged, or put in URLs/analytics.
 */

import { loadDraft, saveDraft, clearDraft } from "./draft";
import { buildIchingContext, type IchingConsultationContext } from "./iching-context";
import { CONSULT_FLOW_DRAFT_KEY } from "./consult-session";
import type { HexagramData } from "./types";

/** Mirror of the existing wizard draft, plus the cast. */
export type ConsultFlowDraftV2 = {
  topic: string;
  customTopic: string;
  stuck: string;
  constraint: string;
  finalQuestion: string;
  step: number; // 1..3 = wizard, 4 = confirm, 5 = cast shown
  /** Six coin results, bottom-up (index 0 = line 1). Present once cast. */
  casts?: { binary: "0" | "1"; changing: boolean }[];
  /** When the coins were thrown — drives expiry. Absent on legacy drafts. */
  castAt?: number;
};

export { CONSULT_FLOW_DRAFT_KEY };
export const CONSULT_CAST_DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000; // same budget as text drafts

export type CastDraftStatus =
  | { kind: "none" }
  | { kind: "ok"; draft: ConsultFlowDraftV2 }
  | { kind: "expired"; draft: ConsultFlowDraftV2 };

function isValidCast(c: unknown): c is { binary: "0" | "1"; changing: boolean } {
  return (
    typeof c === "object" && c !== null &&
    ("binary" in c && (c.binary === "0" || c.binary === "1")) &&
    ("changing" in c && typeof c.changing === "boolean")
  );
}

/** Load the wizard+cast draft. Expired casts are reported, not discarded:
 *  the caller decides how to present the re-cast prompt. */
export function loadConsultFlowDraft(): CastDraftStatus {
  const raw = loadDraft<ConsultFlowDraftV2>(CONSULT_FLOW_DRAFT_KEY);
  if (!raw || typeof raw !== "object") return { kind: "none" };
  const d = raw as ConsultFlowDraftV2;
  if (typeof d.step !== "number") return { kind: "none" };

  if (Array.isArray(d.casts)) {
    if (d.casts.length !== 6 || !d.casts.every(isValidCast)) return { kind: "none" }; // malformed → treat as absent
    if (typeof d.castAt !== "number") return { kind: "ok", draft: d }; // legacy: no clock, keep
    const age = Date.now() - d.castAt;
    if (!Number.isFinite(age) || age < 0 || age > CONSULT_CAST_DRAFT_MAX_AGE_MS) {
      return { kind: "expired", draft: d };
    }
  }
  return { kind: "ok", draft: d };
}

export function saveConsultFlowDraft(draft: ConsultFlowDraftV2): void {
  saveDraft(CONSULT_FLOW_DRAFT_KEY, draft);
}

export function clearConsultFlowDraft(): void {
  clearDraft(CONSULT_FLOW_DRAFT_KEY);
}

/** Deterministically rebuild the consultation context from a stored draft. */
export function castContextFromDraft(
  draft: ConsultFlowDraftV2,
  hexagrams: HexagramData[],
): IchingConsultationContext | null {
  if (!draft.casts) return null;
  return buildIchingContext(draft.casts, hexagrams);
}
