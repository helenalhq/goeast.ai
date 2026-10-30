import type { Metadata } from "next";
import Link from "next/link";
import EntryViewTracker from "./EntryViewTracker";
import MyReadings from "./MyReadings";

export const metadata: Metadata = {
  title: "Consult — Organize a Question | GoEast.ai",
  description:
    "Guided I Ching consultation: bring a real question, cast the coins, and receive a traditional teaching plus an AI interpretation for reflection.",
  alternates: {
    canonical: "/consult",
    languages: {
      en: "https://www.goeast.ai/consult",
      "x-default": "https://www.goeast.ai/consult",
    },
  },
};

export default function ConsultPage() {
  return (
    <div className="min-h-screen bg-cream">
      <EntryViewTracker />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <p className="text-xs uppercase tracking-widest text-warm mb-3">Consult</p>
        <h1 className="font-serif text-3xl sm:text-4xl text-ink mb-4">
          Bring a real question, get a real reading
        </h1>
        <p className="text-ink/80 leading-relaxed mb-8 max-w-2xl">
          The I Ching has been consulted for three thousand years as a way to think clearly
          about a situation — not to predict the future, but to see it from an angle you
          might have missed. We&apos;ll help you organize what&apos;s on your mind into a
          focused question, cast the coins, and give you the traditional teaching behind
          your hexagram plus an AI interpretation written for your situation.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Primary: guided I Ching flow */}
          <Link
            href="/consult/iching"
            className="group block p-6 bg-white/60 rounded-xl border-2 border-china-red/60 hover:border-china-red transition-colors"
          >
            <h2 className="font-serif text-xl text-ink mb-2 group-hover:text-china-red transition-colors">
              Organize a question →
            </h2>
            <p className="text-sm text-ink/75 leading-relaxed mb-3">
              A short guided flow — three questions, then a coin cast. You get:
            </p>
            <ul className="text-sm text-ink/75 space-y-1.5">
              <li>· Your hexagram with its classical judgment</li>
              <li>· An AI interpretation of your specific situation</li>
              <li>· Open questions to sit with, and a place to note your next step</li>
            </ul>
            <span className="inline-block mt-4 text-xs text-warm">
              Free casting · AI interpretation requires a free account (3/day, Pro 10/day)
            </span>
          </Link>

          {/* Secondary: Zi Wei tool */}
          <Link
            href="/ziwei"
            className="group block p-6 bg-white/40 rounded-xl border border-sand hover:border-warm transition-colors"
          >
            <h2 className="font-serif text-xl text-ink mb-2 group-hover:text-warm transition-colors">
              Understand yourself or a relationship →
            </h2>
            <p className="text-sm text-ink/75 leading-relaxed mb-3">
              Zi Wei Dou Shu — Chinese astrology mapped from your birth data. Explore your
              palaces and patterns, or compare two charts for relationship dynamics.
            </p>
            <span className="inline-block mt-4 text-xs text-warm">Free chart · AI readings with an account</span>
          </Link>
        </div>

        <div className="mt-8 p-5 bg-sand/30 rounded-lg border border-sand/60">
          <p className="text-sm text-ink/80">
            Not sure what a finished consultation looks like?{" "}
            <Link
              href="/examples/iching-writing-habit"
              className="text-china-red underline underline-offset-2 hover:text-china-red/80"
            >
              See a completed example
            </Link>{" "}
            — a real reading about building a writing habit.
          </p>
        </div>

        <p className="mt-8 text-xs text-warm/80 leading-relaxed">
          Readings are material for reflection — never a prediction of what will
          happen, never a reason to fear, and never a reason to pay.
        </p>
      </main>

      {/* Recent readings for logged-in users — minimal history entry point */}
      <MyReadings />
    </div>
  );
}
