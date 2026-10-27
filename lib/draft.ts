/**
 * Best-effort sessionStorage drafts so tool state survives a login
 * round-trip in the same tab. Values are JSON; failures (private mode,
 * quota) are silently ignored — drafts are a convenience, never a
 * source of truth. Nothing here is sent over the network or logged.
 */

const PREFIX = "goeast:draft:";

export function saveDraft<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function loadDraft<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function clearDraft(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}

/** Max age for sealed text drafts (question drafts) — mirrors the hexagram
 *  context rule in lib/iching-context.ts so a question can't outlive its cast. */
export const TEXT_DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type TextDraftEnvelope = { text: string; savedAt: number };

/** Wrap a question draft for storage with a birth timestamp. */
export function sealTextDraft(text: string): TextDraftEnvelope {
  return { text, savedAt: Date.now() };
}

/** Unseal a stored text draft. Returns null when missing/malformed/legacy/
 *  expired (incl. future or NaN timestamps). Caller decides whether to clear. */
export function unsealTextDraft(raw: unknown): string | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { text, savedAt } = raw as Record<string, unknown>;
  if (typeof text !== "string") return null;
  const age = typeof savedAt === "number" ? Date.now() - savedAt : Number.NaN;
  if (!Number.isFinite(age) || age < 0 || age > TEXT_DRAFT_MAX_AGE_MS) return null;
  return text;
}

/** Save a one-time source attribution (e.g. which article drove the visit).
 *  Only the pathname is stored — no query params or user input. Cleared
 *  after a single read by the consumer (no cross-session tracking). */
export function saveSource(key: string, pathname: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(PREFIX + key, pathname);
  } catch {
    // ignore
  }
}

/** Read and clear a one-time source attribution. Returns null if absent. */
export function takeSource(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(PREFIX + key);
    if (raw) window.sessionStorage.removeItem(PREFIX + key);
    return raw;
  } catch {
    return null;
  }
}
