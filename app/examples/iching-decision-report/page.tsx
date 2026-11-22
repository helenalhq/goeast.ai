import type { Metadata } from "next";
import Link from "next/link";
import DecisionReportView from "@/components/decision-report/DecisionReportView";
import {
  CAREER_DECISION_SAMPLE,
  DECISION_REPORT_EXAMPLE_PATH,
  DECISION_REPORT_WALKTHROUGH_PATH,
} from "@/lib/decision-report-example";

export const metadata: Metadata = {
  title: "I Ching Career Decision Report: A Complete Example | GoEast",
  description: "A complete fictional I Ching decision report that compares two options and offers a reversible seven-day test.",
  alternates: { canonical: DECISION_REPORT_EXAMPLE_PATH },
};

export default function CareerDecisionExamplePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="mb-8">
        <p className="text-sm font-semibold tracking-wide text-warm uppercase">Synthetic example · no purchase</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-ink sm:text-4xl">Thinking about changing jobs?</h1>
        <p className="mt-3 max-w-prose leading-relaxed text-ink/80">
          See the complete one-time decision report before using it. This is a fictional scenario with a fixed cast and an editorial example of what the report format contains. It is not a customer story or a transaction.
        </p>
      </header>
      <DecisionReportView report={CAREER_DECISION_SAMPLE} synthetic />
      <nav aria-label="Decision report links" className="mt-8 flex flex-wrap gap-x-5 gap-y-3">
        <Link href="/consult/iching" className="font-semibold text-china-red underline underline-offset-4">Try a free cast</Link>
        {process.env.VERCEL_ENV === "preview" && (
          <Link href={DECISION_REPORT_WALKTHROUGH_PATH} className="font-semibold text-china-red underline underline-offset-4">Try the synthetic Preview walkthrough</Link>
        )}
      </nav>
    </main>
  );
}
