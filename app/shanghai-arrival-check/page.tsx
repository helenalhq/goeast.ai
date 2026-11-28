import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Intake from "./intake";
import Rehearsal from "./rehearsal";
import SampleExperience, { SampleTrigger } from "./sample-dialog";
import styles from "./arrival.module.css";

export const metadata: Metadata = {
  title: "Shanghai Arrival Check | GoEast",
  description: "A personal, offline airport-to-hotel plan for your first arrival at Shanghai Pudong.",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};
export const dynamic = "force-dynamic";

const deliverables = [
  ["01 / EMAIL", "The route to take", "What works at your landing time, where to go after baggage claim, and when to switch plans."],
  ["02 / OFFLINE PDF", "What to do if things go wrong", "Steps for no data, a declined payment or a late check-in. Includes a message to send your hotel and dated sources."],
  ["03 / SAVE TO PHOTOS", "A card to show your driver", "Your exact hotel’s Chinese name, street address and phone number, ready even without a connection."],
];

function Arrow({direction = "right"}: {direction?: "right" | "corner"}) {
  return <svg aria-hidden="true" className="shrink-0" width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d={direction === "right" ? "M3 8h10m-4-4 4 4-4 4" : "M4 12 12 4m-6 0h6v6"} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

export default function ArrivalPage() {
  const environment = process.env.VERCEL_ENV;
  if (environment !== "preview" && (environment || (process.env.NODE_ENV !== "development" && process.env.ARRIVAL_LOCAL_REHEARSAL !== "1"))) notFound();

  return (
    <div id="arrival-preview" className={styles.shell}>
      <nav aria-label="GoEast arrival navigation" className="border-b border-[#dae6e4] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link className="inline-flex min-h-14 items-center text-lg font-bold tracking-tight text-[#102e35]" href="/">GoEast<span className="ml-0.5 text-[#006557]" aria-hidden="true">.</span></Link>
          <Link className="inline-flex min-h-14 items-center gap-1 text-right text-sm font-bold text-[#006557] underline-offset-4 hover:underline" href="/china-travel-guide">Free China travel guide <Arrow direction="corner" /></Link>
        </div>
      </nav>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-5 sm:space-y-8 sm:px-6 sm:py-9">
        <header className={`${styles.hero} rounded-3xl p-5 sm:p-9 lg:p-12`}>
          <div className="grid items-center gap-7 lg:grid-cols-[1.16fr_.84fr] lg:gap-10">
            <SampleExperience>
              <div>
                <p className="text-[0.7rem] font-bold tracking-[.14em] text-[#c0f0df]">SHANGHAI ARRIVAL CHECK</p>
                <h1 className="mt-3 max-w-[20ch] text-balance text-[2.05rem] font-bold leading-[1.12] tracking-[-.036em] sm:text-5xl lg:text-[3.25rem]">Your plan from Pudong Airport to your hotel.</h1>
                <p className="mt-3 max-w-md text-base leading-relaxed text-[#e0eeec] sm:text-lg">Know which route to take and what to do if your phone won’t connect or your payment fails.</p>
                <div className="mt-4 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                  <strong className="text-2xl font-bold tracking-tight text-white">US$12.90</strong><span className="text-sm text-[#d1e4e0]">proposed price · one payment per trip</span>
                </div>
                <p className="mt-2 max-w-md text-sm text-[#e0eeec]">For first-time visitors with a Pudong flight and Shanghai hotel booked.</p>
                <div className={`${styles.heroActions} mt-4 flex flex-wrap gap-2.5`}>
                  <a className={styles.heroPrimary} href="#trip-check">Try a sample trip <Arrow /></a>
                  <SampleTrigger>See a sample <Arrow direction="corner" /></SampleTrigger>
                </div>
                <p className="mt-3 text-xs text-[#d1e4e0]">No account needed. Preview uses fictional details and does not charge or email you.</p>
              </div>

              <aside className="rounded-2xl border border-[#c8e7de] bg-[#f4faf8] p-4 text-[#102e35] shadow-sm sm:p-5" aria-labelledby="sample-title">
                <p className={styles.kicker}>EXAMPLE · GRAND HYATT SHANGHAI</p>
                <h2 id="sample-title" className="mt-1 text-xl font-bold tracking-tight">Same hotel. Two different routes.</h2>
                <p className="mt-1 text-sm leading-relaxed text-[#425d63]">See what changes when your flight does.</p>
                <div className="mt-3 grid gap-2.5">
                  <SampleTrigger scenario="late" label="Open late-night arrival sample: Take the official taxi" className={styles.proofItem}>
                    <span className={styles.proofTime}>23:35 <small>T2</small></span>
                    <span><strong className="block">Take the official taxi</strong><span className="mt-0.5 block text-sm leading-snug text-[#425d63]">You land after the regular last Airport Link train.</span></span>
                    <Arrow direction="corner" />
                  </SampleTrigger>
                  <SampleTrigger scenario="day" label="Open daytime arrival sample: Take Metro Line 2 if running" className={styles.proofItem}>
                    <span className={styles.proofTime}>13:10 <small>T1</small></span>
                    <span><strong className="block">Take Metro Line 2 if running</strong><span className="mt-0.5 block text-sm leading-snug text-[#425d63]">Daytime with light luggage; keep the T1 taxi as backup.</span></span>
                    <Arrow direction="corner" />
                  </SampleTrigger>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-[#425d63]"><strong className="text-[#102e35]">One detail we check:</strong> Grand Hyatt is at No. 88 Century Avenue. Park Hyatt is at No. 100.</p>
              </aside>
            </SampleExperience>
          </div>
        </header>

        <section aria-labelledby="deliverables-title" className="rounded-2xl border border-[#dce6e4] bg-white p-4 sm:p-6">
          <h2 id="deliverables-title" className="text-xl font-bold tracking-tight">What you’ll receive before you fly</h2>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
            {deliverables.map(([n,title,copy]) => <article key={n} className="rounded-xl border border-[#dce6e4] bg-[#f8fbfa] p-3.5 sm:p-4">
              <p className={styles.kicker}>{n}</p><h3 className="mt-1.5 font-bold">{title}</h3><p className="mt-1 text-sm leading-relaxed text-[#425d63]">{copy}</p>
            </article>)}
          </div>
        </section>

        <section aria-labelledby="arrival-value-title" className="grid items-center gap-3 rounded-2xl border border-[#cfe3de] bg-[#e9f4f0] p-4 sm:grid-cols-[1fr_auto] sm:p-6">
          <div>
            <h2 id="arrival-value-title" className="text-lg font-bold tracking-tight">Why pay for the check?</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#345459]">The free guide explains the options. The check tells you which ones fit your flight and hotel, what to use if they don’t, and what still needs confirming. Already have your ride and check-in sorted? Start with the free guide.</p>
          </div>
          <Link className={styles.secondary} href="/china-travel-guide">Read the free guide <Arrow direction="corner" /></Link>
        </section>

        <section aria-labelledby="arrival-try-heading">
          <h2 id="arrival-try-heading" className="mb-1 text-2xl font-bold tracking-tight">See how your details change the plan</h2>
          <p className="mb-3 text-sm leading-relaxed text-[#425d63]">Start with a sample. In the real flow, you’d check the plan’s fit, price and exact delivery deadline before paying.</p>
          <Intake />
        </section>

        <section aria-labelledby="faq-title" className="rounded-2xl border border-[#dce6e4] bg-white p-5 sm:p-8">
          <p className={styles.kicker}>GOOD TO KNOW</p>
          <h2 id="faq-title" className="mb-3 mt-1 text-2xl font-bold tracking-tight">Before you order</h2>
          <details className="border-t border-[#dce6e4]"><summary className="cursor-pointer py-3 font-bold">Does this book a ride?</summary><p className="pb-3 text-[#425d63]">No. It doesn’t book transport, monitor flights live, provide live support or guarantee a payment method will work.</p></details>
          <details className="border-t border-[#dce6e4]"><summary className="cursor-pointer py-3 font-bold">How quickly would I get it?</summary><p className="pb-3 text-[#425d63]">Pilot target: two hours, with a maximum of 12 hours for accepted orders once payment and trip details are verified. A real quote would show the exact deadline before checkout.</p></details>
          <details className="border-t border-[#dce6e4]"><summary className="cursor-pointer py-3 font-bold">What if my terminal or hotel can’t be verified?</summary><p className="pb-3 text-[#425d63]">We would ask you for the missing detail before taking payment. We don’t guess the terminal or choose a hotel branch for you.</p></details>
          <details className="border-t border-[#dce6e4]"><summary className="cursor-pointer py-3 font-bold">Already arranged airport pickup?</summary><p className="pb-3 text-[#425d63]">The <Link className="font-bold text-[#006557] underline" href="/china-travel-guide">free China travel guide</Link> may be all you need.</p></details>
        </section>

        <details className="rounded-xl border border-[#dce6e4] bg-[#eef3f2] px-4 py-1">
          <summary className="cursor-pointer py-3 text-sm font-semibold text-[#425d63]">Operator demo: simulated fulfillment</summary>
          <div className="mb-3"><Rehearsal /></div>
        </details>
      </div>
    </div>
  );
}
