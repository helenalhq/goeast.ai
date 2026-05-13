"use client";

import { useState, useRef, useEffect } from "react";
import OracleOverlay from "./OracleOverlay";

interface PhilosopherIntroProps {
  slug: string;
  intro: string;
  name: string;
  nameZh: string;
  color: string;
}

export default function PhilosopherIntro({
  slug,
  intro,
  name,
  nameZh,
  color,
}: PhilosopherIntroProps) {
  const [introOpen, setIntroOpen] = useState(false);
  const [consultOpen, setConsultOpen] = useState(false);
  const [displayed, setDisplayed] = useState("");
  const [typing, setTyping] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (introOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTyping(true);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayed("");
      let i = 0;
      const type = () => {
        if (i < intro.length) {
          setDisplayed(intro.slice(0, i + 1));
          i++;
          timerRef.current = setTimeout(type, 28);
        } else {
          setTyping(false);
        }
      };
      timerRef.current = setTimeout(type, 300);
    } else {
      setDisplayed("");
      setTyping(false);
    }
  }, [introOpen, intro]);

  return (
    <>
      {/* Floating buttons on the portrait */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex gap-2">
        <button
          onClick={() => { setIntroOpen(true); setConsultOpen(false); }}
          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-full text-white text-[11px] font-medium backdrop-blur-sm transition-all hover:scale-105 active:scale-95 shadow-lg"
          style={{ backgroundColor: color }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Meet
        </button>
        <button
          onClick={() => { setConsultOpen(true); setIntroOpen(false); }}
          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-full text-white text-[11px] font-medium backdrop-blur-sm transition-all hover:scale-105 active:scale-95 shadow-lg bg-white/25 hover:bg-white/35"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Consult
        </button>
      </div>

      {/* Intro overlay */}
      {introOpen && (
        <div
          className="absolute inset-0 z-20 flex flex-col p-5 cursor-pointer"
          style={{ backgroundColor: `${color}f2` }}
          onClick={() => setIntroOpen(false)}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-medium">
                {nameZh.charAt(0)}
              </div>
              <div>
                <span className="text-white text-sm font-medium">{name}</span>
                <span className="text-white/60 text-xs ml-1.5">{nameZh}</span>
              </div>
            </div>
            <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/25 transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
          </div>
          <div className="h-px bg-white/15 mb-4" />
          <div className="flex-1 text-white/90 text-[13px] leading-[1.7]">
            {displayed}
            {typing && (
              <span className="inline-block w-0.5 h-3.5 bg-white/60 animate-pulse ml-0.5 align-middle rounded-sm" />
            )}
          </div>
          {!typing && displayed && (
            <p className="text-white/40 text-[10px] text-center mt-3">tap anywhere to close</p>
          )}
        </div>
      )}

      {/* Consult overlay */}
      {consultOpen && (
        <OracleOverlay
          slug={slug}
          name={name}
          nameZh={nameZh}
          color={color}
          onClose={() => setConsultOpen(false)}
        />
      )}
    </>
  );
}
