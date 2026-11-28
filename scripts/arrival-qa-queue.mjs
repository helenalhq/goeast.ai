// Isolated, local rehearsal store; never use this with Vercel's ephemeral disk.
import { DatabaseSync } from "node:sqlite";
import { matchArrivalPayment, verifiedEvent, noticeSubject, approveArrival } from "../lib/arrival-fulfillment.ts";

export function openQaQueue(file) {
  const db = new DatabaseSync(file);
  db.exec(`PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, checkout TEXT UNIQUE NOT NULL, itineraryVersion INTEGER NOT NULL, expires TEXT NOT NULL, deadline TEXT NOT NULL, state TEXT NOT NULL, providerOrder TEXT UNIQUE, paidAt TEXT, noticeReceipt TEXT, trip TEXT NOT NULL, approvedDigest TEXT, deliveryReceipt TEXT);
  `);
  const find=id=>db.prepare("SELECT * FROM orders WHERE id=?").get(id);
  const transaction=fn=>{db.exec("BEGIN IMMEDIATE");try { const r=fn(); db.exec("COMMIT");return r; }catch(e){db.exec("ROLLBACK");throw e}};
  return {
    close:()=>db.close(),
    register(order,trip){
      noticeSubject(order.id);
      if(!trip||trip.synthetic!==true||!["PVG T1","PVG T2"].includes(trip.terminal)||!trip.hotel||!trip.localArrival||!Array.isArray(trip.preferences)) throw new Error("only complete fictional QA trips");
      db.prepare("INSERT INTO orders (id,checkout,itineraryVersion,expires,deadline,state,trip) VALUES (?,?,?,?,?,'pending',?)").run(order.id,order.checkout,order.itineraryVersion,order.expires,order.deadline,JSON.stringify(trip));
    },
    settle(raw,signature,secret){
      const event=verifiedEvent(raw,signature,secret);
      if(!event) return "invalid";
      const id=event?.object?.request_id;
      if(typeof id!=="string") return "ignore";
      return transaction(()=>{
        const order=find(id);
        if(!order) return "ignore";
        const result=matchArrivalPayment(order,event);
        if(result.kind==="paid"){
          if(db.prepare("SELECT 1 FROM orders WHERE providerOrder=?").get(result.providerOrder)) return "review";
          db.prepare("UPDATE orders SET state='paid',providerOrder=?,paidAt=? WHERE id=?").run(result.providerOrder,result.paidAt,id);
        }
        return result.kind;
      });
    },
    listUnnotified:()=>db.prepare("SELECT id,paidAt FROM orders WHERE state='paid' AND noticeReceipt IS NULL ORDER BY paidAt").all().map(r=>({...r,subject:noticeSubject(r.id)})),
    recordNotice:(id,receipt)=>{if(!receipt) return false;return db.prepare("UPDATE orders SET noticeReceipt=? WHERE id=? AND state='paid' AND noticeReceipt IS NULL").run(receipt,id).changes===1;},
    tripForPaidOrder:id=>{const r=find(id); return r?.state==="paid"?{id:r.id,version:r.itineraryVersion,deadline:r.deadline,trip:JSON.parse(r.trip)}:null;},
    approve(id,draft,now){return transaction(()=>{const r=find(id);if(!r||!approveArrival(r,draft,now))return false;return db.prepare("UPDATE orders SET state='approved',approvedDigest=? WHERE id=?").run(draft.sha256,id).changes===1;});},
    completeSimulatedDelivery(id,digest,receipt){if(!/^QA-[A-Za-z0-9-]+$/.test(receipt)) return false;return db.prepare("UPDATE orders SET state='delivered',deliveryReceipt=? WHERE id=? AND state='approved' AND approvedDigest=?").run(receipt,id,digest).changes===1;},
  };
}
