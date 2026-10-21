"use client";

import { useRouter } from "next/navigation";
import { buildStudyContext, ICHING_CONTEXT_DRAFT_KEY } from "@/lib/iching-context";
import { saveDraft } from "@/lib/draft";

/** "Study this hexagram" CTA — tells the Oracle the user is LEARNING this
 *  hexagram (no cast, no changing lines), replacing the generic Oracle CTA
 *  on hexagram reference pages. */
export default function OracleStudyLink({
  hexagramNumber,
  accentColor = "#8b4513",
  message,
}: {
  hexagramNumber: number;
  accentColor?: string;
  message: string;
}) {
  const router = useRouter();
  return (
    <div className="mt-12 p-6 bg-cream/60 rounded-sm text-center">
      <p className="font-serif text-ink text-lg mb-4">{message}</p>
      <button
        type="button"
        onClick={() => {
          saveDraft(ICHING_CONTEXT_DRAFT_KEY, buildStudyContext(hexagramNumber));
          router.push("/sophies-journey/prologue-zhougong#oracle");
        }}
        className="inline-block px-7 py-3 rounded-sm text-white font-medium text-sm transition-colors hover:opacity-90 no-underline"
        style={{ backgroundColor: accentColor }}
      >
        Study This Hexagram with Zhou Gong →
      </button>
      <p className="text-xs text-warm/50 mt-2">Free: 3 consultations per day · Pro: 10 per day + deep readings</p>
    </div>
  );
}
