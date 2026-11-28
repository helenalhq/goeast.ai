import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Intake from "./intake";
import Rehearsal from "./rehearsal";
import SampleDialog from "./sample-dialog";
import styles from "./arrival.module.css";

export const metadata: Metadata = {
  title: "Shanghai Arrival Check | GoEast",
  description: "A personal, offline airport-to-hotel plan for your first arrival at Shanghai Pudong.",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};
export const dynamic = "force-dynamic";

const deliverables = [
  ["01", "A short email", "Your route at a glance, plus a fallback if the first option doesn’t work."],
  ["02", "An offline PDF", "Save your route, fallback steps and verified details before you fly."],
  ["03", "A Chinese address card", "A hotel address image you can open in Photos and show your driver."],
];

export default function ArrivalPage() {
  const environment = process.env.VERCEL_ENV;
  if (environment !== "preview" && (environment || (process.env.NODE_ENV !== "development" && process.env.ARRIVAL_LOCAL_REHEARSAL !== "1"))) notFound();

  return (
    <div id="arrival-preview" className={styles.shell}>
      <nav aria-label="GoEast arrival navigation" className="border-b border-[#dae6e4] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link className="inline-flex min-h-14 items-center text-lg font-bold tracking-tight text-[#102e35]" href="/">GoEast<span className="ml-0.5 text-[#006557]" aria-hidden="true">.</span></Link>
          <Link className="inline-flex min-h-14 items-center text-right text-sm font-bold text-[#006557] underline-offset-4 hover:underline" href="/china-travel-guide">Free China travel guide <svg aria-hidden="true" className="ml-1 shrink-0" width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 12 12 4m-6 0h6v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></Link>
        </div>
      </nav>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-5 sm:space-y-8 sm:px-6 sm:py-9">
        <header className={`${styles.hero} rounded-3xl p-5 sm:p-9 lg:p-12`}>
          <div className="grid items-center gap-7 lg:grid-cols-[1.2fr_.8fr] lg:gap-10">
            <div>
              <p className="text-[0.7rem] font-bold tracking-[.14em] text-[#c0f0df]">SHANGHAI ARRIVAL CHECK</p>
              <h1 className="mt-3 max-w-[18ch] text-balance text-[2.1rem] font-bold leading-[1.1] tracking-[-.038em] sm:text-5xl lg:text-[3.35rem]">Land in Shanghai with a plan.</h1>
              <p className="mt-3 max-w-md text-base leading-relaxed text-[#e0eeec] sm:text-lg">Know how to get from Pudong Airport to your hotel, even if your phone can’t get online.</p>
              <p className="mt-4 text-sm text-[#e0eeec]"><strong className="mr-1 text-lg text-white">US$12.90</strong> proposed one-time price</p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                <a className={styles.heroPrimary} href="#trip-check">Try a sample trip <span aria-hidden="true">→</span></a>
                <SampleDialog />
              </div>
              <p className="mt-3 text-xs text-[#d1e4e0]">Preview only · No real orders, payments or emails.</p>
            </div>
            <aside className="rounded-2xl border border-[#c8e7de] bg-[#f4faf8] p-4 text-[#102e35] shadow-sm sm:p-6" aria-labelledby="sample-title">
              <div className="flex items-start justify-between gap-3">
                <div><p className={styles.kicker}>TWO SAMPLE ARRIVALS</p><h2 id="sample-title" className="mt-1 text-xl font-bold tracking-tight">Same hotel, different plan</h2></div>
                
              </div>
              <div className="my-3 border-y border-[#d3e6e2] py-3">
                <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
                  <span className="text-sm font-bold">Pudong Airport</span>
                  <span className="h-px bg-[#8faeaa]" aria-hidden="true" />
                  <span className="text-sm font-bold">Your hotel</span>
                </div>
              </div>
              <ul className="grid gap-2 text-sm text-[#345459]">
                <li><strong className="text-[#102e35]">23:35 landing:</strong> skip the Airport Link; use the T2 taxi stand.</li>
                <li><strong className="text-[#102e35]">13:10 landing:</strong> try Metro Line 2; keep a T1 taxi backup.</li>
              </ul>
            </aside>
          </div>
        </header>

        <section aria-label="What you receive" className="grid gap-2.5 sm:grid-cols-3">
          {deliverables.map(([n,title,copy]) => <article key={n} className="flex gap-3 rounded-xl border border-[#dce6e4] bg-white p-3.5 sm:p-5">
            <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#e2f1ed] text-xs font-bold text-[#006557]">{n}</span>
            <div><h2 className="font-bold">{title}</h2><p className="mt-0.5 text-sm leading-relaxed text-[#425d63]">{copy}</p></div>
          </article>)}
        </section>

        <Intake />

        <section aria-labelledby="faq-title" className="rounded-2xl border border-[#dce6e4] bg-white p-5 sm:p-8">
          <p className={styles.kicker}>GOOD TO KNOW</p>
          <h2 id="faq-title" className="mb-3 mt-1 text-2xl font-bold tracking-tight">How it works</h2>
          <p className="mb-3 text-[#425d63]">For first-time travelers with a Pudong flight and a Shanghai hotel booked. Confirm your itinerary, price and delivery time before paying. No account required.</p>
          <details className="border-t border-[#dce6e4]"><summary className="cursor-pointer py-3 font-bold">Does this book a ride?</summary><p className="pb-3 text-[#425d63]">No. It doesn’t book transport, monitor flights live, provide live support or guarantee a payment method will work.</p></details>
          <details className="border-t border-[#dce6e4]"><summary className="cursor-pointer py-3 font-bold">How quickly would I get it?</summary><p className="pb-3 text-[#425d63]">Pilot target: two hours, with a maximum of 12 hours for accepted orders once payment and trip details are verified. A real quote would show the exact deadline before checkout.</p></details>
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
