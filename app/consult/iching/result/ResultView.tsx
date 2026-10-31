"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { loadConsultResult, parseConsultResponse, saveConsultNextStep } from "@/lib/consult-session";
import type { ConsultResult } from "@/lib/consult-session";
import { getHexagramByNumber } from "@/lib/iching-data";
import { logEvent } from "@/lib/analytics";

/**
 * Account-save status lifecycle:
 *   "checking"  → loaded from local cache, confirming with server
 *   "saved"     → server confirmed this result exists in the account
 *   "local"     → not in account (not logged in, or save failed)
 *   "error"     → server unreachable, status unknown (local copy intact)
 */
type AccountSaveStatus = "checking" | "saved" | "local" | "error";

/** Next-step save status for the inline editor. */
type NextStepStatus = "idle" | "saving" | "saved" | "error";

/** Render one hexagram's six lines top-down (data is bottom-up).
 *  Lines are clickable — selecting a line highlights related interpretation.
 */
function HexagramLines({
  binary,
  changingLines,
  selectedLine,
  onLineSelect,
}: {
  binary: string;
  changingLines: number[];
  selectedLine: number | null;
  onLineSelect: (line: number | null) => void;
}) {
  const rows = [...binary].map((b, i) => ({
    lineNumber: i + 1,
    yang: b === "1",
    changing: changingLines.includes(i + 1),
  })).reverse();

  return (
    <div className="inline-flex flex-col gap-1.5 py-2" role="group" aria-label="Hexagram lines — select to see related interpretation">
      {rows.map((r) => (
        <button
          key={r.lineNumber}
          type="button"
          onClick={() => onLineSelect(selectedLine === r.lineNumber ? null : r.lineNumber)}
          aria-pressed={selectedLine === r.lineNumber}
          aria-label={`Line ${r.lineNumber}: ${r.yang ? "yang (solid)" : "yin (broken)"}${r.changing ? ", changing" : ""}`}
          className={`flex items-center gap-1 p-1 rounded transition-colors cursor-pointer ${
            selectedLine === r.lineNumber
              ? "bg-cinnabar/10 outline outline-1 outline-cinnabar"
              : "hover:bg-sand/30"
          }`}
        >
          <span className="text-[10px] text-warm/60 w-4 text-right">{r.lineNumber}</span>
          {r.yang ? (
            <span className={`block h-1.5 w-16 rounded-sm ${selectedLine === r.lineNumber ? "bg-cinnabar" : "bg-paper-ink"}`} />
          ) : (
            <>
              <span className={`block h-1.5 w-6 rounded-sm ${selectedLine === r.lineNumber ? "bg-cinnabar" : "bg-paper-ink"}`} />
              <span className={`block h-1.5 w-6 rounded-sm ml-2 ${selectedLine === r.lineNumber ? "bg-cinnabar" : "bg-ink"}`} />
            </>
          )}
          {r.changing && <span className="text-cinnabar text-xs font-bold ml-1">◦</span>}
        </button>
      ))}
    </div>
  );
}

