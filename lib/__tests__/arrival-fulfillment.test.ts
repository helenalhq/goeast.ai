import { createHmac } from "node:crypto";
import { describe, it, expect } from "vitest";
import { arrivalCheckoutCorrelation, arrivalCheckoutMetadata, arrivalWebhookOrderId, matchArrivalPayment, matchSignedArrivalPayment, matchRetrievedArrivalPayment, noticeSubject, verifiedEvent, approveArrival, type ArrivalOrder } from "../arrival-fulfillment";

const product = "prod_6mUIh9LkfcmjyuSLmfByO";
const secret = "a".repeat(40);
const now = "2026-11-28T12:00:00.000Z";
const order: ArrivalOrder = { id:"ar_113e4567-e89b-42d3-a456-426614174000", checkout:"ch_order", itineraryVersion:1, expires:"2026-11-28T13:00:00.000Z", deadline:"2026-11-29T00:00:00.000Z", state:"pending", providerOrder:null };
const event = { id:"evt_1",eventType:"checkout.completed",created_at:Date.parse(now),object:{id:order.checkout,mode:"test",status:"completed",request_id:order.id,product:{id:product},order:{id:"ord_test",type:"onetime",status:"paid",amount:1290,currency:"USD",product,created_at:now}} };
describe("Arrival Test fulfillment contract",()=>{
  it("requires a valid signature on the actual body",()=>{
    const raw=JSON.stringify(event); const signature=createHmac("sha256",secret).update(raw).digest("hex");
    expect(verifiedEvent(raw,signature,secret)).toEqual(event);
    expect(verifiedEvent(raw+" ",signature,secret)).toBeNull();
    expect(verifiedEvent(raw, "f",secret)).toBeNull();
  });
  it("accepts only a correlated test one-time payment, and makes replay harmless",()=>{
    expect(matchArrivalPayment(order,event)).toEqual({kind:"paid",providerOrder:"ord_test",paidAt:now});
    expect(matchArrivalPayment({...order,state:"paid",providerOrder:"ord_test"},event)).toEqual({kind:"duplicate"});
    for (const change of [{mode:"live"},{id:"ch_other"},{request_id:"wrong"},{product:{id:"prod_other"}},{order:{...event.object.order,amount:1200}},{order:{...event.object.order,status:"pending"}},{order:{...event.object.order,type:"recurring"}}]) {
      expect(matchArrivalPayment(order,{...event,object:{...event.object,...change}}).kind).toBe("ignore");
    }
    expect(matchArrivalPayment({...order,expires:"2026-11-28T11:59:00Z"},event).kind).toBe("review");
  });
  it("correlates Creem's optional/provider-shaped checkout echo using exact order and offer metadata",()=>{
    const metadata=arrivalCheckoutMetadata(order.id);
    for(const request_id of [order.id.slice(3),null,undefined,"provider_echo"]){
      const checkout={...event.object,metadata,request_id};
      expect(arrivalCheckoutCorrelation(order.id,checkout)).toBe(true);
      expect(arrivalWebhookOrderId(checkout)).toBe(order.id);
      expect(matchArrivalPayment(order,{...event,object:checkout}).kind).toBe("paid");
    }
    for(const checkout of [
      {request_id:"123e4567-e89b-42d3-a456-426614174999",metadata},
      {request_id:"ar_123e4567-e89b-42d3-a456-426614174999",metadata},
      {request_id:"provider_echo",metadata:{...metadata,offer_id:"decision_once"}},
      {request_id:"provider_echo"},
    ]) expect(arrivalCheckoutCorrelation(order.id,checkout)).toBe(false);
  });
  it("reconciles only the bound Creem Test checkout and its independently paid transaction",()=>{
    const checkout={...event.object,order:{...event.object.order,transaction:"tran_a"}};
    const transaction={id:"tran_a",mode:"test",type:"payment",status:"paid",created_at:Date.parse(now),order:"ord_test",product,amount:1290,amount_paid:1290,currency:"USD"};
    expect(matchRetrievedArrivalPayment(order,checkout,transaction)).toEqual({kind:"paid",providerOrder:"ord_test",paidAt:now});
    expect(matchRetrievedArrivalPayment(order,checkout,{...transaction,product:undefined}).kind).toBe("paid");
    expect(matchRetrievedArrivalPayment({...order,state:"paid",providerOrder:"ord_test"},checkout,transaction)).toEqual({kind:"duplicate"});
    for(const invalid of [{mode:"prod"},{status:"refunded"},{status:"chargeback"},{amount_paid:0},{order:"ord_other"},{id:"tran_other"},{product:"prod_other"}]){
      expect(matchRetrievedArrivalPayment(order,checkout,{...transaction,...invalid}).kind).toBe("ignore");
    }
    expect(matchRetrievedArrivalPayment(order,{...checkout,id:"ch_other"},transaction).kind).toBe("ignore");
    expect(matchRetrievedArrivalPayment(order,{...checkout,request_id:null},transaction).kind).toBe("ignore");
    expect(matchRetrievedArrivalPayment(order,checkout,{...transaction,created_at:null}).kind).toBe("review");
    expect(matchRetrievedArrivalPayment({...order,expires:"2026-11-28T11:59:00Z"},checkout,transaction).kind).toBe("review");
  });
  it("uses a matched provider transaction clock on either ingress, not delayed callback time",()=>{
    const signedCheckout={...event.object,order:{...event.object.order,transaction:"tran_a"}};
    const delayed={...event,created_at:Date.parse(order.expires)+2000,object:signedCheckout};
    const early={id:"tran_a",mode:"test",type:"payment",status:"paid",created_at:Date.parse(order.expires)-1000,order:"ord_test",amount:1290,amount_paid:1290,currency:"USD"};
    expect(matchSignedArrivalPayment(order,delayed,signedCheckout,early)).toEqual(matchRetrievedArrivalPayment(order,signedCheckout,early));
    expect(matchSignedArrivalPayment(order,delayed,signedCheckout,early).kind).toBe("paid");
    expect(matchSignedArrivalPayment(order,event,signedCheckout,early).kind).toBe("ignore");
    expect(matchSignedArrivalPayment(order,{...delayed,object:{...signedCheckout,order:{...signedCheckout.order,id:"ord_other"}}},signedCheckout,early).kind).toBe("ignore");
    expect(matchSignedArrivalPayment(order,delayed,signedCheckout,{...early,created_at:Date.parse(order.expires)+1000}).kind).toBe("review");
  });
  it("puts only an opaque order ID in the notice; gates approval on payment, version and checks",()=>{
    expect(noticeSubject(order.id)).toBe("[GoEast Arrival QA] Paid "+order.id);
    expect(()=>noticeSubject("A\ncustomer@example.com")).toThrow();
    const draft={id: order.id,version:1,sha256:"a".repeat(64),completeEvidence:true};
    expect(approveArrival(order,draft,now)).toBe(false);
    expect(approveArrival({...order,state:"paid"},{...draft,version:2},now)).toBe(false);
    expect(approveArrival({...order,state:"paid"},{...draft,completeEvidence:false},now)).toBe(false);
    expect(approveArrival({...order,state:"paid"},draft,now)).toBe(true);
  });
});
