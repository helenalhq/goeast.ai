"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";

const api="/api/arrival-orders/orders";
const base="/shanghai-arrival-check/order";
const attemptSlot="goeast-arrival-intake-attempt-v1";
const states:Record<string,string>={
  submitted:"Trip received. We’ll verify your flight terminal and hotel before you can pay. Return here to check your quote.",
  quoted:"Your trip is verified. Confirm the details and delivery time below before paying.",
  paid:"Payment confirmed. We’re preparing a report for this itinerary.",
  ready:"Your report and offline address card are ready.",
  revoked:"This payment is no longer eligible for download. Contact GoEast support if this is unexpected.",
  held:"This payment needs a manual review. Do not pay again; contact GoEast support for help.",
};
type Order = { id:string;state:string;trip:{date:string;flight:string;hotel:string};verified?:{hotel:string;terminal:string;localTime:string};due_at?:string;quote_expires?:string;subtotal:number;currency:string;can_checkout:boolean };
type History = Pick<Order,"id"|"state"> & {date:string;flight:string;hotel:string};
const box="mt-5 rounded-2xl border border-[#cadcd5] bg-white p-5";
const input="mt-1 block min-h-11 w-full rounded-lg border border-[#829b93] px-3";
const button="min-h-11 rounded-lg bg-[#086457] px-4 py-2 font-bold text-white disabled:opacity-50";

