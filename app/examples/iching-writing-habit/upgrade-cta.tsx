"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { logEvent } from "@/lib/analytics";
import { useUpgradeButton } from "@/lib/use-upgrade-button";

/**
 * Upgrade CTA at the end of the /examples page — reuses the existing
 * checkout flow (same /api/checkout endpoint, same Creem pipeline).
 * Source attribution: `from: "example"` distinguishes this entry point.
 * Uses shared useUpgradeButton hook (bfcache-safe, double-click guard).
 */
export default function ExampleUpgradeCta() {
  const [user, setUser] = useState<object | null>(null);
  const [checking, setChecking] = useState(true);
  const { loading, error, handleUpgrade } = useUpgradeButton("example");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setChecking(false);
    });
  }, []);

  return (
    <section className="mt-10 p-6 bg-gradient-to-br from-cream to-white rounded-xl border-2 border-china-red text-center">
      <p className="font-serif text-ink text-lg mb-2">
        Want readings like this for your own questions?
      </p>
      <p className="text-sm text-warm mb-1">
        GoEast.ai Pro — deep readings with Going Deeper sections, reflection
        prompts, and follow-up invitations.
      </p>
      <p className="text-xs text-warm/70 mb-5">
        $4.99/month · auto-renews · 10 AI consultations per day (free: 3) ·
        cancel anytime in Account
      </p>

      {error && (
        <p className="text-xs text-china-red mb-3" role="alert">{error}</p>
      )}

      {checking ? (
        <div className="inline-block px-8 py-3 rounded-lg bg-china-red/50 text-white text-sm font-medium cursor-wait">
          Loading...
        </div>
      ) : !user ? (
        <Link
          href="/login?next=/examples/iching-writing-habit"
          onClick={() => logEvent("upgrade_clicked", { from: "example" })}
          className="inline-block px-8 py-3 rounded-lg bg-china-red text-white text-sm font-medium hover:bg-china-red/90 transition-colors no-underline"
        >
          Get Pro deep readings — $4.99/month
        </Link>
      ) : (
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="inline-block px-8 py-3 rounded-lg bg-china-red text-white text-sm font-medium hover:bg-china-red/90 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {loading ? "Redirecting to checkout..." : "Get Pro deep readings — $4.99/month"}
        </button>
      )}

      <p className="text-xs text-warm/60 mt-4">
        <Link href="/iching" className="underline hover:text-china-red">
          or cast your own hexagram free →
        </Link>
      </p>
      <p className="text-xs text-warm/50 mt-2">
        Subscription renews automatically each month. Cancel anytime from your
        Account page — access continues until the end of the paid period.
      </p>
    </section>
  );
}
