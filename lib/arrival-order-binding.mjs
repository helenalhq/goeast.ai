import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const PRICE_CENTS = 1290;
export const OFFER = 'shanghai_arrival_check';
export const isId = v => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);
export const providerId = (v, prefix) => typeof v === 'string' && v.length <= 120 && v.startsWith(prefix) && /^[a-zA-Z0-9_]+$/.test(v.slice(prefix.length));
const prefs = new Set(['no_mobile_data','no_mobile_payments','extra_luggage']);
const date = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0,10)===v;
const clean = v => typeof v==='string' && !/\p{C}/u.test(v) ? v.normalize('NFC').trim().replace(/\s+/g, ' ') : '';
const property = v => typeof v==='string' && clean(v).length >= 2 && clean(v).length<=120;
const millis = v => typeof v === 'number' && Number.isSafeInteger(v) ? v : (typeof v === 'string' || v instanceof Date ? +new Date(v) : NaN);
const ref = v => typeof v==='string' ? v : v?.id;
export const shanghaiDay = () => new Date(Date.now()+8*3600000).toISOString().slice(0,10);

export function normalizeTrip(body,today) {
  if (!body || typeof body!=='object' || Object.keys(body).some(k=>!['flight','date','hotel','airport','preferences','termsAccepted'].includes(k))
    || body.termsAccepted!==true || !date(today) || !date(body.date) || body.date<=today
    || +new Date(body.date)-+new Date(today)>60*86400000 || body.airport!=='PVG'
    || !property(body.hotel) || !Array.isArray(body.preferences) || body.preferences.length>3 || body.preferences.some(p=>!prefs.has(p))) return null;
  const flight=clean(body.flight).toUpperCase().replaceAll(' ','');
  if(!/^[A-Z0-9]{2}\d{1,4}[A-Z]?$/.test(flight) || /^\d{2}/.test(flight)) return null;
  return {flight,date:body.date,hotel:clean(body.hotel),airport:'PVG',preferences:[...new Set(body.preferences)].sort()};
}

export function validateQuote(row, input, now) {
  const cutoff=millis(input?.quoteExpires), due=millis(input?.dueAt), current=millis(now);
  const arrival=millis(row.trip.date+'T'+input?.localTime+':00+08:00');
  if(!['T1','T2'].includes(input?.terminal)|| !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(input?.localTime) || !property(input?.hotel)
     || ![cutoff,due,current,arrival].every(Number.isFinite) || cutoff<=current || due<=cutoff || due>=arrival) return null;
  return {terminal:input.terminal,localTime:input.localTime,hotel:clean(input.hotel),quoteExpires:new Date(cutoff).toISOString(),dueAt:new Date(due).toISOString()};
}

export const checkoutMetadata=(row,cfg)=>({offer_id:OFFER,order_id:row.id,trip_version:String(row.version),arrival_environment:cfg.mode});
export const returnUrl=(row,cfg)=>cfg.origin+'/shanghai-arrival-check/order?id='+row.id;
function correlated(row,checkout,cfg){
  const binding=checkoutMetadata(row,cfg);
  return isId(row.id) && checkout?.mode===cfg.mode && ref(checkout?.product)===row.product && row.product===cfg.product
    && providerId(checkout?.id,'ch_') && Object.entries(binding).every(([k,v])=>checkout?.metadata?.[k]===v)
    && (checkout.request_id==null || checkout.request_id===row.id);
}
export function verifyCheckout(row, input, cfg){
  if(!correlated(row,input,cfg)||input.status!=='pending'||input.success_url!==returnUrl(row,cfg)) return null;
  const id=input.id, url=input.checkout_url;
  if(url!=='https://checkout.creem.io/'+id &&
     !(cfg.mode==='test' && ['https://www.creem.io','https://creem.io'].some(host=>url===host+'/test/checkout/'+cfg.product+'/'+id))) return null;
  return {id,url};
}
export function verifyPaid(row,checkout,tx,cfg){
  const order=checkout?.order, at=millis(tx?.created_at), tax=tx?.tax_amount??0;
  if(!correlated(row,checkout,cfg)|| checkout.id!==row.checkout_id || checkout.status!=='completed'
    || !providerId(order?.id,'ord_') || ref(order.product)!==row.product || order.status!=='paid' || order.type!=='onetime'
    || row.currency!=='USD' || row.subtotal!==PRICE_CENTS || order.currency!==row.currency || order.amount!==row.subtotal
    || !providerId(tx?.id,'tran_') || tx.id!==order.transaction || ref(tx.order)!==order.id
    || tx.mode!==cfg.mode || tx.type!=='payment'||tx.status!=='paid'||tx.currency!==row.currency
    || tx.amount!==row.subtotal || (tx.discount_amount??0)!==0 || (tx.refunded_amount??0)!==0
    || (tx.product!=null&&ref(tx.product)!==row.product)
    || !Number.isSafeInteger(tax) || tax<0 || !Number.isSafeInteger(tx.amount_paid) || tx.amount_paid!==row.subtotal+tax
    || ![at,millis(row.checkout_started_at),millis(row.quote_expires),millis(row.due_at)].every(Number.isFinite)
    || at<millis(row.checkout_started_at) || at>millis(row.quote_expires) || at>=millis(row.due_at)) return null;
  return {order:order.id,transaction:tx.id,paidAt:new Date(at).toISOString(),gross:tx.amount_paid};
}

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export function reportTrip(row) {
  return {date:row.trip.date,flight:row.trip.flight,hotel:row.verified.hotel,terminal:row.verified.terminal,
    localTime:row.verified.localTime,preferences:row.trip.preferences};
}
export function verifyPacket(row, manifest, pdf, png) {
  if(!row.verified||manifest?.orderId!==row.id || manifest.version!==row.version || manifest.template!=='arrival-v1'
     || !Buffer.isBuffer(pdf)||!Buffer.isBuffer(png)||pdf.length>2_000_000||png.length>750_000
     ||pdf.subarray(0,5).toString()!=='%PDF-'|| !png.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'))) return null;
  const trip=reportTrip(row);
  if(Object.entries(trip).some(([k,v])=>JSON.stringify(manifest.trip?.[k])!==JSON.stringify(v))) return null;
  const hashes={pdf:sha(pdf),png:sha(png)};
  return hashes.pdf===manifest.sha256?.pdf && hashes.png===manifest.sha256?.png?hashes:null;
}

export function signedEvent(raw,signature,secret){
  if(typeof signature!=='string'||! /^[a-f0-9]{64}$/i.test(signature)||!secret) return null;
  const expected=createHmac('sha256',secret).update(raw).digest();
  if(!timingSafeEqual(expected,Buffer.from(signature,'hex'))) return null;
  try {const e=JSON.parse(raw); return providerId(e?.id,'evt_') ? e : null;} catch{return null;}
}
