"use client";

import { useState } from "react";
import { advance, getPlan, sample, sources, type Event, type Phase, type Scenario } from "@/lib/arrival-preview";

const labels: Record<Phase, string> = {
  sample: "Select a fictional itinerary to start",
  requested: "Request received · no payment",
  paid: "Test payment matched · ready for evidence check",
  hold: "On hold · confirm the hotel or terminal before preparing anything",
  review: "Draft ready · awaiting human review",
  approved: "Approved · ready for simulated delivery",
  delivered: "Simulated delivery recorded · no email was sent",
  canceled: "Canceled · no delivery",
};
const actions: Partial<Record<Phase, [Event, string]>> = {
  sample: ["apply","Submit test request"],
  requested: ["paid","Simulate matching paid invoice"],
  paid: ["prepare","Prepare draft"],
  review: ["approve","Approve draft"],
  approved: ["delivered","Simulate sending"],
};

export default function Rehearsal() {
  const [order, setOrder] = useState(() => sample("t2"));
  const action = actions[order.phase];
  const showPlan = ["review", "approved", "delivered"].includes(order.phase);
  const plan = showPlan ? getPlan(order) : null;
  function run(event: Event) { setOrder(current => advance(current, event)); }
  return (
    <section id="rehearsal" className="scroll-mt-6 rounded-2xl border border-[#d9e4dc] bg-white p-5 sm:p-8">
      <p className="text-xs font-bold tracking-widest text-[#086457]">INTERNAL REHEARSAL</p>
      <h2 className="my-2 text-2xl font-bold">From request to delivery</h2>
      <p className="mb-4">Fictional data only. Nothing leaves this rehearsal or creates an order.</p>
      <label className="block font-semibold" htmlFor="scenario">Sample itinerary</label>
      <select id="scenario" className="mt-2 w-full rounded-lg border border-[#73938c] bg-white p-2 sm:max-w-md" value={order.scenario}
        onChange={e => setOrder(sample(e.currentTarget.value as Scenario))}>
        <option value="t2">23:35 · Pudong T2</option><option value="t1">23:35 · Pudong T1</option>
        <option value="day">13:10 · Pudong T2</option><option value="unknown">Terminal not confirmed</option>
        <option value="ambiguous">Hotel not confirmed</option>
      </select>
      <p className="my-4 rounded-lg bg-[#e3f0e8] p-3 font-bold" aria-live="polite">{labels[order.phase]} · v{order.revision}</p>
      <div className="flex flex-wrap gap-3">
        {action && <button type="button" className="rounded-lg bg-[#086457] px-4 py-3 font-bold text-white" onClick={() => run(action[0])}>{action[1]}</button>}
        {order.phase !== "sample" && <button type="button" className="rounded-lg border px-4 py-3 font-semibold" onClick={() => setOrder(sample(order.scenario))}>Reset sample</button>}
        {["review", "approved"].includes(order.phase) && <button type="button" className="rounded-lg border px-4 py-3 font-semibold" onClick={() => run("changed")}>Simulate itinerary update</button>}
      </div>
      {plan && <article className="mt-6 rounded-xl bg-[#f3f5ee] p-4">
        <h3 className="text-lg font-bold">Customer email draft (synthetic)</h3>
        <p className="mt-2 font-semibold">{plan.flight}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>{plan.before}</li><li>{plan.route}</li><li>{plan.fallback}</li>{plan.rail && <li>{plan.rail}</li>}
        </ul>
        <p className="my-3 font-bold" lang="zh-CN">{plan.address}</p>
        <p className="text-sm"><a className="underline" href={sources.taxis}>Taxi source</a> · <a className="underline" href={sources.desk}>Airport desk</a> · <a className="underline" href={sources.hotel}>Hotel source</a>{plan.rail && <> · <a className="underline" href={sources.rail}>Rail timetable</a></>}</p>
        <p className="mt-2 text-sm">The downloadable attachments above are the published T2 demo artifacts, not generated per rehearsal.</p>
      </article>}
    </section>
  );
}
