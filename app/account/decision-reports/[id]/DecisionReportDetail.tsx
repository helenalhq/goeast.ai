"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import DecisionReportView from "@/components/decision-report/DecisionReportView";
import type { DecisionMode, DecisionReport, DecisionStatus } from "@/lib/decision-types";

const buttonClass = "min-h-11 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-china-red disabled:opacity-50";
const secondaryClass = "min-h-11 rounded-lg border border-sand px-4 py-2 text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-china-red disabled:opacity-50";

type Order = {
  id: string;
  mode: DecisionMode;
  status: DecisionStatus;
  createdAt: string;
  report: DecisionReport | null;
  actionNote: string | null;
  generationRetryable?: boolean;
};
type Mutation = { action: "generate" | "mock-pay" | "mock-refund" } | { action: "note"; note: string };

export default function DecisionReportDetail({ id }: { id: string }) {
  const noteId = useId();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const read = useRef<AbortController | null>(null);
  const mutation = useRef<AbortController | null>(null);
  const endpoint = `/api/decision-report/${encodeURIComponent(id)}`;

  useEffect(() => {
    const load = async () => {
      read.current?.abort();
      const controller = new AbortController();
      read.current = controller;
      try {
        const response = await fetch(endpoint, { cache: "no-store", credentials: "same-origin", signal: controller.signal });
        if (controller.signal.aborted) return;
        if (!response.ok) {
          setOrder(null);
          setNote("");
          setError(response.status === 401 ? "Sign in again to see this report." : "This report is not available to this account.");
          return;
        }
        const value: Order = await response.json();
        if (controller.signal.aborted) return;
        setOrder(value);
        setNote(value.status === "delivered" ? value.actionNote ?? "" : "");
      } catch {
        if (!controller.signal.aborted) setError("Could not load this report. Refresh the page to try again.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      mutation.current?.abort();
      mutation.current = null;
      setBusy(false);
      setOrder(null);
      setNote("");
      setError("");
      setStatusMessage("");
      setLoading(true);
      void load();
    };
    void load();
    window.addEventListener("pageshow", onPageShow);
    return () => {
      read.current?.abort();
      mutation.current?.abort();
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [endpoint]);

  async function update(payload: Mutation) {
    if (mutation.current) return;
    const controller = new AbortController();
    mutation.current = controller;
    setBusy(true);
    setError("");
    setStatusMessage("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (!response.ok) {
        if (response.status === 401 || response.status === 404) {
          setOrder(null);
          setNote("");
          setError("This report is not available to this account.");
          return;
        }
        setError(payload.action === "generate"
          ? "The report was not ready. Refresh its status or retry here without paying again."
          : "The update could not be confirmed. Refresh the status before trying again.");
        return;
      }
      const value: Order = await response.json();
      if (controller.signal.aborted) return;
      setOrder(value);
      setNote(value.status === "delivered" ? value.actionNote ?? "" : "");
      if (payload.action === "note") setStatusMessage("Private action note saved.");
    } catch {
      if (!controller.signal.aborted) setError("The response could not be confirmed. Refresh the status; do not pay again.");
    } finally {
      if (mutation.current === controller) {
        mutation.current = null;
        setBusy(false);
      }
    }
  }

  const refresh = <button type="button" disabled={busy} onClick={() => window.location.reload()} className={secondaryClass}>Refresh status</button>;

  if (loading) return <p role="status" className="text-sm text-warm">Loading your report…</p>;
  return (
    <div className="space-y-5">
      {order?.mode && (
        <p className="rounded-lg border border-sand bg-paper-panel p-3 text-sm font-semibold text-ink">
          {order.mode === "mock" ? "Preview simulated order · No real charge" : "Preview test order · No real charge"}
        </p>
      )}
      {error && <p role="alert" className="rounded-lg border border-sand bg-white p-3 text-sm text-china-red">{error}</p>}
      {busy && <p role="status" className="text-sm text-warm">Updating this order…</p>}
      {order?.status === "pending" && (
        <section className="space-y-3 rounded-xl border border-sand bg-white p-5">
          <h2 className="font-serif text-xl font-semibold text-ink">Waiting for payment confirmation</h2>
          {order.mode === "mock" ? (
            <>
              <p>Simulate a $1.99 USD one-time test payment. No cards or actual charges are involved.</p>
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" disabled={busy} onClick={() => void update({ action: "mock-pay" })} className={buttonClass}>Simulate test payment</button>
                <Link href="/consult/iching" className="text-china-red underline underline-offset-2">Leave without paying</Link>
              </div>
            </>
          ) : <p>Returning from checkout does not confirm payment. If you already paid, refresh this status instead of paying again.</p>}
          {refresh}
        </section>
      )}
      {(order?.status === "paid" || order?.status === "generating") && (
        <section className="space-y-3 rounded-xl border border-sand bg-white p-5">
          <h2 className="font-serif text-xl font-semibold text-ink">{order.status === "paid" ? "Payment confirmed" : "Report generation is in progress"}</h2>
          <p>Your original cast is saved. Generating or retrying the report never charges you again.</p>
          <div className="flex flex-wrap gap-3">
            {(order.status === "paid" || order.generationRetryable) && (
              <button type="button" disabled={busy} onClick={() => void update({ action: "generate" })} className={buttonClass}>
                {order.status === "paid" ? "Generate or retry report" : "Retry stalled generation"}
              </button>
            )}
            {refresh}
          </div>
        </section>
      )}
      {order?.status === "refunded" && (
        <section className="rounded-xl border border-sand bg-white p-5">
          <h2 className="font-serif text-xl font-semibold text-ink">Test order refunded</h2>
          <p className="mt-2">Access to the paid report was removed. Your free readings and Pro subscription are unchanged.</p>
        </section>
      )}
      {order?.status === "delivered" && order.report && (
        <>
          <DecisionReportView report={order.report} />
          <form className="space-y-3 rounded-xl border border-sand bg-white p-5" onSubmit={(event) => {
            event.preventDefault();
            void update({ action: "note", note: note.trim() });
          }}>
            <h2 className="font-serif text-xl font-semibold text-ink">How did the test go?</h2>
            <label htmlFor={noteId} className="block text-sm text-ink">Private action note</label>
            <textarea id={noteId} rows={4} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)}
              className="w-full rounded-lg border border-sand bg-cream p-3 text-sm focus-visible:outline-2 focus-visible:outline-china-red" />
            <button type="submit" disabled={busy} className={buttonClass}>Save note</button>
            {statusMessage && <p role="status" className="text-sm text-ink">{statusMessage}</p>}
          </form>
        </>
      )}
      {order?.status === "delivered" && !order.report && <p role="status">The report content is unavailable. Refresh its status to try again.</p>}
      {order?.mode === "mock" && (order.status === "paid" || order.status === "delivered") && (
        <div><button type="button" disabled={busy} onClick={() => void update({ action: "mock-refund" })} className={secondaryClass}>Simulate test refund</button></div>
      )}
    </div>
  );
}
