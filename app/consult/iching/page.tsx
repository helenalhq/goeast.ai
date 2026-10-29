import type { Metadata } from "next";
import { getAllHexagrams } from "@/lib/iching-data";
import GuidedFlow from "./GuidedFlow";

export const metadata: Metadata = {
  title: "Guided I Ching Consultation | GoEast.ai",
  description:
    "Three short questions, one coin cast, one reading. Organize what's on your mind and consult the I Ching with Zhou Gong.",
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
        <GuidedFlow hexagrams={hexagrams} />
      </main>
    </div>
  );
}
