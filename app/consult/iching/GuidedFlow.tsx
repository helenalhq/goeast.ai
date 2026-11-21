"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { readSseData } from "@/lib/sse";
import { loginUrlWithNext } from "@/lib/auth-redirect";
import { logEvent } from "@/lib/analytics";
import { buildIchingContext, type IchingConsultationContext } from "@/lib/iching-context";
import {
  CONSULT_FLOW_DRAFT_KEY,
  newSessionId,
  saveConsultResult,
  type ConsultResult,
} from "@/lib/consult-session";
import {
  loadConsultFlowDraft,
  saveConsultFlowDraft,
  clearConsultFlowDraft,
  castContextFromDraft,
  type ConsultFlowDraftV2,
} from "@/lib/consult-cast";
import CastView from "./CastView";
import type { HexagramData } from "@/lib/types";

// --- coin casting (same probabilities as IChingDivination) -----------------

interface CoinCast {
  values: [number, number, number];
  line: number;
  binary: string;
  changing: boolean;
}

function castCoins(): CoinCast {
  const coins: [number, number, number] = [
    Math.random() < 0.5 ? 2 : 3,
    Math.random() < 0.5 ? 2 : 3,
    Math.random() < 0.5 ? 2 : 3,
  ];
  const line = coins[0] + coins[1] + coins[2];
  const binary = line === 7 || line === 9 ? "1" : "0";
  const changing = line === 6 || line === 9;
  return { values: coins, line, binary, changing };
}

function throwsToCast(t: CoinCast): { binary: "0" | "1"; changing: boolean } {
  return { binary: t.binary === "1" ? "1" : "0", changing: t.changing };
}

// --- flow state -------------------------------------------------------------

const EXAMPLE_TOPICS = [
  "A writing habit",
  "A work decision",
  "A creative project",
  "A relationship pattern",
];

const EMPTY_DRAFT: ConsultFlowDraftV2 = {
  topic: "",
  customTopic: "",
  stuck: "",
  constraint: "",
  finalQuestion: "",
  step: 1,
};

type Phase = "wizard" | "confirm" | "cast" | "generating";

function assembleQuestion(d: ConsultFlowDraftV2): string {
  const topic = d.topic === "__custom__" ? d.customTopic.trim() : d.topic;
  const parts = [`I would like to consult the I Ching about: ${topic}.`];
  if (d.stuck.trim()) parts.push(`Where I'm stuck: ${d.stuck.trim()}`);
  if (d.constraint.trim()) parts.push(`Constraints / insight sought: ${d.constraint.trim()}`);
  return parts.join(" ");
}