function formatTime(value:string){
  return new Intl.DateTimeFormat("en-GB",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Shanghai"}).format(new Date(value))+" Shanghai time";
}
export default function OrderForm({id}:{id:string}){
  const [order,setOrder]=useState<Order>();
  const [history,setHistory]=useState<History[]>([]);
  const [failure,setFailure]=useState("");
  const [confirm,setConfirm]=useState(false);
  const [busy,setBusy]=useState(false);
  const [intakeConflict,setIntakeConflict]=useState(false);
  const attempt=useRef("");
  const [revision,setRevision]=useState(0);
  useEffect(()=>{
    const ctl=new AbortController();
    void fetch(api+(id?"?id="+id:""),{cache:"no-store",signal:ctl.signal}).then(async r=>{
      if(!r.ok) throw new Error(r.status===404?"Order not found.":"Could not load orders. Refresh to retry.");
      const result=await r.json();
      if(!ctl.signal.aborted){if(id)setOrder(result.order);else setHistory(result.orders);}
    }).catch(e=>{if(!ctl.signal.aborted)setFailure(e.message);});
    return ()=>ctl.abort();
  },[id,revision]);
  function clearAttempt(){
    attempt.current="";
    try {sessionStorage.removeItem(attemptSlot);}catch{/* Storage is optional within this page. */}
  }
  async function post(path:string,value:object){
    const intake=path===api;
    setBusy(true);setFailure("");setIntakeConflict(false);
    try {
      const headers:Record<string,string>={"content-type":"application/json"};
      if(intake){
        try {attempt.current ||= sessionStorage.getItem(attemptSlot)??"";}catch{/* Use the in-memory attempt. */}
        attempt.current ||= crypto.randomUUID();
        headers["Idempotency-Key"]=attempt.current;
        try {sessionStorage.setItem(attemptSlot,attempt.current);}catch{/* Use the in-memory attempt. */}
      }
      const r=await fetch(path,{method:"POST",headers,body:JSON.stringify(value)});
      const data=await r.json();
      if(!r.ok){
        if(intake&&r.status===409){
          setIntakeConflict(true);
          throw new Error("This attempt is already linked to an earlier trip. Check My orders before starting a separate submission.");
        }
        throw new Error(data.error);
      }
      if(intake) clearAttempt();
      window.location.assign(data.url??(base+"?id="+encodeURIComponent(data.id)));
    } catch(e){
      setFailure(e instanceof Error?e.message:"Something went wrong.");
      if(intake)setRevision(v=>v+1);
    }
    finally{setBusy(false);}
  }
  function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const form=new FormData(e.currentTarget);
    void post(api,{date:form.get("date"),flight:form.get("flight"),hotel:form.get("hotel"),airport:"PVG",preferences:form.getAll("preferences"),termsAccepted:form.get("terms")==="on"});
  }
  return <>
    {failure&&<p role="alert" className="mt-4 text-red-800">{failure}</p>}
    {id ? <section className={box}>
      <a href={base} className="underline">Back to my orders</a>
      <p className="mt-3 font-semibold" aria-live="polite">{order?states[order.state]:"Loading order…"}</p>
      {order&&<dl className="my-4 grid gap-2">
        <div><dt className="font-bold">Flight</dt><dd>{order.trip.flight} · {order.trip.date} · PVG {order.verified?.terminal} {order.verified?.localTime}</dd></div>
        <div><dt className="font-bold">Hotel</dt><dd>{order.verified?.hotel??order.trip.hotel}</dd></div>
        {order.due_at&&<div><dt className="font-bold">Delivery by</dt><dd>{formatTime(order.due_at)}</dd></div>}
      </dl>}
      {order?.state==="quoted" && (order.quote_expires&&order.can_checkout?<>
        <p className="mb-2">US$ {(order.subtotal/100).toFixed(2)} once. Any applicable tax is shown at checkout. Quote expires {formatTime(order.quote_expires)}.</p>
        <label className="mb-4 flex items-center gap-2"><input type="checkbox" checked={confirm} onChange={e=>setConfirm(e.target.checked)}/> I confirm this itinerary and delivery time.</label>
        <button className={button} disabled={!confirm||busy} onClick={()=>void post(api+"?action=checkout",{id,acceptedQuote:true})}>Continue to checkout</button>
      </>:<p>This quote expired. Contact support for a new quote. Do not reuse a checkout link.</p>)}
      {order?.state==="ready"&&<div className="flex flex-wrap gap-4">
        <a className="underline" href={api+"?id="+id+"&file=pdf"}>Download your PDF</a>
        <a className="underline" href={api+"?id="+id+"&file=png"}>Save offline address card</a>
      </div>}
      {order?.state!=="ready"&&<button type="button" className="mt-3 block min-h-11 underline" onClick={()=>{setFailure("");setRevision(v=>v+1);}}>Refresh status</button>}
    </section>:<>
      <form className={box} onSubmit={submit}>
        <h2 className="text-xl font-bold">Submit your Pudong (PVG) itinerary</h2>
        <p className="mt-2">No payment now. We check the flight and hotel before offering a quote.</p>
        <label className="mt-4 block">Arrival date in Shanghai <input className={input} name="date" type="date" required/></label>
        <label className="mt-4 block">Flight number <input className={input} name="flight" required maxLength={12} autoCapitalize="characters" placeholder="e.g. CX368"/></label>
        <label className="mt-4 block">Full hotel name or address <input className={input} name="hotel" required maxLength={120}/></label>
        <p className="mt-1 text-sm">Do not include passport numbers, booking codes, or payment details.</p>
        <fieldset className="my-5">
          <legend className="font-bold">What should we plan around? (optional)</legend>
          {([["no_mobile_data","No mobile data"],["no_mobile_payments","No mobile payments"],["extra_luggage","Extra luggage"]] as const).map(([value,label])=>
            <label key={value} className="flex min-h-10 items-center gap-2"><input type="checkbox" name="preferences" value={value}/>{label}</label>)}
        </fieldset>
        <div className="my-5 flex items-start gap-2"><input id="arrival-terms" type="checkbox" name="terms" required/><div><label htmlFor="arrival-terms">I agree that GoEast may use these details to prepare my quote and report.</label>{" "}<a href="/privacy" className="underline">Privacy</a>{" · "}<a href="/terms" className="underline">Terms</a></div></div>
        <button className={button} disabled={busy||intakeConflict}>Submit trip for review</button>
        {intakeConflict&&<button type="button" className="mt-3 block min-h-11 underline" onClick={()=>{
          clearAttempt();setIntakeConflict(false);setFailure("Ready for a separate order. Review the new itinerary before submitting.");
        }}>Start a separate submission</button>}
      </form>
      {history.length>0&&<section className={box}>
        <h2 className="text-xl font-bold">My orders</h2>
        <ul>{history.map(o=><li key={o.id} className="mt-3 border-t border-[#cadcd5] pt-2"><a className="underline" href={base+"?id="+o.id}>{o.flight} · {o.date} · {o.hotel}</a><p className="text-sm">{states[o.state]}</p></li>)}</ul>
      </section>}
    </>}
  </>;
}
