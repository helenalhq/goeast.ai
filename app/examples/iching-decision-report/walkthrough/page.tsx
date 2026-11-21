import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CAREER_DECISION_SAMPLE, DECISION_REPORT_EXAMPLE_PATH } from "@/lib/decision-report-example";
import DecisionReportWalkthrough from "./DecisionReportWalkthrough";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Synthetic Decision Report Walkthrough | GoEast Preview",
  robots: { index: false, follow: false, nocache: true },
};

export default function DecisionReportWalkthroughPage() {
  if (process.env.VERCEL_ENV !== "preview") notFound();
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="mb-6 font-serif text-3xl font-bold text-ink sm:text-4xl">Try the decision report flow</h1>
      <DecisionReportWalkthrough report={CAREER_DECISION_SAMPLE} />
      <Link href={DECISION_REPORT_EXAMPLE_PATH} className="mt-8 inline-block text-china-red underline underline-offset-4">Back to the complete example</Link>
    </main>
  );
}
