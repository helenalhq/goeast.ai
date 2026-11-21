"use client";

import React, { useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginUrlWithNext } from "@/lib/auth-redirect";
import { logEvent } from "@/lib/analytics";
import type { DecisionCoin, DecisionMode } from "@/lib/decision-types";
import OfferViewedTracker from "@/app/pricing/offer-viewed-tracker";

const UUID = "[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}";
const ORDER_ID = new RegExp(`^${UUID}$`, "i");
const MOCK_RETURN = new RegExp(`^/account/decision-reports/${UUID}\\?mock=1$`, "i");

export function trustedDecisionCheckoutUrl(value: unknown, mode: DecisionMode): string | null {
  if (typeof value !== "string") return null;
  if (mode === "mock") return MOCK_RETURN.test(value) ? value : null;
  try {
    const url = new URL(value);
    if (mode !== "test" || url.protocol !== "https:" || url.port || url.username || url.password || url.search || url.hash) return null;
    const hosted = url.hostname === "checkout.creem.io" && /^\/ch_[a-z0-9]+$/i.test(url.pathname);
    const sandbox = (url.hostname === "creem.io" || url.hostname === "www.creem.io") &&
      /^\/test\/checkout\/prod_[a-zA-Z0-9]+\/ch_[a-zA-Z0-9]+$/.test(url.pathname);
    return hosted || sandbox ? url.href : null;
  } catch {
    return null;
  }
}

export default function DecisionReportOffer({
  question,
  casts,
  mode,
}: {
  question: string;
  casts: DecisionCoin[];
  mode: DecisionMode;
}) {
  const router = useRouter();
  const otherId = useId();
  const [alternative, setAlternative] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const inFlight = useRef(false);
  const questionValid = question.trim().length > 0 && question.trim().length <= 500;

  async function choose(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || !questionValid || needsLogin) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/decision-report/checkout", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, casts, ...(alternative.trim() ? { alternative: alternative.trim() } : {}) }),
      });
      if (response.status === 401) {
        setNeedsLogin(true);
        setError("Your session expired. Sign in again to continue with the same cast.");
        return;
      }
      if (!response.ok) {
        setError("Checkout is unavailable. Your free cast is unchanged. No payment was requested here.");
        return;
      }
      const result: { orderId?: unknown; checkoutUrl?: unknown } = await response.json();
      if (result.checkoutUrl !== undefined) {
        const destination = trustedDecisionCheckoutUrl(result.checkoutUrl, mode);
        if (!destination) {
          setError("This checkout link could not be verified. No payment was requested here.");
          return;
        }
        logEvent("checkout_started", { offer_id: "decision_once", from: "consult_iching", env: "preview", qa: "decision-report-preview" });
        if (mode === "mock") router.push(destination);
        else window.location.assign(destination);
      } else if (typeof result.orderId === "string" && ORDER_ID.test(result.orderId)) {
        router.push(`/account/decision-reports/${result.orderId}`);
      } else {
        setError("Checkout is unavailable. Your free cast is unchanged.");
      }
    } catch {
      setError("We could not open checkout. Check your connection and try again. Your cast stays here.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <section aria-label="Career decision report" className="mt-5 space-y-3 rounded-xl border border-sand bg-white p-5 sm:p-6">
      <p className="rounded-lg border border-sand bg-paper-panel p-3 text-sm font-semibold">Preview test only · No real charge</p>
      <h2 className="font-serif text-xl font-semibold text-ink">Career Decision Report</h2>
      <p className="text-sm leading-relaxed text-ink/80">
        Compare two options and their blind spots, find one question to verify, and plan a reversible seven-day test. Your same cast and question become a private report saved in your account. No new cast, no prediction.
      </p>
      <Link href="/examples/iching-decision-report" className="inline-block text-sm text-china-red underline underline-offset-4">
        See the complete fictional example
      </Link>
      <form className="space-y-4" onSubmit={choose}>
        <div>
          <label htmlFor={otherId} className="block text-sm font-semibold text-ink">Another option to compare (optional)</label>
          <input
            id={otherId}
            maxLength={160}
            value={alternative}
            onChange={(event) => setAlternative(event.target.value)}
            aria-describedby={`${otherId}-hint`}
            className="mt-1 min-h-11 w-full rounded-lg border border-sand bg-cream px-3 text-ink focus-visible:outline-2 focus-visible:outline-china-red"
          />
          <p id={`${otherId}-hint`} className="mt-1 text-sm text-warm">Leave it blank and the report will label its suggested alternative as a hypothesis.</p>
        </div>
        <OfferViewedTracker offerId="decision_once" path="consult_iching" previewQa enabled={!busy && questionValid && !needsLogin}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div>
              <p className="font-semibold text-ink">$1.99 USD</p>
              <p className="text-xs text-warm">One payment. Does not renew.</p>
            </div>
            <button type="submit" disabled={busy || !questionValid || needsLogin} className="min-h-11 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-china-red disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? "Opening checkout…" : "Continue to one-time checkout"}
            </button>
          </div>
        </OfferViewedTracker>
        <p className="text-xs leading-relaxed text-warm">
          If report generation fails, you can retry without paying again. For refund questions, <Link href="/contact" className="underline underline-offset-2">contact support</Link>; a confirmed full refund removes access to the paid report only.
        </p>
        {!questionValid && <p className="text-sm text-warm">Edit your question to 500 characters or fewer before ordering.</p>}
        {error && <p role="alert" className="text-sm text-china-red">{error}</p>}
        {needsLogin && <Link href={loginUrlWithNext()} className="inline-block text-china-red underline underline-offset-2">Sign in again</Link>}
      </form>
    </section>
  );
}
