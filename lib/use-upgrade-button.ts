"use client";

import { useEffect, useState, useCallback } from "react";
import { logEvent } from "@/lib/analytics";

/**
 * Shared upgrade-button logic for all checkout entry points
 * (pricing, examples, account, oracle overlay).
 *
 * Fixes: browser Back from the Creem checkout page restores the page from
 * bfcache with `loading: true`, leaving the button permanently disabled.
 * The `pageshow` listener resets `loading` when the page is restored,
 * WITHOUT requiring a refresh or auto-redirect.
 *
 * Also guards against double-click duplicate checkouts: `loading` stays
 * `true` for the duration of the fetch, and resets on failure for retry.
 */
export function useUpgradeButton(from: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset loading when the page is restored from bfcache (browser Back).
  // event.persisted is true when the page came from the back-forward cache.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setLoading(false);
        setError(null);
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const handleUpgrade = useCallback(async () => {
    if (loading) return; // guard: no duplicate checkout while in flight
    setLoading(true);
    setError(null);
    logEvent("upgrade_clicked", { from });
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        // NOTE: do NOT reset loading here — the browser is navigating away.
        // If the user presses Back, the pageshow listener resets it.
      } else {
        setError(data.error || "Failed to start checkout");
        setLoading(false);
      }
    } catch {
      setError("Payment service unavailable");
      setLoading(false);
    }
  }, [from, loading]);

  return { loading, error, handleUpgrade };
}
