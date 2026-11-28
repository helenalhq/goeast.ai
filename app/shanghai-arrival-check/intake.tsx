"use client";

import { useState, type FormEvent } from "react";
import { DEMO_EMAIL, examples, formatShanghai, lookupFlight, lookupHotels, makeDemoQuote, readyForReview, type Trip } from "@/lib/arrival-intake";

const input = "mt-1 min-h-12 w-full min-w-0 rounded-xl border border-[#829b93] bg-white px-3 text-base text-[#15322c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086457]";
const button = "inline-flex min-h-12 items-center justify-center rounded-xl bg-[#086457] px-5 py-2.5 text-center font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086457]";
const secondary = "inline-flex min-h-12 items-center justify-center rounded-xl border border-[#829b93] bg-white px-4 py-2.5 text-center font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086457]";
const pickList = [
  ["late", "Late arrival · T2"], ["day", "Daytime · T1"], ["codeshare", "Next week · shared flight"],
  ["uncertain", "Terminal not confirmed"], ["otherAirport", "Wrong airport"], ["unavailable", "Source unavailable"],
] as const;
const issues = {
  "outside-window": "The airport does not show this date yet. A dated airline schedule is needed. Your flight number is not necessarily wrong.",
  "not-found": "No flight matched this number and Shanghai arrival date in the sample data. Check the itinerary or use another sample.",
  "outside-scope": "This sample lands at Shanghai Hongqiao (SHA). Arrival Check currently covers Pudong (PVG) only.",
  "unverified-terminal": "Only a usual terminal was found. We couldn't verify this flight's terminal, so no checkout is available.",
  "source-unavailable": "The sample flight source is temporarily unavailable. Your details are retained; no checkout is available.",
};

function focus(id: string) {
  requestAnimationFrame(() => document.getElementById(id)?.focus());
}

