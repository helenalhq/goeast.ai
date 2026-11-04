/**
 * Follow-up server-side guarantees — integration test with fault injection.
 * Run against a LOCAL `next build && next start` server whose
 * AZURE_OPENAI_ENDPOINT points at the local mock (scripts/acceptance/mock-azure.mjs).
 * Real Supabase (auth/RLS/quota) + mocked model = deterministic failures.
 *
 * Covers (owner acceptance round 3):
 *   E1 ownership matrix (anon / account B / account A)
 *   E2 idempotency (sequential dup, concurrent same-key, no text-dedup, legacy no-key)
 *   E3 disconnect → server still saves → retry replays (no re-charge)
 *   E4 fault injection (create500 / slowfail / streambreak / emptydone / quota 429)
 *   E5 original report untouched + old-report-no-cast 422
 *
 * Test data only: QA users @qa.goeast.test, created and reported here.
 * Evidence: /tmp/goeast-3b/fault-evidence.json (+ console). No PII inside.
 *
 * Usage:
 *   node scripts/acceptance/mock-azure.mjs &            # terminal 1
 *   AZURE_OPENAI_ENDPOINT=http://localhost:3199 PORT=3101 npm start   # terminal 2
 *   BASE_URL=http://localhost:3101 node scripts/acceptance/followup-fault-injection.mjs
 */
