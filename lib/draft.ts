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
