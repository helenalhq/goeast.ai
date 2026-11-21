"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { DecisionStatus } from "@/lib/decision-types";

interface OrderSummary {
  id: string;
  status: DecisionStatus;
  createdAt: string;
}
const labels: Record<DecisionStatus, string> = {
  pending: "Awaiting payment confirmation",
  paid: "Ready to generate",
  generating: "Generating",
  delivered: "Report ready",
  refunded: "Refunded",
};

export default function DecisionReportList() {
  const [orders, setOrders] = useState<OrderSummary[]>();
  const [error, setError] = useState("");

  useEffect(() => {
    let controller: AbortController;
    async function load() {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      try {
        const response = await fetch("/api/decision-report", { cache: "no-store", credentials: "same-origin", signal: request.signal });
        if (!response.ok) throw new Error("Unavailable");
        const data: { orders: OrderSummary[] } = await response.json();
        if (!request.signal.aborted) setOrders(data.orders);
      } catch {
        if (!request.signal.aborted) setError("Your reports could not be loaded. Refresh the page to try again.");
      }
    }
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      setOrders(undefined);
      setError("");
      void load();
    };
    void load();
    window.addEventListener("pageshow", onPageShow);
    return () => {
      controller?.abort();
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  if (error) return <p role="alert" className="text-sm text-china-red">{error}</p>;
  if (!orders) return <p role="status" className="text-sm text-warm">Loading your reports…</p>;
  if (!orders.length) return <p className="text-ink/80">No decision reports yet. A report will appear here after you start checkout from your free work-decision cast.</p>;
  return (
    <ul className="space-y-3">
      {orders.map((order) => (
        <li key={order.id}>
          <Link href={`/account/decision-reports/${encodeURIComponent(order.id)}`} prefetch={false} className="block rounded-xl border border-sand bg-white p-4 text-ink hover:border-warm focus-visible:outline-2 focus-visible:outline-china-red">
            <p className="font-semibold">{labels[order.status]}</p>
            <time dateTime={order.createdAt} className="text-sm text-warm">
              {new Date(order.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })}
            </time>
          </Link>
        </li>
      ))}
    </ul>
  );
}
