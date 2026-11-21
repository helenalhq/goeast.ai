import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isDecisionOfferEnabled } from "@/lib/decision-config";
import { createClient } from "@/lib/supabase/server";
import DecisionReportList from "./DecisionReportList";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "My Decision Reports | GoEast",
  robots: { index: false, follow: false, nocache: true },
};

export default async function DecisionReportHistory() {
  if (!isDecisionOfferEnabled()) notFound();
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user || !isDecisionOfferEnabled(user.id)) notFound();
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <Link href="/account" prefetch={false} className="mb-4 inline-block text-china-red underline underline-offset-2">Back to your account</Link>
      <h1 className="mb-3 font-serif text-3xl font-bold text-ink">My decision reports</h1>
      <p className="mb-6 text-sm leading-relaxed text-warm">Each one-time report keeps the same cast. Reports and action notes are private to your account.</p>
      <DecisionReportList />
    </main>
  );
}
