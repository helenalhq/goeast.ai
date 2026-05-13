"use client";

import { useState, useEffect, useRef } from "react";
import { getOracleScenarios } from "@/lib/oracle-scenarios";

interface OracleOverlayProps {
  slug: string;
  name: string;
  nameZh: string;
  color: string;
  onClose: () => void;
}

type Phase = "question" | "loading" | "reading" | "error";

// Ritual animation type per philosopher school
type RitualType =
  | "hexagram"
  | "water"
  | "scroll"
  | "weiqi"
  | "enso"
  | "flame"
  | "compass";

const RITUAL_MAP: Record<string, RitualType> = {
  "prologue-zhougong": "hexagram",
  "ch01-laozi": "water",
  "ch02-confucius": "scroll",
  "ch03-sunzi": "weiqi",
  "ch04-zhuangzi": "water",
  "ch05-mencius": "scroll",
  "ch06-mozi": "compass",
  "ch07-zhuxi": "compass",
  "ch08-zhangzai": "compass",
  "ch09-huineng": "enso",
  "ch10-wangyangming": "flame",
};

function RitualAnimation({ type, character }: { type: RitualType; character: string }) {
  return (
    <div className="relative w-24 h-24 mx-auto mb-5">
      {/* Hexagram — six lines forming one by one */}
      {type === "hexagram" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-[3px] rounded-full bg-white/80"
              style={{
                width: i % 2 === 0 ? "70%" : "90%",
                animation: `hexagramLine 2s ease-out ${i * 0.25}s both`,
              }}
            />
          ))}
        </div>
      )}

      {/* Water ripple — expanding circles */}
      {type === "water" && (
        <div className="absolute inset-0 flex items-center justify-center">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute rounded-full border border-white/40"
              style={{
                width: "20%",
                height: "20%",
                animation: `waterRipple 2.5s ease-out ${i * 0.6}s infinite`,
              }}
            />
          ))}
          <div className="w-2 h-2 rounded-full bg-white/60" />
        </div>
      )}

      {/* Bamboo scroll — vertical bar expanding */}
      {type === "scroll" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="h-[3px] bg-white/70 rounded-full"
            style={{ animation: "scrollUnfurl 2s ease-out both", width: "80%" }}
          />
          <div
            className="absolute h-[3px] bg-white/50 rounded-full"
            style={{ animation: "scrollUnfurl 2s ease-out 0.3s both", width: "70%", marginTop: "12px" }}
          />
          <div
            className="absolute h-[3px] bg-white/30 rounded-full"
            style={{ animation: "scrollUnfurl 2s ease-out 0.6s both", width: "60%", marginTop: "24px" }}
          />
        </div>
      )}

      {/* Weiqi stone — dot placed with expanding ring */}
      {type === "weiqi" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="absolute w-10 h-10 rounded-full border-2 border-white/30"
            style={{ animation: "weiqiGrid 1.5s ease-out both" }}
          />
          <div
            className="absolute w-6 h-6 rounded-full border border-white/20"
            style={{
              transform: "translate(14px, -14px)",
              animation: "weiqiGrid 1.5s ease-out 0.4s both",
            }}
          />
          <div
            className="w-4 h-4 rounded-full bg-white/70"
            style={{ animation: "weiqiPlace 0.8s ease-out 0.8s both" }}
          />
        </div>
      )}

      {/* Enso circle — ink brush stroke */}
      {type === "enso" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-20 h-20">
            <circle
              cx="50"
              cy="50"
              r="38"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="220"
              strokeDashoffset="220"
              opacity={0.7}
              style={{ animation: "ensoDraw 2s ease-out forwards" }}
            />
          </svg>
        </div>
      )}

      {/* Flame — flickering glow */}
      {type === "flame" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div
              className="w-6 h-10 bg-white/70 rounded-full"
              style={{
                clipPath: "polygon(50% 0%, 100% 70%, 80% 100%, 20% 100%, 0% 70%)",
                animation: "flameFlicker 0.8s ease-in-out infinite alternate",
              }}
            />
            <div
              className="absolute inset-0 w-6 h-10 bg-white/40 rounded-full blur-md"
              style={{
                clipPath: "polygon(50% 0%, 100% 70%, 80% 100%, 20% 100%, 0% 70%)",
                animation: "flameGlow 1.2s ease-in-out infinite alternate",
              }}
            />
          </div>
        </div>
      )}

      {/* Compass / cosmic diagram — rotating with points */}
      {type === "compass" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-16 h-16 rounded-full border border-white/30"
            style={{ animation: "compassRotate 4s linear infinite" }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/60" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/60" />
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white/60" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white/60" />
          </div>
          <div
            className="absolute w-8 h-8 rounded-full border border-white/20"
            style={{ animation: "compassRotate 3s linear infinite reverse" }}
          />
        </div>
      )}

      {/* Center character */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="text-white/80 text-2xl font-serif"
          style={{ animation: "ritualFadeIn 1s ease-out 1.5s both" }}
        >
          {character}
        </span>
      </div>
    </div>
  );
}

