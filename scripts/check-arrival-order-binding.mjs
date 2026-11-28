import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { normalizeTrip, checkoutMetadata, verifyPaid, verifyCheckout, verifyPacket, validateQuote } from '../lib/arrival-order-binding.mjs';

const id='a3797201-764b-4fae-902e-0267d22cd96c', other='a3797201-764b-4fae-902e-0267d22cd96d';
const cfg={mode:'test',product:'prod_Arrival', origin:'https://preview.goeast.ai'};
const form={flight:' cx 368 ',date:'2026-12-09',hotel:'Park Hyatt Shanghai',airport:'PVG',preferences:['no_mobile_payments'],termsAccepted:true};
const trip=()=>normalizeTrip(form,'2026-11-28');
const verified={terminal:'T1',localTime:'13:10',hotel:'Park Hyatt Shanghai'};
const row={id,version:1,checkout_id:'ch_first',product:cfg.product,subtotal:1290,currency:'USD',verified,trip:trip(),checkout_started_at:'2026-11-28T14:00:00Z',quote_expires:'2026-12-01T12:00:00Z',due_at:'2026-12-01T23:00:00Z'};
const metadata=checkoutMetadata(row,cfg);
const base={id:'ch_first',product:cfg.product,mode:'test',metadata,request_id:id,success_url:cfg.origin+'/shanghai-arrival-check/order?id='+id};
const order={id:'ord_first',product:cfg.product,amount:1290,currency:'USD',status:'paid',type:'onetime',transaction:'tran_first'};
const checkout={...base,status:'completed',order};
const transaction={id:'tran_first',order:'ord_first',mode:'test',type:'payment',status:'paid',amount:1290,amount_paid:1419,tax_amount:129,currency:'USD',created_at:'2026-11-28T15:03:00Z'};
const pdf=Buffer.from('%PDF-1.4\ntest\n%%EOF'), png=Buffer.from('89504e470d0a1a0a00','hex');
const hash=b=>createHash('sha256').update(b).digest('hex');
const packet={orderId:id,version:1,trip:{date:'2026-12-09',flight:'CX368',hotel:'Park Hyatt Shanghai',terminal:'T1',localTime:'13:10',preferences:['no_mobile_payments']},sha256:{pdf:hash(pdf),png:hash(png)},template:'arrival-v1'};

test('normalize only submitted fields; reject invalid real date, other airports, missing acceptance and free text preferences',()=>{
  assert.deepEqual(trip(),{flight:'CX368',date:'2026-12-09',hotel:'Park Hyatt Shanghai',airport:'PVG',preferences:['no_mobile_payments']});
  for(const args of [{date:'2026-02-30'},{airport:'SHA'},{termsAccepted:false},{preferences:['arbitrary']},{keys:'unexpected'},{date:'2026-11-28'}])
    assert.equal(normalizeTrip({...form,...args},'2026-11-28'),null);
});
test('checkout links must be exactly from the configured provider and correlated with this order',()=>{
  const pending={...base,status:'pending',checkout_url:'https://www.creem.io/test/checkout/prod_Arrival/ch_first'};
  assert.equal(verifyCheckout(row,pending,cfg)?.id,'ch_first');
  for(const updates of [{metadata:{...metadata,order_id:other}},{metadata:{...metadata,trip_version:'2'}},{checkout_url:'https://creem.io.attacker.example/test/checkout/prod_Arrival/ch_first'},{success_url:'https://www.goeast.ai/'}])
    assert.equal(verifyCheckout(row,{...pending,...updates},cfg),null);
});
test('canonical matching accepts explicitly taxed totals but rejects discrepancies and non-paid states',()=>{
  assert.equal(verifyPaid(row,checkout,transaction,cfg)?.transaction,'tran_first');
  assert.equal(verifyPaid(row,checkout,{...transaction,amount_paid:1290,tax_amount:0},cfg)?.gross,1290);
  for(const tx of [{amount_paid:1419,tax_amount:undefined},{amount_paid:1200},{created_at:'2026-11-27T00:00:00Z'},{created_at:'2026-12-02T00:00:00Z'},{currency:'EUR'},{status:'refunded'},{mode:'live'},{order:'ord_second'},{product:'prod_other'}])
    assert.equal(verifyPaid(row,checkout,{...transaction,...tx},cfg),null);
  assert.equal(verifyPaid(row,{...checkout,order:{...order,id:'ord_another'}},transaction,cfg),null);
});
test('report packet cannot cross order, version, hotel, flight, traveler preferences or changed bytes',()=>{
  assert.ok(verifyPacket(row,packet,pdf,png));
  for(const bad of [{...packet,orderId:other},{...packet,version:2},{...packet,trip:{...packet.trip,hotel:'Grand Hyatt Shanghai'}},{...packet,trip:{...packet.trip,flight:'CX369'}},{...packet,trip:{...packet.trip,preferences:[]}}])
    assert.equal(verifyPacket(row,bad,pdf,png),null);
  assert.equal(verifyPacket(row,packet,Buffer.from('%PDF-different'),png),null);
});
test('quote requires verified property, terminal, future expiry and enough preflight delivery time',()=>{
  const q={...verified,quoteExpires:'2026-12-01T12:00:00Z',dueAt:'2026-12-01T23:00:00Z'};
  assert.ok(validateQuote(row,q,'2026-11-28T15:00:00Z'));
  for(const bad of [{terminal:'T3'},{hotel:''},{localTime:'24:59'},{dueAt:'2026-12-09T20:00:00Z'},{quoteExpires:'2026-10-01T00:00:00Z'}])
    assert.equal(validateQuote(row,{...q,...bad},'2026-11-28T15:00:00Z'),null);
});
