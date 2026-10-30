"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveDraft, loadDraft, clearDraft } from "@/lib/draft";
import { loginUrlWithNext } from "@/lib/auth-redirect";
import { logEvent } from "@/lib/analytics";
import { buildIchingContext } from "@/lib/iching-context";
import {
  CONSULT_FLOW_DRAFT_KEY,
  newSessionId,
  saveConsultResult,
  type ConsultFlowDraft,
  type ConsultResult,
} from "@/lib/consult-session";
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

// --- flow state -------------------------------------------------------------

const EXAMPLE_TOPICS = [
  "A writing habit",
  "A work decision",
  "A creative project",
  "A relationship pattern",
];

const EMPTY_DRAFT: ConsultFlowDraft = {
  topic: "",
  customTopic: "",
  stuck: "",
  constraint: "",
  finalQuestion: "",
  step: 1,
};

type Phase = "wizard" | "confirm" | "generating";

function assembleQuestion(d: ConsultFlowDraft): string {
  const topic = d.topic === "__custom__" ? d.customTopic.trim() : d.topic;
  const parts = [`I would like to consult the I Ching about: ${topic}.`];
  if (d.stuck.trim()) parts.push(`Where I'm stuck: ${d.stuck.trim()}`);
  if (d.constraint.trim()) parts.push(`Constraints / insight sought: ${d.constraint.trim()}`);
  return parts.join(" ");
}

export default function GuidedFlow({ hexagrams }: { hexagrams: HexagramData[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<ConsultFlowDraft>(EMPTY_DRAFT);
  const [hydrated, setHydrated] = useState(false);
  const [phase, setPhase] = useState<Phase>("wizard");
  const [streamedText, setStreamedText] = useState("");
  const [error, setError] = useState("");
  const startedRef = useRef(false);

  // Restore draft after a login round-trip (or accidental refresh mid-flow).
  /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration from sessionStorage, an external store */
  useEffect(() => {
    const saved = loadDraft<ConsultFlowDraft>(CONSULT_FLOW_DRAFT_KEY);
    if (saved && typeof saved.step === "number" && saved.step >= 1 && saved.step <= 4) {
      setDraft(saved);
      if (saved.step === 4) setPhase("confirm");
    } else {
      logEvent("consult_flow_started", { step: 1 });
    }
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const update = (patch: Partial<ConsultFlowDraft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      saveDraft(CONSULT_FLOW_DRAFT_KEY, next);
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

  const handleStartReading = async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    setError("");
    setStreamedText("");
    setPhase("generating");
    logEvent("consult_generation_started");

    // Cast the coins ONCE for this consultation.
    const casts = Array.from({ length: 6 }, () => castCoins());
    const castResult = buildIchingContext(casts, hexagrams);
    if (!castResult) {
      setError("The cast could not be completed. Please try again.");
      setPhase("confirm");
      startedRef.current = false;
      return;
    }

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
            // Drafts already saved — they survive the login round-trip.
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
        setPhase("confirm");
        startedRef.current = false;
        return;
      }

      // SSE stream — accumulate content until [DONE].
      const reader = res.body?.getReader();
      if (!reader) {
        setError("The oracle could not be reached. Please try again.");
        logEvent("consult_generation_failed", { reason: "no_stream" });
        setPhase("confirm");
        startedRef.current = false;
        return;
      }
      const decoder = new TextDecoder();
      let accumulated = "";
      let streamError = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;
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
        }
      }

      if (!accumulated || streamError) {
        setError("The oracle could not be reached. Please try again.");
        logEvent("consult_generation_failed", { reason: "empty_response" });
        setPhase("confirm");
        startedRef.current = false;
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
      clearDraft(CONSULT_FLOW_DRAFT_KEY);
      logEvent("consult_generation_completed");
      router.push(`/consult/iching/result?session=${encodeURIComponent(result.sessionId)}`);
    } catch {
      setError("The oracle could not be reached. Please try again.");
      logEvent("consult_generation_failed", { reason: "network" });
      setPhase("confirm");
      startedRef.current = false;
    }
  };

  const handleStartOver = () => {
    clearDraft(CONSULT_FLOW_DRAFT_KEY);
    setDraft(EMPTY_DRAFT);
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

  // --- confirm ----------------------------------------------------------------
  if (phase === "confirm") {
    return (
      <div className="p-6 sm:p-8 bg-cream rounded-xl border border-sand">
        <p className="text-xs uppercase tracking-widest text-warm mb-2">Step 4 · Confirm</p>
        <h1 className="font-serif text-2xl text-ink mb-1">This is the question you&apos;ll ask</h1>
        <p className="text-sm text-ink/70 mb-5">
          Edit anything below, then cast the coins. Starting the reading uses one of your
          daily AI consultations.
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
          <strong>What happens next:</strong> The coins are cast, then you&apos;ll receive a classical
          teaching, an AI interpretation, and reflection questions. AI reading requires a free
          account (3/day free, Pro 10/day). You&apos;ll be prompted to log in if needed — your
          question and answers are preserved.
        </div>
        {error && (
          <div className="mb-5 p-4 bg-china-red/10 border border-china-red/30 rounded-lg text-sm text-china-red">
            {error}
            <div className="mt-2">
              <Link href="/pricing" className="underline underline-offset-2">
                See Pro limits →
              </Link>
            </div>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleStartReading}
            className="px-6 py-3 bg-china-red text-white rounded-full font-medium hover:bg-china-red/90 transition-colors"
          >
            Start Reading →
          </button>
          <button
            type="button"
            onClick={() => setPhase("wizard")}
            className="px-6 py-3 border border-sand rounded-full text-warm hover:text-ink hover:border-warm transition-colors"
          >
            Back
          </button>
        </div>
        <p className="mt-4 text-xs text-warm/80">
          AI interpretation requires a free account (3/day, Pro 10/day). If you&apos;re not
          logged in, you&apos;ll be asked to sign in — your answers are preserved.
        </p>
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
          <p className="text-xs uppercase tracking-widest text-warm mb-2">Step 1 of 3</p>
          <h1 className="font-serif text-2xl text-ink mb-5">What would you like to discuss?</h1>
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
          <p className="text-xs uppercase tracking-widest text-warm mb-2">Step 2 of 3</p>
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
          <p className="text-xs uppercase tracking-widest text-warm mb-2">Step 3 of 3</p>
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
