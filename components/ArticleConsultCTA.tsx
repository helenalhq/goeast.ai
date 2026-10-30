"use client";

import Link from "next/link";
import { logEvent } from "@/lib/analytics";

/**
 * In-article consultation CTA for philosophy articles with search traffic.
 * Links to the guided /consult flow (not directly to the Oracle overlay),
 * so the user gets the structured wizard experience.
 *
 * - States login requirement and free quota upfront
 * - Includes a "See a completed example" link for social proof
 * - Does NOT package free results as Pro-only
 * - Mobile-first layout
 */
export default function ArticleConsultCTA({
  sourceArticle,
  title,
  subtitle,
}: {
  sourceArticle: string;
  title: string;
  subtitle: string;
}) {
  const handleClick = () => {
    logEvent("try_iching_clicked", {
      source: "article",
      source_article: sourceArticle,
    });
  };

  return (
    <div className="mt-8 mb-8 p-5 sm:p-6 bg-gradient-to-br from-cream to-white rounded-xl border border-sand text-center">
      <p className="font-serif text-ink text-lg sm:text-xl mb-2">{title}</p>
      <p className="text-sm text-warm mb-4 max-w-md mx-auto leading-relaxed">{subtitle}</p>

      <div className="flex flex-col sm:flex-row justify-center gap-3 mb-3">
        <Link
          href="/consult"
          onClick={handleClick}
          className="inline-block px-6 py-3 rounded-full bg-china-red text-white font-medium text-sm hover:bg-china-red/90 transition-colors no-underline"
        >
          Try a Free Consultation →
        </Link>
        <Link
          href="/examples/iching-writing-habit"
          className="inline-block px-6 py-3 rounded-full border border-sand text-ink font-medium text-sm hover:border-china-red hover:text-china-red transition-colors no-underline"
        >
          See a Completed Example
        </Link>
      </div>

      <p className="text-xs text-warm/60">
        Free account required for AI reading · 3 free consultations per day · Pro: 10/day + deeper readings
      </p>
    </div>
  );
}
