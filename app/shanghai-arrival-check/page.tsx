import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Rehearsal from "./rehearsal";

export const metadata: Metadata = {
  title: "Shanghai Arrival Check | GoEast",
  description: "A personal, offline airport-to-hotel plan for your first arrival at Shanghai Pudong.",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};
export const dynamic = "force-dynamic";

export default function ArrivalPage() {
  if (!(process.env.VERCEL_ENV === "preview" || process.env.NODE_ENV === "development" ||
      (process.env.ARRIVAL_LOCAL_REHEARSAL === "1" && !process.env.VERCEL_ENV))) notFound();
  return (
    <main className="bg-[#f3f5ee] text-[#142f33]">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:py-14">
        <div className="rounded-3xl bg-[#142f33] px-6 py-10 text-white sm:px-12">
          <p className="mb-4 text-xs font-bold tracking-widest text-[#b7e7d0]">GOEAST / SHANGHAI ARRIVAL CHECK</p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">Know how you’ll get from Pudong to your hotel.</h1>
          <p className="mt-5 max-w-2xl text-lg text-[#d3e7df]">A personal arrival plan, a backup if your phone doesn’t work, and a Chinese address card you can save before you fly.</p>
          <p className="mt-6 font-bold">Proposed pilot price: US$12.90 per itinerary</p>
          <p className="mt-2 text-sm text-[#d3e7df]">Pilot timing goal: 2 hours, with a 12-hour maximum for accepted orders. Timing is not yet live.</p>
          <p className="mt-2 text-sm text-[#d3e7df]">Preview only. No real orders, payment, or email. Please don’t enter personal information.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a className="rounded-lg bg-[#b7e7d0] px-4 py-3 font-bold text-[#142f33]" href="#rehearsal">Try a sample order</a>
            <a className="rounded-lg border border-[#b7e7d0] px-4 py-3 font-semibold" href="/samples/shanghai-arrival-check.pdf" download>See sample PDF</a>
          </div>
        </div>
        <div className="my-7 grid gap-4 sm:grid-cols-3">
          {[["Before you fly","What to save and which details to confirm."],["After baggage claim","Where to go and what to do if your first plan fails."],["Show your driver","A Chinese hotel card you can keep in your photos."]].map(([title, copy]) =>
            <div key={title} className="rounded-2xl border border-[#d9e4dc] bg-white p-5"><h2 className="font-bold">{title}</h2><p className="mt-1 text-sm">{copy}</p></div>)}
        </div>
        <p className="my-5">For first-time travelers flying into Pudong. Written planning only, not a transfer, booking or live support. <a className="underline" href="/samples/shanghai-driver-card.png" download>Save the sample driver card</a>.</p>
        <Rehearsal />
        <Link className="mt-6 inline-block underline" href="/china-travel-guide">GoEast’s free China travel guide</Link>
      </div>
    </main>
  );
}
