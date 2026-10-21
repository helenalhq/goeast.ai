"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveDraft, loadDraft, clearDraft } from "@/lib/draft";
import { buildIchingContext, ICHING_CONTEXT_DRAFT_KEY } from "@/lib/iching-context";
import { HexagramData } from "@/lib/types";
import Link from "next/link";
import ShareButtons from "@/components/ShareButtons";
import EmailCapture from "@/components/EmailCapture";

interface CoinCast {
  values: [number, number, number]; // 3 coins, each 2 or 3
  line: number; // 6=old yang, 7=young yang, 8=young yin, 9=old yin
  binary: string; // "1" or "0"
  changing: boolean; // old yang (6) or old yin (9) are changing lines
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

const CAST_DRAFT_KEY = "iching-cast";

export default function IChingDivination({ hexagrams }: { hexagrams: HexagramData[] }) {
  const [casts, setCasts] = useState<CoinCast[]>([]);
  const [result, setResult] = useState<HexagramData | null>(null);
  const [phase, setPhase] = useState<"ready" | "casting" | "result">("ready");
  const router = useRouter();

  // Restore an in-progress cast after navigating away and back. The saved
  // coin results ARE the cast — restoring them never re-rolls the coins.
  /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration from sessionStorage, an external store */
  useEffect(() => {
    const saved = loadDraft<CoinCast[]>(CAST_DRAFT_KEY);
    if (saved && saved.length > 0 && saved.length <= 6) {
      setCasts(saved);
      if (saved.length === 6) {
        const binary = saved.map((c) => c.binary).join("");
        setResult(hexagrams.find((h) => h.binary === binary) || null);
        setPhase("result");
      } else {
        setPhase("casting");
      }
    }
  }, [hexagrams]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleCast = () => {
    if (casts.length >= 6) return;
    const newCast = castCoins();
    const newCasts = [...casts, newCast];
    setCasts(newCasts);
    saveDraft(CAST_DRAFT_KEY, newCasts);

    if (newCasts.length === 6) {
      const binary = newCasts.map((c) => c.binary).join("");
      const hexagram = hexagrams.find((h) => h.binary === binary);
      setResult(hexagram || null);
      setPhase("result");
    }
  };

  const handleReset = () => {
    clearDraft(CAST_DRAFT_KEY);
    clearDraft(ICHING_CONTEXT_DRAFT_KEY);
    setCasts([]);
    setResult(null);
    setPhase("ready");
  };

  const lineSymbol = (cast: CoinCast) => {
    if (cast.binary === "1") {
      return cast.changing ? "━━━○" : "━━━━━";
    }
    return cast.changing ? "━ ━ ×" : "━ ━ ━";
  };

  return (
    <div className="p-6 bg-cream rounded-xl border border-sand text-center">
      {phase === "ready" && (
        <div>
          <p className="text-lg font-serif text-ink mb-4">
            Cast the coins to receive your hexagram. Six casts build your reading from bottom to top.
          </p>
          <button
            onClick={() => { setPhase("casting"); }}
            className="px-6 py-3 bg-china-red text-white rounded-full font-medium hover:bg-china-red/90 transition-colors"
          >
            Begin Divination
          </button>
        </div>
      )}

      {phase === "casting" && (
        <div>
          <p className="text-sm text-warm mb-4">
            Cast {6 - casts.length} more lines. Line {casts.length + 1} of 6.
          </p>
          <div className="font-mono text-lg mb-6 space-y-1">
            {casts.map((cast, i) => (
              <div key={i} className="text-ink">
                Line {i + 1}: {lineSymbol(cast)}
              </div>
            ))}
            {Array.from({ length: 6 - casts.length }).map((_, i) => (
              <div key={`empty-${i}`} className="text-sand">
                Line {casts.length + i + 1}: ━ ━ ━ ━ ━
              </div>
            ))}
          </div>
          <button
            onClick={handleCast}
            className="px-6 py-3 bg-china-red text-white rounded-full font-medium hover:bg-china-red/90 transition-colors"
          >
            Cast Coins ({casts.length + 1}/6)
          </button>
        </div>
      )}

      {phase === "result" && result && (
        <div>
          <p className="text-2xl font-bold text-ink mb-1">
            Hexagram {result.number}: {result.name} ({result.name_zh})
          </p>
          <div className="font-mono text-lg my-4 space-y-1">
            {casts.map((cast, i) => (
              <div key={i} className="text-ink">
                Line {i + 1}: {lineSymbol(cast)}
              </div>
            ))}
          </div>
          <div className="mt-6 prose prose-warm max-w-none">
            <p className="text-base text-ink italic">{result.judgment_en}</p>
            <p className="text-sm text-warm/60 mt-2">{result.judgment_zh}</p>
          </div>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href={`/iching/${result.slug}`}
              className="px-6 py-2 bg-ink text-white rounded-full font-medium hover:bg-ink/90 transition-colors text-sm"
            >
              Read Full Hexagram →
            </Link>
            <button
              type="button"
              onClick={() => {
                // Hand the actual cast to the Oracle (numbers only; server resolves names).
                const ctx = buildIchingContext(casts, hexagrams);
                if (ctx) saveDraft(ICHING_CONTEXT_DRAFT_KEY, ctx);
                router.push("/sophies-journey/prologue-zhougong#oracle");
              }}
              className="px-6 py-2 bg-[#8b4513] text-white rounded-full font-medium hover:opacity-90 transition-colors text-sm"
            >
              Ask Zhou Gong for AI Interpretation →
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 text-warm text-sm hover:text-china-red transition-colors"
            >
              Cast Again
            </button>
          </div>

          {/* Share + Email Capture */}
          <div className="mt-6 pt-6 border-t border-sand">
            <ShareButtons
              title={`I Ching Reading: Hexagram ${result.number} ${result.name} (${result.name_zh}) — GoEast.ai`}
              label="Share your reading"
            />
          </div>
          <div className="mt-6">
            <EmailCapture
              title="I Ching Updates from GoEast"
              subtitle="The 64-hexagram library is always free here — subscribe to hear when we add new readings and guides."
              source="iching_result"
              variant="inline"
            />
          </div>
        </div>
      )}

      {phase === "result" && !result && (
        <div>
          <p className="text-lg text-ink mb-4">Your hexagram has been cast, but the reading is not yet available in our database.</p>
          <button onClick={handleReset} className="px-6 py-3 bg-china-red text-white rounded-full font-medium">
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
