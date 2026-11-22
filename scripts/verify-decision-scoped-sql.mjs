import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE));
const migration = await readFile(new URL("../supabase/decision-report-scoped/001.sql", import.meta.url), "utf8");
const preflight = await readFile(new URL("../supabase/decision-report-scoped/preflight-public.sql", import.meta.url), "utf8");
const rollback = await readFile(new URL("../supabase/decision-report-scoped/rollback.sql", import.meta.url), "utf8");
const role = "goeast_p1_qa";
const qa = "33783acb-2e34-47d4-ae37-33330a3c9d4c";
const other = "73d8e672-7b15-4f27-be17-3cd7712d2587";
const id = "93783acb-2e34-47d4-ae37-33330a3c9d4c";
const token = "47383acb-2e34-47d4-ae37-33330a3c9d4c";
const db = await PGlite.create();
const fixture = `
  create role anon; create role authenticated; create role service_role bypassrls;
  create schema auth; grant usage on schema auth to public;
  create table auth.users (id uuid); insert into auth.users values ('${qa}'), ('${other}');
  create table public.subscriptions (id integer, status text);
  insert into public.subscriptions values (1, 'unchanged');
  create table public.consult_results (id integer);
`;
await db.exec(fixture);
const sql = migration.replace("REPLACE_WITH_DESIGNATED_AUTH_UUID", qa);

assert.deepEqual((await db.query(preflight)).rows, []);
await db.exec("grant select (status) on public.subscriptions to public");
assert.deepEqual((await db.query(preflight)).rows, [{ reason:"public-relation-privilege", object_name:"public.subscriptions" }]);
await assert.rejects(() => db.exec(sql), /Outside-QA relation privileges/);
await db.exec("rollback; revoke select (status) on public.subscriptions from public");
await db.exec("create function public.read_status() returns text language sql security definer as 'select status from public.subscriptions'");
assert.deepEqual((await db.query(preflight)).rows, [{ reason:"public-execute-security-definer", object_name:"public.read_status()" }]);
await assert.rejects(() => db.exec(sql), /Outside-QA SECURITY DEFINER privilege/);
await db.exec("rollback; drop function public.read_status()");
assert.deepEqual((await db.query(preflight)).rows, []);
await db.exec(sql);

const query = (q, args = []) => db.query(q, args);
const value = async (q, args = []) => (await query(q, args)).rows[0]?.v;
assert.equal(await value("select rolcanlogin v from pg_roles where rolname='goeast_p1_qa'"), false);
await db.exec("set session authorization "+role);
assert.equal(await value("select goeast_p1_qa.decision_qa_isolation_ok($1) v", [qa]), true);
assert.equal(await value("select goeast_p1_qa.decision_qa_isolation_ok($1) v", [other]), false);
for (const stmt of [
  "select * from public.subscriptions",
  "update public.subscriptions set status='changed'",
  "select * from public.consult_results",
  "insert into public.consult_results values (1)",
  "select * from auth.users",
  "delete from auth.users",
  "create table public.unauthorized (id integer)",
  "set role service_role",
]) await assert.rejects(() => db.exec(stmt), /permission denied/);
const insert = "insert into goeast_p1_qa.decision_orders(id,owner_id,cast_hash,capture,mode,product_id,checkout_id) values ($1,$2,$3,'{}','test','prod_once','ch_1')";
await assert.rejects(() => query(insert,[id,other,"a".repeat(64)]), /foreign key constraint|row-level security/);
await query(insert,[id,qa,"a".repeat(64)]);
assert.equal(await value("select goeast_p1_qa.decision_record_payment($1,'test','prod_once','ch_1','ord_1','tx_1') v",[id]),"paid");
assert.equal(await value("select goeast_p1_qa.decision_acquire_generation($1,$2,$3) v",[id,qa,token]),true);
assert.equal(await value("select goeast_p1_qa.decision_finish_generation($1,$2,$3,'{}') v",[id,qa,token]),true);
assert.equal(await value("select status v from goeast_p1_qa.decision_orders where id=$1",[id]),"delivered");
assert.equal(await value("select goeast_p1_qa.decision_record_refund('test','ord_1','tx_1') v"),"refunded");
assert.equal(await value("select status v from goeast_p1_qa.decision_orders where id=$1 and report is null",[id]),"refunded");
assert.equal(await value("select goeast_p1_qa.decision_record_payment($1,'test','prod_once','ch_1','ord_1','tx_1') v",[id]),"duplicate");
await db.close();
for (const apiRole of ["anon", "authenticated", "service_role"]) {
  const api = await PGlite.create();
  await api.exec(fixture);
  await api.exec(sql);
  await api.exec("set session authorization "+apiRole);
  await assert.rejects(() => api.query("select * from goeast_p1_qa.decision_orders"), /permission denied/);
  await assert.rejects(() => api.query("select goeast_p1_qa.decision_qa_isolation_ok($1)",[qa]), /permission denied/);
  await api.close();
}
const drift = await PGlite.create();
await drift.exec(fixture);
await drift.exec(sql);
await drift.exec("grant update (status) on public.subscriptions to public");
assert.equal((await drift.query("select status from public.subscriptions")).rows[0].status,"unchanged");
await drift.exec("set session authorization "+role);
assert.equal((await drift.query("select goeast_p1_qa.decision_qa_isolation_ok($1) ok",[qa])).rows[0].ok,false);
await drift.close();
const cleanup = await PGlite.create();
await cleanup.exec(fixture);
await cleanup.exec(sql);
await cleanup.exec(rollback);
assert.deepEqual((await cleanup.query(preflight)).rows,[]);
assert.equal((await cleanup.query("select status from public.subscriptions")).rows[0].status,"unchanged");
await cleanup.close();
console.log("Scoped role SQL: privilege boundary, deny-on-drift, and refund state checks passed.");