// Parse reading into paragraphs for better typography
function ReadingDisplay({ text }: { text: string }) {
  const paragraphs = text.split(/\n\n+/).filter(Boolean);
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (visibleCount < paragraphs.length) {
      const timer = setTimeout(() => setVisibleCount((c) => c + 1), 300);
      return () => clearTimeout(timer);
    }
  }, [visibleCount, paragraphs.length]);

  return (
    <div className="space-y-3">
      {paragraphs.slice(0, visibleCount).map((p, i) => {
        // Highlight first paragraph as ritual opening
        if (i === 0) {
          return (
            <p
              key={i}
              className="text-white/60 text-[11px] italic leading-relaxed border-l-2 pl-3"
              style={{ borderColor: "rgba(255,255,255,0.25)" }}
            >
              {p}
            </p>
          );
        }
        // Highlight last paragraph if it looks like a quote (starts with em-dash or quote mark)
        if (i === paragraphs.length - 1 && /^[—“”"—""]/.test(p)) {
          return (
            <p
              key={i}
              className="text-white/95 text-[12px] leading-[1.8] italic font-serif mt-4 pt-3 border-t"
              style={{ borderColor: "rgba(255,255,255,0.15)" }}
            >
              {p}
            </p>
          );
        }
        return (
          <p key={i} className="text-white/90 text-[12px] leading-[1.8]">
            {p}
          </p>
        );
      })}
      {visibleCount < paragraphs.length && (
        <span className="inline-block w-1 h-3 bg-white/50 animate-pulse rounded-sm" />
      )}
    </div>
  );
}

