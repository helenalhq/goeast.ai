"use client";

import { useRouter } from "next/navigation";
import { buildStudyContext, sealIchingContext, ICHING_CONTEXT_DRAFT_KEY } from "@/lib/iching-context";
import { saveDraft, clearDraft, saveSource } from "@/lib/draft";
import { logEvent } from "@/lib/analytics";

/** Source-attribution key for the Oracle overlay to read on open.
 *  Only pathname, no query params or user input. Cleared after one read. */
const SOURCE_KEY = "oracle-source";

/**
 * In-article AI study entry — placed between the intro (Judgment/Image)
 * and the long interpretation (Modern Application) on selected hexagram
 * pages. Links to the SAME study-mode flow as the bottom OracleStudyLink,
 * with source attribution so article-driven visits are distinguishable.
 *
 * Does NOT: auto-submit, consume quota, trigger payment, or bypass login.
 */
export default function ArticleStudyCTA({
  hexagramNumber,
  hexagramSlug,
}: {
  hexagramNumber: number;
  hexagramSlug: string;
}) {
  const router = useRouter();

  const handleClick = () => {
    // Fire a click event with source info (scalars only, no PII)
    logEvent("hexagram_study_clicked", {
      hexagram: hexagramNumber,
      source_article: `/iching/${hexagramSlug}`,
      cta_position: "in_article",
    });

    // Store source for the Oracle overlay to attribute this session.
    // Cleared after one read in OracleOverlay — no cross-session tracking.
    saveSource(SOURCE_KEY, `/iching/${hexagramSlug}`);

    // Same study-mode setup as OracleStudyLink (start new consultation)
    clearDraft("oracle:prologue-zhougong");
    saveDraft(ICHING_CONTEXT_DRAFT_KEY, sealIchingContext(buildStudyContext(hexagramNumber)));
    router.push("/sophies-journey/prologue-zhougong#oracle");
  };

  return (
    <div className="mb-10 p-5 bg-cream rounded-lg border border-sand text-center">
      <p className="text-sm text-warm mb-3">
        Discuss this hexagram&rsquo;s meaning with the AI guide.
      </p>
      <button
        type="button"
        onClick={handleClick}
        className="inline-block px-6 py-2.5 rounded-full bg-ink text-white font-medium text-sm transition-colors hover:bg-ink/90 no-underline cursor-pointer"
      >
        Explore this hexagram with AI →
      </button>
      <p className="text-xs text-warm/50 mt-2">
        Free · no coins needed · login required for AI reading
      </p>
    </div>
  );
}
