/**
 * Validated post-login return destinations.
 *
 * Only root-relative, same-site paths are allowed. Everything else —
 * external URLs, protocol-relative URLs, encoded bypasses, auth-internal
 * paths (login loops), oversized input — falls back to /account.
 */

export const DEFAULT_NEXT_PATH = "/account";

const MAX_NEXT_LENGTH = 512;

// Never allow a return destination into auth surfaces or APIs (login loops,
// callback replay, direct API hits).
const BLOCKED_PATH_PREFIXES = ["/login", "/auth", "/api"];

function decodeFully(raw: string): string {
  let candidate = raw;
  for (let i = 0; i < 3; i++) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(candidate);
    } catch {
      return ""; // malformed encoding → treat as invalid
    }
    if (decoded === candidate) break;
    candidate = decoded;
  }
  return candidate;
}

export function sanitizeNextPath(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_NEXT_PATH;

  // The raw value must already be a path — a leading "/" that only appears
  // after percent-deoding is an encoding-bypass attempt.
  if (!raw.trim().startsWith("/")) return DEFAULT_NEXT_PATH;

  const candidate = decodeFully(raw).trim();
  if (!candidate || candidate.length > MAX_NEXT_LENGTH) return DEFAULT_NEXT_PATH;
  // Reject control characters and backslashes anywhere (header/link injection).
  if (/[\x00-\x1f\x7f]/.test(candidate) || candidate.includes("\\")) return DEFAULT_NEXT_PATH;

  // Must be a root-relative path.
  if (!candidate.startsWith("/")) return DEFAULT_NEXT_PATH;
  // Reject protocol-relative (//host) and backslash tricks (/\host).
  if (candidate.startsWith("//") || candidate.startsWith("/\\")) return DEFAULT_NEXT_PATH;

  // Validate the path component strictly; query/hash may follow.
  const pathPart = candidate.split(/[?#]/)[0];
  if (!/^\/[a-zA-Z0-9\-._~/]*$/.test(pathPart)) return DEFAULT_NEXT_PATH;
  // Reject dot-segments so the validated output is canonical.
  if (/(^|\/)\.\.(\/|$)/.test(pathPart)) return DEFAULT_NEXT_PATH;

  const blocked = BLOCKED_PATH_PREFIXES.some(
    (prefix) => pathPart === prefix || pathPart.startsWith(`${prefix}/`)
  );
  if (blocked) return DEFAULT_NEXT_PATH;

  return candidate;
}

/**
 * Client helper: /login?next=<current path> for tool components that must
 * send the user back to the exact tool after signing in. Uses pathname plus
 * a sanitized hash (e.g. #oracle deep links) — never search params or state —
 * so no user input leaks into the URL.
 */
export function loginUrlWithNext(): string {
  const target =
    typeof window !== "undefined"
      ? sanitizeNextPath(
          window.location.pathname + (window.location.hash || "")
        )
      : DEFAULT_NEXT_PATH;
  return `/login?next=${encodeURIComponent(target)}`;
}
