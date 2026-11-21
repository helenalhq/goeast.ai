"use client";

import { useEffect } from "react";
import { logEvent } from "@/lib/analytics";

/**
 * Funnel: fires `offer_viewed` once when the paid offer is actually
 * displayed on the pricing page (not on homepage loads or link clicks).
 * Scalars only — no user data.
 */
export default function OfferViewedTracker({ offerId }: { offerId: string }) {
  useEffect(() => {
    logEvent("offer_viewed", { offer_id: offerId, channel: "web", path: "pricing" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on mount
  }, []);
  return null;
}
