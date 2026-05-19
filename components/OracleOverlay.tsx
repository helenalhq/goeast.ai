"use client";

import { useState, useEffect, useRef } from "react";
import { getOracleScenarios } from "@/lib/oracle-scenarios";
import { getOraclePortrait } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import ReactMarkdown from "react-markdown";

interface OracleOverlayProps {
  slug: string;
  name: string;
  nameZh: string;
  color: string;
  onClose: () => void;
}

type Phase = "question" | "loading" | "reading" | "error";

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

// ─── Philosopher Visual Themes ───

interface PhilosopherTheme {
  accent: string; // "R,G,B"
  bgBase: string; // hex for base dark color
  bgWarm: string; // hex for slightly warmer variant
  haloColor: string; // "R,G,B" for portrait halo
  watermark: string;
  separator: string;
  headerDecor: string;
  footerLabel: string;
}

const THEMES: Record<string, PhilosopherTheme> = {
  "prologue-zhougong": {
    accent: "201,168,76", // Gold
    bgBase: "#0a0806",
    bgWarm: "#100d08",
    haloColor: "201,168,76",
    watermark: "☯", // ☯ yin-yang
    separator: "☰", // ☰ hexagram trigram
    headerDecor: "☰ ☯ ☷", // ☰ ☯ ☷
    footerLabel: "卦象 · Hexagram",
  },
  "ch01-laozi": {
    accent: "100,175,130", // Jade green
    bgBase: "#060d09",
    bgWarm: "#0a120d",
    haloColor: "100,175,130",
    watermark: "道", // 道
    separator: "〜", // 〰 wave
    headerDecor: "上善若水", // 上善若水
    footerLabel: "道法 · The Way",
  },
  "ch02-confucius": {
    accent: "195,125,85", // Cinnabar amber
    bgBase: "#0d0806",
    bgWarm: "#120a08",
    haloColor: "195,125,85",
    watermark: "仁", // 仁
    separator: "◇", // ◇
    headerDecor: "仁 义 礼", // 仁 义 礼
    footerLabel: "圣言 · The Teaching",
  },
};

const SERIF = 'Georgia, "Songti SC", "STSong", "SimSun", serif';

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function getTheme(slug: string, color: string): PhilosopherTheme {
  if (THEMES[slug]) return THEMES[slug];
  const [r, g, b] = hexToRgb(color);
  return {
    accent: `${r},${g},${b}`,
    bgBase: "#08080d",
    bgWarm: "#0d0d14",
    haloColor: `${r},${g},${b}`,
    watermark: "☯",
    separator: "☰",
    headerDecor: "☰ ☯ ☷",
    footerLabel: "卦象 · Oracle",
  };
}

// ─── Particles ───

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  s: 2 + (i % 3),
  l: (i * 37 + 13) % 100,
  t: (i * 53 + 7) % 100,
  d: i * 0.6,
  dur: 8 + (i % 5) * 3,
  o: 0.18 + (i % 3) * 0.08,
}));

