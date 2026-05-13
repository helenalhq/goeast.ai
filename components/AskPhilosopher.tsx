"use client";

import { useState } from "react";
import { getSuggestedQuestions } from "@/lib/ask-questions";

interface AskPhilosopherProps {
  slug: string;
  name: string;
  nameZh: string;
  era: string;
  school: string;
  schoolZh: string;
  color: string;
  onClose: () => void;
}

export default function AskPhilosopher({
  slug,
  name,
  nameZh,
  era,
  schoolZh,
  color,
  onClose,
}: AskPhilosopherProps) {
  const [input, setInput] = useState("");
  const questions = getSuggestedQuestions(slug).slice(0, 2);

  const buildPrompt = (question: string) =>
    `You are ${name} (${nameZh}), the ${era} philosopher of ${schoolZh}. Answer the following question in character, as if you are ${name} speaking directly. Stay true to your philosophical views. Keep the answer concise (150-200 words).\n\nQuestion: ${question}`;

  const ask = (question: string) => {
    const prompt = buildPrompt(question);
    const encoded = encodeURIComponent(prompt);
    window.open(`https://chat.openai.com/?q=${encoded}`, "_blank");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      ask(input.trim());
      onClose();
    }
  };

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col p-4"
      style={{ backgroundColor: `${color}f2` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="text-white text-xs font-medium">Ask {name}</span>
          <span className="text-white/40 text-[10px]">{schoolZh}</span>
        </div>
        <button
          onClick={onClose}
          className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center text-white/60 hover:text-white transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Suggested questions */}
      <div className="space-y-1.5 mb-3">
        {questions.map((q, i) => (
          <button
            key={i}
            onClick={() => ask(q.question)}
            className="w-full text-left px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <span className="text-white/50 text-[10px] block mb-0.5">{q.label}</span>
            <span className="text-white/85 text-[11px] leading-snug">{q.question}</span>
          </button>
        ))}
      </div>

      {/* Custom question input */}
      <form onSubmit={handleSubmit} className="mt-auto">
        <div className="flex gap-1.5">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask ${nameZh}...`}
            className="flex-1 bg-white/10 border border-white/15 rounded-lg px-2.5 py-1.5 text-white text-[11px] placeholder:text-white/35 focus:outline-none focus:border-white/30 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="px-2.5 py-1.5 bg-white/20 rounded-lg text-white text-[11px] font-medium hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Ask
          </button>
        </div>
        <p className="text-white/30 text-[9px] text-center mt-2">Opens ChatGPT with your question</p>
      </form>
    </div>
  );
}
