"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
    // Loading from sessionStorage only — refreshing never re-casts or re-calls the API.
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

  return (
    <div className="bg-white/50 rounded-xl border border-sand overflow-hidden">
      {/* Question */}
      <Section title="Your Question">
        <p className="text-ink leading-relaxed whitespace-pre-wrap">{result.question}</p>
      </Section>

      {/* Hexagram */}
      <Section title="Your Hexagram">
        {hexagram ? (
          <>
            <p className="text-ink mb-1">
              Hexagram {hexagram.number} · {hexagram.name} ({hexagram.name_zh})
            </p>
            {result.cast.changingLines.length > 0 && (
              <p className="text-sm text-ink/75 mb-1">
                Changing lines: {result.cast.changingLines.join(", ")}
              </p>
            )}
            {transformed && (
              <p className="text-sm text-ink/75 mb-2">
                → Transformed: Hexagram {transformed.number} · {transformed.name} ({transformed.name_zh})
              </p>
            )}
            <div className="flex gap-6 items-start mt-3">
              <div className="text-center">
                <HexagramLines binary={hexagram.binary} changingLines={result.cast.changingLines} />
                {result.cast.changingLines.length === 0 && (
                  <p className="text-xs text-warm mt-1">static cast</p>
                )}
              </div>
              {transformed && (
                <div className="text-center">
                  <HexagramLines binary={transformed.binary} changingLines={[]} />
                  <p className="text-xs text-warm mt-1">transformed 之卦</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="text-ink/70 text-sm">Hexagram {result.cast.hexagramNumber}</p>
        )}
      </Section>

      {/* Traditional teaching */}
      <Section title="Traditional Teaching">
        <p className="text-ink/90 leading-relaxed whitespace-pre-wrap">
          {sections.traditional || hexagram?.judgment_en}
        </p>
      </Section>

      {/* AI interpretation */}
      <Section title="AI Interpretation">
        <p className="text-sm text-warm/80 mb-2">
          Generated by AI — material for reflection, not a prediction.
        </p>
        <p className="text-ink leading-relaxed whitespace-pre-wrap">{sections.interpretation}</p>
        {sections.deeper && (
          <div className="mt-4 pt-4 border-t border-sand/70">
            <h3 className="font-serif text-base text-warm mb-2">Going Deeper</h3>
            <p className="text-ink leading-relaxed whitespace-pre-wrap">{sections.deeper}</p>
          </div>
        )}
      </Section>

      {/* Perspectives */}
      {sections.reflection.length > 0 && (
        <Section title="Perspectives to Consider">
          <ul className="space-y-2">
            {sections.reflection.map((q, i) => (
              <li key={i} className="text-ink/90 leading-relaxed flex gap-2">
                <span className="text-warm">•</span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Next step */}
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
