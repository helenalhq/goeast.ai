"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { loadConsultResult, parseConsultResponse, saveConsultNextStep } from "@/lib/consult-session";
import type { ConsultResult } from "@/lib/consult-session";
import { getHexagramByNumber } from "@/lib/iching-data";
import { logEvent } from "@/lib/analytics";

/** Render one hexagram's six lines top-down (data is bottom-up). */
function HexagramLines({ binary, changingLines }: { binary: string; changingLines: number[] }) {
  const rows = [...binary].map((b, i) => ({
    yang: b === "1",
    changing: changingLines.includes(i + 1),
  }));
  return (
    <div className="inline-flex flex-col gap-1.5 py-2">
      {rows.reverse().map((r, i) => (
        <div key={i} className="flex items-center gap-1">
          {r.yang ? (
            <span className="block h-1.5 w-16 bg-ink rounded-sm" />
          ) : (
            <>
              <span className="block h-1.5 w-7 bg-ink rounded-sm" />
              <span className="block h-1.5 w-7 bg-ink rounded-sm ml-2" />
            </>
          )}
          {r.changing && <span className="text-china-red text-xs font-bold ml-1">◦</span>}
        </div>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="px-5 sm:px-6 py-5 border-t border-sand first:border-t-0">
      <h2 className="font-serif text-lg text-warm mb-2">{title}</h2>
      {children}
    </section>
  );
}

export default function ResultView() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");
  const [result, setResult] = useState<ConsultResult | null | undefined>(undefined); // undefined = loading
  const [nextStepInput, setNextStepInput] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration from sessionStorage, an external store */
  useEffect(() => {
    const loaded = loadConsultResult(sessionId);
    setResult(loaded);
    setNextStepInput(loaded?.nextStep || "");
  }, [sessionId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (result === undefined) {
    return <div className="p-6 bg-cream rounded-xl border border-sand text-center text-warm">Loading…</div>;
  }

  if (result === null) {
    return (
      <div className="p-6 sm:p-8 bg-cream rounded-xl border border-sand text-center">
        <h1 className="font-serif text-2xl text-ink mb-3">This reading is no longer available</h1>
        <p className="text-sm text-ink/70 mb-6">
          Readings live in this tab only — if it was closed or the reading was started in
          another tab, you can start a new consultation.
        </p>
        <Link
          href="/consult/iching"
          className="inline-block px-6 py-3 bg-china-red text-white rounded-full font-medium hover:bg-china-red/90 transition-colors"
        >
          Start a new consultation
        </Link>
      </div>
    );
  }

  const hexagram = getHexagramByNumber(result.cast.hexagramNumber);
  const transformed =
    result.cast.transformedNumber !== undefined ? getHexagramByNumber(result.cast.transformedNumber) : null;
  const sections = parseConsultResponse(result.aiResponse);

  const handleSaveNextStep = () => {
    saveConsultNextStep(result.sessionId, nextStepInput.trim(), { ...result, nextStep: nextStepInput.trim() });
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2000);
    if (nextStepInput.trim()) {
      logEvent("consult_next_step_saved");
    }
  };

  // Split the AI interpretation into two perspectives:
  // Perspective 1 = the main interpretation
  // Perspective 2 = "going deeper" (Pro) or the latter half of interpretation if no deeper section
  const interpretationParas = sections.interpretation.split(/\n\s*\n/).filter(Boolean);
  const perspective1 = interpretationParas.slice(0, Math.ceil(interpretationParas.length / 2)).join("\n\n");
  const perspective2 = sections.deeper || interpretationParas.slice(Math.ceil(interpretationParas.length / 2)).join("\n\n");

  return (
    <div className="bg-white/50 rounded-xl border border-sand overflow-hidden">
      {/* 1. Question */}
      <Section title="Your Question">
        <p className="text-ink leading-relaxed whitespace-pre-wrap">{result.question}</p>
      </Section>

      {/* 2. Hexagram & Basis — program-generated, not AI */}
      <Section title="Your Hexagram">
        {hexagram ? (
          <>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
              <div className="text-center sm:text-left">
                <p className="text-ink font-medium">
                  Hexagram {hexagram.number} · {hexagram.name} ({hexagram.name_zh})
                </p>
                {result.cast.changingLines.length > 0 ? (
                  <p className="text-sm text-ink/70 mt-1">
                    Changing line{result.cast.changingLines.length > 1 ? "s" : ""}: {result.cast.changingLines.join(", ")}
                  </p>
                ) : (
                  <p className="text-sm text-warm/60 mt-1">No changing lines — a static cast</p>
                )}
                <HexagramLines binary={hexagram.binary} changingLines={result.cast.changingLines} />
              </div>
              {transformed && (
                <div className="text-center sm:text-left sm:border-l sm:border-sand sm:pl-8">
                  <p className="text-ink/80 text-sm mb-1">Transforms to 之卦</p>
                  <p className="text-ink font-medium">
                    Hexagram {transformed.number} · {transformed.name} ({transformed.name_zh})
                  </p>
                  <HexagramLines binary={transformed.binary} changingLines={[]} />
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="text-ink/70 text-sm">Hexagram {result.cast.hexagramNumber}</p>
        )}
      </Section>

      {/* 3. Traditional Teaching — from structured data only, NOT AI */}
      <Section title="Classical Text">
        <p className="text-xs text-warm/70 mb-2">
          From the I Ching (Book of Changes). Source: GoEast hexagram database.
        </p>
        {hexagram && (
          <>
            <div className="mb-3">
              <p className="text-xs font-semibold text-warm mb-1">Judgment 卦辞</p>
              <blockquote className="pl-4 border-l-2 border-china-red/30 text-ink/90 leading-relaxed italic">
                {hexagram.judgment_en}
              </blockquote>
              <p className="text-sm text-warm/60 mt-1">{hexagram.judgment_zh}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-warm mb-1">Image 象辞</p>
              <blockquote className="pl-4 border-l-2 border-warm/30 text-ink/90 leading-relaxed italic">
                {hexagram.image_en}
              </blockquote>
              <p className="text-sm text-warm/60 mt-1">{hexagram.image_zh}</p>
            </div>
            {transformed && (
              <div className="mt-4 pt-3 border-t border-sand/50">
                <p className="text-xs font-semibold text-warm mb-1">Transformed hexagram judgment</p>
                <blockquote className="pl-4 border-l-2 border-gold/30 text-ink/90 leading-relaxed italic">
                  {transformed.judgment_en}
                </blockquote>
              </div>
            )}
          </>
        )}
      </Section>

      {/* 4. AI Interpretation — clearly labeled as AI-generated */}
      <Section title="AI Interpretation">
        <p className="text-xs text-warm/70 mb-3">
          The following is generated by AI based on your question and hexagram. It is
          material for reflection — not a prediction, not professional advice.
        </p>
        {/* Merge AI's "traditional teaching" content here (it often contains
            contextual interpretation mixed with quotes) */}
        {sections.traditional && (
          <div className="mb-3">
            <div className="prose prose-sm prose-warm max-w-none">
              <ReactMarkdown>{sections.traditional}</ReactMarkdown>
            </div>
          </div>
        )}
        <div className="prose prose-sm prose-warm max-w-none">
          <ReactMarkdown>{perspective1}</ReactMarkdown>
        </div>
      </Section>

      {/* 5. Two Perspectives — distinct angles on the same situation */}
      {(perspective2 || sections.deeper) && (
        <Section title="A Second Perspective">
          <p className="text-xs text-warm/70 mb-3">
            Another angle on the same situation — for contrast, not contradiction.
          </p>
          <div className="prose prose-sm prose-warm max-w-none">
            <ReactMarkdown>{sections.deeper || perspective2}</ReactMarkdown>
          </div>
        </Section>
      )}

      {/* 6. Reflection questions */}
      {sections.reflection.length > 0 && (
        <Section title="Questions to Sit With">
          <ul className="space-y-2">
            {sections.reflection.map((q, i) => (
              <li key={i} className="text-ink/85 leading-relaxed flex gap-2">
                <span className="text-warm">•</span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* 7. My Next Step */}
      <Section title="My Next Step">
        <p className="text-xs text-warm/80 mb-2">
          Optional — write the one small thing you&apos;ll do, in your own words. It stays in
          this tab.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={nextStepInput}
            onChange={(e) => setNextStepInput(e.target.value)}
            maxLength={300}
            placeholder="e.g. Write for 15 minutes tomorrow morning before checking messages"
            className="flex-1 p-3 bg-white/70 border border-sand rounded-lg text-ink focus:outline-none focus:border-warm"
          />
          <button
            type="button"
            onClick={handleSaveNextStep}
            className="px-5 py-3 bg-ink text-white rounded-full font-medium hover:bg-ink/90 transition-colors text-sm whitespace-nowrap"
          >
            {savedFlash ? "Saved ✓" : "Save"}
          </button>
        </div>
      </Section>

      {/* Actions */}
      <div className="px-5 sm:px-6 py-5 border-t border-sand flex flex-col sm:flex-row gap-3 bg-sand/20">
        <Link
          href="/consult/iching"
          className="px-6 py-3 bg-china-red text-white rounded-full font-medium hover:bg-china-red/90 transition-colors text-center"
        >
          Start a new consultation
        </Link>
        <Link
          href="/consult"
          className="px-6 py-3 border border-sand rounded-full text-warm hover:text-ink hover:border-warm transition-colors text-center"
        >
          Back to consult
        </Link>
      </div>
    </div>
  );
}
