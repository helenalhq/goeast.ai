"use client";

import Link from "next/link";
import { logEvent } from "@/lib/analytics";
import { clearDraft } from "@/lib/draft";
import { ICHING_CONTEXT_DRAFT_KEY } from "@/lib/iching-context";

/**
 * Zi Wei Dou Shu tool CTA for astrology-related articles.
 * Links to the existing /ziwei chart generator (free, no login required
 * for chart casting; AI interpretation requires login).
 *
 * Clears any inherited I Ching study context so the user enters the
 * Zi Wei tool in its default state.
 */
export default function ZiWeiToolCTA({
  sourceArticle,
  message,
}: {
  sourceArticle: string;
  message: string;
}) {
  const handleClick = () => {
    logEvent("ziwei_tool_clicked", {
      source_article: sourceArticle,
      cta_position: "article_bottom",
    });
    // Clear any I Ching study context — entering the Zi Wei tool
    // is a separate experience.
    clearDraft(ICHING_CONTEXT_DRAFT_KEY);
  };

  return (
    <div className="mt-12 p-6 bg-cream/60 rounded-sm text-center">
      <p className="font-serif text-ink text-lg mb-4">{message}</p>
      <Link
        href="/ziwei"
        onClick={handleClick}
        className="inline-block px-7 py-3 rounded-sm text-white font-medium text-sm transition-colors hover:opacity-90 no-underline"
        style={{ backgroundColor: "#2c1810" }}
      >
        Generate Your Free Zi Wei Chart →
      </Link>
      <p className="text-xs text-warm/50 mt-2">
        Free · no account needed for chart casting · AI interpretation requires login (3/day free, 10/day Pro)
      </p>
    </div>
  );
}
