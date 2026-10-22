import { describe, expect, it } from "vitest";
import {
  sealTextDraft,
  unsealTextDraft,
  TEXT_DRAFT_MAX_AGE_MS,
} from "../draft";

describe("text draft envelope (question drafts)", () => {
  it("seals text with a timestamp", () => {
    const env = sealTextDraft("hello");
    expect(env.text).toBe("hello");
    expect(typeof env.savedAt).toBe("number");
    expect(Math.abs(env.savedAt - Date.now())).toBeLessThan(1000);
  });

  it("unseals a fresh envelope to the exact text", () => {
    expect(unsealTextDraft(sealTextDraft("hello"))).toBe("hello");
  });

  it("returns null for expired envelopes (25h old)", () => {
    const old = Date.now() - 25 * 3600 * 1000;
    expect(unsealTextDraft({ text: "x", savedAt: old })).toBeNull();
  });

  it("returns null for future/NaN timestamps and malformed payloads", () => {
    expect(unsealTextDraft({ text: "x", savedAt: Date.now() + 3600_000 })).toBeNull();
    expect(unsealTextDraft({ text: "x", savedAt: Number.NaN })).toBeNull();
    expect(unsealTextDraft({ text: "x" })).toBeNull();
    expect(unsealTextDraft("bare string")).toBeNull(); // legacy shape → clean start
    expect(unsealTextDraft(null)).toBeNull();
    expect(unsealTextDraft(42)).toBeNull();
  });

  it("matches the 24h rule used for hexagram contexts", () => {
    expect(TEXT_DRAFT_MAX_AGE_MS).toBe(24 * 60 * 60 * 1000);
  });
});
