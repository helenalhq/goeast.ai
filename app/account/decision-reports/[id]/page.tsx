import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isDecisionOfferEnabled } from "@/lib/decision-config";
import { createClient } from "@/lib/supabase/server";
import DecisionReportDetail from "./DecisionReportDetail";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Private Decision Report | GoEast",
  robots: { index: false, follow: false, nocache: true },
};

export default async function PrivateDecisionReportPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isDecisionOfferEnabled()) notFound();
  const { id } = await params;
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) notFound();
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user || !isDecisionOfferEnabled(user.id)) notFound();
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <Link href="/account/decision-reports" prefetch={false} className="mb-4 inline-block text-china-red underline underline-offset-2">Back to my decision reports</Link>
      <h1 className="mb-6 font-serif text-3xl font-bold text-ink">Your decision report</h1>
      <DecisionReportDetail id={id} key={id} />
    </main>
  );
}