export default function GuidedFlow({ hexagrams }: { hexagrams: HexagramData[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<ConsultFlowDraftV2>(EMPTY_DRAFT);
  const [hydrated, setHydrated] = useState(false);
  const [phase, setPhase] = useState<Phase>("wizard");
  const [streamedText, setStreamedText] = useState("");
  const [error, setError] = useState("");
  const [castNotice, setCastNotice] = useState(""); // e.g. expired-draft notice
  const [aiBusy, setAiBusy] = useState(false);
  const startedRef = useRef(false);

  // Restore after refresh or a login round-trip: the SAME cast and question
  // come back — a new cast only happens on an explicit re-cast.
  /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration from sessionStorage, an external store */
  useEffect(() => {
    const status = loadConsultFlowDraft();
    if (status.kind === "none") {
      logEvent("consult_flow_started", { step: 1 });
    } else if (status.kind === "expired") {
      // Expired cast: keep the question, drop the coins, tell the user —
      // never silently re-roll.
      const kept = { ...status.draft };
      delete kept.casts;
      delete kept.castAt;
      setDraft(kept);
      setPhase(kept.step >= 4 ? "confirm" : "wizard");
      setCastNotice("Your previous cast expired (casts are kept for 24 hours). Your answers are preserved below — cast again when ready.");
    } else {
      setDraft(status.draft);
      if (status.draft.casts) setPhase("cast"); // same coins, no new free_result_viewed
      else if (status.draft.step === 4) setPhase("confirm");
    }
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // bfcache: browser Back from the login page restores this component frozen
  // in the "generating" phase (state at redirect time). Re-hydrate from the
  // draft so the user lands back on their SAME cast, never a stuck spinner.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      const status = loadConsultFlowDraft();
      startedRef.current = false;
      setAiBusy(false);
      setError("");
      if (status.kind === "ok" && status.draft.casts) {
        setDraft(status.draft);
        setPhase("cast");
      } else {
        setPhase("wizard");
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const update = (patch: Partial<ConsultFlowDraftV2>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      saveConsultFlowDraft(next);
      return next;
    });
  };

  const goToStep = (step: number) => {
    update({ step });
    logEvent("consult_flow_started", { step });
  };

  const assembled = useMemo(() => assembleQuestion(draft), [draft]);
  const finalQuestion = draft.finalQuestion.trim() || assembled;

  const topicChosen = draft.topic === "__custom__" ? draft.customTopic.trim().length > 0 : draft.topic.length > 0;
  const canAdvance = phase === "wizard" && (draft.step === 1 ? topicChosen : draft.step === 2 ? draft.stuck.trim().length > 0 : true);

  // --- ACTION 1 (free, anonymous): cast the coins ---------------------------
  // Client-side only — no API call, no quota, nothing personalized.
  const doCast = () => {
    const casts = Array.from({ length: 6 }, () => throwsToCast(castCoins()));
    const ctx = buildIchingContext(casts, hexagrams);
    if (!ctx) {
      setError("The cast could not be completed. Please try again.");
      return;
    }
    setError("");
    setCastNotice("");
    update({ casts, castAt: Date.now(), step: 5 });
    setPhase("cast");
    // New cast displayed → funnel event. Restore (refresh/login return) does NOT re-fire.
    logEvent("free_result_viewed", { channel: "web", path: "consult_iching" });
  };

  // --- ACTION 2 (requires login): AI interpretation of THIS cast ------------
  const handleAiInterpretation = async () => {
    if (startedRef.current || aiBusy) return;
    const castResult = castContextFromDraft(draft, hexagrams);
    if (!castResult) {
      setPhase("confirm");
      return;
    }
    startedRef.current = true;
    setAiBusy(true);
    setError("");
    setStreamedText("");
    setPhase("generating");
    logEvent("consult_generation_started");

    try {
      const res = await fetch("/api/oracle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          philosopher: "prologue-zhougong",
          question: finalQuestion,
          ichingContext: castResult,
        }),
      });

      if (!res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const data = await res.json();
          if (data.code === "LOGIN_REQUIRED") {
            // Cast + question are already in the draft — the login round-trip
            // returns to this same cast. This click is the auth funnel start.
            logEvent("auth_started", { channel: "web", path: "consult_iching" });
            logEvent("consult_generation_failed", { reason: "login_required" });
            window.location.href = loginUrlWithNext();
            return;
          }
          if (data.code === "LIMIT_REACHED") {
            setError("Daily consultation limit reached. Free accounts get 3 readings/day, Pro 10/day.");
          } else {
            setError(data.error || "The oracle could not be reached. Please try again.");
          }
        } else {
          setError("The oracle could not be reached. Please try again.");
        }
        logEvent("consult_generation_failed", { reason: "api_error" });
        setPhase("cast");
        startedRef.current = false;
        setAiBusy(false);
        return;
      }

      // SSE stream — accumulate content until [DONE].
      const reader = res.body?.getReader();
      if (!reader) {
        setError("The oracle could not be reached. Please try again.");
        logEvent("consult_generation_failed", { reason: "no_stream" });
        setPhase("cast");
        startedRef.current = false;
        setAiBusy(false);
        return;
      }
      let accumulated = "";
      let streamError = false;
      // Carry-buffered SSE reader — frames split across network chunks are
      // delivered whole (the naive per-chunk split drops them silently).
      await readSseData(reader, (payload) => {
        if (payload === "[DONE]") return;
        try {
          const parsed = JSON.parse(payload);
          if (parsed.content) {
            accumulated += parsed.content;
            setStreamedText(accumulated);
          }
          if (parsed.error) {
            streamError = true;
          }
        } catch {
          // skip malformed line
        }
      });

      if (!accumulated || streamError) {
        setError("The oracle could not be reached. Please try again.");
        logEvent("consult_generation_failed", { reason: "empty_response" });
        setPhase("cast");
        startedRef.current = false;
        setAiBusy(false);
        return;
      }

      // Generate session ID once, use for both DB save and local result.
      const sessionId = newSessionId();
      const context = {
        topic: draft.topic === "__custom__" ? draft.customTopic.trim() : draft.topic,
        stuck: draft.stuck.trim(),
        constraint: draft.constraint.trim(),
      };

      // Persist to DB for logged-in users (survives tab close / re-login).
      // Wait up to 3s so the result page can show accurate save status.
      let persistedToAccount = false;
      try {
        const saveRes = await Promise.race([
          fetch("/api/consult/result", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId,
              question: finalQuestion,
              context,
              cast: castResult,
              aiResponse: accumulated,
            }),
          }),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("save-timeout")), 3000)),
        ]);
        persistedToAccount = saveRes.ok;
        if (saveRes.ok) logEvent("consult_result_saved");
      } catch {
        // Not logged in, DB unavailable, or timeout — sessionStorage still works
      }

      const result: ConsultResult = {
        sessionId,
        question: finalQuestion,
        context,
        cast: castResult,
        aiResponse: accumulated,
        completedAt: new Date().toISOString(),
        persistedToAccount,
      };
      saveConsultResult(result);
      clearConsultFlowDraft();
      logEvent("consult_generation_completed");
      router.push(`/consult/iching/result?session=${encodeURIComponent(result.sessionId)}`);
    } catch {
      setError("The oracle could not be reached. Please try again.");
      logEvent("consult_generation_failed", { reason: "network" });
      setPhase("cast");
      startedRef.current = false;
      setAiBusy(false);
    }
  };

  const handleStartOver = () => {
    clearConsultFlowDraft();
    setDraft(EMPTY_DRAFT);
    setCastNotice("");
    setPhase("wizard");
  };

  if (!hydrated) {
    return <div className="p-6 bg-cream rounded-xl border border-sand text-center text-warm">Loading…</div>;
  }

  // --- generating -----------------------------------------------------------
  if (phase === "generating") {
    return (
      <div className="p-6 sm:p-8 bg-cream rounded-xl border border-sand text-center">
        <h1 className="font-serif text-2xl text-ink mb-3">Consulting Zhou Gong…</h1>
        <p className="text-sm text-warm mb-6">
          The coins have been cast. Your reading is being written — this usually takes a
          moment.
        </p>
        <div className="max-h-72 overflow-y-auto text-left font-mono text-xs text-ink/60 whitespace-pre-wrap border border-sand/60 rounded-lg p-4 bg-white/40">
          {streamedText || "…"}
        </div>
      </div>
    );
  }

  // --- cast result (free, anonymous) ----------------------------------------
  if (phase === "cast") {
    const castResult = castContextFromDraft(draft, hexagrams);
    if (!castResult) {
      // Defensive: cast missing/corrupt — fall back to confirm, never re-roll silently.
      setPhase("confirm");
      return null;
    }
    return (
      <div>
        {castNotice && (
          <div className="mb-4 p-3 bg-sand/30 border border-sand rounded-lg text-sm text-warm">{castNotice}</div>
        )}
        {error && (
          <div className="mb-4 p-4 bg-china-red/10 border border-china-red/30 rounded-lg text-sm text-china-red" role="alert">
            {error}
            {(error.includes("limit reached") || error.includes("limit reached")) && (
              <div className="mt-2">
                <Link href="/pricing" className="underline underline-offset-2">See Pro limits →</Link>
              </div>
            )}
          </div>
        )}
        <CastView
          cast={castResult}
          question={finalQuestion}
          onAiInterpretation={handleAiInterpretation}
          onRecast={doCast}
          onEditQuestion={() => setPhase("confirm")}
          busy={aiBusy}
        />
      </div>
    );
  }

  // --- confirm ----------------------------------------------------------------
  if (phase === "confirm") {
    return (
      <div className="p-6 sm:p-8 bg-cream rounded-xl border border-sand">
        <div className="flex items-center gap-2 mb-3">
          {[1,2,3].map(n => (
            <span key={n} className="inline-block w-2.5 h-2.5 rounded-full bg-jade" />
          ))}
          <span className="w-2.5 h-2.5 rounded-full bg-cinnabar step-dot-active inline-block" />
          <span className="text-xs text-warm ml-2">Step 4 · Confirm</span>
        </div>
        <h1 className="font-serif text-2xl text-ink mb-1">This is the question you&apos;ll ask</h1>
        <p className="text-sm text-ink/70 mb-5">
          Edit anything below, then cast the coins. <strong>Casting is free and needs no
          account</strong> — you&apos;ll see your hexagram and its classical text before any
          sign-in. The AI interpretation of your question is a separate step that uses one
          of your daily AI readings (free account, 3/day; Pro 10/day).
        </p>
        <textarea
          value={draft.finalQuestion || assembled}
          onChange={(e) => update({ finalQuestion: e.target.value })}
          rows={6}
          maxLength={500}
          className="w-full p-4 bg-white/70 border border-sand rounded-lg text-ink leading-relaxed focus:outline-none focus:border-warm"
          placeholder={assembled}
        />
        <p className="text-xs text-warm mt-1 mb-3">
          {finalQuestion.trim().length}/500 characters
        </p>
        <div className="mb-5 p-3 bg-sand/20 rounded-lg text-xs text-warm leading-relaxed">
          <strong>What happens next:</strong> the coins are cast — free, no account — and you
          see your hexagram with the classical text (the same text for anyone who casts it;
          not yet personalized). If you then want the AI to interpret <em>your</em> question
          through this cast, that step asks you to sign in (free). Your question and cast
          are preserved through sign-in.
        </div>
        {castNotice && (
          <div className="mb-5 p-3 bg-sand/30 border border-sand rounded-lg text-sm text-warm">{castNotice}</div>
        )}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={doCast}
            className="px-6 py-3 bg-china-red text-white rounded-full font-medium hover:bg-china-red/90 transition-colors"
          >
            起卦 · Cast the Coins →
          </button>
          <button
            type="button"
            onClick={() => setPhase("wizard")}
            className="px-6 py-3 border border-sand rounded-full text-warm hover:text-ink hover:border-warm transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // --- wizard -------------------------------------------------------------------
  const step = draft.step;
  return (
    <div className="p-6 sm:p-8 bg-cream rounded-xl border border-sand">
      <div className="flex gap-2 mb-6" aria-hidden>
        {[1, 2, 3].map((s) => (
          <span
            key={s}
            className={`h-1 flex-1 rounded-full ${s <= step ? "bg-china-red" : "bg-sand"}`}
          />
        ))}
      </div>

      {step === 1 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
          {[1,2,3].map(n => (
            <span key={n} className={`inline-block w-2.5 h-2.5 rounded-full transition-colors ${n === 1 ? "bg-cinnabar step-dot-active" : n < 1 ? "bg-jade" : "bg-sand"}`} />
          ))}
          <span className="text-xs text-warm ml-2">Step 1 of 3</span>
        </div>
          <h2 className="font-serif text-2xl text-ink mb-1">What would you like to discuss?</h2>
          <p className="text-sm text-warm/70 mb-5">Step 1 of 3</p>
          <div className="grid gap-3 sm:grid-cols-2 mb-5">
            {EXAMPLE_TOPICS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => update({ topic: t })}
                className={`p-4 text-left rounded-lg border transition-colors ${
                  draft.topic === t
                    ? "border-china-red bg-china-red/5 text-ink"
                    : "border-sand bg-white/50 text-ink/80 hover:border-warm"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={draft.topic === "__custom__" ? draft.customTopic : ""}
            onChange={(e) => update({ topic: "__custom__", customTopic: e.target.value })}
            placeholder="…or describe your own topic"
            maxLength={200}
            className="w-full p-3 bg-white/70 border border-sand rounded-lg text-ink focus:outline-none focus:border-warm"
          />
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
          {[1,2,3].map(n => (
            <span key={n} className={`inline-block w-2.5 h-2.5 rounded-full transition-colors ${n === 2 ? "bg-cinnabar step-dot-active" : n < 2 ? "bg-jade" : "bg-sand"}`} />
          ))}
          <span className="text-xs text-warm ml-2">Step 2 of 3</span>
        </div>
          <h1 className="font-serif text-2xl text-ink mb-2">Where are you stuck?</h1>
          <p className="text-sm text-ink/70 mb-4">
            A sentence or two about what makes this hard right now.
          </p>
          <textarea
            value={draft.stuck}
            onChange={(e) => update({ stuck: e.target.value })}
            rows={5}
            maxLength={300}
            placeholder="e.g. I start strong but abandon it after a few days…"
            className="w-full p-4 bg-white/70 border border-sand rounded-lg text-ink leading-relaxed focus:outline-none focus:border-warm"
          />
        </div>
      )}

      {step === 3 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
          {[1,2,3].map(n => (
            <span key={n} className={`inline-block w-2.5 h-2.5 rounded-full transition-colors ${n === 3 ? "bg-cinnabar step-dot-active" : n < 3 ? "bg-jade" : "bg-sand"}`} />
          ))}
          <span className="text-xs text-warm ml-2">Step 3 of 3</span>
        </div>
          <h1 className="font-serif text-2xl text-ink mb-2">
            Any constraints, or what kind of insight are you seeking?
          </h1>
          <p className="text-sm text-ink/70 mb-4">Optional — you can leave this empty.</p>
          <textarea
            value={draft.constraint}
            onChange={(e) => update({ constraint: e.target.value })}
            rows={4}
            maxLength={300}
            placeholder="e.g. I have 30 minutes a day; I want a sustainable approach, not a sprint…"
            className="w-full p-4 bg-white/70 border border-sand rounded-lg text-ink leading-relaxed focus:outline-none focus:border-warm"
          />
        </div>
      )}

      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          disabled={!canAdvance}
          onClick={() => {
            if (step < 3) {
              goToStep(step + 1);
            } else {
              logEvent("consult_question_confirmed", { step: 3 });
              update({ step: 4 });
              setPhase("confirm");
            }
          }}
          className="px-6 py-3 bg-china-red text-white rounded-full font-medium hover:bg-china-red/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {step < 3 ? "Continue →" : "Review question →"}
        </button>
        {step === 3 && (
          <button
            type="button"
            onClick={() => update({ constraint: "" })}
            className="px-6 py-3 border border-sand rounded-full text-warm hover:text-ink hover:border-warm transition-colors"
          >
            Skip this step
          </button>
        )}
        {step > 1 && (
          <button
            type="button"
            onClick={() => goToStep(step - 1)}
            className="px-4 py-3 text-warm text-sm hover:text-ink transition-colors"
          >
            ← Back
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={handleStartOver}
        className="mt-4 text-xs text-warm/70 hover:text-china-red transition-colors"
      >
        Start over
      </button>
    </div>
  );
}
