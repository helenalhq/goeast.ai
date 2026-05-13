"use client";

import { useState } from "react";
import { getOracleScenarios } from "@/lib/oracle-scenarios";

interface OracleOverlayProps {
  slug: string;
  name: string;
  nameZh: string;
  color: string;
  onClose: () => void;
}

type Phase = "question" | "loading" | "reading" | "error";

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

  const config = getOracleScenarios(slug);

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
    <div className="absolute inset-0 z-20 flex flex-col" style={{ backgroundColor: `${color}f2` }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={0.7}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="text-white text-xs font-medium">Consult {name}</span>
          <span className="text-white/40 text-[10px]">{config?.specialty}</span>
        </div>
        <button onClick={onClose} className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center text-white/60 hover:text-white transition-colors">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Question phase */}
      {phase === "question" && (
        <div className="flex-1 flex flex-col px-4 pt-1">
          {errorMsg === "limit" && (
            <div className="mb-2 px-3 py-2 rounded-lg bg-white/10 text-white/80 text-[10px] leading-snug">
              You&apos;ve used your free consultation today. Come back tomorrow, or unlock unlimited for $4.99/month.
            </div>
          )}

          {config && (
            <div className="space-y-1.5 mb-3">
              {config.scenarios.map((s, i) => (
                <button
                  key={i}
                  onClick={() => consult(s.question)}
                  className="w-full text-left px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <span className="text-white/50 text-[10px] block mb-0.5">{s.label}</span>
                  <span className="text-white/85 text-[11px] leading-snug">{s.question}</span>
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-auto pb-4">
            <div className="flex gap-1.5">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Ask ${nameZh} anything...`}
                className="flex-1 bg-white/10 border border-white/15 rounded-lg px-2.5 py-1.5 text-white text-[11px] placeholder:text-white/35 focus:outline-none focus:border-white/30 transition-colors"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="px-2.5 py-1.5 bg-white/20 rounded-lg text-white text-[11px] font-medium hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Consult
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Loading phase */}
      {phase === "loading" && (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 border-2 border-white/20 rounded-full animate-spin" style={{ animationDuration: "3s" }} />
            <div className="absolute inset-2 border border-white/40 rounded-full animate-spin" style={{ animationDuration: "2s", animationDirection: "reverse" }} />
            <div className="absolute inset-0 flex items-center justify-center text-white/80 text-lg">
              {config?.specialtyZh?.charAt(0) || "?"}
            </div>
          </div>
          <p className="text-white/60 text-xs animate-pulse">Consulting the oracle...</p>
        </div>
      )}

      {/* Reading phase */}
      {phase === "reading" && (
        <div className="flex-1 flex flex-col px-4 pt-1 overflow-y-auto">
          <div className="h-px bg-white/15 mb-3" />
          <div className="flex-1 text-white/90 text-[12px] leading-[1.75] whitespace-pre-wrap">
            {reading}
          </div>
          <div className="mt-3 pb-3">
            <p className="text-white/40 text-[9px] text-center">
              Free consultation today ·{" "}
              <a href="#" className="underline hover:text-white/60">Unlock unlimited — $4.99/month</a>
            </p>
          </div>
        </div>
      )}

      {/* Error phase */}
      {phase === "error" && (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <p className="text-white/70 text-xs text-center mb-3">{errorMsg}</p>
          <button
            onClick={() => { setPhase("question"); setErrorMsg(""); }}
            className="px-3 py-1.5 bg-white/15 rounded-lg text-white text-[11px] hover:bg-white/25 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