export default function Intake() {
  const [trip, setTrip] = useState<Trip>({date:"", number:"", hotel:"", carrier:""});
  const [checked, setChecked] = useState(false);
  const [hotelId, setHotelId] = useState("");
  const [step, setStep] = useState<"trip" | "review" | "done">("trip");
  const [email, setEmail] = useState("");
  const [context, setContext] = useState<string[]>([]);
  const flight = lookupFlight(trip);
  const hotels = lookupHotels(trip.hotel);
  const selected = hotels.find(h => h.id === hotelId);

  function edit(key: keyof Trip, value: string) {
    setTrip(v => ({...v, [key]: value, ...(key === "date" || key === "number" ? {carrier:""} : {})}));
    if (key === "hotel") setHotelId("");
    if (key !== "carrier") setChecked(false);
  }

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setChecked(true);
    const id = selected?.id ?? (hotels.length === 1 ? hotels[0].id : "");
    if (id) setHotelId(id);
    if (readyForReview(flight, hotels, id)) {
      setStep("review");
      focus("arrival-review-heading");
    } else if (flight.kind === "needs-carrier") {
      focus("arrival-carrier");
    } else {
      focus("arrival-check-result");
    }
  }

  function fillSample(key: keyof typeof examples) {
    setTrip(examples[key]); setChecked(false); setHotelId(""); setEmail(""); setContext([]); setStep("trip");
    focus("arrival-date");
  }

  const quote = flight.kind === "matched" ? makeDemoQuote(flight.flight, email) : null;
  const explicitlyBlocked = checked && (flight.kind === "outside-scope" || flight.kind === "unverified-terminal");

  return (
    <section id="trip-check" tabIndex={-1} className="scroll-mt-6 rounded-3xl border border-[#d9e4dc] bg-white p-5 shadow-sm sm:p-8" aria-labelledby="intake-title">
      <p className="text-xs font-bold tracking-[.17em] text-[#086457]">INTERACTIVE PREVIEW · FICTIONAL DATA ONLY</p>
      <h2 id="intake-title" className="mt-2 text-3xl font-bold tracking-tight">Check my trip</h2>
      <p className="mt-2 max-w-xl text-[#36584e]">Try a sample trip. The preview does not look up, submit or store personal details, take payment or send email.</p>
      <ol aria-label="Form progress" className="mt-5 grid grid-cols-2 gap-2 text-sm font-bold">
        <li aria-current={step === "trip" ? "step" : undefined} className={step === "trip" ? "border-t-2 border-[#086457] pt-2" : "border-t-2 border-[#d9e4dc] pt-2"}>1. Your trip</li>
        <li aria-current={step !== "trip" ? "step" : undefined} className={step !== "trip" ? "border-t-2 border-[#086457] pt-2" : "border-t-2 border-[#d9e4dc] pt-2"}>2. Review & delivery</li>
      </ol>

      <div hidden={step !== "trip"}>
        <aside className="my-5 rounded-xl border border-[#dce6e4] bg-[#eef5f3] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold">Start with fictional data</p>
            <button type="button" className={secondary} onClick={() => fillSample("late")}>Use the late-arrival example</button>
          </div>
          <label htmlFor="arrival-sample" className="mt-3 block text-sm font-bold">Load a fictional itinerary</label>
          <select id="arrival-sample" className={input} value="" onChange={e => fillSample(e.currentTarget.value as keyof typeof examples)}>
            <option value="" disabled>Choose a sample…</option>
            {pickList.map(([k,label]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </aside>
        <form onSubmit={review} autoComplete="off">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="arrival-date" className="font-bold">Arrival date in Shanghai</label>
              <input id="arrival-date" className={input} type="date" required value={trip.date} onChange={e => edit("date", e.currentTarget.value)} aria-describedby="arrival-date-help" />
              <p id="arrival-date-help" className="mt-1 text-sm text-[#36584e]">Use the date you land, in Shanghai time (UTC+8).</p>
            </div>
            <div>
              <label htmlFor="arrival-flight" className="font-bold">Flight number</label>
              <input id="arrival-flight" className={input} type="text" required maxLength={12} placeholder="e.g. DX246" autoCapitalize="characters" spellCheck={false} value={trip.number} onChange={e => edit("number", e.currentTarget.value)} />
            </div>
          </div>
          <div className="mt-4">
            <label htmlFor="arrival-hotel" className="font-bold">Hotel name</label>
            <input id="arrival-hotel" className={input} type="text" required maxLength={120} placeholder="e.g. Bund Garden" value={trip.hotel} onChange={e => edit("hotel", e.currentTarget.value)} />
          </div>

          {checked && <div id="arrival-check-result" tabIndex={-1} aria-live="polite" className="mt-4 space-y-4 rounded-xl bg-[#f0f5ee] p-4">
            {flight.kind === "matched" && <div>
              <p className="font-bold">Sample flight matched · PVG {flight.flight.terminal} · {formatShanghai(`${flight.flight.date}T${flight.flight.time}:00+08:00`)}</p>
              <p className="mt-1 text-sm">{flight.flight.source === "schedule" ? "Scheduled from a dated airline plan. Recheck with the operating airline before departure." : "Sample airport listing. Not live flight status."}</p>
            </div>}
            {(flight.kind === "needs-carrier" || trip.carrier) && <div>
              <p>This flight is outside the airport lookup window and may be shared by two airlines.</p>
              <label htmlFor="arrival-carrier" className="mt-2 block font-bold">What airline is listed after “Operated by”?</label>
              <input id="arrival-carrier" className={input} type="text" maxLength={64} value={trip.carrier} placeholder="Try Demo Pacific" onChange={e => edit("carrier", e.currentTarget.value)} />
              <p className="mt-1 text-sm">No booking code or screenshot needed.</p>
            </div>}
            {flight.kind !== "matched" && flight.kind !== "needs-carrier" && <p role="status">{issues[flight.kind]}</p>}
            {flight.kind !== "outside-scope" && hotels.length > 1 && <fieldset className="min-w-0">
              <legend className="font-bold">Which hotel address is yours?</legend>
              {hotels.map(hotel => <label key={hotel.id} className="mt-2 flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-[#829b93] bg-white p-3">
                <input type="radio" name="arrival-hotel-choice" value={hotel.id} checked={hotelId === hotel.id} onChange={() => setHotelId(hotel.id)} />
                <span><strong className="block">{hotel.name}</strong><span className="block text-sm">{hotel.address}</span></span>
              </label>)}
            </fieldset>}
            {flight.kind !== "outside-scope" && hotels.length === 0 && <p>No sample property matched. Try the street address in the same field or load another sample. A real trip would go to manual review, without payment.</p>}
          </div>}

          <details className="my-5 border-y border-[#d9e4dc] py-3">
            <summary className="cursor-pointer py-2 font-semibold">Optional: add a backup preference</summary>
            {["I may not have mobile data", "I may not have mobile payments set up", "I already have an airport pickup"].map(item => <label key={item} className="flex min-h-11 items-center gap-3">
              <input type="checkbox" checked={context.includes(item)} onChange={e => {const active = e.currentTarget.checked;setContext(v => active ? [...v, item] : v.filter(x => x !== item));}} />
              <span>{item}</span>
            </label>)}
          </details>
          {context.includes("I already have an airport pickup") && <p className="mb-4">Already covered? The <a href="/china-travel-guide" className="font-bold underline">free guide</a> may be enough.</p>}
          {!explicitlyBlocked && <button type="submit" className={button}>Review my trip</button>}
          {explicitlyBlocked && <button type="button" className={secondary} onClick={() => {setChecked(false);focus("arrival-flight");}}>Edit trip details</button>}
        </form>
      </div>
      {step === "review" && flight.kind === "matched" && selected && <div className="mt-6">
        <h3 id="arrival-review-heading" tabIndex={-1} className="text-2xl font-bold">Review your trip</h3>
        <div className="mt-3 rounded-xl bg-[#f0f5ee] p-4">
          <dl className="space-y-3">
            <div><dt className="text-sm text-[#36584e]">Arrival · Shanghai time</dt><dd className="font-bold">{formatShanghai(`${flight.flight.date}T${flight.flight.time}:00+08:00`)} · Pudong (PVG) {flight.flight.terminal}</dd><dd className="text-sm">{flight.flight.source === "schedule" ? `Scheduled · operating flight ${flight.flight.number}. Recheck before departure.` : "Fictional airport lookup result."}</dd></div>
            <div><dt className="text-sm text-[#36584e]">Hotel for your address card</dt><dd className="font-bold">{selected.name}</dd><dd className="text-sm">{selected.address}</dd></div>
            {context.length > 0 && <div><dt className="text-sm text-[#36584e]">Backup preferences</dt><dd>{context.join(" · ")}</dd></div>}
          </dl>
          <button type="button" className="mt-3 min-h-11 font-bold underline" onClick={() => {setStep("trip");focus("arrival-date");}}>Edit trip</button>
        </div>
        <div className="mt-5">
          <label htmlFor="arrival-email" className="font-bold">Delivery email</label>
          <input id="arrival-email" className={input} type="email" readOnly placeholder="Use a sample email below" value={email} aria-describedby="arrival-email-help" />
          <p id="arrival-email-help" className="mt-1 text-sm text-[#36584e]">A real order would need only an email for delivery. This demo never asks for your actual address.</p>
          {!email && <button type="button" className={`${secondary} mt-3`} onClick={() => {setEmail(DEMO_EMAIL);focus("arrival-demo-confirm");}}>Use sample email</button>}
        </div>
        {quote && <div aria-live="polite" className="mt-5 rounded-xl border border-[#d9e4dc] p-4">
          <p className="text-lg font-bold">Demo quote · {quote.price} one time</p>
          <p className="mt-1 text-sm">Example quote expires {quote.expires}. Example delivery by {quote.latestDelivery}, Shanghai time (UTC+8).</p>
          <button id="arrival-demo-confirm" type="button" className={`${button} mt-3`} onClick={() => {setStep("done");focus("arrival-done-heading");}}>Preview order confirmation</button>
        </div>}
        {email && !quote && <p role="status" className="mt-4">This sample does not have a safe delivery window. Checkout is unavailable.</p>}
      </div>}
      {step === "done" && <div className="mt-6 rounded-xl bg-[#f0f5ee] p-4">
        <h3 id="arrival-done-heading" className="text-2xl font-bold" tabIndex={-1}>Demo complete</h3>
        <p className="my-3">No order was created, no money was taken and no email was sent. A real confirmation would follow verified payment.</p>
        <button type="button" className={secondary} onClick={() => {setStep("trip");focus("arrival-sample");}}>Try another trip</button>
      </div>}
    </section>
  );
}
