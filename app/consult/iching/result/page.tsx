import type { Metadata } from "next";
import { Suspense } from "react";
import ResultView from "./ResultView";

export const metadata: Metadata = {
  title: "Your I Ching Reading | GoEast.ai",
  description:
    "Your question, your cast, the traditional teaching, and an AI interpretation for reflection.",
  robots: { index: false },
};

export default function ConsultResultPage() {
  return (
    <div className="min-h-screen bg-cream">
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <Suspense
          fallback={<div className="p-6 bg-cream rounded-xl border border-sand text-center text-warm">Loading…</div>}
        >
          <ResultView />
        </Suspense>
      </main>
    </div>
  );
}
