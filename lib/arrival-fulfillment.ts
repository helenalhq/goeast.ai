import { createHmac, timingSafeEqual } from "node:crypto";

export const arrivalTestProduct = "prod_6mUIh9LkfcmjyuSLmfByO";
const orderId = /^ar_[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/;
const providerId = /^ord_[A-Za-z0-9_]+$/;
export type ArrivalOrder = {id:string; checkout:string; itineraryVersion:number; expires:string; deadline:string; state:"pending"|"paid"|"held"|"approved"|"delivered";providerOrder:string|null};
type Payment = {kind:"ignore"|"duplicate"|"review"} | {kind:"paid";providerOrder:string;paidAt:string};
type Bag = Record<string, unknown>;
const bag = (v:unknown):Bag => v && typeof v === "object" && !Array.isArray(v) ? v as Bag : {};
const millis = (v:unknown) => typeof v === "string" ? Date.parse(v) : NaN;

export function verifiedEvent(raw:string,signature:string,secret:string):unknown {
  if (!secret || raw.length>128_000 || !/^[a-f0-9]{64}$/i.test(signature)) return null;
  const expected=createHmac("sha256",secret).update(raw).digest();
  if (!timingSafeEqual(expected,Buffer.from(signature,"hex"))) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

const offer = "shanghai_arrival_qa";
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
export const arrivalCheckoutMetadata=(id:string)=>({offer_id:offer,order_id:id});

export function arrivalCheckoutCorrelation(id:string,input:unknown){
  const checkout=bag(input), metadata=bag(checkout.metadata), echo=checkout.request_id;
  if(!orderId.test(id) || (echo!=null&&typeof echo!=="string") ||
     (typeof echo==="string"&&((uuid.test(echo)&&echo.toLowerCase()!==id.slice(3))||(orderId.test(echo)&&echo!==id)))) return false;
  const metadataMatches=metadata.order_id===id&&metadata.offer_id===offer;
  if(checkout.metadata!=null&&!metadataMatches) return false;
  return echo===id||echo===id.slice(3)||metadataMatches;
}
export function arrivalWebhookOrderId(input:unknown){
  const checkout=bag(input), candidate=bag(checkout.metadata).order_id;
  if(typeof candidate==="string"&&arrivalCheckoutCorrelation(candidate,checkout)) return candidate;
  const echo=checkout.request_id;
  if(typeof echo==="string"&&orderId.test(echo)&&arrivalCheckoutCorrelation(echo,checkout)) return echo;
  return null;
}

function paymentForCheckout(order:ArrivalOrder,input:unknown,timestamp:unknown):Payment {
  const checkout=bag(input), paid=bag(checkout.order);
  const product=typeof checkout.product==="string"?checkout.product:bag(checkout.product).id;
  const orderProduct=typeof paid.product==="string"?paid.product:bag(paid.product).id;
  if (!orderId.test(order.id)
    || checkout.mode!=="test" || checkout.status!=="completed" || !arrivalCheckoutCorrelation(order.id,checkout) || checkout.id!==order.checkout
    || product!==arrivalTestProduct || orderProduct!==arrivalTestProduct
    || paid.status!=="paid" || paid.type!=="onetime" || paid.amount!==1290 || paid.currency!=="USD" || typeof paid.id!=="string" || !providerId.test(paid.id)) return {kind:"ignore"};
  if (order.providerOrder===paid.id) return {kind:"duplicate"};
  if (order.state!=="pending") return {kind:"review"};
  const paidAt=typeof timestamp==="number" && Number.isSafeInteger(timestamp) ? timestamp : millis(timestamp);
  if (!Number.isFinite(paidAt)||!Number.isFinite(millis(order.expires))||!Number.isFinite(millis(order.deadline))
      || paidAt<=0||paidAt>millis(order.expires)||paidAt>=millis(order.deadline)) return {kind:"review"};
  return {kind:"paid",providerOrder:paid.id,paidAt:new Date(paidAt).toISOString()};
}
export function matchArrivalPayment(order:ArrivalOrder,input:unknown):Payment {
  const event=bag(input);
  if(event.eventType!=="checkout.completed"||typeof event.id!=="string") return {kind:"ignore"};
  return paymentForCheckout(order,event.object,event.created_at);
}
// Only invoked after authenticated server-to-server reads of both Creem Test resources.
export function matchRetrievedArrivalPayment(order:ArrivalOrder,input:unknown,transaction:unknown):Payment {
  const checkout=bag(input), paid=bag(checkout.order), tx=bag(transaction);
  if(typeof paid.transaction!=="string"||!/^tran_[A-Za-z0-9_]+$/.test(paid.transaction)
    || tx.id!==paid.transaction || (typeof tx.order==="string"?tx.order:bag(tx.order).id)!==paid.id
    || (tx.product!=null&&(typeof tx.product==="string"?tx.product:bag(tx.product).id)!==arrivalTestProduct)
    || tx.mode!=="test" || tx.type!=="payment" || tx.status!=="paid" || tx.currency!=="USD"
    || tx.amount!==1290 || tx.amount_paid!==1290) return {kind:"ignore"};
  return paymentForCheckout(order,checkout,tx.created_at);
}
export function noticeSubject(id:string){
  if(!orderId.test(id)) throw new Error("invalid order ID");
  return "[GoEast Arrival QA] Paid "+id;
}
export function approveArrival(order:ArrivalOrder,draft:{id:string;version:number;sha256:string;completeEvidence:boolean},now:string){
  return order.state==="paid"&&draft.id===order.id&&draft.version===order.itineraryVersion&&/^[0-9a-f]{64}$/.test(draft.sha256)
    &&draft.completeEvidence&&millis(now)<millis(order.deadline);
}
