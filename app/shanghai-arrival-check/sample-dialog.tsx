"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import packs from "@/lib/arrival-sample-packs.json";
import styles from "./arrival.module.css";

const options = ["late", "day"] as const;
type Pack = typeof options[number];

const OpenSample = createContext<((scenario: Pack, trigger: HTMLButtonElement) => void) | null>(null);

export function SampleTrigger({children, scenario = "late", className = styles.secondary, label}: {
  children: ReactNode; scenario?: Pack; className?: string; label?: string;
}) {
  const show = useContext(OpenSample);
  return (
    <button type="button" aria-label={label} aria-haspopup="dialog" aria-controls="arrival-sample-dialog" className={className}
      onClick={event => show?.(scenario, event.currentTarget)}>
      {children}
    </button>
  );
}

export default function SampleExperience({children}: { children: ReactNode }) {
  const panel = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const [selected, setSelected] = useState<Pack>("late");
  const current = packs.cases[selected];

  const show = useCallback((scenario: Pack, button: HTMLButtonElement) => {
    if (!panel.current || panel.current.open) return;
    trigger.current = button;
    setSelected(scenario);
    panel.current.showModal();
    close.current?.focus();
  }, []);

  return (
    <OpenSample.Provider value={show}>
      {children}
      <dialog ref={panel} id="arrival-sample-dialog" className={styles.dialog} aria-labelledby="arrival-sample-heading" onClose={() => trigger.current?.focus()}>
        <div className={styles.dialogPanel}>
          <header className="border-b border-[#dce5e7] px-5 pb-3 pt-4 sm:px-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={styles.kicker}>COMPARE TWO FICTIONAL ITINERARIES</p>
                <h2 id="arrival-sample-heading" className="mt-1 text-xl font-bold tracking-tight text-[#102b32] sm:text-3xl">Your first hour in Shanghai</h2>
              </div>
              <button ref={close} type="button" onClick={() => panel.current?.close()} className={styles.close} aria-label="Close sample"><span aria-hidden="true">×</span></button>
            </div>
            <div role="group" aria-label="Choose an example itinerary" className="mt-3 grid grid-cols-2 gap-2">
              {options.map(key => <button key={key} aria-pressed={selected === key} className={selected === key ? styles.primary : styles.secondary} onClick={() => setSelected(key)} type="button">
                {packs.cases[key].label} <span className="hidden text-xs opacity-80 sm:inline">{packs.cases[key].time}</span>
              </button>)}
            </div>
          </header>

          <div key={selected} className="min-h-0 overflow-y-auto overscroll-contain px-5 py-4 sm:px-7">
            <p className="text-xs font-semibold text-[#425d63]">{current.time} Shanghai time · {current.context}</p>
            <h3 className="mt-3 text-sm font-bold text-[#006557]">The airport-to-hotel plan</h3>
            <div className="mt-1 rounded-2xl border border-[#bae0d5] bg-[#e8f5f0] p-3.5 sm:p-4">
              <p className="text-lg font-bold leading-snug tracking-tight text-[#102b32] sm:text-2xl">{current.verdict}</p>
              <p className="mt-2 text-sm leading-relaxed text-[#345459]">{current.finding}</p>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[#345459]"><strong className="text-[#102b32]">When to switch:</strong> {current.switch}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <details className="rounded-xl border border-[#dce5e7] bg-white px-3">
                <summary className="cursor-pointer py-3 text-sm font-bold">Your first steps</summary>
                <ol className="space-y-2 pb-3 text-sm text-[#425d63]">{current.route.map(step => <li key={step.title}><strong className="block text-[#102b32]">{step.title}</strong>{step.body}</li>)}</ol>
              </details>
              <details className="rounded-xl border border-[#dce5e7] bg-white px-3">
                <summary className="cursor-pointer py-3 text-sm font-bold">Offline and payment backups</summary>
                <ul className="space-y-2 pb-3 text-sm text-[#425d63]">{current.fallback.map(step => <li key={step.title}><strong className="block text-[#102b32]">{step.title}</strong>{step.body}</li>)}</ul>
                {"deskPhrase" in current && <div className="mb-3 rounded-lg bg-[#eef5f3] p-2.5 text-sm">
                  <strong className="block">{current.deskPhrase.heading}</strong>
                  <p className="mt-1 text-[#425d63]">{current.deskPhrase.english}</p>
                  <p lang="zh-CN" className="mt-2">{current.deskPhrase.chinese.join("")}</p>
                </div>}

              </details>
              <details className="rounded-xl border border-[#dce5e7] bg-white px-3">
                <summary className="cursor-pointer py-3 text-sm font-bold">Message to send your hotel</summary>
                <p className="pb-2 text-sm font-semibold text-[#102b32]">{current.hotelTask}</p>
                <blockquote className="mb-3 border-l-2 border-[#9ec8bd] pl-3 text-sm text-[#425d63]">{current.message}</blockquote>
              </details>
              <details className="rounded-xl border border-[#dce5e7] bg-white px-3">
                <summary className="cursor-pointer py-3 text-sm font-bold">What we checked</summary>
                <p className="pb-2 text-sm text-[#425d63]">Sample research: {packs.checked}. <strong>Recheck before departure:</strong> {current.recheck}</p>
                <ul className="space-y-2 pb-3 text-sm">{current.sourceIds.map(id => {
                  const evidence = packs.sources[id as keyof typeof packs.sources];
                  return <li key={id}><a className="font-semibold text-[#006557] underline" href={evidence.url} target="_blank" rel="noreferrer">{evidence.name}</a><p className="text-[#425d63]">{evidence.scope}</p></li>;
                })}</ul>
              </details>
            </div>

            <figure className="mt-4 grid grid-cols-[minmax(0,1fr)_5rem] items-center gap-3 rounded-xl bg-[#eef5f3] p-3 sm:grid-cols-[minmax(0,1fr)_6rem]">
              <figcaption><strong className="block text-sm text-[#102b32]">Chinese address card</strong><span className="mt-1 block text-sm text-[#425d63]">{packs.hotel.name} · Save to Photos for offline use.</span></figcaption>
              <Image className="mx-auto h-auto max-h-32 w-auto max-w-full rounded border border-[#b7ccc8]" src="/samples/shanghai-driver-card.png" alt="Chinese address card for the Grand Hyatt Shanghai" width={900} height={1420} unoptimized />
            </figure>
          </div>
          <footer className="flex flex-wrap gap-2 border-t border-[#dce5e7] bg-[#f6f9f8] px-5 py-3 sm:px-7">
            <a className={styles.primary} href={`/samples/${current.file}.pdf`} download>Download sample PDF</a>
            <a className={styles.secondary} href="/samples/shanghai-driver-card.png" download>Download address card</a>
          </footer>
        </div>
      </dialog>
    </OpenSample.Provider>
  );
}