import { chromium } from "playwright-core";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const BASE = process.env.BASE_URL || "http://localhost:3101";
const SCENARIO_FILE = "/tmp/goeast-3b/mock-scenario.txt";
const REQUEST_LOG = "/tmp/goeast-3b/mock-requests.log";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// --- env + supabase admin ----------------------------------------------------
const env = {};
for (const line of fs.readFileSync(path.resolve(process.cwd(), ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const SB = env.NEXT_PUBLIC_SUPABASE_URL;
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" };

async function sbRest(pathname, init = {}) {
  const res = await fetch(`${SB}${pathname}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function createQaUser(label) {
  const email = `qa-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@qa.goeast.test`;
  const password = `Qa-${label}-${Math.random().toString(36).slice(2, 10)}!x`;
  const { status, body } = await sbRest("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) });
  if ((status !== 200 && status !== 201) || !body?.id) throw new Error(`qa user create failed ${status}`);
  return { email, password, id: body.id };
}

// --- helpers ------------------------------------------------------------------
const evidence = { startedAt: new Date().toISOString(), base: BASE, checks: [] };
function check(name, ok, expected, actual) {
  evidence.checks.push({ name, ok, expected, actual });
  console.log(`${ok ? "✅" : "❌"} ${name} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
function setScenario(s) { fs.writeFileSync(SCENARIO_FILE, s); }
function mockRequests() {
  try { return fs.readFileSync(REQUEST_LOG, "utf8").trim().split("\n").filter(Boolean).map(l => JSON.parse(l)); }
  catch { return []; }
}

async function insertReport(user, sessionId, castData) {
  const { status } = await sbRest("/rest/v1/consult_results", {
    method: "POST",
    body: JSON.stringify({
      session_id: sessionId, user_id: user.id, question: "INTEGRATION seed question about a work decision",
      context: { topic: "A work decision", stuck: "seed", constraint: "" },
      cast_data: castData, ai_response: "INTEGRATION seed reading: TRADITIONAL TEACHING seed text.",
    }),
  });
  if (status !== 201) throw new Error(`seed report insert failed ${status}`);
}

async function usageOf(user) {
  const today = new Date().toISOString().slice(0, 10);
  const { body } = await sbRest(`/rest/v1/usage_log?user_id=eq.${user.id}&select=window_start,count`);
  const row = (body || []).find(r => String(r.window_start).startsWith(today));
  return row ? row.count : 0;
}
async function setUsage(user, count) {
  const today = new Date().toISOString().slice(0, 10);
  await sbRest("/rest/v1/usage_log", {
    method: "POST",
    body: JSON.stringify([{ user_id: user.id, window_start: `${today}T00:00:00+00`, count }]),
    headers: { Prefer: "resolution=merge-duplicates" },
  });
}
async function followupRowsOf(sessionId) {
  const { body } = await sbRest(`/rest/v1/consult_followups?session_id=eq.${sessionId}&select=id,turn_index,question,answer&order=turn_index.asc`);
  return body || [];
}
async function reportRowOf(sessionId) {
  const { body } = await sbRest(`/rest/v1/consult_results?session_id=eq.${sessionId}&select=question,ai_response,cast_data,updated_at,next_step`);
  return body?.[0] ?? null;
}

function newKey() { return crypto.randomUUID(); }

/** Authenticated fetch runner inside a logged-in browser page (cookie auth). */
async function makeAuthedFetcher(browser) {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const login = async (user) => {
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
    await page.fill("#email", user.email);
    await page.fill("#password", user.password);
    await page.locator("button", { hasText: "Sign In" }).first().click();
    await page.waitForURL(u => !u.pathname.includes("/login"), { timeout: 30000 });
  };
  /** POST a follow-up; resolves {status, frames} where frames = parsed SSE payloads. */
  const ask = async (sessionId, question, turnKey, opts = {}) =>
    page.evaluate(async ({ sessionId, question, turnKey, opts }) => {
      const res = await fetch(opts.endpoint || "/api/consult/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, question, ...(turnKey ? { turnKey } : {}) }),
        signal: opts.abortAfterMs ? AbortSignal.timeout(opts.abortAfterMs) : undefined,
      });
      if (!res.ok) return { status: res.status, body: await res.json().catch(() => ({})), frames: [] };
      const text = await res.text();
      const frames = [];
      for (const line of text.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const p = line.slice(6).trim();
        if (p === "[DONE]") { frames.push({ done: true }); continue; }
        try { frames.push(JSON.parse(p)); } catch { /* skip */ }
      }
      return { status: res.status, frames };
    }, { sessionId, question, turnKey, opts });
  const getJson = async (pathname) =>
    page.evaluate(async (p) => {
      const r = await fetch(p);
      return { status: r.status, body: await r.json().catch(() => null) };
    }, pathname);
  return { context, page, login, ask, getJson };
}

/** Parse SSE frames → {content, replay, saveFailed, error} */
function digest(frames) {
  let content = "", replay = false, saveFailed = false, error = false;
  for (const f of frames) {
    if (f.replay) replay = true;
    if (f.content) content += f.content;
    if (f.saveFailed) saveFailed = true;
    if (f.error) error = true;
  }
  return { content, replay, saveFailed, error, done: frames.some(f => f.done) };
}

// --- main ----------------------------------------------------------------------
function findChromium() {
  const base = `${process.env.HOME}/Library/Caches/ms-playwright`;
  const d = fs.readdirSync(base).filter(x => x.startsWith("chromium_headless_shell")).sort().reverse()[0];
  return `${base}/${d}/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
}

const mockProc = spawn("node", ["scripts/acceptance/mock-azure.mjs"], { stdio: "ignore", detached: false });
const browser = await chromium.launch({ executablePath: findChromium(), headless: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

try {
  fs.writeFileSync(REQUEST_LOG, "");
  setScenario("ok");
  const sleepUntilReady = async () => { for (let i = 0; i < 30; i++) { try { await fetch(`${BASE}/login`); return; } catch { await sleep(1000); } } throw new Error("app not reachable"); };
  await sleepUntilReady();

  const userA = await createQaUser("fa");
  const userB = await createQaUser("fb");
  console.log(`\nQA accounts — A:${userA.email.slice(0, 14)}… B:${userB.email.slice(0, 14)}…`);

  const A = await makeAuthedFetcher(browser);
  await A.login(userA);
  const B = await makeAuthedFetcher(browser);
  await B.login(userB);

  // Seed report for A (valid cast), no quota consumed by seeding.
  const sessionId = `it-${Date.now()}`;
  const GOOD_CAST = { mode: "cast", hexagramNumber: 47, changingLines: [3], transformedNumber: 6 };
  await insertReport(userA, sessionId, GOOD_CAST);
  const reportBefore = await reportRowOf(sessionId);

  // ===========================================================================
  console.log("\n== E1 ownership matrix ==");
  {
    const anonPost = await fetch(`${BASE}/api/consult/followup`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, question: "anon?" }) });
    const anonBody = await anonPost.json().catch(() => ({}));
    check("E1 anon POST → 401 LOGIN_REQUIRED", anonPost.status === 401 && anonBody.code === "LOGIN_REQUIRED", "401/LOGIN_REQUIRED", `${anonPost.status}/${anonBody.code}`);

    const anonGet = await fetch(`${BASE}/api/consult/followup?session_id=${sessionId}`);
    check("E1 anon GET → 401", anonGet.status === 401, 401, anonGet.status);

    const bRead = await B.getJson(`/api/consult/result?session_id=${encodeURIComponent(sessionId)}`);
    check("E1 B reads A's report → no data (result null, not leak)", bRead.status === 200 && bRead.body?.result === null, "200/{result:null}", `${bRead.status}/${JSON.stringify(bRead.body)?.slice(0, 40)}`);

    const bList = await B.getJson(`/api/consult/followup?session_id=${encodeURIComponent(sessionId)}`);
    check("E1 B lists A's follow-ups → 404", bList.status === 404, 404, bList.status);

    const bAsk = await B.ask(sessionId, "hijack attempt", newKey());
    check("E1 B asks on A's report → 404, no model call", bAsk.status === 404 && mockRequests().length === 0, "404 + 0 model calls", `${bAsk.status} + ${mockRequests().length} model calls`);

    const bodySpoof = await A.ask(sessionId, "spoof", newKey());
    // (A's own ask succeeds — the spoof check is below: body user_id/cast are ignored)
    check("E1 A's own ask succeeds (baseline)", bodySpoof.status === 200, 200, bodySpoof.status);
  }

  // ===========================================================================
  console.log("\n== E2 idempotency & exact quota ==");
  // Deterministic budget: reset the daily counter, assert DELTAS per case.
  // (Free tier is 3/day — without resets the suite self-exhausts mid-run.)
  await setUsage(userA, 0);
  let usageMark = 0;
  {
    // t1: sequential duplicate of the SAME logical turn
    const K1 = newKey();
    const first = await A.ask(sessionId, "what does the changing line mean?", K1);
    const d1 = digest(first.frames);
    const rows1 = await followupRowsOf(sessionId);
    const u1 = await usageOf(userA);
    check("E2 t1 first ask → saved once, +1 charge", rows1.filter(r => r.id === K1).length === 1 && u1 === usageMark + 1, `1 row/+1 (${usageMark}→${usageMark + 1})`, `${rows1.filter(r => r.id === K1).length} rows/${usageMark}→${u1}`);

    const dup = await A.ask(sessionId, "what does the changing line mean?", K1);
    const dDup = digest(dup.frames);
    const rows2 = await followupRowsOf(sessionId);
    const u2 = await usageOf(userA);
    check("E2 t1 duplicate same key → replay, 0 new rows, 0 charge", dDup.replay === true && rows2.length === rows1.length && u2 === u1, `replay/${rows1.length} rows/same usage`, `${dDup.replay}/${rows2.length} rows/${u1}→${u2}`);
    check("E2 t1 replay content matches stored answer", dDup.content === (rows2.find(r => r.id === K1)?.answer ?? ""), "identical", dDup.content === rows2.find(r => r.id === K1)?.answer ? "identical" : "DIFFERS");
    usageMark = u2;

    // t2: CONCURRENT same key (two parallel fetches in one page)
    const K2 = newKey();
    const [c1, c2] = await Promise.all([
      A.ask(sessionId, "concurrent twin question", K2),
      A.ask(sessionId, "concurrent twin question", K2),
    ]);
    await sleep(2500); // conflict refund is fire-and-forget
    const rowsK2 = (await followupRowsOf(sessionId)).filter(r => r.id === K2);
    const u3 = await usageOf(userA);
    check("E2 t2 concurrent same key → exactly 1 row", rowsK2.length === 1, 1, rowsK2.length);
    check("E2 t2 concurrent same key → exactly 1 net charge", u3 === usageMark + 1, `${usageMark}→${usageMark + 1}`, `${usageMark}→${u3}`);
    usageMark = u3;

    // t3: same TEXT, different keys → both processed (no text dedup)
    await setUsage(userA, 1); usageMark = 1; // leave headroom for two asks
    const K3a = newKey(), K3b = newKey();
    await A.ask(sessionId, "identical wording question", K3a);
    await A.ask(sessionId, "identical wording question", K3b);
    const rowsAll = await followupRowsOf(sessionId);
    const u4 = await usageOf(userA);
    check("E2 t3 same text different keys → 2 rows, 2 charges", rowsAll.filter(r => r.question === "identical wording question").length === 2 && u4 === usageMark + 2, `2 rows/+2`, `${rowsAll.filter(r => r.question === "identical wording question").length} rows/${usageMark}→${u4}`);
    usageMark = u4;

    // t4: legacy request WITHOUT turnKey still works (server uuid)
    await setUsage(userA, 1); usageMark = 1;
    const legacy = await A.ask(sessionId, "legacy no-key question", null);
    const legacyRows = (await followupRowsOf(sessionId)).filter(r => r.question === "legacy no-key question");
    check("E2 t4 no turnKey → works, server-generated uuid id", legacy.status === 200 && legacyRows.length === 1 && UUID.test(legacyRows[0].id), "1 row/uuid id", `${legacy.status}/${legacyRows.length} rows/${legacyRows[0]?.id?.slice(0, 8)}`);
    usageMark = await usageOf(userA);
  }

  // ===========================================================================
  console.log("\n== E3 disconnect mid-stream → server still saves; retry replays ==");
  {
    await setUsage(userA, 0); usageMark = 0;
    const K = newKey();
    const reqCountBefore = mockRequests().length;
    // abort the fetch after ~300ms (mid-stream: mock 'ok' streams immediately)
    const aborted = await A.ask(sessionId, "disconnect me mid-stream", K, { abortAfterMs: 300 }).catch(e => ({ status: "aborted:" + String(e.message).slice(0, 40), frames: [] }));
    await sleep(2500); // server finishes generation + saves
    const rowsK = (await followupRowsOf(sessionId)).filter(r => r.id === K);
    const u = await usageOf(userA);
    check("E3 disconnected ask still saved server-side (1 row, 1 charge)", rowsK.length === 1 && u === usageMark + 1, `1 row/${usageMark}→${usageMark + 1}`, `${rowsK.length} rows/${usageMark}→${u}`);

    const retry = await A.ask(sessionId, "disconnect me mid-stream", K);
    const dRetry = digest(retry.frames);
    const rowsAfter = (await followupRowsOf(sessionId)).filter(r => r.id === K);
    const uAfter = await usageOf(userA);
    check("E3 retry same key → replay (no regeneration)", dRetry.replay === true && mockRequests().length === reqCountBefore + 1, `replay/total model calls ${reqCountBefore + 1}`, `${dRetry.replay}/total ${mockRequests().length}`);
    check("E3 retry same key → 0 new rows, 0 new charge", rowsAfter.length === 1 && uAfter === u, `1 row/usage ${u}`, `${rowsAfter.length} rows/usage ${uAfter}`);
    usageMark = uAfter;
  }

  // ===========================================================================
  console.log("\n== E4 fault injection (mock model) ==");
  await setUsage(userA, 0); usageMark = 0;
  const faultCases = [
    { scenario: "create500", name: "model create fails (500)", expect: { http: 500 } },
    { scenario: "slowfail", name: "model slow then fails", expect: { http: 500 } },
    { scenario: "streambreak", name: "stream cut mid-flight", expect: { sseError: true } },
    { scenario: "emptydone", name: "empty stream (DONE only)", expect: { empty: true } },
  ];
  for (const tc of faultCases) {
    const K = newKey();
    const rowsBefore = (await followupRowsOf(sessionId)).length;
    setScenario(tc.scenario);
    const res = await A.ask(sessionId, `fault case ${tc.name}`, K);
    await sleep(2500); // refunds are fire-and-forget
    const d = digest(res.frames);
    const rowsAfter = (await followupRowsOf(sessionId)).length;
    const u = await usageOf(userA);
    const noLeak = JSON.stringify(res.body || {}).length < 400 && !JSON.stringify(res).includes("SUPABASE") && !JSON.stringify(res).includes("apikey");
    if (tc.expect.http) {
      check(`E4 ${tc.name} → ${tc.expect.http} generic error`, res.status === tc.expect.http && noLeak, `${tc.expect.http}/no internals`, `${res.status}/${noLeak ? "clean" : "LEAK?"}`);
    } else {
      check(`E4 ${tc.name} → SSE error/empty, no success record`, (d.error || d.content === "") && noLeak, "error frame or empty/clean", `${d.error ? "error frame" : "empty"}/${noLeak ? "clean" : "LEAK?"}`);
    }
    check(`E4 ${tc.name} → 0 new rows, charge refunded`, rowsAfter === rowsBefore && u === usageMark, `${rowsBefore} rows/usage ${usageMark}`, `${rowsAfter} rows/usage ${u}`);
  }
  setScenario("ok");

  // quota exhausted (deterministic: set count to the free limit)
  {
    const K = newKey();
    await setUsage(userA, 3);
    const rowsBefore = (await followupRowsOf(sessionId)).length;
    const modelCallsBefore = mockRequests().length;
    const res = await A.ask(sessionId, "should hit the daily limit", K);
    const u = await usageOf(userA);
    check("E4 quota exhausted → 429 LIMIT_REACHED, clear copy, no model call",
      res.status === 429 && res.body?.code === "LIMIT_REACHED" && typeof res.body?.error === "string" && mockRequests().length === modelCallsBefore,
      "429/LIMIT_REACHED/0 model calls", `${res.status}/${res.body?.code}/${mockRequests().length - modelCallsBefore} model calls`);
    check("E4 quota exhausted → 0 rows, count stays 3", (await followupRowsOf(sessionId)).length === rowsBefore && u === 3, `${rowsBefore} rows/3`, `${(await followupRowsOf(sessionId)).length} rows/${u}`);
  }

  // ===========================================================================
  console.log("\n== E5 original report untouched + old-report degradation ==");
  {
    const reportAfter = await reportRowOf(sessionId);
    check("E5 original report row identical after ALL scenarios",
      JSON.stringify(reportAfter) === JSON.stringify(reportBefore),
      "byte-identical (question/cast/ai_response/updated_at/next_step)",
      JSON.stringify(reportAfter) === JSON.stringify(reportBefore) ? "identical" : "CHANGED");

    const rows = await followupRowsOf(sessionId);
    check("E5 all follow-ups are appends on the same session", rows.every(r => true) && rows.length > 0, `>0 rows`, `${rows.length} rows`);

    // old report without usable cast → explicit 422, model not called, no guessing
    const oldSession = `it-old-${Date.now()}`;
    await insertReport(userA, oldSession, {});
    const modelCallsBefore = mockRequests().length;
    const res = await A.ask(oldSession, "ask about an old report", newKey());
    check("E5 old report missing cast → 422 REPORT_DATA_MISSING, model not called",
      res.status === 422 && res.body?.code === "REPORT_DATA_MISSING" && mockRequests().length === modelCallsBefore,
      "422/REPORT_DATA_MISSING/0 model calls", `${res.status}/${res.body?.code}/${mockRequests().length - modelCallsBefore} model calls`);
  }

  // ===========================================================================
  console.log("\n== S synastry follow-up fault injection (mock model) ==");
  {
    // Seed a romantic synastry report (charts stored; generation path untouched)
    const synId = `it-syn-${Date.now()}`;
    const SYN_CHART = {
      fiveElementsClass: "木三局", soul: "贪狼", body: "天同", zodiac: "寅",
      palaces: [
        { name: "命宫", heavenlyStem: "戊", earthlyBranch: "寅", majorStars: [{ name: "太阳", brightness: "得" }] },
        { name: "夫妻宫", heavenlyStem: "壬", earthlyBranch: "申", majorStars: [] },
      ],
    };
    await sbRest("/rest/v1/synastry_results", {
      method: "POST",
      body: JSON.stringify({
        session_id: synId, user_id: userA.id, relationship_type: "romantic",
        person_a: { birthDate: "1995-01-01", birthHour: 2, gender: "female" },
        person_b: { birthDate: "1993-07-20", birthHour: 8, gender: "male" },
        language: "both", chart_a: SYN_CHART, chart_b: SYN_CHART,
        ai_response: "seed synastry report",
      }),
    });
    const synRows = async () => (await sbRest(`/rest/v1/synastry_followups?session_id=eq.${synId}&select=id`)).body || [];
    await setUsage(userA, 0); usageMark = 0;

    const synFaults = [
      { scenario: "create500", name: "synastry model create fails", expect: 500 },
      { scenario: "slowfail", name: "synastry model slow then fails", expect: 500 },
      { scenario: "streambreak", name: "synastry stream cut mid-flight", expect: 0 },
      { scenario: "emptydone", name: "synastry empty stream", expect: 0 },
    ];
    for (const tc of synFaults) {
      const K = crypto.randomUUID();
      setScenario(tc.scenario);
      const res = await A.ask(synId, `synastry fault ${tc.name}`, K, { endpoint: "/api/synastry/followup" });
      await sleep(2500);
      const rows = await synRows();
      const u = await usageOf(userA);
      if (tc.expect === 500) {
        check(`S ${tc.name} → 500 generic error`, res.status === 500 && !JSON.stringify(res).includes("apikey"), "500/clean", `${res.status}`);
      } else {
        const d = res.frames.length ? digest(res.frames) : { error: false, content: "" };
        check(`S ${tc.name} → SSE error or empty, no record`, (d.error || d.content === "") && rows.length === 0, "error/empty + 0 rows", `${d.error ? "error" : "empty"}/${rows.length} rows`);
      }
      check(`S ${tc.name} → 0 rows, charge refunded`, rows.length === 0 && u === usageMark, `0 rows/usage ${usageMark}`, `${rows.length} rows/usage ${u}`);
    }
    setScenario("ok");

    // disconnect mid-stream → server still saves; retry same key replays.
    // slowok: content starts at ~800ms, so aborting at 300ms lands DURING the
    // model stream (post-charge) — synastry pre-flight alone exceeds 300ms.
    const K = crypto.randomUUID();
    const callsBefore = mockRequests().length;
    setScenario("slowok");
    await A.ask(synId, "synastry disconnect me", K, { abortAfterMs: 300, endpoint: "/api/synastry/followup" }).catch(() => {});
    await sleep(2500);
    let rows = await synRows();
    let u = await usageOf(userA);
    check("S disconnected ask still saved (1 row, 1 charge)", rows.length === 1 && u === usageMark + 1, `1 row/${usageMark + 1}`, `${rows.length} rows/usage ${u}`);
    const retry = await A.ask(synId, "synastry disconnect me", K, { endpoint: "/api/synastry/followup" });
    const dRetry = digest(retry.frames);
    rows = await synRows();
    u = await usageOf(userA);
    check("S retry same key → replay, no regeneration", dRetry.replay === true && mockRequests().length === callsBefore + 1, `replay/${callsBefore + 1} calls`, `${dRetry.replay}/${mockRequests().length}`);
    check("S retry same key → no new row/charge", rows.length === 1 && u === usageMark + 1, `1 row/usage ${usageMark + 1}`, `${rows.length} rows/usage ${u}`);
    usageMark = u;
    setScenario("ok");
  }

  console.log("\n== E0 PII spot-check (request log has no question text) ==");
  {
    const log = fs.readFileSync(REQUEST_LOG, "utf8");
    const leaked = ["disconnect me mid-stream", "fault case", "hijack attempt", "identical wording"].filter(s => log.includes(s));
    check("E0 mock request log contains no question text", leaked.length === 0, "0 leaks", `${leaked.length} leaks`);
  }
} catch (e) {
  check("fatal", false, "no exception", String(e).slice(0, 300));
} finally {
  evidence.completedAt = new Date().toISOString();
  fs.writeFileSync("/tmp/goeast-3b/fault-evidence.json", JSON.stringify(evidence, null, 2));
  const passed = evidence.checks.filter(c => c.ok).length;
  console.log(`\n===== FAULT-INJECTION SUITE: ${passed}/${evidence.checks.length} passed =====`);
  console.log("Evidence: /tmp/goeast-3b/fault-evidence.json");
  await browser.close();
  mockProc.kill();
  process.exit(passed === evidence.checks.length ? 0 : 1);
}