/** Line interpretation info — shown when a line is selected. */
function LineInfo({
  lineNumber,
  changingLines,
  hexagramName,
}: {
  lineNumber: number;
  changingLines: number[];
  hexagramName?: string;
}) {
  const isChanging = changingLines.includes(lineNumber);
  return (
    <div className="mt-3 p-3 bg-cream rounded-lg border border-sand text-sm" role="status">
      <p className="font-medium text-ink mb-1">
        Line {lineNumber} {isChanging ? "· Changing line 变爻" : ""}
      </p>
      {isChanging ? (
        <p className="text-warm text-xs leading-relaxed">
          This is a changing line (变爻) — it transforms {hexagramName || "this hexagram"} into the
          transformed hexagram shown above. The AI interpretation references this transformation.
          Individual line texts (爻辞) are not yet in our database — the reading draws on the
          hexagram&apos;s overall judgment (卦辞) and image (象辞) instead.
        </p>
      ) : (
        <p className="text-warm text-xs leading-relaxed">
          Line {lineNumber} is a static line in this cast — it does not transform.
          Individual line texts (爻辞) for static lines are not yet in our database.
          The reading draws on the hexagram&apos;s overall judgment (卦辞) and image (象辞).
        </p>
      )}
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
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [accountStatus, setAccountStatus] = useState<AccountSaveStatus>("checking");
  const [nextStepStatus, setNextStepStatus] = useState<NextStepStatus>("idle");
  const [restoredFromCloud, setRestoredFromCloud] = useState(false);
  // Guard against stale async responses overwriting newer state
  const statusReqId = useRef(0);
  const nextStepReqId = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const myReqId = ++statusReqId.current;

    async function load() {
      // 1. Try sessionStorage first (instant, same-tab)
      const local = loadConsultResult(sessionId);
      if (local && !cancelled) {
        setResult(local);
        setNextStepInput(local.nextStep || "");
        // Show content immediately, then confirm account status with server
        setAccountStatus("checking");
        try {
          const res = await fetch(`/api/consult/result?session_id=${encodeURIComponent(sessionId || "")}`);
          if (cancelled || myReqId !== statusReqId.current) return; // stale response
          if (res.ok) {
            const data = await res.json();
            if (data.result) {
              setAccountStatus("saved");
              // Use the server's nextStep if it's newer than local (e.g. another tab saved)
              if (data.result.nextStep && data.result.nextStep !== local.nextStep) {
                setNextStepInput(data.result.nextStep);
                saveConsultNextStep(local.sessionId, data.result.nextStep, { ...local, nextStep: data.result.nextStep });
              }
            } else {
              setAccountStatus("local"); // logged in but not found in account
            }
          } else if (res.status === 401) {
            setAccountStatus("local"); // not logged in
          } else {
            setAccountStatus("error"); // server error, but local copy works
          }
        } catch {
          if (!cancelled && myReqId === statusReqId.current) setAccountStatus("error");
        }
        return;
      }

      // 2. No local copy — try DB restore (cross-tab, cross-session)
      try {
        const res = await fetch(`/api/consult/result?session_id=${encodeURIComponent(sessionId || "")}`);
        if (cancelled || myReqId !== statusReqId.current) return;
        if (res.ok) {
          const data = await res.json();
          if (data.result) {
            setResult(data.result);
            setNextStepInput(data.result.nextStep || "");
            setRestoredFromCloud(true);
            setAccountStatus("saved");
            saveConsultNextStep(data.result.sessionId, data.result.nextStep || "", data.result);
            return;
          }
          setResult(null); // logged in, not found
          return;
        }
        if (res.status === 401) {
          setResult(null); // not logged in, no local copy
          return;
        }
      } catch {
        // Network error — fall through
      }

      if (!cancelled) setResult(null);
    }

    load();
    return () => { cancelled = true; };
  }, [sessionId]);

  if (result === undefined) {
    return <div className="p-6 bg-cream rounded-xl border border-sand text-center text-warm">Loading…</div>;
  }

  if (result === null) {
    return (
      <div className="p-6 sm:p-8 bg-cream rounded-xl border border-sand text-center">
        <h1 className="font-serif text-2xl text-ink mb-3">This reading is no longer available</h1>
        <p className="text-sm text-ink/70 mb-6">
          {sessionId
            ? "This reading was not found in your saved results. If you were logged in when it was created, try logging in again."
            : "No reading session was specified."}
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

  const handleSaveNextStep = async () => {
    if (!result || nextStepStatus === "saving") return;
    const trimmed = nextStepInput.trim();
    const myReqId = ++nextStepReqId.current;

    // Save locally immediately (instant, works offline)
    saveConsultNextStep(result.sessionId, trimmed, { ...result, nextStep: trimmed });
    setNextStepStatus("saving");

    // Then try to persist to account
    try {
      const res = await fetch("/api/consult/result", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: result.sessionId, nextStep: trimmed }),
      });
      if (myReqId !== nextStepReqId.current) return; // stale response — newer save in flight
      if (res.ok) {
        setNextStepStatus("saved");
        setAccountStatus("saved"); // confirms the reading is in the account too
        if (trimmed) logEvent("consult_next_step_saved");
      } else if (res.status === 401) {
        setNextStepStatus("saved"); // saved locally, just not to account
      } else {
        setNextStepStatus("error");
      }
    } catch {
      if (myReqId === nextStepReqId.current) setNextStepStatus("error");
    }
  };

  // Split the AI interpretation into two perspectives
  const interpretationParas = sections.interpretation.split(/\n\s*\n/).filter(Boolean);
  const perspective1 = interpretationParas.slice(0, Math.ceil(interpretationParas.length / 2)).join("\n\n");
  const perspective2 = sections.deeper || interpretationParas.slice(Math.ceil(interpretationParas.length / 2)).join("\n\n");

  return (
    <div className="bg-paper-panel rounded-xl border border-sand overflow-hidden shadow-sm">
      {restoredFromCloud && (
        <div className="px-5 sm:px-6 py-2 bg-cream/60 text-xs text-warm text-center">
          Restored from your saved readings
        </div>
      )}

      {/* 1. Question */}
      <Section title="Your Question">
        <p className="text-ink leading-relaxed whitespace-pre-wrap">{result.question}</p>
      </Section>

      {/* 2. Hexagram — program-generated, not AI */}
      <Section title="Your Hexagram">
        {hexagram ? (
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
              <HexagramLines binary={hexagram.binary} changingLines={result.cast.changingLines} selectedLine={selectedLine} onLineSelect={setSelectedLine} />
              {selectedLine !== null && (
                <LineInfo
                  lineNumber={selectedLine}
                  changingLines={result.cast.changingLines}
                  hexagramName={hexagram.name}
                />
              )}
            </div>
            {transformed && (
              <div className="text-center sm:text-left sm:border-l sm:border-sand sm:pl-8">
                <p className="text-ink/80 text-sm mb-1">Transforms to 之卦</p>
                <p className="text-ink font-medium">
                  Hexagram {transformed.number} · {transformed.name} ({transformed.name_zh})
                </p>
                <HexagramLines binary={transformed.binary} changingLines={[]} selectedLine={null} onLineSelect={() => {}} />
              </div>
            )}
          </div>
        ) : (
          <p className="text-ink/70 text-sm">Hexagram {result.cast.hexagramNumber}</p>
        )}
      </Section>

      {/* 3. Classical Text — original Chinese + English rendering, clearly sourced */}
      <Section title="Classical Text 卦辞">
        {hexagram && (
          <>
            <div className="mb-4">
              <p className="text-xs font-semibold text-warm mb-1">Original Chinese 原文</p>
              <blockquote className="pl-4 border-l-2 border-china-red/30 text-ink leading-relaxed text-base font-serif">
                {hexagram.judgment_zh}
              </blockquote>
            </div>
            <div className="mb-4">
              <p className="text-xs font-semibold text-warm mb-1">
                English rendering <span className="font-normal text-warm/60">(traditional translation style, GoEast database)</span>
              </p>
              <blockquote className="pl-4 border-l-2 border-warm/30 text-ink/80 leading-relaxed italic">
                {hexagram.judgment_en}
              </blockquote>
              <p className="text-xs text-warm/50 mt-1">
                Note: English text is an editorial rendering in the tradition of standard translations
                (e.g., Wilhelm/Baynes); it is not a verified quotation of any specific published translation.
              </p>
            </div>
            {hexagram.image_zh && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-warm mb-1">Image 象辞 (Original)</p>
                <blockquote className="pl-4 border-l-2 border-gold/30 text-ink leading-relaxed text-base font-serif">
                  {hexagram.image_zh}
                </blockquote>
                <p className="text-sm text-warm/70 mt-1 italic">{hexagram.image_en}</p>
              </div>
            )}
            {transformed && (
              <div className="mt-4 pt-3 border-t border-sand/50">
                <p className="text-xs font-semibold text-warm mb-1">Transformed hexagram ({transformed.name_zh}) — Original</p>
                <blockquote className="pl-4 border-l-2 border-gold/30 text-ink leading-relaxed text-base font-serif">
                  {transformed.judgment_zh}
                </blockquote>
                <p className="text-sm text-warm/70 mt-1 italic">{transformed.judgment_en}</p>
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

      {/* 5. Second Perspective */}
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

      {/* 6. Reflection questions — rendered as markdown for bold/lists */}
      {sections.reflection.length > 0 && (
        <Section title="Questions to Sit With">
          <ul className="space-y-2">
            {sections.reflection.map((q, i) => (
              <li key={i} className="text-ink/85 leading-relaxed flex gap-2">
                <span className="text-warm flex-shrink-0">•</span>
                <div className="prose prose-sm prose-warm max-w-none p-0 m-0">
                  <ReactMarkdown>{q}</ReactMarkdown>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* 7. My Next Step */}
      <Section title="My Next Step">
        <p className="text-xs text-warm/80 mb-2">
          Optional — write the one small thing you&apos;ll do, in your own words.
          {accountStatus === "checking" && " Confirming save status…"}
          {accountStatus === "saved" && " Saved to your account."}
          {accountStatus === "local" && " Saved in this tab."}
          {accountStatus === "error" && " Save status unknown — your reading is available in this tab."}
        </p>
        {nextStepStatus === "error" && (
          <p className="text-xs text-china-red mb-2" role="alert">
            Couldn&apos;t sync to your account. Your input is saved in this tab — try again.
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={nextStepInput}
            onChange={(e) => {
              setNextStepInput(e.target.value);
              setNextStepStatus("idle"); // new edit invalidates "saved" status
            }}
            maxLength={300}
            placeholder="e.g. Write for 15 minutes tomorrow morning before checking messages"
            className="flex-1 p-3 bg-white/70 border border-sand rounded-lg text-ink focus:outline-none focus:border-warm"
          />
          <button
            type="button"
            onClick={handleSaveNextStep}
            disabled={nextStepStatus === "saving"}
            className="px-5 py-3 bg-ink text-white rounded-full font-medium hover:bg-ink/90 transition-colors text-sm whitespace-nowrap disabled:opacity-50"
          >
            {nextStepStatus === "saving" ? "Saving…" : nextStepStatus === "saved" ? "Saved ✓" : nextStepStatus === "error" ? "Retry Save" : "Save"}
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
