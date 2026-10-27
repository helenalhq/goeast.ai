"use client";

import Link from "next/link";
import { clearDraft } from "@/lib/draft";
import { ICHING_CONTEXT_DRAFT_KEY } from "@/lib/iching-context";
import { logEvent } from "@/lib/analytics";

/**
 * "Try I Ching" entry — links directly to the existing Oracle tool
 * (Zhou Gong, /sophies-journey/prologue-zhougong#oracle).
 *
 * - Uses next/link for client-side navigation with prefetch; renders as a
 *   semantic <a> so new-tab (Cmd+Click) and keyboard navigation work.
 * - Clears any inherited article study context (gen/kun) so the user enters
 *   the Oracle in its default state, not accidentally studying a hexagram
 *   they were reading about earlier.
 * - Does NOT pre-fill a question, auto-submit, consume quota, or bypass login.
 *   Login flow is handled by the Oracle itself when the user consults.
 */
export default function TryIChingLink({
  source,
  className,
  children,
}: {
  source: "pricing" | "writing-habit-example";
  className?: string;
  children: React.ReactNode;
}) {
  const handleClick = () => {
    logEvent("try_iching_clicked", { source });

    // Clear inherited study context — entering from pricing/example means
    // the user wants the default Oracle experience, not a hexagram study
    // session left over from reading a gen/kun article.
    clearDraft(ICHING_CONTEXT_DRAFT_KEY);
    // Also clear any pending source attribution from an article CTA.
    clearDraft("oracle-source");
    // Clear old question draft — new session.
    clearDraft("oracle:prologue-zhougong");
  };

  return (
    <Link
      href="/sophies-journey/prologue-zhougong#oracle"
      onClick={handleClick}
      className={className}
    >
      {children}
    </Link>
  );
}
