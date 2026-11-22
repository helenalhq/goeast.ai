import {pathToFileURL} from 'node:url';
const modulePath = process.env.PGLITE_MODULE;
if (!modulePath) throw new Error('Set PGLITE_MODULE to the disposable PGlite module index.js path.');
const {PGlite} = await import(pathToFileURL(modulePath));
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const db=await PGlite.create();
await db.exec("create role anon; create role authenticated; create role service_role bypassrls; create schema auth;");
await db.exec(await readFile(new URL("../supabase/decision-report-isolated/001.sql", import.meta.url),"utf8"));

const owner="33783acb-2e34-47d4-ae37-33330a3c9d4c", other="73d8e672-7b15-4f27-be17-3cd7712d2587";
const ids=["93783acb-2e34-47d4-ae37-33330a3c9d4c","83783acb-2e34-47d4-ae37-33330a3c9d4c"];
const token1="47383acb-2e34-47d4-ae37-33330a3c9d4c", token2="57383acb-2e34-47d4-ae37-33330a3c9d4c";
const result=async (sql,args=[]) => (await db.query(sql,args)).rows[0]?.result;
await db.exec("set role service_role");
for (const [i,id] of ids.entries()) {
  const sql="insert into public.decision_orders(id,owner_id,cast_hash,capture,mode,product_id,checkout_id) values ($1,$2,$3,$4,'test','prod_once',$5)";
  await db.query(sql,[id,owner, (i?'a':'b').repeat(64),JSON.stringify({question:"synthetic",casts:[]}),"ch_"+i]);
}
assert.equal(await result("select public.decision_record_payment($1,'test','prod_once','ch_bad','ord_0','tran_0') result",[ids[0]]),"invalid");
assert.equal(await result("select public.decision_record_payment($1,'test','prod_once','ch_0','ord_0','tran_0') result",[ids[0]]),"paid");
assert.equal(await result("select public.decision_record_payment($1,'test','prod_once','ch_0','ord_0','tran_0') result",[ids[0]]),"duplicate");
assert.equal(await result("select public.decision_acquire_generation($1,$2,$3) result",[ids[0],other,token1]),false);
assert.equal(await result("select public.decision_acquire_generation($1,$2,$3) result",[ids[0],owner,token1]),true);
assert.equal(await result("select public.decision_acquire_generation($1,$2,$3) result",[ids[0],owner,token2]),false);
assert.equal(await result("select public.decision_finish_generation($1,$2,$3,null) result",[ids[0],owner,token1]),true);
assert.equal(await result("select public.decision_acquire_generation($1,$2,$3) result",[ids[0],owner,token2]),true);
assert.equal(await result("select public.decision_finish_generation($1,$2,$3,'{}'::jsonb) result",[ids[0],owner,token1]),false);
assert.equal(await result("select public.decision_finish_generation($1,$2,$3,'{}'::jsonb) result",[ids[0],owner,token2]),true);
const reportId = await result("select report_id result from public.decision_orders where id=$1", [ids[0]]);
assert.match(reportId,/^[a-f0-9-]{36}$/);
assert.notEqual(reportId,ids[0]);
assert.equal(await result("select public.decision_record_refund('test','ord_0','tran_0') result"),"refunded");
assert.equal(await result("select report_id result from public.decision_orders where id=$1", [ids[0]]),reportId);
assert.equal(await result("select public.decision_record_refund('test','ord_0','tran_0') result"),"duplicate");
assert.equal(await result("select status result from public.decision_orders where id=$1 and report is null",[ids[0]]),"refunded");
assert.equal(await result("select public.decision_record_refund('test','ord_1','tran_1') result"),"recorded");
assert.equal(await result("select public.decision_record_payment($1,'test','prod_once','ch_1','ord_1','tran_1') result",[ids[1]]),"refund_precedes_payment");
assert.equal(await result("select public.decision_record_payment($1,'test','prod_once','ch_1','ord_1','tran_1') result",[ids[1]]),"duplicate");
assert.equal(await result("select status result from public.decision_orders where id=$1",[ids[1]]),"refunded");
await db.exec("reset role; set role anon");
await assert.rejects(()=>db.query("select * from public.decision_orders"),/permission denied/);
await assert.rejects(()=>result("select public.decision_record_refund('test','ord_2','tran_2') result"),/permission denied/);
console.log("PGlite SQL state machine: 21 checks passed");
await db.close();
