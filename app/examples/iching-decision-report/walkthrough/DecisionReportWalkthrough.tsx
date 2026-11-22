"use client";

import React, { useRef, useState } from "react";
import DecisionReportView from "@/components/decision-report/DecisionReportView";
import type { DecisionReport } from "@/lib/decision-types";

const primary = "min-h-11 rounded-lg bg-ink px-4 py-2 font-semibold text-white hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-china-red";
const secondary = "min-h-11 rounded-lg border border-sand px-4 py-2 text-ink hover:border-warm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-china-red";

type Stage = "offer" | "checkout" | "cancelled" | "report";

export default function DecisionReportWalkthrough({ report }: { report: DecisionReport }) {
  const [stage, setStage] = useState<Stage>("offer");
  const headings = { offer: "Same cast decision report", checkout: "Simulated checkout", cancelled: "Simulated checkout cancelled", report: "Example report unlocked" };
  const heading = useRef<HTMLHeadingElement>(null);
  function advance(next: Stage) {
    setStage(next);
    window.requestAnimationFrame(() => heading.current?.focus());
  }
  return (
    <div>
      <p className="mb-4 rounded-lg border border-sand bg-paper-panel p-3 font-semibold text-ink">
        Preview walkthrough · Fictional data · No real charge or saved order
      </p>
      <h2 ref={heading} tabIndex={-1} className="mb-3 font-serif text-2xl font-semibold text-ink">{headings[stage]}</h2>
      {stage === "offer" && (
        <div className="space-y-4 rounded-2xl border border-sand bg-white p-5">
          <p><strong>Example free cast:</strong> {report.primary.number} · {report.primary.name}; changing line {report.changingLines.join(", ")} → {report.transformed?.number} · {report.transformed?.name}.</p>
          <p className="text-ink/80">The report keeps these same lines. It compares two options, identifies a blind spot for each and suggests a small reversible test.</p>
          <p className="font-semibold">$1.99 USD once in this example · No renewal</p>
          <button type="button" className={primary} onClick={() => advance("checkout")}>Preview a simulated checkout</button>
        </div>
      )}
      {stage === "checkout" && (
        <div className="space-y-4 rounded-2xl border border-sand bg-white p-5">
          <p className="text-ink/80">This step is not connected to a payment provider. You will not be asked to enter card details.</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" className={primary} onClick={() => advance("report")}>Simulate payment success</button>
            <button type="button" className={secondary} onClick={() => advance("cancelled")}>Simulate cancellation</button>
          </div>
        </div>
      )}
      {stage === "cancelled" && (
        <div className="space-y-4 rounded-2xl border border-sand bg-white p-5">
          <p>Nothing was charged. The example cast is unchanged.</p>
          <button type="button" className={secondary} onClick={() => advance("offer")}>Back to the example quote</button>
        </div>
      )}
      {stage === "report" && (
        <div className="space-y-4">
          <p className="text-ink/80">Your simulated payment opened the same fictional cast. Nothing is saved to an account.</p>
          <DecisionReportView report={report} synthetic />
          <button type="button" className={secondary} onClick={() => advance("offer")}>Restart the walkthrough</button>
        </div>
      )}
    </div>
  );
}
