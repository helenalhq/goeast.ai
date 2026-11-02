"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { logEvent } from "@/lib/analytics";
import { loadDraft, saveDraft, clearDraft } from "@/lib/draft";

type Turn = { id: string; question: string; answer: string; turnIndex: number; createdAt: string };
type Phase = "idle" | "streaming";

/**
 * 继续讨论这次解读 — follow-up Q&A on one saved reading. Server grounds
 * every answer in the DB record (original cast + reading + prior turns);
 * this component only sends sessionId + question text. Turns load read-only
 * on mount — refresh/history reopen never trigger generation.
 */
export default function FollowupSection({ sessionId, accountStatus }: { sessionId: string; accountStatus: "checking" | "saved" | "local" | "error" }) {
  const [expanded, setExpanded] = useState(false);
  const [turns, setTurns] = useState<Turn[] | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [saveWarning, setSaveWarning] = useState(false);
  const startedRef = useRef(false);
  const draftKey = `consult:followup:${sessionId}`;

  // Read-only thread load (never generates, never charges)
  /* eslint-disable react-hooks/set-state-in-effect -- one-time external-store hydration */
  useEffect(() => {
    if (accountStatus !== "saved") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/consult/followup?session_id=${encodeURIComponent(sessionId)}`);
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (cancelled) return;
        setTurns(json.followups || []);
        setLimitReached(!!json.limitReached);
        if ((json.followups || []).length > 0) setExpanded(true);
      } catch {
        if (!cancelled) setTurns([]); // read failure shows empty thread; asking still works
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId, accountStatus]);

  useEffect(() => {
    const draft = loadDraft<string>(draftKey);
    if (draft) setInput(draft);
  }, [draftKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (accountStatus !== "saved") {
    return (
      <section className="px-5 sm:px-6 py-5 border-t border-sand">
        <h2 className="font-serif text-lg text-warm mb-2">继续讨论这次解读</h2>
        <p className="text-sm text-warm leading-relaxed">
          {accountStatus === "local"
            ? "This reading is only saved in this tab, so follow-up discussion needs it saved to your account. "
            : "Follow-up discussion needs this reading saved to your account. "}
          <Link href="/login" className="underline underline-offset-2">Log in</Link> to keep readings and continue the conversation.
        </p>
      </section>
    );
  }

  const ask = async () => {
    if (startedRef.current || phase === "streaming") return;
    const question = input.trim();
    if (!question) return;
    startedRef.current = true;
    setPhase("streaming");
    setError("");
    setSaveWarning(false);

    try {
      logEvent("consult_followup_started");
      const res = await fetch("/api/consult/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, question }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const reason =
          res.status === 401 ? "login_required"
          : res.status === 404 ? "not_found"
          : res.status === 422 ? "report_data_missing"
          : data?.code === "FOLLOWUP_LIMIT_REACHED" ? "followup_limit"
          : data?.code === "LIMIT_REACHED" ? "limit_reached"
          : "api_error";
        setError(
          data?.error ||
            (reason === "report_data_missing"
              ? "This reading has no usable cast data, so follow-ups are unavailable."
              : "The oracle could not be reached. Please try again."),
        );
        logEvent("consult_followup_failed", { reason });
        setPhase("idle");
        startedRef.current = false;
        return; // input stays — quota was not consumed for pre-flight failures
      }

      // SSE — accumulate; a saveFailed marker means the turn wasn't persisted
      const reader = res.body?.getReader();
      if (!reader) {
        setError("The oracle could not be reached. Please try again.");
        logEvent("consult_followup_failed", { reason: "no_stream" });
        setPhase("idle");
        startedRef.current = false;
        return;
      }
      const decoder = new TextDecoder();
      let streamed = "";
      let streamError = false;
      let saveFailed = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.content) streamed += parsed.content;
            if (parsed.saveFailed) saveFailed = true;
            if (parsed.error) streamError = true;
          } catch { /* skip */ }
        }
      }

      if (!streamed || streamError) {
        setError("The oracle could not be reached. Please try again.");
        logEvent("consult_followup_failed", { reason: "empty_response" });
        setPhase("idle");
        startedRef.current = false;
        return; // charge was refunded server-side
      }

      // Always display the streamed turn — refetch failure must not lose it
      const optimistic: Turn = {
        id: `local-${Date.now()}`,
        question,
        answer: streamed,
        turnIndex: (turns?.length ?? 0) + 1,
        createdAt: new Date().toISOString(),
      };

      // Refresh the thread (canonical copy with ids/order), clear the draft
      try {
        const listRes = await fetch(`/api/consult/followup?session_id=${encodeURIComponent(sessionId)}`);
        if (listRes.ok) {
          const json = await listRes.json();
          setTurns(json.followups || []);
          setLimitReached(!!json.limitReached);
        } else {
          setTurns([...(turns ?? []), optimistic]);
        }
      } catch {
        setTurns([...(turns ?? []), optimistic]);
      }

      clearDraft(draftKey);
      setInput("");

      if (saveFailed) {
        setSaveWarning(true);
        logEvent("consult_followup_failed", { reason: "save_failed" });
      } else {
        logEvent("consult_followup_completed");
      }
      setPhase("idle");
      startedRef.current = false;
    } catch {
      setError("The oracle could not be reached. Please try again.");
      logEvent("consult_followup_failed", { reason: "network" });
      setPhase("idle");
      startedRef.current = false;
    }
  };

  return (
    <section className="px-5 sm:px-6 py-5 border-t border-sand">
      <h2 className="font-serif text-lg text-warm mb-1">继续讨论这次解读 · Follow-up</h2>
      <p className="text-xs text-warm/80 mb-3">
        Same cast, same reading — ask anything about them. Follow-ups use your daily
        consultation quota (3/day free, Pro 10/day).
      </p>

      {turns === null ? (
        <p className="text-sm text-warm">Loading conversation…</p>
      ) : (
        <div className="space-y-4 mb-4">
          {turns.map((t) => (
            <div key={t.id} className="space-y-2">
              <p className="text-sm font-medium text-ink whitespace-pre-wrap"><span aria-hidden>🧑 </span>{t.question}</p>
              <div className="pl-3 border-l-2 border-sand prose prose-sm prose-warm max-w-none">
                <ReactMarkdown>{t.answer}</ReactMarkdown>
              </div>
            </div>
          ))}
        </div>
      )}

      {saveWarning && (
        <p className="mb-3 text-xs text-china-red" role="status">
          This turn&apos;s answer is shown above but may be lost on refresh — it could not be saved to your account.
        </p>
      )}
      {error && (
        <p className="mb-3 p-3 bg-china-red/10 border border-china-red/30 rounded-lg text-sm text-china-red" role="alert">
          {error}
        </p>
      )}

      {limitReached ? (
        <p className="text-sm text-warm">
          You&apos;ve reached the 20-follow-up limit for this reading.{" "}
          <Link href="/consult/iching" className="underline underline-offset-2">Start a new consultation</Link> for a fresh cast.
        </p>
      ) : expanded ? (
        phase === "streaming" ? (
          <p className="text-sm text-warm animate-pulse">Consulting Zhou Gong…</p>
        ) : (
          <div className="flex flex-col gap-2">
            <textarea
              value={input}
              onChange={(e) => { setInput(e.target.value); saveDraft(draftKey, e.target.value); }}
              rows={3}
              maxLength={500}
              aria-label="Follow-up question"
              placeholder="Ask a follow-up about this reading…"
              className="w-full p-3 text-base bg-white/70 border border-sand rounded-lg text-ink leading-relaxed focus:outline-none focus:border-warm"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-warm/70">{input.trim().length}/500</span>
              <button
                type="button"
                onClick={ask}
                className="px-5 py-3 bg-ink text-white rounded-full text-sm font-medium hover:bg-ink/90 transition-colors disabled:opacity-50"
              >
                Send →
              </button>
            </div>
          </div>
        )
      ) : (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="px-5 py-3 bg-ink text-white rounded-full text-sm font-medium hover:bg-ink/90 transition-colors"
        >
          继续讨论这次解读
        </button>
      )}
    </section>
  );
}