export default function OracleOverlay({
  slug,
  name,
  nameZh,
  color,
  onClose,
}: OracleOverlayProps) {
  const [phase, setPhase] = useState<Phase>("question");
  const [input, setInput] = useState("");
  const [reading, setReading] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [ritualReady, setRitualReady] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const config = getOracleScenarios(slug);
  const ritualType = RITUAL_MAP[slug] || "hexagram";
  const centerChar = config?.specialtyZh?.charAt(0) || nameZh.charAt(0);

  useEffect(() => {
    if (phase === "loading") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRitualReady(false);
      const timer = setTimeout(() => setRitualReady(true), 800);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "reading" && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [phase]);

  const consult = async (question: string) => {
    setPhase("loading");
    setErrorMsg("");

    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("oracle_token="))
        ?.split("=")[1];

      const res = await fetch("/api/oracle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ philosopher: slug, question }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "LIMIT_REACHED") {
          setErrorMsg("limit");
          setPhase("question");
        } else {
          setErrorMsg(data.error || "Something went wrong");
          setPhase("error");
        }
        return;
      }

      setReading(data.reading);
      setPhase("reading");
    } catch {
      setErrorMsg("The oracle could not be reached. Please try again.");
      setPhase("error");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      consult(input.trim());
    }
  };

  return (
    <>
      {/* Inject keyframe animations */}
      <style>{`
        @keyframes hexagramLine {
          from { width: 0; opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes waterRipple {
          0% { width: 20%; height: 20%; opacity: 0.8; }
          100% { width: 120%; height: 120%; opacity: 0; }
        }
        @keyframes scrollUnfurl {
          from { width: 0; opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes weiqiGrid {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes weiqiPlace {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes ensoDraw {
          to { stroke-dashoffset: 40; }
        }
        @keyframes flameFlicker {
          0% { transform: scaleY(1) scaleX(1); }
          100% { transform: scaleY(1.2) scaleX(0.85); }
        }
        @keyframes flameGlow {
          0% { opacity: 0.3; transform: scaleY(1) scaleX(1); }
          100% { opacity: 0.6; transform: scaleY(1.3) scaleX(0.9); }
        }
        @keyframes compassRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes ritualFadeIn {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes ritualTextPulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>

      <div className="absolute inset-0 z-20 flex flex-col" style={{ backgroundColor: `${color}f2` }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white/80 text-[10px] font-serif font-medium"
              style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
            >
              {nameZh.charAt(0)}
            </div>
            <div className="flex flex-col">
              <span className="text-white text-xs font-medium leading-tight">{name}</span>
              <span className="text-white/45 text-[9px]">{config?.specialty}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/20 transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Question phase */}
        {phase === "question" && (
          <div className="flex-1 flex flex-col px-4 pt-2 overflow-y-auto">
            {/* Limit warning */}
            {errorMsg === "limit" && (
              <div className="mb-3 px-3 py-2.5 rounded-lg bg-black/20 backdrop-blur-sm border border-white/10">
                <p className="text-white/80 text-[10px] leading-snug">
                  You&apos;ve used your free consultation today. Come back tomorrow, or unlock unlimited access.
                </p>
                <button
                  className="mt-2 w-full py-1.5 rounded-md text-white text-[10px] font-medium"
                  style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
                >
                  Unlock Unlimited — $4.99/month
                </button>
              </div>
            )}

            {/* Preset scenarios */}
            {config && (
              <div className="space-y-2 mb-4">
                <p className="text-white/35 text-[9px] uppercase tracking-wider mb-1.5">Choose a path</p>
                {config.scenarios.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => consult(s.question)}
                    className="w-full text-left px-3 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.16] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-200 group"
                  >
                    <span className="text-white/40 text-[9px] uppercase tracking-wide block mb-0.5">{s.label}</span>
                    <span className="text-white/90 text-[11px] leading-snug group-hover:text-white transition-colors">{s.question}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Custom input */}
            <form onSubmit={handleSubmit} className="mt-auto pb-4">
              <div className="relative">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={`Ask ${name} anything...`}
                    className="flex-1 bg-white/[0.08] border border-white/[0.1] rounded-xl px-3 py-2 text-white text-[11px] placeholder:text-white/30 focus:outline-none focus:border-white/25 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="px-3 py-2 rounded-xl text-white text-[11px] font-medium disabled:opacity-25 disabled:cursor-not-allowed transition-all"
                    style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
                  >
                    Consult
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Loading phase — ritual animation */}
        {phase === "loading" && (
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <RitualAnimation type={ritualType} character={centerChar} />
            <p
              className="text-white/50 text-[11px] font-serif italic"
              style={{
                animation: ritualReady ? "ritualTextPulse 2s ease-in-out infinite" : "none",
                opacity: ritualReady ? 1 : 0,
                transition: "opacity 0.5s",
              }}
            >
              {config?.ritualText || "Consulting the oracle..."}
            </p>
          </div>
        )}

        {/* Reading phase */}
        {phase === "reading" && (
          <div ref={scrollRef} className="flex-1 flex flex-col px-4 pt-2 overflow-y-auto">
            {/* Decorative divider */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.12)" }} />
              <span className="text-white/30 text-[10px]">{nameZh}</span>
              <div className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.12)" }} />
            </div>

            {/* Reading content with animated paragraphs */}
            <div className="flex-1">
              <ReadingDisplay text={reading} />
            </div>

            {/* Footer with paywall CTA */}
            <div className="mt-4 pb-4 space-y-2">
              <div className="h-px" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
              <div className="flex items-center justify-between">
                <p className="text-white/35 text-[9px]">
                  Free consultation today
                </p>
                <button
                  className="text-[9px] font-medium px-2.5 py-1 rounded-full text-white/80 hover:text-white transition-colors"
                  style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
                >
                  Unlock Unlimited — $4.99/mo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error phase */}
        {phase === "error" && (
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <div className="w-12 h-12 rounded-full bg-white/[0.08] flex items-center justify-center mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" opacity={0.5}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <p className="text-white/60 text-[11px] text-center mb-3">{errorMsg}</p>
            <button
              onClick={() => { setPhase("question"); setErrorMsg(""); }}
              className="px-4 py-2 rounded-xl text-white text-[11px] font-medium hover:bg-white/25 transition-colors"
              style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </>
  );
}
