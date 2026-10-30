import type { Metadata } from "next";
import { Suspense } from "react";
import SynastryResultView from "./SynastryResultView";

export const metadata: Metadata = {
  title: "Your Synastry Reading | GoEast.ai",
  description:
    "Both natal charts and the AI synastry interpretation — material for reflection, not prediction.",
  robots: { index: false },
};

export default function SynastryResultPage() {
  return (
    <div className="min-h-screen bg-cream">
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <Suspense
          fallback={<div className="p-6 bg-cream rounded-xl border border-sand text-center text-warm">Loading…</div>}
        >
          <SynastryResultView />
        </Suspense>
      </main>
    </div>
  );
}
