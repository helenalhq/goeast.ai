// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from "vitest";
import {
  loadConsultFlowDraft,
  saveConsultFlowDraft,
  clearConsultFlowDraft,
  castContextFromDraft,
  CONSULT_FLOW_DRAFT_KEY,
  CONSULT_CAST_DRAFT_MAX_AGE_MS,
} from "../consult-cast";
import { getAllHexagrams } from "../iching-data";

beforeEach(() => {
  window.sessionStorage.clear();
});

const BASE = { topic: "A work decision", customTopic: "", stuck: "s", constraint: "", finalQuestion: "", step: 5 };
const CASTS = [
  { binary: "0" as const, changing: true }, { binary: "1" as const, changing: false },
  { binary: "1" as const, changing: false }, { binary: "1" as const, changing: false },
  { binary: "0" as const, changing: false }, { binary: "0" as const, changing: false },
]; // 恒 011100 with changing line 1

describe("cast draft lifecycle", () => {
  it("round-trips question + cast and rebuilds the SAME consultation context", () => {
    saveConsultFlowDraft({ ...BASE, casts: CASTS, castAt: Date.now() });
    const status = loadConsultFlowDraft();
    expect(status.kind).toBe("ok");
    if (status.kind !== "ok") return;
    const ctx = castContextFromDraft(status.draft, getAllHexagrams());
    expect(ctx).toMatchObject({ hexagramNumber: 32, changingLines: [1] });
    expect(status.draft.stuck).toBe("s"); // question context preserved
  });

  it("expired cast → status expired, question kept for a re-cast prompt (no silent re-roll)", () => {
    saveConsultFlowDraft({ ...BASE, casts: CASTS, castAt: Date.now() - CONSULT_CAST_DRAFT_MAX_AGE_MS - 1000 });
    const status = loadConsultFlowDraft();
    expect(status.kind).toBe("expired");
    if (status.kind !== "expired") return;
    expect(status.draft.casts).toBeDefined(); // caller decides how to present
    expect(status.draft.stuck).toBe("s");
  });

  it("cast exactly at TTL boundary is still valid", () => {
    saveConsultFlowDraft({ ...BASE, casts: CASTS, castAt: Date.now() - CONSULT_CAST_DRAFT_MAX_AGE_MS + 5000 });
    expect(loadConsultFlowDraft().kind).toBe("ok");
  });

  it("future/tampered castAt → expired (not trusted)", () => {
    saveConsultFlowDraft({ ...BASE, casts: CASTS, castAt: Date.now() + 60_000 });
    expect(loadConsultFlowDraft().kind).toBe("expired");
  });

  it("malformed casts (wrong length / bad shape) → treated as absent", () => {
    saveConsultFlowDraft({ ...BASE, casts: [{ binary: "1", changing: false }], castAt: Date.now() });
    expect(loadConsultFlowDraft().kind).toBe("none");
    window.sessionStorage.clear();
    saveConsultFlowDraft({ ...BASE, casts: [{ binary: "2", changing: false } as never], castAt: Date.now() });
    expect(loadConsultFlowDraft().kind).toBe("none");
  });

  it("legacy draft without casts → ok, wizard state (back-compat)", () => {
    saveConsultFlowDraft({ ...BASE, step: 4 });
    const status = loadConsultFlowDraft();
    expect(status.kind).toBe("ok");
    if (status.kind !== "ok") return;
    expect(status.draft.casts).toBeUndefined();
  });

  it("clear removes everything", () => {
    saveConsultFlowDraft({ ...BASE, casts: CASTS, castAt: Date.now() });
    clearConsultFlowDraft();
    expect(window.sessionStorage.getItem("goeast:draft:" + CONSULT_FLOW_DRAFT_KEY)).toBeNull();
    expect(loadConsultFlowDraft().kind).toBe("none");
  });
});
