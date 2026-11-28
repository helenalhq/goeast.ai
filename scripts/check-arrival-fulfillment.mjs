import { test } from "node:test";
import { strictEqual, deepStrictEqual } from "node:assert";
import { createHmac } from "node:crypto";
import { matchArrivalPayment, verifiedEvent } from "../lib/arrival-fulfillment.ts";
const sku="prod_6mUIh9LkfcmjyuSLmfByO";
const now="2026-11-28T12:00:00.000Z";
const order={id:"ar_113e4567-e89b-42d3-a456-426614174000",checkout:"ch_test",state:"pending",providerOrder:null,itineraryVersion:1,expires:"2026-11-28T13:00:00Z",deadline:"2026-11-29T00:00:00Z"};
const event={id:"evt_fixture",eventType:"checkout.completed",created_at:Date.parse(now),object:{id:"ch_test",status:"completed",mode:"test",request_id:order.id,product:{id:sku},order:{id:"ord_fixture",status:"paid",type:"onetime",product:sku,amount:1290,currency:"USD",created_at:now}}};
test("payment acceptance requires a valid signature and the exact outstanding order",()=>{
  const raw=JSON.stringify(event), secret="x".repeat(32), sig=createHmac("sha256",secret).update(raw).digest("hex");
  const normalized=verifiedEvent(raw,sig,secret);
  deepStrictEqual(matchArrivalPayment(order,normalized),{kind:"paid",providerOrder:"ord_fixture",paidAt:now});
  strictEqual(verifiedEvent(raw+" ",sig,secret),null);
  strictEqual(matchArrivalPayment({...order,checkout:"ch_other"},normalized).kind,"ignore");
});
