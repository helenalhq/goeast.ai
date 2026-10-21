/**
 * Shorten text to at most `max` characters without cutting words or
 * sentences in half. Prefers the last complete sentence that fits within
 * the budget; otherwise cuts at a word boundary with an ellipsis. Never
 * adds content — only shortens what is already there.
 */
export function clipText(text: string, max: number): string {
  const clean = text.trim();
  if (clean.length <= max) return clean;

  const window = clean.slice(0, max);
  const sentenceEnd = Math.max(
    window.lastIndexOf(". "),
    window.lastIndexOf("! "),
    window.lastIndexOf("? "),
    window.lastIndexOf("。")
  );
  // Keep the terminator itself, drop the trailing space.
  if (sentenceEnd >= max * 0.4) {
    return window.slice(0, sentenceEnd + 1).trimEnd();
  }

  // Word-boundary fallback. If the character just past the window is a
  // space, the window ends on a complete word already.
  if (clean[max] === " ") {
    return window.trimEnd() + "…";
  }
  const lastSpace = window.lastIndexOf(" ");
  if (lastSpace > 0) {
    return window.slice(0, lastSpace).trimEnd() + "…";
  }
  // No space inside the window: the first word may exceed the budget.
  // Back off to the last word boundary at or before `max` in the full
  // string; if there is none, the first word itself is longer than the
  // budget and returning any prefix of it would cut mid-word, so return
  // the ellipsis only.
  const boundary = clean.lastIndexOf(" ", max);
  if (boundary > 0) {
    return clean.slice(0, boundary).trimEnd() + "…";
  }
  return "…";
}
