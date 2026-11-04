"use client";

import { useEffect, useRef, useState } from "react";
import { loadDraft, saveDraft } from "@/lib/draft";

export type ActionStatus = "not_started" | "in_progress" | "done";

const STATUS_LABELS: Array<{ value: ActionStatus; label: string }> = [
  { value: "not_started", label: "未开始" },
  { value: "in_progress", label: "进行中" },
  { value: "done", label: "已完成" },
];

const REVIEW_NOTE_MAX = 1000;

type NoteStatus = "idle" | "saving" | "saved" | "error";

/**
 * 行动状态 + 复盘心得 — lives inside the My Next Step section of the
 * report page. Status is set ONLY by explicit user click (never by visits
 * or time); the note is optional and editable. Both PATCH the owned report
 * partially (saving one never touches the other), keep a local draft so
 * refresh restores instantly, and guard against stale responses so an old
 * request can't overwrite a newer edit. No AI, no quota, no analytics.
 */
export default function ActionReview({
  sessionId,
  initialStatus,
  initialNote,
  endpoint = "/api/consult/result",
  draftPrefix = "consult",
}: {
  sessionId: string;
  initialStatus?: ActionStatus | null;
  initialNote?: string | null;
  /** Defaults to the I Ching result endpoint; synastry passes its own. */
  endpoint?: string;
  draftPrefix?: string;
}) {
  const [status, setStatus] = useState<ActionStatus | null>(initialStatus ?? null);
  const [statusError, setStatusError] = useState(false);
  const [note, setNote] = useState(initialNote ?? "");
  const [noteStatus, setNoteStatus] = useState<NoteStatus>("idle");
  const statusReqId = useRef(0);
  const noteReqId = useRef(0);
  const draftKey = `${draftPrefix}:action-review:${sessionId}`;

  // One-time hydration: local draft first (instant paint), server values
  // arrive via the parent's initialStatus/initialNote from the report load.
  /* eslint-disable react-hooks/set-state-in-effect -- one-time external-store hydration */
  useEffect(() => {
    const draft = loadDraft<{ status: ActionStatus | null; note: string }>(draftKey);
    if (draft) {
      if (draft.status !== undefined && draft.status !== null) setStatus(draft.status);
      if (typeof draft.note === "string" && draft.note) setNote(draft.note);
    }
  }, [draftKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const persistDraft = (next: { status?: ActionStatus | null; note?: string }) => {
    const draft = loadDraft<{ status: ActionStatus | null; note: string }>(draftKey) || { status: null, note: "" };
    saveDraft(draftKey, {
      status: next.status !== undefined ? next.status : draft.status,
      note: next.note !== undefined ? next.note : draft.note,
    });
  };

  const patch = (payload: Record<string, unknown>) =>
    fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, ...payload }),
    });

  const chooseStatus = async (next: ActionStatus) => {
    if (next === status) return; // duplicate selection — nothing to save
    const myReqId = ++statusReqId.current;
    const prev = status;
    setStatus(next); // optimistic
    setStatusError(false);
    persistDraft({ status: next });
    try {
      const res = await patch({ actionStatus: next });
      if (myReqId !== statusReqId.current) return; // a newer click superseded this one
      if (!res.ok && res.status !== 401) {
        // 401/404: not saved to account (kept locally); 5xx/network: revert + retry
        setStatus(prev);
        persistDraft({ status: prev });
        setStatusError(true);
      }
    } catch {
      if (myReqId !== statusReqId.current) return;
      setStatus(prev);
      persistDraft({ status: prev });
      setStatusError(true);
    }
  };

  const saveNote = async () => {
    if (noteStatus === "saving") return;
    const myReqId = ++noteReqId.current;
    setNoteStatus("saving");
    persistDraft({ note });
    try {
      const res = await patch({ reviewNote: note });
      if (myReqId !== noteReqId.current) return; // a newer save superseded this one
      if (res.ok || res.status === 401) {
        setNoteStatus("saved"); // 401: saved locally in this tab
      } else {
        setNoteStatus("error");
      }
    } catch {
      if (myReqId === noteReqId.current) setNoteStatus("error");
    }
  };

  return (
    <div className="mt-5 pt-4 border-t border-sand/60">
      <p className="text-xs text-warm/80 mb-2">Did you act on it? 你实践了吗？</p>
      <div className="flex gap-2 mb-2" role="group" aria-label="Action status 行动状态">
        {STATUS_LABELS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => chooseStatus(value)}
            aria-pressed={status === value}
            className={`flex-1 py-2.5 rounded-full text-sm font-medium border transition-colors ${
              status === value
                ? "bg-china-red text-white border-china-red"
                : "bg-white/60 text-ink/80 border-sand hover:border-warm"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {statusError && (
        <p className="text-xs text-china-red mb-2" role="alert">
          Couldn&apos;t sync the status — try again.
        </p>
      )}

      <p className="text-xs text-warm/80 mt-4 mb-2">
        复盘心得 Reflection — optional, editable, private.
      </p>
      <textarea
        value={note}
        onChange={(e) => {
          setNote(e.target.value);
          setNoteStatus("idle"); // new edit invalidates "saved"
          persistDraft({ note: e.target.value });
        }}
        rows={4}
        maxLength={REVIEW_NOTE_MAX}
        placeholder="e.g. What happened when you tried? What would you adjust?"
        aria-label="Reflection note 复盘心得"
        className="w-full p-3 text-base bg-white/70 border border-sand rounded-lg text-ink leading-relaxed focus:outline-none focus:border-warm"
      />
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-warm/70">{note.trim().length}/{REVIEW_NOTE_MAX}</span>
        <button
          type="button"
          onClick={saveNote}
          disabled={noteStatus === "saving"}
          className="px-5 py-2.5 bg-ink text-white rounded-full text-sm font-medium hover:bg-ink/90 transition-colors disabled:opacity-50"
        >
          {noteStatus === "saving" ? "Saving…" : noteStatus === "saved" ? "Saved ✓" : noteStatus === "error" ? "Retry Save" : "Save"}
        </button>
      </div>
      {noteStatus === "error" && (
        <p className="text-xs text-china-red mt-1" role="alert">
          Couldn&apos;t sync to your account. Your note is saved in this tab — try again.
        </p>
      )}
    </div>
  );
}
