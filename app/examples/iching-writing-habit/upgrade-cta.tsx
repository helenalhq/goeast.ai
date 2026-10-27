"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { logEvent } from "@/lib/analytics";
import { useUpgradeButton } from "@/lib/use-upgrade-button";
import TryIChingLink from "@/components/TryIChingLink";

/**
 * Upgrade CTA + free trial entry at the end of the /examples page.
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

      <div className="mt-5 pt-4 border-t border-sand">
        <p className="text-sm text-warm mb-3">
          Not ready to subscribe? Try the I Ching Oracle free — 3 consultations per day.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <TryIChingLink
            source="writing-habit-example"
            className="inline-block px-6 py-2.5 rounded-full bg-ink text-white text-sm font-medium hover:bg-ink/90 transition-colors no-underline"
          >
            Try I Ching →
          </TryIChingLink>
          <Link
            href="/iching"
            className="inline-block px-6 py-2.5 rounded-full border border-sand text-ink text-sm font-medium hover:border-china-red hover:text-china-red transition-colors no-underline"
          >
            Browse hexagrams
          </Link>
        </div>
      </div>

      <p className="text-xs text-warm/50 mt-4">
        Subscription renews automatically each month. Cancel anytime from your
        Account page — access continues until the end of the paid period.
      </p>
    </section>
  );
}
