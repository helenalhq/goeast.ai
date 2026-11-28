import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const { PGlite } = await import(process.env.ARRIVAL_QA_PGLITE_MODULE ?? "@electric-sql/pglite");
const root=new URL("..",import.meta.url).pathname.replace(/\/$/,"");
const db=new PGlite();
await db.exec(readFileSync(root+"/supabase/arrival-preview/init.sql","utf8"));
const id="ar_99999999-8888-4777-8666-555555555555";
await db.query(`insert into arrival_preview.jobs(id, trip, expires, deadline, state, "providerOrder", paid_at, "itineraryVersion", notice_id) values($1,'{"synthetic":true}',now()+interval '5 min',now()+interval '12 hours','paid','ord_qa',now(),2,'provider-already-accepted')`,[id]);
const legacy=`SELECT id FROM arrival_preview.jobs WHERE state='paid' AND notice_id IS NULL ORDER BY paid_at LIMIT 20`;
if(process.env.CHECK_LEGACY) assert.equal((await db.query(legacy)).rows.length,1,"mail acceptance must not hide an order before Emma claims it");
const { listClaimableSql, claimSql }=await import(root+"/lib/arrival-preview-claim.ts");
await db.exec(readFileSync(root+"/supabase/arrival-preview/claim.sql","utf8"));
async function list(){return (await db.query(listClaimableSql)).rows;}
async function claim(version){return (await db.query(claimSql,[id,version])).rows;}
assert.equal((await list())[0]?.id,id,"after mail acceptance and missed wake, the order must remain discoverable without its ID");
assert.equal((await list())[0]?.noticeSent,true);
assert.equal((await claim(1)).length,0,"stale revision cannot claim");
const competing=await Promise.all([claim(2),claim(2)]);
assert.equal(competing.flat().length,1,"only one claimant acquires the lease");
assert.equal((await list()).length,0);
await db.query(`update arrival_preview.jobs set claim_until=now()-interval '1 second' where id=$1`,[id]);
assert.equal((await list())[0]?.id,id,"abandoned lease must reappear");
assert.equal((await claim(2)).length,1);
await db.close();
console.log("Passed: accepted mail without wake, version mismatch, one lease across competing claims, abandoned lease recovery");
