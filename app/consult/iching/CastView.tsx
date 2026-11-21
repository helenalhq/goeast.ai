"use client";

import Link from "next/link";
import { getHexagramByNumber } from "@/lib/iching-data";
import type { IchingConsultationContext } from "@/lib/iching-context";

/**
 * Free anonymous cast result — what every visitor sees BEFORE any login:
 * the six lines, primary hexagram, changing lines, transformed hexagram
 * (only when lines actually change), the verified classical text, and an
 * explicit "this is not personalized" note. No API call, no quota.
 *
 * The AI step is a separate, clearly-labeled action (onAiInterpretation).
 */
export default function CastView({
  cast,
  question,
  onAiInterpretation,
  onRecast,
  onEditQuestion,
  busy,
}: {
  cast: IchingConsultationContext;
  question: string;
  onAiInterpretation: () => void;
  onRecast: () => void;
  onEditQuestion: () => void;
  busy?: boolean;
}) {
  const hexagram = getHexagramByNumber(cast.hexagramNumber);
  const transformed =
    cast.transformedNumber !== undefined ? getHexagramByNumber(cast.transformedNumber) : null;
  if (!hexagram) return null;

  // The cast's six lines ARE the primary hexagram's binary (bottom-up);
  // render top-down with changing lines marked.
  const binaries = hexagram.binary;

  return (
    <div className="p-6 sm:p-8 bg-cream rounded-xl border border-sand">
      <p className="text-xs uppercase tracking-widest text-warm mb-2">Your free cast · 免费起卦</p>
      <h1 className="font-serif text-2xl text-ink mb-1">
        Hexagram {hexagram.number} · {hexagram.name} ({hexagram.name_zh})
      </h1>
      <p className="text-sm text-warm mb-4">
        {hexagram.upper_trigram} above · {hexagram.lower_trigram} below
      </p>

      {/* Six lines, top-down */}
      <div className="font-mono text-lg my-4 space-y-1" role="img" aria-label={`Hexagram ${hexagram.number}, six lines, ${cast.changingLines.length} changing`}>
        {[...binaries].map((b, i) => ({ n: i + 1, yang: b === "1", changing: cast.changingLines.includes(i + 1) })).reverse().map((r) => (
          <div key={r.n} className="flex items-center gap-2 text-ink">
            <span className="text-xs text-warm/60 w-4 text-right">{r.n}</span>
            {r.yang ? (
              <span>━━━━━{r.changing ? " ◦" : ""}</span>
            ) : (
              <span>━ ━{r.changing ? " ◦" : ""}━</span>
            )}
            {r.changing && <span className="text-xs text-china-red">changing 变</span>}
          </div>
        ))}
      </div>

      {cast.changingLines.length > 0 ? (
        <p className="text-sm text-ink/80 mb-2">
          Changing line{cast.changingLines.length > 1 ? "s" : ""}: {cast.changingLines.join(", ")}
          {transformed && (
            <> — transforming into <strong>Hexagram {transformed.number} · {transformed.name} ({transformed.name_zh})</strong></>
          )}
        </p>
      ) : (
        <p className="text-sm text-warm/80 mb-2">No changing lines — a static cast 静卦.</p>
      )}

      {/* Classical text — deterministic from our collated database */}
      <div className="mt-4 p-4 bg-white/70 border border-sand rounded-lg">
        <p className="text-xs font-semibold text-warm mb-1">Judgment 卦辞 · 《周易》</p>
        <p className="text-base text-ink leading-relaxed font-serif">{hexagram.judgment_zh}</p>
        {hexagram.image_zh && (
          <>
            <p className="text-xs font-semibold text-warm mt-3 mb-1">Image 象辞 · 《周易》</p>
            <p className="text-base text-ink leading-relaxed font-serif">{hexagram.image_zh}</p>
          </>
        )}
        <p className="text-xs text-warm/60 mt-2">
          The traditional text for this hexagram — the same for everyone who casts it.
          It is <strong>not</strong> a personalized reading of your question.
        </p>
      </div>

      {/* Two clearly separated actions */}
      <div className="mt-6 flex flex-col gap-3">
        <button
          type="button"
          onClick={onAiInterpretation}
          disabled={busy}
          className="px-6 py-3 bg-china-red text-white rounded-full font-medium hover:bg-china-red/90 transition-colors disabled:opacity-50"
        >
          {busy ? "Starting…" : "获取针对我的 AI 解读 · Get my AI interpretation →"}
        </button>
        <p className="text-xs text-warm/80">
          Free — requires a free account (3 AI readings/day, Pro 10/day). You&apos;ll sign in,
          and return to <strong>this same cast and question</strong>.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onRecast}
            className="px-4 py-2 border border-sand rounded-full text-warm text-sm hover:text-ink hover:border-warm transition-colors"
          >
            重新起卦 · Cast again ↻
          </button>
          <button
            type="button"
            onClick={onEditQuestion}
            className="px-4 py-2 text-warm text-sm hover:text-ink transition-colors"
          >
            Edit question
          </button>
        </div>
      </div>

      <p className="mt-4 text-xs text-warm/60">
        Casting is free and needs no account. This cast is kept in this browser tab —
        refresh or sign in and you&apos;ll return to the same coins (same-tab only; other
        devices or tabs are not restored). Casts expire after 24 hours.
      </p>
    </div>
  );
}
