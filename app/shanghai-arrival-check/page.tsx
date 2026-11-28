import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Intake from "./intake";
import Rehearsal from "./rehearsal";
import styles from "./arrival.module.css";

export const metadata: Metadata = {
  title: "Shanghai Arrival Check | GoEast",
  description: "A personal, offline airport-to-hotel plan for your first arrival at Shanghai Pudong.",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};
export const dynamic = "force-dynamic";

export default function ArrivalPage() {
  const environment = process.env.VERCEL_ENV;
  if (environment !== "preview" && (environment || (process.env.NODE_ENV !== "development" && process.env.ARRIVAL_LOCAL_REHEARSAL !== "1"))) notFound();
  return (
    <div id="arrival-preview" className={`${styles.shell} bg-[#f3f5ee] text-[#142f33]`}>
      <nav aria-label="GoEast arrival navigation" className="border-b border-[#d9e4dc] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link className="inline-flex min-h-12 items-center text-lg font-bold" href="/">GoEast</Link>
          <Link className="inline-flex min-h-12 items-center text-right text-sm font-bold underline" href="/china-travel-guide">Free China travel guide</Link>
        </div>
      </nav>
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6 sm:py-12">
        <header className="overflow-hidden rounded-3xl bg-[#142f33] text-white">
          <div className="grid gap-7 p-6 sm:p-9 lg:grid-cols-[1.1fr_.9fr] lg:p-11">
            <div className="self-center">
              <p className="text-xs font-bold tracking-[.17em] text-[#b7e7d0]">GOEAST · SHANGHAI ARRIVAL CHECK</p>
              <h1 className="mt-4 text-4xl font-bold leading-[1.09] tracking-tight sm:text-5xl">Know how you’ll get from Pudong Airport to your hotel.</h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-[#deeee8] sm:text-lg">A checked arrival plan for your flight and hotel, with an offline backup and a Chinese address card.</p>
              <p className="mt-5 font-bold">US$12.90 <span className="text-sm font-normal text-[#deeee8]">one time · proposed pilot price</span></p>
              <p className="mt-1 text-sm text-[#deeee8]">For first-time travelers with a Pudong flight and Shanghai hotel booked.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <a className="inline-flex min-h-12 items-center rounded-xl bg-[#b7e7d0] px-4 py-2 font-bold text-[#142f33]" href="#trip-check">Try a sample trip</a>
                <a className="inline-flex min-h-12 items-center rounded-xl border border-[#b7e7d0] px-4 py-2 font-bold" href="#arrival-sample-plan">See a sample</a>
              </div>
              <p className="mt-4 text-xs text-[#deeee8]">Preview only. No real orders, payment or email.</p>
            </div>
            <aside id="arrival-sample-plan" className="scroll-mt-6 self-center rounded-2xl bg-[#e7f3e8] p-5 text-[#142f33] sm:p-6" aria-labelledby="sample-title">
              <p className="text-xs font-bold tracking-widest text-[#086457]">DEMO · ILLUSTRATIVE ONLY</p>
              <h2 id="sample-title" className="mt-2 text-2xl font-bold">Late arrival · Pudong T2</h2>
              <p className="mt-1 text-sm">23:35 scheduled arrival · Sample plan, not live advice</p>
              <ol className="mt-4 space-y-3 border-l-2 border-[#84aa9e] pl-4 text-sm">
                <li><strong className="block">After baggage claim</strong> Head to the official taxi stand outside Arrival Gate 25.</li>
                <li><strong className="block">If your phone doesn’t work</strong> Ask at the international arrivals service desk. Confirm how to pay before boarding.</li>
                <li><strong className="block">Show your driver</strong> Open the saved Chinese address card offline.</li>
              </ol>
              <Image className="mx-auto mt-4 h-auto max-h-64 w-auto max-w-full rounded-xl border border-[#9cbbb0]" src="/samples/shanghai-driver-card.png" alt="Example Chinese address card for the Grand Hyatt Shanghai" width={1170} height={2160} unoptimized />
              <div className="mt-3 flex flex-wrap gap-x-4 text-sm font-bold text-[#07584c]">
                <a className="inline-flex min-h-11 items-center underline" href="/samples/shanghai-arrival-check.pdf" download>See sample PDF</a>
                <a className="inline-flex min-h-11 items-center underline" href="/samples/shanghai-driver-card.png" download>Save the sample driver card</a>
              </div>
            </aside>
          </div>
        </header>

        <section aria-label="What you receive" className="grid gap-3 sm:grid-cols-3">
          {[
            ["01", "A short email", "Your airport-to-hotel plan, plus what to do if the first option doesn’t work."],
            ["02", "An offline PDF", "Two phone-friendly pages you can save before you fly."],
            ["03", "A Chinese address card", "A hotel address image you can keep in Photos and show to your driver."],
          ].map(([n,title,copy]) => <article key={n} className="rounded-2xl border border-[#d9e4dc] bg-white p-5">
            <p className="text-xs font-bold text-[#086457]">{n}</p><h2 className="mt-2 font-bold">{title}</h2><p className="mt-1 text-sm leading-relaxed text-[#36584e]">{copy}</p>
          </article>)}
        </section>

        <Intake />

        <section aria-labelledby="faq-title" className="rounded-2xl border border-[#d9e4dc] bg-white p-5 sm:p-8">
          <h2 id="faq-title" className="mb-3 text-2xl font-bold">How it works</h2>
          <p className="mb-3">Check your trip, then review the price and delivery time before paying. No account required. This preview only demonstrates those steps.</p>
          <details className="border-t border-[#d9e4dc] py-3"><summary className="cursor-pointer font-bold">Does this book a ride?</summary><p className="pt-2">No. This is written planning. It doesn’t book transport, monitor flights live, provide live support or guarantee a payment method will work.</p></details>
          <details className="border-t border-[#d9e4dc] py-3"><summary className="cursor-pointer font-bold">How quickly would I get it?</summary><p className="pt-2">Pilot target: two hours, with a maximum of 12 hours for accepted orders once payment and trip details are verified. A real quote would show the exact deadline before checkout.</p></details>
          <details className="border-t border-[#d9e4dc] py-3"><summary className="cursor-pointer font-bold">Already arranged airport pickup?</summary><p className="pt-2">The <Link className="font-bold underline" href="/china-travel-guide">free China travel guide</Link> may be all you need.</p></details>
        </section>

        <details className="rounded-2xl border border-[#d9e4dc] bg-white p-4">
          <summary className="cursor-pointer p-2 font-bold">Operator demo: simulated fulfillment</summary>
          <div className="mt-3"><Rehearsal /></div>
        </details>
      </div>
    </div>
  );
}
