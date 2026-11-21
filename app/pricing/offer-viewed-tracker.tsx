"use client";

import React, { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { logEvent } from "@/lib/analytics";

const OFFER_JOURNEY_MS = 30 * 60_000;

/** Observe the compact group containing the live CTA and its quote, not the
 * whole pricing card. The tab-local timestamp expires; it is not a user ID. */
export default function OfferViewedTracker({
  offerId,
  children,
  enabled = true,
  path = "pricing",
  previewQa = false,
}: {
  offerId: string;
  children: ReactNode;
  enabled?: boolean;
  path?: "pricing" | "consult_iching";
  previewQa?: boolean;
}) {
  const quote = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = quote.current;
    if (!enabled || !target || typeof IntersectionObserver === "undefined") return;

    const key = `goeast:offer-viewed:${offerId}`;
    let fullyVisible = false;
    let counted = false;

    const countIfVisible = () => {
      if (counted || !fullyVisible || document.visibilityState !== "visible") return;
      counted = true;

      const now = Date.now();
      try {
        const saved = sessionStorage.getItem(key);
        const previous = Number(saved);
        if (saved !== null && now >= previous && now - previous < OFFER_JOURNEY_MS) return;
        sessionStorage.setItem(key, String(now));
      } catch {
        // Without session storage, only deduplicate for this mount.
      }
      logEvent("offer_viewed", {
        offer_id: offerId,
        channel: "web",
        path,
        ...(previewQa ? { env: "preview", qa: "decision-report-preview" } : {}),
      });
    };

    const observer = new IntersectionObserver((entries) => {
      const entry = entries.at(-1);
      fullyVisible = entry?.isIntersecting === true && entry.intersectionRatio >= 1;
      countIfVisible();
    }, { threshold: 1 });
    observer.observe(target);
    document.addEventListener("visibilitychange", countIfVisible);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", countIfVisible);
    };
  }, [enabled, offerId, path, previewQa]);

  return <div ref={quote}>{children}</div>;
}