function SacredParticles({ accent }: { accent: string }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: p.s,
            height: p.s,
            background: `rgba(${accent},${p.o})`,
            left: `${p.l}%`,
            top: `${p.t}%`,
            animation: `sacredFloat ${p.dur}s ease-in-out ${p.d}s infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Ritual Animation ───

function RitualAnimation({
  type,
  character,
  accent,
}: {
  type: RitualType;
  character: string;
  accent: string;
}) {
  return (
    <div className="relative w-32 h-32 mx-auto mb-6">
      {type === "hexagram" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-[3px] rounded-full"
              style={{
                width: i % 2 === 0 ? "65%" : "85%",
                background: `linear-gradient(90deg, transparent, rgba(${accent},0.7), transparent)`,
                animation: `hexagramLine 2s ease-out ${i * 0.3}s both`,
              }}
            />
          ))}
        </div>
      )}

      {type === "water" && (
        <div className="absolute inset-0 flex items-center justify-center">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: "15%",
                height: "15%",
                border: `1px solid rgba(${accent},0.3)`,
                animation: `waterRipple 3s ease-out ${i * 0.7}s infinite`,
              }}
            />
          ))}
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: `rgba(${accent},0.5)`,
              animation: "waterGlow 2s ease-in-out infinite alternate",
            }}
          />
        </div>
      )}

      {type === "scroll" && (
        <div className="absolute inset-0 flex items-center justify-center flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[3px] rounded-full"
              style={{
                background: `linear-gradient(90deg, transparent, rgba(${accent},0.6), transparent)`,
                animation: `scrollUnfurl 2s ease-out ${i * 0.4}s both`,
                width: `${80 - i * 15}%`,
              }}
            />
          ))}
        </div>
      )}

      {type === "weiqi" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="absolute w-12 h-12 rounded-full border-2 border-white/25"
            style={{ animation: "weiqiGrid 1.5s ease-out both" }}
          />
          <div
            className="absolute w-7 h-7 rounded-full border border-white/15"
            style={{
              transform: "translate(16px, -16px)",
              animation: "weiqiGrid 1.5s ease-out 0.5s both",
            }}
          />
          <div
            className="w-4 h-4 rounded-full bg-white/60"
            style={{ animation: "weiqiPlace 0.8s ease-out 1s both" }}
          />
        </div>
      )}

      {type === "enso" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-24 h-24">
            <circle
              cx="50"
              cy="50"
              r="38"
              fill="none"
              stroke={`rgba(${accent},0.6)`}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="220"
              strokeDashoffset="220"
              style={{ animation: "ensoDraw 2.5s ease-out forwards" }}
            />
          </svg>
        </div>
      )}

      {type === "flame" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div
              className="w-7 h-12 rounded-full"
              style={{
                background: `linear-gradient(to top, rgba(${accent},0.7), rgba(${accent},0.2))`,
                clipPath:
                  "polygon(50% 0%, 100% 65%, 85% 100%, 15% 100%, 0% 65%)",
                animation: "flameFlicker 0.8s ease-in-out infinite alternate",
              }}
            />
            <div
              className="absolute inset-0 w-7 h-12 rounded-full blur-lg"
              style={{
                background: `rgba(${accent},0.15)`,
                clipPath:
                  "polygon(50% 0%, 100% 65%, 85% 100%, 15% 100%, 0% 65%)",
                animation: "flameGlow 1.2s ease-in-out infinite alternate",
              }}
            />
          </div>
        </div>
      )}

      {type === "compass" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="rounded-full border border-white/25"
            style={{
              animation: "compassRotate 6s linear infinite",
              width: "4.5rem",
              height: "4.5rem",
            }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/50" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 rounded-full bg-white/50" />
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white/50" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-2 rounded-full bg-white/50" />
          </div>
          <div
            className="absolute w-9 h-9 rounded-full border border-white/15"
            style={{ animation: "compassRotate 4s linear infinite reverse" }}
          />
        </div>
      )}

      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="text-white/90 text-3xl tracking-wider"
          style={{
            fontFamily: SERIF,
            animation: "ritualFadeIn 1.2s ease-out 1.8s both",
          }}
        >
          {character}
        </span>
      </div>
    </div>
  );
}

// ─── Reading Display ───

function ReadingDisplay({
  text,
  streaming,
  accent,
}: {
  text: string;
  streaming: boolean;
  accent: string;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!streaming) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [streaming]);

  return (
    <div className="oracle-reading space-y-4">
      <ReactMarkdown
        components={{
          p: ({ children }) => (
            <p
              className="text-white/85 text-base leading-[2]"
              style={{ fontFamily: SERIF }}
            >
              {children}
            </p>
          ),
          em: ({ children }) => (
            <em
              className="text-white/50 not-italic text-sm"
              style={{ fontFamily: SERIF }}
            >
              {children}
            </em>
          ),
          strong: ({ children }) => (
            <strong
              className="font-semibold"
              style={{ color: `rgba(${accent},0.9)` }}
            >
              {children}
            </strong>
          ),
          blockquote: ({ children }) => (
            <blockquote
              className="border-l-2 pl-4 my-4"
              style={{ borderColor: `rgba(${accent},0.3)` }}
            >
              {children}
            </blockquote>
          ),
          hr: () => (
            <div className="flex items-center gap-4 my-6">
              <div
                className="flex-1 h-px"
                style={{
                  background: `linear-gradient(90deg, transparent, rgba(${accent},0.25), transparent)`,
                }}
              />
              <span style={{ color: `rgba(${accent},0.3)` }} className="text-[8px]">
                &#9775;
              </span>
              <div
                className="flex-1 h-px"
                style={{
                  background: `linear-gradient(90deg, transparent, rgba(${accent},0.25), transparent)`,
                }}
              />
            </div>
          ),
          h1: ({ children }) => (
            <h1
              className="text-white text-lg font-medium leading-snug mb-3"
              style={{ fontFamily: SERIF }}
            >
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2
              className="text-white/95 text-base font-medium leading-snug mb-2"
              style={{ fontFamily: SERIF }}
            >
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3
              className="text-white/90 text-[15px] font-medium leading-snug mb-2"
              style={{ fontFamily: SERIF }}
            >
              {children}
            </h3>
          ),
          ul: ({ children }) => (
            <ul
              className="text-white/85 text-base leading-[2] list-none pl-4 space-y-1"
              style={{ fontFamily: SERIF }}
            >
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol
              className="text-white/85 text-base leading-[2] list-none pl-4 space-y-1"
              style={{ fontFamily: SERIF }}
            >
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li
              className="relative pl-3 before:content-['·'] before:absolute before:left-0"
              style={{ fontFamily: SERIF, color: `rgba(${accent},0.4)` }}
            >
              <span className="text-white/85">{children}</span>
            </li>
          ),
          code: ({ children }) => (
            <code className="text-white/75 bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono">
              {children}
            </code>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
      {streaming && (
        <span
          className="inline-block w-0.5 h-4 animate-pulse rounded-full"
          style={{ background: `rgba(${accent},0.6)` }}
        />
      )}
      <div ref={bottomRef} />
    </div>
  );
}

// ─── Main Component ───

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
  const [streaming, setStreaming] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [ritualReady, setRitualReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const config = getOracleScenarios(slug);
  const ritualType = RITUAL_MAP[slug] || "hexagram";
  const centerChar = config?.specialtyZh?.charAt(0) || nameZh.charAt(0);
  const [r, g, b] = hexToRgb(color);
  const philosopherImage = getOraclePortrait(slug);
  const theme = getTheme(slug, color);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) {
        supabase
          .from("subscriptions")
          .select("status")
          .eq("user_id", data.user.id)
          .in("status", ["active", "scheduled_cancel"])
          .limit(1)
          .maybeSingle()
          .then(({ data: sub }) => setIsSubscribed(!!sub));
      }
    });
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

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

  const handleUnlock = async () => {
    if (!user) {
      window.location.href = "/login";
      return;
    }
    setUnlocking(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const { checkoutUrl } = await res.json();
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      }
    } catch {
      setUnlocking(false);
    }
  };

  const consult = async (question: string) => {
    setPhase("loading");
    setErrorMsg("");
    setReading("");

    try {
      const res = await fetch("/api/oracle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ philosopher: slug, question }),
      });

      if (!res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const data = await res.json();
          if (data.code === "LIMIT_REACHED") {
            setErrorMsg("limit");
            setPhase("question");
          } else {
            setErrorMsg(data.error || "Something went wrong");
            setPhase("error");
          }
        } else {
          setErrorMsg("Something went wrong");
          setPhase("error");
        }
        return;
      }

      setPhase("reading");
      setStreaming(true);
      const reader = res.body?.getReader();
      if (!reader) {
        setErrorMsg("The oracle could not be reached. Please try again.");
        setPhase("error");
        return;
      }

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") break;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.content) {
              accumulated += parsed.content;
              setReading(accumulated);
            }
          } catch {
            // Skip malformed lines
          }
        }
      }
      setStreaming(false);
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

  const accent = theme.accent;
  const halo = theme.haloColor;
  const bgGradient = `
    radial-gradient(ellipse 80% 50% at 50% 0%, rgba(${accent},0.15) 0%, transparent 50%),
    radial-gradient(circle at 30% 70%, rgba(${accent},0.05) 0%, transparent 40%),
    linear-gradient(180deg, ${theme.bgBase} 0%, ${theme.bgWarm} 50%, ${theme.bgBase} 100%)
  `;

  return (
    <>
      <style>{`
        @keyframes hexagramLine {
          from { width: 0; opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes waterRipple {
          0% { width: 15%; height: 15%; opacity: 0.7; }
          100% { width: 140%; height: 140%; opacity: 0; }
        }
        @keyframes waterGlow {
          0% { opacity: 0.3; transform: scale(1); }
          100% { opacity: 0.7; transform: scale(1.2); }
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
          100% { transform: scaleY(1.25) scaleX(0.82); }
        }
        @keyframes flameGlow {
          0% { opacity: 0.2; transform: scaleY(1) scaleX(1); }
          100% { opacity: 0.5; transform: scaleY(1.35) scaleX(0.88); }
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
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.9; }
        }
        @keyframes ambientPulse {
          0%, 100% { opacity: 0.03; }
          50% { opacity: 0.06; }
        }
        @keyframes subtleDrift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(10px, -10px) scale(1.05); }
          66% { transform: translate(-8px, 8px) scale(0.97); }
        }
        @keyframes portraitReveal {
          from { opacity: 0; transform: scale(1.1); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes sacredFloat {
          0%, 100% { transform: translate(0, 0); opacity: 0.15; }
          25% { transform: translate(8px, -12px); opacity: 0.3; }
          50% { transform: translate(-5px, -20px); opacity: 0.12; }
          75% { transform: translate(12px, 5px); opacity: 0.25; }
        }
        @keyframes haloPulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(1.06); }
        }
        @keyframes haloExpand {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        .oracle-scroll::-webkit-scrollbar { display: none; }
        .oracle-scroll { scrollbar-width: none; }
      `}</style>

      {/* Full-screen portal */}
      <div
        className="fixed inset-0 z-50 flex flex-col overflow-x-hidden overflow-y-hidden"
        style={{
          background: bgGradient,
          opacity: mounted ? 1 : 0,
          transition: "opacity 0.5s ease-out",
        }}
      >
        {/* Sacred particles */}
        <SacredParticles accent={accent} />

        {/* Philosopher watermark */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <span
            className="text-white/[0.03] text-[280px] leading-none select-none"
            style={{ fontFamily: SERIF }}
          >
            {theme.watermark}
          </span>
        </div>

        {/* Ambient drift */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: "120%",
            height: "120%",
            top: "-10%",
            left: "-10%",
            background: `radial-gradient(circle at 30% 70%, rgba(${accent},0.06) 0%, transparent 50%)`,
            animation: "subtleDrift 20s ease-in-out infinite",
          }}
        />

        {/* Close button — always visible */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute top-4 right-4 z-[60] w-10 h-10 rounded-full flex items-center justify-center text-white/40 hover:text-white/90 transition-all duration-200 cursor-pointer"
          style={{
            backgroundColor: "rgba(0,0,0,0.4)",
            border: `1px solid rgba(${accent},0.2)`,
            backdropFilter: "blur(8px)",
          }}
          aria-label="Close"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* ─── Question Phase ─── */}
        {phase === "question" && (
          <div className="relative flex-1 flex flex-col overflow-y-auto oracle-scroll px-6">
            {/* Philosopher portrait with themed halo */}
            <div className="flex flex-col items-center pt-10 pb-4">
              {philosopherImage && (
                <div
                  className="relative mb-6"
                  style={{
                    animation: mounted
                      ? "portraitReveal 1.2s ease-out both"
                      : "none",
                  }}
                >
                  {/* Outer glow */}
                  <div
                    className="absolute -inset-10 rounded-full blur-3xl"
                    style={{
                      background: `radial-gradient(circle, rgba(${halo},0.3) 0%, transparent 70%)`,
                      animation: "haloPulse 4s ease-in-out infinite alternate",
                    }}
                  />
                  {/* Accent ring */}
                  <div
                    className="absolute -inset-4 rounded-full"
                    style={{
                      border: `1px solid rgba(${accent},0.25)`,
                      animation: "haloExpand 1.5s ease-out 0.3s both",
                    }}
                  />
                  {/* Inner glow */}
                  <div
                    className="absolute -inset-2 rounded-full blur-lg"
                    style={{
                      background: `radial-gradient(circle, rgba(${halo},0.25) 0%, transparent 70%)`,
                    }}
                  />
                  {/* Portrait */}
                  <div
                    className="relative w-40 h-40 rounded-full overflow-hidden shadow-2xl"
                    style={{ border: `2px solid rgba(${accent},0.3)` }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={philosopherImage}
                      alt={`${name} portrait`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              {/* Name */}
              <div
                style={{
                  animation: mounted
                    ? "slideUp 0.8s ease-out 0.3s both"
                    : "none",
                }}
              >
                <h2
                  className="text-white text-2xl font-semibold tracking-wide text-center"
                  style={{ fontFamily: SERIF }}
                >
                  {name}
                </h2>
                <p
                  className="text-center mt-1"
                  style={{
                    color: `rgba(${accent},0.7)`,
                    fontFamily: SERIF,
                    fontSize: "1.1rem",
                  }}
                >
                  {nameZh}
                </p>
                <p className="text-white/25 text-[10px] tracking-[0.25em] uppercase text-center mt-2">
                  {config?.specialty}
                </p>
                {/* Themed separator */}
                <div className="flex items-center gap-3 mt-4 justify-center">
                  <div
                    className="w-12 h-px"
                    style={{
                      background: `linear-gradient(90deg, transparent, rgba(${accent},0.35))`,
                    }}
                  />
                  <span
                    style={{ color: `rgba(${accent},0.4)` }}
                    className="text-[11px]"
                  >
                    {theme.separator}
                  </span>
                  <div
                    className="w-12 h-px"
                    style={{
                      background: `linear-gradient(90deg, rgba(${accent},0.35), transparent)`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Oracle lots */}
            {config && (
              <div
                className="space-y-2 mb-6"
                style={{
                  animation: mounted
                    ? "slideUp 0.8s ease-out 0.5s both"
                    : "none",
                }}
              >
                <p
                  className="text-white/25 text-[10px] tracking-[0.2em] text-center mb-3"
                  style={{ fontFamily: SERIF }}
                >
                  Choose Your Question
                </p>
                {config.scenarios.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => consult(s.question)}
                    className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-r-lg group cursor-pointer transition-all duration-300 hover:translate-x-1"
                    style={{
                      background: `linear-gradient(135deg, rgba(${accent},0.08) 0%, rgba(${accent},0.02) 100%)`,
                      borderLeft: `2px solid rgba(${accent},0.4)`,
                    }}
                  >
                    <span
                      className="text-xs flex-shrink-0 w-10 text-center"
                      style={{
                        fontFamily: SERIF,
                        color: `rgba(${accent},0.5)`,
                      }}
                    >
                      {"第"}{i + 1}{"签"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-white/30 text-[10px] uppercase tracking-[0.15em] block mb-0.5">
                        {s.label}
                      </span>
                      <span
                        className="text-white/75 text-sm leading-relaxed group-hover:text-white/95 transition-colors"
                        style={{ fontFamily: SERIF }}
                      >
                        {s.question}
                      </span>
                    </div>
                    <svg
                      className="w-3 h-3 text-white/10 group-hover:text-white/30 transition-colors flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            )}

            {/* Scroll input */}
            <div
              className="mt-auto pb-6"
              style={{
                animation: mounted
                  ? "slideUp 0.8s ease-out 0.7s both"
                  : "none",
              }}
            >
              {errorMsg === "limit" && (
                <div
                  className="mb-4 px-4 py-3 rounded-xl"
                  style={{
                    backgroundColor: "rgba(0,0,0,0.3)",
                    border: `1px solid rgba(${accent},0.15)`,
                  }}
                >
                  {isSubscribed ? (
                    <p
                      className="text-white/60 text-sm leading-relaxed"
                      style={{ fontFamily: SERIF }}
                    >
                      Daily consultation limit reached (10/day). Please return tomorrow for deeper consultations.
                    </p>
                  ) : (
                    <>
                      <p
                        className="text-white/60 text-sm leading-relaxed"
                        style={{ fontFamily: SERIF }}
                      >
                        Daily free consultation limit reached.{" "}
                        {user
                          ? "Unlock unlimited access for deeper consultations."
                          : "Sign in to unlock unlimited access."}
                      </p>
                      <button
                        onClick={handleUnlock}
                        disabled={unlocking}
                        className="mt-3 w-full py-2.5 rounded-lg text-sm font-medium disabled:opacity-40 transition-all duration-200 cursor-pointer"
                        style={{
                          backgroundColor: `rgba(${accent},0.15)`,
                          border: `1px solid rgba(${accent},0.2)`,
                          color: "rgba(255,255,255,0.85)",
                          fontFamily: SERIF,
                        }}
                      >
                        {unlocking
                          ? "Redirecting..."
                          : user
                            ? "Unlock Unlimited · $4.99/month"
                            : "Sign In to Unlock"}
                      </button>
                    </>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div
                  className="h-px"
                  style={{
                    background: `linear-gradient(90deg, transparent, rgba(${accent},0.3), transparent)`,
                  }}
                />
                <div
                  className="flex items-stretch"
                  style={{
                    backgroundColor: `rgba(${accent},0.04)`,
                    borderLeft: `1px solid rgba(${accent},0.12)`,
                    borderRight: `1px solid rgba(${accent},0.12)`,
                  }}
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={`Ask ${name} · 向${nameZh}求问`}
                    className="flex-1 bg-transparent border-none px-4 py-3.5 text-white text-sm placeholder:text-white/15 focus:outline-none"
                    style={{ fontFamily: SERIF }}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="px-5 text-sm font-medium disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer hover:bg-white/10"
                    style={{
                      color: `rgba(${accent},0.85)`,
                      fontFamily: SERIF,
                    }}
                  >
                    {config?.consultLabel || "Consult"}
                  </button>
                </div>
                <div
                  className="h-px"
                  style={{
                    background: `linear-gradient(90deg, transparent, rgba(${accent},0.3), transparent)`,
                  }}
                />
              </form>
            </div>
          </div>
        )}

        {/* ─── Loading Phase ─── */}
        {phase === "loading" && (
          <div className="relative flex-1 flex flex-col items-center justify-center px-8">
            {philosopherImage && (
              <div
                className="relative mb-8"
                style={{ animation: "portraitReveal 1s ease-out both" }}
              >
                <div
                  className="absolute -inset-6 rounded-full blur-2xl"
                  style={{
                    background: `radial-gradient(circle, rgba(${halo},0.35) 0%, transparent 70%)`,
                    animation: "haloPulse 3s ease-in-out infinite alternate",
                  }}
                />
                <div
                  className="relative w-24 h-24 rounded-full overflow-hidden"
                  style={{ border: `1.5px solid rgba(${accent},0.3)` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={philosopherImage}
                    alt={`${name} portrait`}
                    className="w-full h-full object-cover"
                    style={{
                      animation: "ambientPulse 3s ease-in-out infinite",
                    }}
                  />
                </div>
              </div>
            )}
            <RitualAnimation
              type={ritualType}
              character={centerChar}
              accent={accent}
            />
            <p
              className="text-white/35 text-sm italic tracking-wide"
              style={{
                fontFamily: SERIF,
                animation: ritualReady
                  ? "ritualTextPulse 2.5s ease-in-out infinite"
                  : "none",
                opacity: ritualReady ? 1 : 0,
                transition: "opacity 0.6s ease-out",
              }}
            >
              {config?.ritualText || "Consulting the oracle..."}
            </p>
          </div>
        )}

        {/* ─── Reading Phase ─── */}
        {phase === "reading" && (
          <div className="absolute inset-0 flex flex-col">
            {/* Fixed header */}
            <div
              className="flex-shrink-0 flex items-center gap-3 px-5 py-3"
              style={{
                backgroundColor: "rgba(8,8,13,0.95)",
                borderBottom: `1px solid rgba(${accent},0.2)`,
              }}
            >
              {philosopherImage && (
                <div
                  className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0"
                  style={{
                    border: `1.5px solid rgba(${accent},0.35)`,
                    boxShadow: `0 0 12px rgba(${halo},0.3)`,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={philosopherImage}
                    alt={`${name} portrait`}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p
                  className="text-white/90 text-sm font-medium truncate"
                  style={{ fontFamily: SERIF }}
                >
                  {name}
                </p>
                <p
                  className="text-xs truncate"
                  style={{
                    color: `rgba(${accent},0.6)`,
                    fontFamily: SERIF,
                  }}
                >
                  {nameZh} &middot; {config?.specialty}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full flex items-center justify-center text-white/50 hover:text-white transition-all duration-200 cursor-pointer flex-shrink-0"
                style={{
                  backgroundColor: "rgba(255,255,255,0.08)",
                  border: `1px solid rgba(${accent},0.2)`,
                }}
                aria-label="Close"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Scrollable text area */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto oracle-scroll px-6 py-5"
            >
              {/* Themed decorative header */}
              <div className="flex items-center gap-3 mb-6 justify-center">
                <div
                  className="w-16 h-px"
                  style={{
                    background: `linear-gradient(90deg, transparent, rgba(${accent},0.25))`,
                  }}
                />
                <span
                  style={{ color: `rgba(${accent},0.35)` }}
                  className="text-[10px] tracking-[0.15em]"
                >
                  {theme.headerDecor}
                </span>
                <div
                  className="w-16 h-px"
                  style={{
                    background: `linear-gradient(90deg, rgba(${accent},0.25), transparent)`,
                  }}
                />
              </div>
              <ReadingDisplay
                text={reading}
                streaming={streaming}
                accent={accent}
              />
            </div>

            {/* Fixed footer */}
            <div
              className="flex-shrink-0 px-5 py-3 flex items-center justify-between"
              style={{
                backgroundColor: "rgba(8,8,13,0.95)",
                borderTop: `1px solid rgba(${accent},0.12)`,
              }}
            >
              <p
                className="text-white/15 text-[10px] tracking-wider"
                style={{ fontFamily: SERIF }}
              >
                {theme.footerLabel}
              </p>
              {!isSubscribed && (
                <button
                  onClick={handleUnlock}
                  disabled={unlocking}
                  className="text-[11px] font-medium px-3.5 py-1.5 rounded-full disabled:opacity-40 cursor-pointer transition-all duration-200 hover:bg-white/10"
                  style={{
                    backgroundColor: `rgba(${accent},0.1)`,
                    border: `1px solid rgba(${accent},0.18)`,
                    color: `rgba(${accent},0.75)`,
                    fontFamily: SERIF,
                  }}
                >
                  {unlocking ? "Redirecting..." : "Unlock · $4.99/mo"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ─── Error Phase ─── */}
        {phase === "error" && (
          <div className="relative flex-1 flex flex-col items-center justify-center px-8">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
              style={{
                backgroundColor: "rgba(255,255,255,0.03)",
                border: `1px solid rgba(${accent},0.12)`,
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="1.5"
                opacity={0.3}
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <p
              className="text-white/45 text-sm text-center mb-4 leading-relaxed"
              style={{ fontFamily: SERIF }}
            >
              {errorMsg}
            </p>
            <button
              onClick={() => {
                setPhase("question");
                setErrorMsg("");
              }}
              className="px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-white/10 transition-all duration-200 cursor-pointer"
              style={{
                backgroundColor: `rgba(${accent},0.08)`,
                border: `1px solid rgba(${accent},0.12)`,
                color: "rgba(255,255,255,0.7)",
                fontFamily: SERIF,
              }}
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </>
  );
}
