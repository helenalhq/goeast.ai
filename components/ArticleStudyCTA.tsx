"use client";

import { buildStudyContext, sealIchingContext, ICHING_CONTEXT_DRAFT_KEY } from "@/lib/iching-context";
import { saveDraft, clearDraft, saveSource } from "@/lib/draft";
import { logEvent } from "@/lib/analytics";

/** Source-attribution key for the Oracle overlay to read on open.
 *  Only pathname, no query params or user input. Cleared after one read. */
const SOURCE_KEY = "oracle-source";

/**
 * In-article AI study entry — placed after the intro (citation) and before
 * the long interpretation (Judgment) on selected hexagram pages.
 *
 * Uses `window.location.assign` (full navigation) instead of `router.push`
 * to guarantee the #oracle hash is correctly set on every navigation,
 * including re-entry after browser Back. SPA router.push on the same route
 * with a hash can produce duplicated hash fragments (#oracle#oracle) when
 * the router's internal history state is out of sync with the browser.
 */
export default function ArticleStudyCTA({
  hexagramNumber,
  hexagramSlug,
}: {
  hexagramNumber: number;
  hexagramSlug: string;
}) {
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

    // Full page navigation — guarantees fresh mount + correct hash every time.
    // sessionStorage drafts survive full navigations within the same tab.
    window.location.assign("/sophies-journey/prologue-zhougong#oracle");
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
