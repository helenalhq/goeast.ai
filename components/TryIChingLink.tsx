"use client";

import { clearDraft } from "@/lib/draft";
import { ICHING_CONTEXT_DRAFT_KEY } from "@/lib/iching-context";
import { logEvent } from "@/lib/analytics";

/**
 * "Try I Ching" entry — links directly to the existing Oracle tool
 * (Zhou Gong, /sophies-journey/prologue-zhougong#oracle).
 *
 * Uses a plain <a> tag (NOT next/link) because full page navigation is
 * required for reliable #oracle hash handling. When the user has previously
 * visited the Oracle page (e.g. from an article study CTA), Next.js's
 * client-side router retains stale state and <Link> can produce a doubled
 * hash fragment (#oracle#oracle). A full page load always fresh-mounts the
 * component and sets the hash correctly.
 *
 * - <a href="..."> default behavior = full page navigation (what we want)
 * - Cmd+Click / middle-click opens in new tab (href used directly)
 * - onClick fires before navigation to clear drafts + fire analytics
 * - Does NOT pre-fill, auto-submit, consume quota, or bypass login.
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
    // eslint-disable-next-line @next/next/no-html-link-for-pages -- full page navigation is intentional for hash reliability (see comment above)
    <a
      href="/sophies-journey/prologue-zhougong#oracle"
      onClick={handleClick}
      className={className}
    >
      {children}
    </a>
  );
}
