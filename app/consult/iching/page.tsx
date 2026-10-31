import type { Metadata } from "next";
import { getAllHexagrams } from "@/lib/iching-data";
import GuidedFlow from "./GuidedFlow";

export const metadata: Metadata = {
  title: "I Ching Reading Online — AI Interpretation | GoEast",
  description:
    "Get a free I Ching reading online. Describe your situation, cast the coins, receive a classical teaching, AI interpretation, and reflection questions. 3 free readings per day.",
  alternates: {
    canonical: "/consult/iching",
    languages: {
      en: "https://www.goeast.ai/consult/iching",
      "x-default": "https://www.goeast.ai/consult/iching",
    },
  },
};

export default function ConsultIchingPage() {
  const hexagrams = getAllHexagrams();
  return (
    <div className="min-h-screen bg-cream">
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {/* SSR-rendered H1 and intro — visible in server HTML for SEO */}
        <header className="mb-8 text-center">
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink mb-3">
            Get an I Ching Reading Online
          </h1>
          <p className="text-warm max-w-xl mx-auto leading-relaxed">
            Describe what&apos;s on your mind, cast the coins, and receive a classical teaching,
            an AI interpretation, and reflection questions — in about two minutes.
            Chart casting is free; AI reading requires a free account (3/day, Pro 10/day).
          </p>
        </header>
        <GuidedFlow hexagrams={hexagrams} />
      </main>
    </div>
  );
}
