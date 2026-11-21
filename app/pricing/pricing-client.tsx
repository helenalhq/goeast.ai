"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useUpgradeButton } from "@/lib/use-upgrade-button";
import OfferViewedTracker from "./offer-viewed-tracker";

const AUTH_CHECK_TIMEOUT_MS = 10_000;

type AuthStatus = "checking" | "guest" | "signed-in" | "failed";

export default function PricingClient({
  paymentEnabled,
  children,
}: {
  paymentEnabled: boolean;
  children?: ReactNode;
}) {
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [attempt, setAttempt] = useState(0);
  const { loading, error, handleUpgrade } = useUpgradeButton("pricing");

  useEffect(() => {
    if (!paymentEnabled) return;
    let active = true;

    function finish(status: AuthStatus) {
      if (!active) return;
      active = false;
      clearTimeout(timeout);
      setAuthStatus(status);
    }

    // getUser has no cancellation signal here. Once the UI deadline expires,
    // ignore the old result and let the user retry or reach sign-in.
    const timeout = setTimeout(() => finish("failed"), AUTH_CHECK_TIMEOUT_MS);

    async function checkSession() {
      try {
        const { data, error } = await createClient().auth.getUser();
        if (error) {
          finish(isAuthSessionMissingError(error) ? "guest" : "failed");
        } else {
          finish(data.user ? "signed-in" : "guest");
        }
      } catch {
        finish("failed");
      }
    }

    void checkSession();
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [attempt, paymentEnabled]);

  function retry() {
    setAuthStatus("checking");
    setAttempt(previous => previous + 1);
  }

  function withQuote(action: ReactNode, ready = false, enabled = true) {
    return ready && children ? (
      <OfferViewedTracker offerId="pro_monthly" enabled={enabled}>
        {action}
        {children}
      </OfferViewedTracker>
    ) : (
      <>
        {action}
        {children}
      </>
    );
  }

  if (!paymentEnabled) {
    return withQuote(
      <div className="block w-full text-center px-6 py-2.5 rounded-lg bg-warm/30 text-warm text-sm font-medium cursor-not-allowed">
        Coming soon
      </div>
    );
  }

  if (authStatus === "checking") {
    return withQuote(
      <div className="block w-full text-center px-6 py-2.5 rounded-lg bg-china-red/50 text-white text-sm font-medium cursor-wait">
        Loading...
      </div>
    );
  }

  if (authStatus === "failed") {
    return withQuote(
      <div className="text-center">
        <p className="text-xs text-warm mb-2" role="alert">
          Couldn&apos;t check your sign-in status — connection issue.
        </p>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={retry}
            className="px-5 py-2.5 rounded-lg border border-sand text-ink text-sm font-medium hover:border-china-red hover:text-china-red transition-colors"
          >
            Retry
          </button>
          <Link
            href="/login?next=/pricing"
            className="inline-block px-5 py-2.5 rounded-lg bg-china-red text-white text-sm font-medium hover:bg-china-red/90 transition-colors"
          >
            Sign in to upgrade
          </Link>
        </div>
      </div>
    );
  }

  if (authStatus === "guest") {
    return withQuote(
      <Link
        href="/login?next=/pricing"
        className="block w-full text-center px-6 py-2.5 rounded-lg bg-china-red text-white text-sm font-medium hover:bg-china-red/90 transition-colors"
      >
        Sign in to upgrade
      </Link>,
      true,
    );
  }

  return withQuote(
    <div>
      {error && (
        <p className="text-xs text-china-red mb-2 text-center" role="alert">{error}</p>
      )}
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="block w-full px-6 py-2.5 rounded-lg bg-china-red text-white text-sm font-medium hover:bg-china-red/90 transition-colors disabled:opacity-50 cursor-pointer"
      >
        {loading ? "Redirecting..." : "Upgrade to Pro"}
      </button>
    </div>,
    true,
    !loading,
  );
}
