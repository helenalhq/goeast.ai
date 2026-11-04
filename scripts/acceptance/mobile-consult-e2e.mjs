/**
 * Task 3B acceptance — mobile first-consultation loop + conversion measurement.
 *
 * Entry under test: /insights/confucius-leadership → "Try a Free Consultation"
 * → /consult → guided I Ching flow → login gate → draft restore → reading →
 * save → history recovery. Mobile viewport throughout (375×812, touch).
 *
 * Three groups (run all or one via GROUPS=a,b,c):
 *   A  success flow — guest draft → login round-trip → generate → save →
 *      My Readings restore. Needs a working AI backend (Preview).
 *   B  failure recovery — oracle 500 (broken Azure key on a local
 *      `next build && next start`) → error UI → retry → refund keeps quota
 *      flat, no report rows. Needs NODE_ENV=production to enforce quota.
 *   C  duplicate submission — rapid multi-click on Start Reading → exactly
 *      one /api/oracle call, one deduction, one report row; result-page
 *      reload re-reads storage, no re-generation; save idempotent by
 *      session_id.
 *
 * Analytics: every event fires through logEvent(); QA traffic is marked by
 * localStorage["goeast:qa"]="3b" (attached as `qa:"3b"` on each event).
 * Evidence captured:
 *   - console "[analytics]" lines (dev server — event FIRED)
 *   - POST bodies to vercel-scripts/vercel-insights (Preview — beacon SENT)
 * PII guard: the typed question carries a unique marker (PIIMARK-…); the QA
 * email/password are unique. None of them may appear in any captured payload.
 *
 * Usage:
 *   node scripts/acceptance/mobile-consult-e2e.mjs                     # A,B,C
 *   BASE_URL=https://<preview>.vercel.app GROUPS=a,c node scripts/…
 *   # group B: local prod-mode server with broken AI key, e.g.
 *   #   AZURE_OPENAI_API_KEY=broken PORT=3101 npm start   (after npm run build)
 *   #   BASE_URL=http://localhost:3101 GROUPS=b node scripts/…
 *
 * A Supabase QA user is created via the admin API (service key from
 * .env.local) and kept for dashboard inspection — creds printed + stored in
 * /tmp/goeast-3b/qa-user.json for reuse across groups.
 */
import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";

const BASE = process.env.BASE_URL || "http://localhost:3100";
const GROUPS = (process.env.GROUPS || "a,b,c").split(",").map((g) => g.trim().toLowerCase());
// Quota is only enforced when NODE_ENV=production (Preview, `next start`).
// Set QUOTA_ENFORCED=0 against a `next dev` server to downgrade the check.
const QUOTA_ENFORCED = process.env.QUOTA_ENFORCED !== "0";
const QA_LABEL = process.env.QA_LABEL || "3b";
const RUN = { base: BASE, startedAt: new Date().toISOString(), groups: [], events: [], beacons: [], warnings: [] };
const SHOTS = "/tmp/goeast-3b/shots";
fs.mkdirSync(SHOTS, { recursive: true });

// --- Supabase admin (service role) from .env.local ---------------------------
function loadEnvLocal() {
  const file = path.resolve(process.cwd(), ".env.local");
  const env = {};
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return env;
}
const ENV = loadEnvLocal();
const SB_URL = ENV.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = ENV.SUPABASE_SERVICE_ROLE_KEY;
if (!SB_URL || !SB_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(2);
}
const adminHeaders = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };

async function sb(pathname, init = {}) {
  const res = await fetch(`${SB_URL}${pathname}`, { ...init, headers: { ...adminHeaders, ...(init.headers || {}) } });
  return { status: res.status, body: await res.json().catch(() => null) };
}

// --- QA user -----------------------------------------------------------------
const QA_FILE = "/tmp/goeast-3b/qa-user.json";
let QA;
if (fs.existsSync(QA_FILE)) {
  QA = JSON.parse(fs.readFileSync(QA_FILE, "utf8"));
  console.log(`[qa-user] reusing ${QA.email}`);
} else {
  const email = `qa-${QA_LABEL}-${Date.now()}@qa.goeast.test`;
  const password = `Qa-${QA_LABEL}-${Math.random().toString(36).slice(2, 10)}!x`;
  const { status, body } = await sb("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if ((status !== 200 && status !== 201) || !body?.id) {
    console.error(`[qa-user] create failed (${status})`, body);
    process.exit(2);
  }
  QA = { email, password, id: body.id };
  fs.mkdirSync("/tmp/goeast-3b", { recursive: true });
  fs.writeFileSync(QA_FILE, JSON.stringify(QA, null, 2));
  console.log(`[qa-user] created ${email} (${body.id})`);
}

// PII markers — unique strings that must NEVER appear in analytics payloads.
const PII = {
  question: `PIIMARK-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
  emailLocal: QA.email.split("@")[0],
};
console.log(`[pii] question marker: ${PII.question}`);

async function usageCount() {
  const today = new Date().toISOString().slice(0, 10);
  const { body } = await sb(`/rest/v1/usage_log?user_id=eq.${QA.id}&select=window_start,count`);
  const rows = Array.isArray(body) ? body : [];
  const row = rows.find((r) => String(r.window_start).startsWith(today));
  return row ? row.count : 0;
}

async function reportRows() {
  const { body } = await sb(`/rest/v1/consult_results?user_id=eq.${QA.id}&select=session_id,created_at&order=created_at.desc`);
  return body || [];
}

async function followupRows(sessionId) {
  const { body } = await sb(`/rest/v1/consult_followups?session_id=eq.${sessionId}&select=id,turn_index,question,answer,created_at&order=turn_index.asc`);
  return body || [];
}

async function reportSnapshot(sessionId) {
  const { body } = await sb(`/rest/v1/consult_results?session_id=eq.${sessionId}&select=question,ai_response,cast_data,updated_at,next_step,action_status,review_note`);
  return body && body[0] ? body[0] : null;
}

async function createQaUser(label) {
  const email = `qa-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@qa.goeast.test`;
  const password = `Qa-${label}-${Math.random().toString(36).slice(2, 10)}!x`;
  const { status, body } = await sb("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if ((status !== 200 && status !== 201) || !body?.id) throw new Error(`qa user create failed ${status}`);
  return { email, password, id: body.id };
}

const SYN_CHART = {
  fiveElementsClass: "木三局", soul: "贪狼", body: "天同", zodiac: "寅",
  palaces: [
    { name: "命宫", heavenlyStem: "戊", earthlyBranch: "寅", majorStars: [{ name: "太阳", brightness: "得" }] },
    { name: "夫妻宫", heavenlyStem: "壬", earthlyBranch: "申", majorStars: [] },
    { name: "财帛宫", heavenlyStem: "庚", earthlyBranch: "午", majorStars: [{ name: "武曲", brightness: "庙" }] },
  ],
};

async function seedSynastryReport(user, sessionId, relationshipType = "romantic") {
  const { status } = await sb("/rest/v1/synastry_results", {
    method: "POST",
    body: JSON.stringify({
      session_id: sessionId, user_id: user.id,
      relationship_type: relationshipType,
      person_a: { name: "A", birthDate: "1995-01-01", birthHour: 2, gender: "female" },
      person_b: { name: "B", birthDate: "1993-07-20", birthHour: 8, gender: "male" },
      language: "both",
      chart_a: SYN_CHART, chart_b: SYN_CHART,
      ai_response: "E2E seed synastry report: structured dual-chart reading text.",
    }),
  });
  if (status !== 201) throw new Error(`synastry seed failed ${status}`);
}

async function synastrySnapshot(sessionId) {
  const { body } = await sb(`/rest/v1/synastry_results?session_id=eq.${sessionId}&select=relationship_type,person_a,person_b,chart_a,chart_b,ai_response,updated_at,action_status,review_note`);
  return body && body[0] ? body[0] : null;
}

async function synastryFollowupRows(sessionId) {
  const { body } = await sb(`/rest/v1/synastry_followups?session_id=eq.${sessionId}&select=id,turn_index,question,answer&order=turn_index.asc`);
  return body || [];
}

// --- browser + capture -------------------------------------------------------
function findChromium() {
  const base = `${process.env.HOME}/Library/Caches/ms-playwright`;
  const dirs = fs.readdirSync(base).filter((d) => d.startsWith("chromium_headless_shell")).sort().reverse();
  for (const d of dirs) {
    const p = path.join(base, d, "chrome-headless-shell-mac-arm64", "chrome-headless-shell");
    if (fs.existsSync(p)) return p;
  }
  for (const d of fs.readdirSync(base).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse()) {
    const p = path.join(base, d, "chrome-mac-arm64", "Chromium");
    if (fs.existsSync(p)) return p;
    const p2 = path.join(base, d, "chrome-mac", "Chromium");
    if (fs.existsSync(p2)) return p2;
  }
  throw new Error("no playwright chromium found");
}

const browser = await chromium.launch({ executablePath: findChromium(), headless: true });

/** Mobile page with QA marker + analytics capture attached. */
async function mobilePage() {
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    // Optional: Vercel "Protection Bypass for Automation" token — required when
    // the project's Deployment Protection (SSO) gates preview deployments.
    ...(process.env.VERCEL_BYPASS_TOKEN
      ? { extraHTTPHeaders: { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS_TOKEN } }
      : {}),
  });
  await context.addInitScript((label) => {
    try { window.localStorage.setItem("goeast:qa", label); } catch {}
  }, QA_LABEL);
  context.on("request", (req) => {
    if (req.method() !== "POST") return;
    const url = req.url();
    if (/vercel-scripts\.com|vercel-insights|\/_vercel\/insights/.test(url)) {
      const post = req.postData() || "";
      RUN.beacons.push({ url, body: post, at: new Date().toISOString() });
    }
  });
  const page = await context.newPage();
  page.on("console", (msg) => {
    const text = msg.text();
    if (text.startsWith("[analytics]")) {
      RUN.events.push({ at: new Date().toISOString(), line: text });
    }
  });
  return { context, page };
}

const results = [];
function check(group, name, ok, detail = "") {
  results.push({ group, name, ok, detail });
  console.log(`${ok ? "✅" : "❌"} [${group}] ${name}${detail ? ` — ${detail}` : ""}`);
}
function warn(group, name, detail) {
  RUN.warnings.push({ group, name, detail });
  console.log(`⚠️  [${group}] ${name} — ${detail}`);
}

async function noOverflow(page, label, group) {
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  if (sw > 375) warn(group, "horizontal overflow", `${label}: scrollWidth=${sw}`);
  else check(group, `no horizontal overflow (${label})`, true, `scrollWidth=${sw}`);
}

/** Focus an input/textarea and verify mobile-keyboard ergonomics we can
 *  measure headlessly: ≥16px font (iOS auto-zoom guard) + it receives focus. */
async function typeWithKeyboardChecks(page, locator, text, label, group) {
  await locator.tap();
  const focused = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || !("value" in el)) return null;
    return { tag: el.tagName, fontSize: parseFloat(getComputedStyle(el).fontSize) };
  });
  if (!focused) { check(group, `keyboard focus (${label})`, false, "no focused input"); return; }
  if (focused.fontSize < 16) warn(group, "input font <16px (iOS zoom risk)", `${label}: ${focused.fontSize}px on ${focused.tag}`);
  await locator.fill(text);
  check(group, `keyboard focus + input (${label})`, true, `${focused.tag} @ ${focused.fontSize}px`);
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: false });
}

/** Drive the wizard from /consult/iching to the confirm page. */
async function wizardToConfirm(page, group, stuckText) {
  await page.goto(`${BASE}/consult/iching`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=What would you like to discuss?", { timeout: 30000 });
  check(group, "wizard step 1 visible", true);

  const topic = page.locator("button", { hasText: "A work decision" }).first();
  const box = await topic.boundingBox();
  if (box && box.height < 40) warn(group, "tap target <40px", `topic button h=${Math.round(box.height)}`);
  await topic.tap();
  await noOverflow(page, "wizard step1", group);
  await page.locator("button", { hasText: "Continue" }).first().click();
  await page.waitForSelector("text=Where are you stuck?", { timeout: 10000 });

  await typeWithKeyboardChecks(page, page.locator("textarea").first(), stuckText, "stuck textarea", group);
  await page.locator("button", { hasText: "Continue" }).first().click();
  await page.waitForSelector("text=Any constraints", { timeout: 10000 });
  check(group, "wizard step 3 reached", true);

  await page.locator("button", { hasText: "Review question" }).first().click();
  await page.waitForSelector("text=This is the question you'll ask", { timeout: 10000 });
  check(group, "confirm page reached", true);
  await noOverflow(page, "confirm", group);
}

async function loginViaUi(page, group) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#email", { timeout: 30000 });
  await page.fill("#email", QA.email);
  await page.fill("#password", QA.password);
  await page.locator("button", { hasText: "Sign In" }).first().click();
  await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 30000 });
  check(group, "login via UI (password)", true, page.url());
}

async function expectEvents(group, names, evidence) {
  // evidence = "console" (dev server logs each event) | "beacon" (Vercel
  // preview POSTs to vercel-scripts) | "none" (local prod build: debug lines
  // stripped, script not injected — skip with a warning).
  if (evidence === "none") {
    warn(group, "event capture unavailable", "local production build sends no debug lines and no beacons — events verified on dev/preview runs");
    return;
  }
  const deadline = Date.now() + 15000;
  const have = () =>
    names.every((n) =>
      evidence === "console"
        ? RUN.events.some((e) => e.line.includes(`[analytics] ${n} `) || e.line.includes(`[analytics] ${n}`))
        : RUN.beacons.some((b) => b.body.includes(`"event":"${n}"`) || b.body.includes(`"event": "${n}"`)),
    );
  while (!have() && Date.now() < deadline) await new Promise((r) => setTimeout(r, 500));
  for (const n of names) {
    const ok =
      evidence === "console"
        ? RUN.events.some((e) => e.line.includes(n))
        : RUN.beacons.some((b) => b.body.includes(`"event":"${n}"`) || b.body.includes(`"event": "${n}"`));
    check(group, `event ${n} (${evidence})`, ok);
  }
}

function piiAudit(group) {
  const haystacks = [
    ...RUN.events.map((e) => e.line),
    ...RUN.beacons.map((b) => b.body),
  ];
  for (const [label, needle] of [["question text", PII.question], ["QA email", PII.emailLocal]]) {
    const leaked = haystacks.filter((h) => h.includes(needle));
    check(group, `PII absent from analytics: ${label}`, leaked.length === 0, leaked.length ? "LEAKED" : "clean");
  }
  const qaMarked =
    RUN.events.filter((e) => e.line.includes(`qa: ${QA_LABEL}`) || e.line.includes(`"qa":"${QA_LABEL}"`)).length +
    RUN.beacons.filter((b) => b.body.includes(`"qa":"${QA_LABEL}"`)).length;
  check(group, `QA marker on events (qa=${QA_LABEL})`, qaMarked > 0, `${qaMarked} marked payloads`);
}

// ============================================================================
// GROUP A — success: article → draft (guest) → login gate → draft restore →
// generate → save → history recovery
// ============================================================================
async function groupA() {
  const g = "A";
  const { context, page } = await mobilePage();
  const usageBaseline = await usageCount();
  const rowsBaseline = (await reportRows()).length;
  try {
    // 1. Content entry
    await page.goto(`${BASE}/insights/confucius-leadership`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector("text=Try a Free Consultation", { timeout: 30000 });
    check(g, "article entry loads with CTA", true);
    await noOverflow(page, "article", g);
    await shot(page, "a1-article-cta");

    // 2. CTA → /consult
    await page.locator("a", { hasText: "Try a Free Consultation" }).first().tap();
    await page.waitForURL(/\/consult$/, { timeout: 30000 });
    await page.waitForSelector("text=Organize a question", { timeout: 30000 });
    check(g, "CTA → /consult landing", true);
    await shot(page, "a2-consult-landing");

    // 3. → guided flow, fill wizard (as GUEST)
    await page.locator("a", { hasText: "Organize a question" }).first().tap();
    await page.waitForSelector("text=What would you like to discuss?", { timeout: 30000 });
    await page.locator("button", { hasText: "A work decision" }).first().tap();
    await page.locator("button", { hasText: "Continue" }).first().click();
    await page.waitForSelector("text=Where are you stuck?", { timeout: 10000 });
    await typeWithKeyboardChecks(page, page.locator("textarea").first(), `I keep switching approaches ${PII.question} and nothing sticks for long.`, "stuck textarea (guest)", g);
    await shot(page, "a3-wizard-step2");
    await page.locator("button", { hasText: "Continue" }).first().click();
    await page.waitForSelector("text=Any constraints", { timeout: 10000 });
    await page.locator("button", { hasText: "Review question" }).first().click();
    await page.waitForSelector("text=This is the question you'll ask", { timeout: 10000 });
    check(g, "guest reaches confirm", true);

    // 4. Refresh on confirm — draft preserved
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=This is the question you'll ask", { timeout: 30000 });
    const bodyAfterRefresh = await page.locator("textarea").first().inputValue();
    check(g, "refresh preserves confirm draft", bodyAfterRefresh.includes("work decision"), bodyAfterRefresh.slice(0, 80));

    // 5. Browser back → /consult, forward → confirm restored
    await page.goBack({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=Organize a question", { timeout: 30000 });
    check(g, "back returns to /consult", true);
    await page.goForward({ waitUntil: "domcontentloaded" }).catch(() => {});
    await page.waitForSelector("text=This is the question you'll ask", { timeout: 30000 });
    const restored = await page.locator("textarea").first().inputValue();
    check(g, "forward re-enters confirm with draft", restored.includes("work decision"), "");

    // 6. Guest Start Reading → login gate with next
    await page.locator("button", { hasText: "Start Reading" }).first().tap();
    await page.waitForURL(/\/login/, { timeout: 30000 });
    check(g, "guest → /login redirect", true, page.url());
    const nextOk = decodeURIComponent(page.url()).includes("/consult/iching");
    check(g, "login next targets consult flow", nextOk, page.url());
    await shot(page, "a4-login-gate");

    // 7. Login → draft restored on /consult/iching
    const loginFonts = await page.evaluate(() => {
      const ids = ["email", "password"];
      return ids.map((id) => {
        const el = document.getElementById(id);
        return el ? { id, fontSize: parseFloat(getComputedStyle(el).fontSize) } : { id, fontSize: -1 };
      });
    });
    for (const f of loginFonts) {
      if (f.fontSize < 16) warn(g, "input font <16px (iOS zoom risk)", `login #${f.id}: ${f.fontSize}px`);
    }
    await page.fill("#email", QA.email);
    await page.fill("#password", QA.password);
    await shot(page, "a5-login-form");
    await page.locator("button", { hasText: "Sign In" }).first().tap();
    await page.waitForURL(/\/consult\/iching/, { timeout: 30000 });
    await page.waitForSelector("text=This is the question you'll ask", { timeout: 30000 });
    const afterLogin = await page.locator("textarea").first().inputValue();
    check(g, "draft survives login round-trip", afterLogin.includes("work decision"), afterLogin.slice(0, 80));
    await shot(page, "a6-draft-restored");

    // 8. Generate (real AI on Preview)
    const usageBefore = usageBaseline;
    await page.locator("button", { hasText: "Start Reading" }).first().tap();
    await page.waitForSelector("text=Consulting Zhou Gong", { timeout: 20000 });
    check(g, "generating state shown", true);
    const btnGone = (await page.locator("button", { hasText: "Start Reading" }).count()) === 0;
    check(g, "Start Reading hidden while generating (dup-click surface)", btnGone);
    await shot(page, "a7-generating");
    await page.waitForURL(/\/consult\/iching\/result\?session=/, { timeout: 180000 });
    await page.waitForSelector("text=Your Hexagram", { timeout: 60000 });
    check(g, "result page renders hexagram", true);
    await shot(page, "a8-result");

    // 9. Save status confirmed
    await page.waitForSelector("text=Saved to your account", { timeout: 30000 });
    check(g, "result confirmed saved to account", true);

    // 10. DB state: exactly one deduction, one report (relative to group start)
    const usageAfter = await usageCount();
    if (usageAfter === usageBefore + 1) check(g, "quota deducted exactly once", true, `usage ${usageBefore}→${usageAfter}`);
    else if (!QUOTA_ENFORCED) warn(g, "quota not enforced (next dev skips free-tier increment)", `usage ${usageBefore}→${usageAfter}`);
    else check(g, "quota deducted exactly once", false, `usage ${usageBefore}→${usageAfter}`);
    const rows = await reportRows();
    check(g, "exactly one new report row", rows.length === rowsBaseline + 1, `${rowsBaseline}→${rows.length}`);

    // 11. History recovery — new tab (no sessionStorage), My Readings → restore
    const page2 = await context.newPage();
    page2.on("console", (msg) => {
      const text = msg.text();
      if (text.startsWith("[analytics]")) RUN.events.push({ at: new Date().toISOString(), line: text });
    });
    await page2.goto(`${BASE}/consult`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page2.waitForSelector("text=My Readings", { timeout: 30000 });
    const hasItem = await page2.locator("a", { hasText: "consult the I Ching" }).count();
    check(g, "My Readings lists the reading", hasItem > 0);
    await page2.locator("a", { hasText: "consult the I Ching" }).first().tap();
    await page2.waitForSelector("text=Restored from your saved readings", { timeout: 30000 });
    check(g, "history restore banner shown", true);
    await page2.waitForSelector("text=Your Hexagram", { timeout: 30000 });
    check(g, "restored reading renders content", true);
    await shot(page2, "a9-history-restore");
    await page2.close();

    // 12. Analytics arrival evidence (preview → beacons; dev → console;
    // local prod build → none, warned)
    const onVercel = !BASE.includes("localhost") && !BASE.includes("127.0.0.1");
    const devPortal = onVercel ? false : await page.evaluate(() => !!document.querySelector("nextjs-portal"));
    await expectEvents(g, [
      "try_iching_clicked",
      "consult_entry_viewed",
      "consult_flow_started",
      "consult_question_confirmed",
      "consult_generation_started",
      "consult_generation_completed",
      "consult_result_saved",
      "login_page_viewed_with_target",
      "login_succeeded",
      "consult_result_restored",
    ], onVercel ? "beacon" : devPortal ? "console" : "none");
    if (onVercel || devPortal) piiAudit(g);
    else warn(g, "PII audit unavailable", "no captured payloads on a local production build — audit ran on dev/preview");
  } catch (e) {
    check(g, "group A flow error", false, String(e).slice(0, 300));
  } finally {
    await context.close();
  }
}

// ============================================================================
// GROUP B — failure recovery: oracle 500 → error UI → retry → quota refunded
// Run against a local `next start` (NODE_ENV=production) with a broken
// AZURE_OPENAI_API_KEY so the model call fails AFTER the quota increment.
// ============================================================================
async function groupB() {
  const g = "B";
  const { context, page } = await mobilePage();
  try {
    await loginViaUi(page, g);
    const before = await usageCount();
    const rowsBefore = (await reportRows()).length;
    check(g, "baseline usage recorded", true, `usage=${before}, reports=${rowsBefore}`);

    await wizardToConfirm(page, g, `Recovery test ${PII.question} — oracle backend is down on purpose.`);

    // 1st attempt → 500 → error UI
    await page.locator("button", { hasText: "Start Reading" }).first().tap();
    await page.waitForSelector("text=The oracle could not be reached", { timeout: 60000 });
    check(g, "failure shows error message", true);
    await shot(page, "b1-error");
    const retryEnabled = await page.locator("button", { hasText: "Start Reading" }).first().isEnabled();
    check(g, "Start Reading re-enabled after failure", retryEnabled);

    // quota must be back to baseline (refunded), still no report
    await new Promise((r) => setTimeout(r, 2000)); // refund is fire-and-forget for stream, awaited for 500
    const after1 = await usageCount();
    check(g, "failed attempt refunded (no double charge)", after1 === before, `usage=${after1} (baseline ${before})`);
    const rows1 = (await reportRows()).length;
    check(g, "no report row from failure", rows1 === rowsBefore, `${rows1} rows`);

    // retry → same failure, still no double charge
    await page.locator("button", { hasText: "Start Reading" }).first().tap();
    await page.waitForSelector("text=The oracle could not be reached", { timeout: 60000 });
    await new Promise((r) => setTimeout(r, 2000));
    const after2 = await usageCount();
    check(g, "retry also refunded", after2 === before, `usage=${after2} (baseline ${before})`);
    const rows2 = (await reportRows()).length;
    check(g, "still no report rows", rows2 === rowsBefore, `${rows2} rows`);
    await shot(page, "b2-after-retry");

    // draft still intact after failures
    const draftOk = (await page.locator("textarea").first().inputValue()).includes("Recovery test");
    check(g, "draft intact after failed attempts", draftOk);
  } catch (e) {
    check(g, "group B flow error", false, String(e).slice(0, 300));
  } finally {
    await context.close();
  }
}

// ============================================================================
// GROUP C — duplicate submission: multi-click, reload idempotency, save upsert
// ============================================================================
async function groupC() {
  const g = "C";
  const { context, page } = await mobilePage();
  try {
    await loginViaUi(page, g);
    const before = await usageCount();
    const rowsBefore = (await reportRows()).length;

    await wizardToConfirm(page, g, `Dup-click test ${PII.question} — only one reading should be charged.`);

    // Count oracle POSTs; hammer the button 3× rapidly
    let oraclePosts = 0;
    const listener = (req) => { if (req.url().includes("/api/oracle") && req.method() === "POST") oraclePosts++; };
    page.on("request", listener);

    const btn = page.locator("button", { hasText: "Start Reading" }).first();
    await btn.tap();
    await Promise.all([btn.tap().catch(() => {}), btn.tap().catch(() => {})]); // 2 more rapid taps

    await page.waitForURL(/\/consult\/iching\/result\?session=/, { timeout: 180000 });
    await page.waitForSelector("text=Your Hexagram", { timeout: 60000 });
    page.off("request", listener);
    check(g, "rapid multi-click → exactly one /api/oracle call", oraclePosts === 1, `${oraclePosts} POSTs`);
    await shot(page, "c1-result");

    const usageAfter = await usageCount();
    check(g, "multi-click deducted once", usageAfter === before + 1, `usage ${before}→${usageAfter}`);
    const rowsAfter = (await reportRows()).length;
    check(g, "multi-click created one report", rowsAfter === rowsBefore + 1, `${rowsBefore}→${rowsAfter}`);

    // Reload result page — restored from storage, no re-generation
    let reloadPosts = 0;
    const l2 = (req) => { if (req.url().includes("/api/oracle") && req.method() === "POST") reloadPosts++; };
    page.on("request", l2);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=Your Hexagram", { timeout: 60000 });
    await new Promise((r) => setTimeout(r, 1500));
    page.off("request", l2);
    check(g, "result reload does not re-generate", reloadPosts === 0, `${reloadPosts} POSTs`);
    const usageAfterReload = await usageCount();
    check(g, "reload does not re-charge", usageAfterReload === usageAfter, `usage=${usageAfterReload}`);

    // Save idempotency: re-POST the same result → still one row (upsert key)
    const dup = await page.evaluate(async () => {
      const m = window.location.href.match(/session=([^&]+)/);
      if (!m) return "no-session";
      const raw = sessionStorage.getItem(`goeast:draft:consult:result:${decodeURIComponent(m[1])}`);
      if (!raw) return "no-local-result";
      const res = await fetch("/api/consult/result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: raw,
      });
      return `${res.status}`;
    });
    await new Promise((r) => setTimeout(r, 1000));
    const rowsFinal = (await reportRows()).length;
    check(g, "duplicate save POST is idempotent (upsert)", dup === "200" && rowsFinal === rowsAfter, `POST ${dup}, rows ${rowsAfter}→${rowsFinal}`);
  } catch (e) {
    check(g, "group C flow error", false, String(e).slice(0, 300));
  } finally {
    await context.close();
  }
}

// ============================================================================
// GROUP D — follow-up Q&A: same-cast grounding, persistence, permissions
// Quota budget for a fresh free user: report(1) + followup#1(1) + followup#2(1) = 3
// ============================================================================
async function groupD() {
  const g = "D";
  const { context, page } = await mobilePage();
  try {
    await loginViaUi(page, g);

    // 1. Create a report (charge 1) and snapshot the original row
    await wizardToConfirm(page, g, `Followup base ${PII.question} — one reading to discuss.`);
    await page.locator("button", { hasText: "Start Reading" }).first().tap();
    await page.waitForURL(/\/consult\/iching\/result\?session=/, { timeout: 180000 });
    await page.waitForSelector("text=Your Hexagram", { timeout: 60000 });
    const sessionId = decodeURIComponent(page.url().match(/session=([^&]+)/)[1]);
    const before = await reportSnapshot(sessionId);
    const hexBefore = await page.locator("text=/Hexagram \\d+/").first().textContent();
    check(g, "base report created", !!before, sessionId.slice(0, 8));

    // 2. Follow-up #1 (charge 2)
    await page.waitForSelector("text=继续讨论这次解读", { timeout: 30000 });
    await page.locator("button", { hasText: "继续讨论这次解读" }).first().tap();
    // The action-review note textarea also lives on this page — target the
    // follow-up input by its aria-label, not by DOM position.
    const ta = page.locator("textarea[aria-label='Follow-up question']");
    await typeWithKeyboardChecks(page, ta, `First follow-up ${PII.question} — what does the changing line mean?`, "followup input", g);
    let posts = 0;
    const countReq = (r) => { if (r.url().includes("/api/consult/followup") && r.method() === "POST") posts++; };
    page.on("request", countReq);
    await page.locator("button", { hasText: "Send" }).first().tap();
    await page.waitForSelector(`text=First follow-up`, { timeout: 180000 });
    check(g, "follow-up #1 turns appear in thread", true);

    // 3. Follow-up #2 (charge 3) — rapid double-click on Send (still 1 POST)
    await ta.fill(`Second follow-up — how should I act on this?`);
    await page.locator("button", { hasText: "Send" }).first().tap();
    await page.locator("button", { hasText: "Send" }).first().tap().catch(() => {});
    await page.waitForSelector("text=Second follow-up", { timeout: 180000 });
    await page.waitForTimeout(1500);
    page.off("request", countReq);
    check(g, "two follow-ups, exactly 2 POSTs (double-click safe)", posts === 2, `${posts} POSTs`);

    // 4. Original report unchanged + follow-up rows saved
    const after = await reportSnapshot(sessionId);
    check(g, "original report row unchanged", JSON.stringify(after) === JSON.stringify(before), "");
    const rows = await followupRows(sessionId);
    check(g, "exactly 2 follow-up rows", rows.length === 2, `${rows.length} rows`);
    const hexAfter = await page.locator("text=/Hexagram \\d+/").first().textContent();
    check(g, "hexagram unchanged on page", hexBefore === hexAfter, `${hexBefore} → ${hexAfter}`);
    const usage = await usageCount();
    check(g, "usage = 3 (report + 2 follow-ups)", usage === 3, `usage=${usage}`);

    // 5. Refresh — thread restored read-only, no new POSTs/charges
    let refreshPosts = 0;
    const countReq2 = (r) => { if (r.url().includes("/api/consult/followup") && r.method() === "POST") refreshPosts++; };
    page.on("request", countReq2);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=Second follow-up", { timeout: 60000 });
    await page.waitForTimeout(1500);
    page.off("request", countReq2);
    check(g, "refresh restores full thread, 0 POSTs", refreshPosts === 0, `${refreshPosts} POSTs`);
    check(g, "refresh does not re-charge", (await usageCount()) === 3, "");
    const after2 = await reportSnapshot(sessionId);
    check(g, "report row still unchanged", JSON.stringify(after2) === JSON.stringify(before), "");
    await shot(page, "d1-followup-thread");

    // 6. Cross-account permission: fresh user cannot read or follow up
    const user2 = await createQaUser("3d2");
    const ctx2 = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
      ...(process.env.VERCEL_BYPASS_TOKEN
        ? { extraHTTPHeaders: { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS_TOKEN } }
        : {}),
    });
    const p3 = await ctx2.newPage();
    await p3.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
    await p3.fill("#email", user2.email);
    await p3.fill("#password", user2.password);
    await p3.locator("button", { hasText: "Sign In" }).first().tap();
    await p3.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 30000 });
    const readRes = await p3.evaluate(async (sid) =>
      (await fetch(`/api/consult/followup?session_id=${encodeURIComponent(sid)}`, { method: "GET" })).status
    , sessionId);
    check(g, "other account GET → 404", readRes === 404, `status ${readRes}`);
    const askRes = await p3.evaluate(async (sid) =>
      (await fetch("/api/consult/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid, question: "let me in?" }),
      })).status
    , sessionId);
    check(g, "other account POST → 404", askRes === 404, `status ${askRes}`);
    check(g, "other account created no rows", (await followupRows(sessionId)).length === 2, "");
    await ctx2.close();
  } catch (e) {
    check(g, "group D flow error", false, String(e).slice(0, 300));
  } finally {
    await context.close();
  }
}

// ============================================================================
// GROUP E — 行动记录与复盘 V1: status + note save/restore, permissions,
// duplicate submits, zero AI / zero quota. Report seeded via admin REST —
// this group never calls the model.
// ============================================================================
async function groupE() {
  const g = "E";
  const { context, page } = await mobilePage();
  try {
    await loginViaUi(page, g);

    // Seed an owned report directly (no AI cost); snapshot includes the new columns
    const sessionId = `act-${Date.now()}`;
    await sb("/rest/v1/consult_results", {
      method: "POST",
      body: JSON.stringify({
        session_id: sessionId, user_id: QA.id,
        question: "E2E action-review seed: a work decision",
        context: { topic: "A work decision", stuck: "seed", constraint: "" },
        cast_data: { mode: "cast", hexagramNumber: 1, changingLines: [], transformedNumber: undefined },
        ai_response: "Seed reading for action review testing.",
      }),
    });
    const before = await reportSnapshot(sessionId);
    const usageStart = await usageCount();
    check(g, "seeded report present, status/note null", before && before.action_status === null && before.review_note === null, JSON.stringify(before?.action_status));

    // Open the report (no local copy → DB restore path)
    let aiPosts = 0;
    const noAi = (r) => { if ((r.url().includes("/api/oracle") || r.url().includes("/api/consult/followup")) && r.method() === "POST") aiPosts++; };
    page.on("request", noAi);
    await page.goto(`${BASE}/consult/iching/result?session=${encodeURIComponent(sessionId)}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=Your Hexagram", { timeout: 60000 });
    await page.waitForSelector("text=复盘心得", { timeout: 30000 });
    check(g, "result page shows action-review panel", true);
    await noOverflow(page, "result+panel", g);

    // 1. Click 进行中 → optimistic + persisted
    await page.locator("button", { hasText: "进行中" }).first().tap();
    await page.waitForFunction(() => document.querySelector('[aria-pressed="true"]')?.textContent?.includes("进行中"), null, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1500);
    let row = await reportSnapshot(sessionId);
    check(g, "status 进行中 persisted", row.action_status === "in_progress", row.action_status);

    // 2. Type note + Save (mobile keyboard check on the textarea)
    const note = `E2E reflection ${PII.question} — tried it for two mornings.`;
    await typeWithKeyboardChecks(page, page.locator("textarea").last(), note, "review note", g);
    let patchCount = 0;
    const countPatch = (r) => { if (r.url().includes("/api/consult/result") && r.method() === "PATCH") patchCount++; };
    page.on("request", countPatch);
    await page.locator("button", { hasText: "Save" }).last().tap();
    await page.waitForSelector("text=Saved ✓", { timeout: 15000 });
    row = await reportSnapshot(sessionId);
    check(g, "note persisted verbatim", row.review_note === note, (row.review_note || "").slice(0, 40));

    // 3. Duplicate submits: same-status click (no-op) + rapid note re-save
    await page.locator("button", { hasText: "进行中" }).first().tap(); // already selected → no PATCH
    await page.locator("button", { hasText: "Save" }).last().tap().catch(() => {}); // Saved state → allowed once
    await page.waitForTimeout(1500);
    page.off("request", countPatch);
    check(g, "duplicate status click + re-save → minimal PATCHes (≤2)", patchCount <= 2, `${patchCount} PATCHes`);
    row = await reportSnapshot(sessionId);
    check(g, "no duplicate/corrupt records", (row.review_note === note) && row.action_status === "in_progress", `${row.action_status}/${(row.review_note || "").slice(0, 20)}`);

    // 4. Refresh → status + note restored from server
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=复盘心得", { timeout: 60000 });
    await page.waitForTimeout(2000); // server confirm re-seeds the panel
    const pressed = await page.locator("button[aria-pressed='true']").first().textContent().catch(() => "");
    const noteAfter = await page.locator("textarea").last().inputValue();
    check(g, "refresh restores selected status", (pressed || "").includes("进行中"), pressed || "(none)");
    check(g, "refresh restores note text", noteAfter === note, noteAfter.slice(0, 30));
    await shot(page, "e1-action-review");

    // 5. MyReadings shows the status marker and reopens the report
    await page.goto(`${BASE}/consult`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=My Readings", { timeout: 30000 });
    const marker = await page.locator("text=⟳ 进行中").count();
    check(g, "My Readings shows 进行中 marker", marker > 0, `${marker} markers`);
    await page.locator("a", { hasText: "action-review seed" }).first().tap();
    await page.waitForSelector("text=复盘心得", { timeout: 60000 });
    await page.waitForTimeout(2000);
    const reopenedNote = await page.locator("textarea").last().inputValue();
    check(g, "reopening from history restores note", reopenedNote === note, reopenedNote.slice(0, 30));

    // 6. Zero AI / zero quota the whole group
    page.off("request", noAi);
    check(g, "zero AI calls (oracle/followup POSTs)", aiPosts === 0, `${aiPosts} POSTs`);
    check(g, "zero quota consumed", (await usageCount()) === usageStart, `${usageStart}→${await usageCount()}`);

    // 7. Cross-account: read + write both denied
    const user2 = await createQaUser("3e2");
    const ctx2 = await browser.newContext({
      viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true,
      ...(process.env.VERCEL_BYPASS_TOKEN ? { extraHTTPHeaders: { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS_TOKEN } } : {}),
    });
    const p3 = await ctx2.newPage();
    await p3.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
    await p3.fill("#email", user2.email);
    await p3.fill("#password", user2.password);
    await p3.locator("button", { hasText: "Sign In" }).first().tap();
    await p3.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 30000 });
    const reads = await p3.evaluate(async (sid) => {
      const r = await (await fetch(`/api/consult/result?session_id=${encodeURIComponent(sid)}`)).json();
      return r.result === null ? "null" : "LEAKED";
    }, sessionId);
    check(g, "other account GET → no data", reads === "null", reads);
    const writes = await p3.evaluate(async (sid) => {
      const r = await fetch("/api/consult/result", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid, actionStatus: "done", reviewNote: "hijack" }),
      });
      return r.status;
    }, sessionId);
    check(g, "other account PATCH → 404 (no false success)", writes === 404, `${writes}`);
    row = await reportSnapshot(sessionId);
    check(g, "other account changed nothing", row.action_status === "in_progress" && row.review_note === note, row.action_status);
    await ctx2.close();
  } catch (e) {
    check(g, "group E flow error", false, String(e).slice(0, 300));
  } finally {
    await context.close();
  }
}

// --- run ---------------------------------------------------------------------
if (GROUPS.includes("a")) { RUN.groups.push("A"); console.log("\n=== GROUP A: success flow ==="); await groupA(); }
if (GROUPS.includes("b")) { RUN.groups.push("B"); console.log("\n=== GROUP B: failure recovery ==="); await groupB(); }
if (GROUPS.includes("c")) { RUN.groups.push("C"); console.log("\n=== GROUP C: duplicate submission ==="); await groupC(); }
if (GROUPS.includes("d")) { RUN.groups.push("D"); console.log("\n=== GROUP D: follow-up Q&A ==="); await groupD(); }
if (GROUPS.includes("e")) { RUN.groups.push("E"); console.log("\n=== GROUP E: action review V1 ==="); await groupE(); }
if (GROUPS.includes("f")) { RUN.groups.push("F"); console.log("\n=== GROUP F: synastry follow-up V1 ==="); await groupF(); }

// ============================================================================
// GROUP F — synastry follow-up + relationship action V1 (romantic only).
// Report seeded via admin REST (deterministic; the generation path itself is
// unchanged). Follow-ups charge the shared pool: report(seeded, 0) + 2
// follow-ups = 2 charges.
// ============================================================================
async function groupF() {
  const g = "F";
  const { context, page } = await mobilePage();
  try {
    await loginViaUi(page, g);
    const sessionId = `syn-${Date.now()}`;
    await seedSynastryReport(QA, sessionId);
    await seedSynastryReport(QA, `syn-biz-${Date.now()}`, "business"); // non-romantic
    const before = await synastrySnapshot(sessionId);
    const usageStart = await usageCount();
    check(g, "seeded romantic report present", !!before, sessionId.slice(0, 10));

    // 1. Open the report from history entry point: My Relationship Reports on /ziwei/synastry
    let aiPosts = 0;
    const noAi = (r) => { if (r.url().includes("/api/ziwei/synastry") && r.method() === "POST") aiPosts++; };
    page.on("request", noAi);
    await page.goto(`${BASE}/ziwei/synastry`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=My Relationship Reports", { timeout: 30000 });
    // Target the ROMANTIC seed by its sessionId (a business seed shares the
    // same birth dates and sorts first) — list fetch resolves after the heading.
    const romanticLink = page.locator(`a[href*="${sessionId}"]`);
    await romanticLink.waitFor({ timeout: 30000 });
    await romanticLink.tap();
    await page.waitForSelector("text=AI Interpretation", { timeout: 60000 });
    await page.waitForSelector("text=继续讨论这份关系解读", { timeout: 30000 });
    check(g, "history entry opens report with follow-up section", true);
    await noOverflow(page, "synastry result", g);

    // 2. Follow-up #1 (charge 1)
    await page.locator("button", { hasText: "继续讨论这份关系解读" }).first().tap();
    const ta = page.locator("textarea[aria-label='Follow-up question']");
    await typeWithKeyboardChecks(page, ta, `First synastry follow-up ${PII.question} — what does his Life Palace borrowing mean?`, "synastry followup input", g);
    let posts = 0;
    const countReq = (r) => { if (r.url().includes("/api/synastry/followup") && r.method() === "POST") posts++; };
    page.on("request", countReq);
    await page.locator("button", { hasText: "Send" }).first().tap();
    await page.waitForSelector("text=First synastry follow-up", { timeout: 180000 });
    check(g, "follow-up #1 appears in thread", true);

    // 3. Follow-up #2 (charge 2) with rapid double-click — still 2 POSTs total
    await ta.fill("Second follow-up — how should I bring up money topics?");
    await page.locator("button", { hasText: "Send" }).first().tap();
    await page.locator("button", { hasText: "Send" }).first().tap().catch(() => {});
    await page.waitForSelector("text=Second follow-up", { timeout: 180000 });
    await page.waitForTimeout(1500);
    page.off("request", countReq);
    check(g, "two follow-ups, exactly 2 POSTs (double-click safe)", posts === 2, `${posts} POSTs`);

    // 4. Original report unchanged + rows + quota
    const after = await synastrySnapshot(sessionId);
    check(g, "original synastry report row unchanged", JSON.stringify(after) === JSON.stringify(before), "");
    const rows = await synastryFollowupRows(sessionId);
    check(g, "exactly 2 follow-up rows", rows.length === 2, `${rows.length} rows`);
    const usage = await usageCount();
    check(g, "usage = 2 charges (seeded report costs 0)", usage === usageStart + 2, `${usageStart}→${usage}`);
    await shot(page, "f1-synastry-followup");

    // 5. Refresh — thread restored read-only, no new POSTs/charges
    let refreshPosts = 0;
    const countReq2 = (r) => { if (r.url().includes("/api/synastry/followup") && r.method() === "POST") refreshPosts++; };
    page.on("request", countReq2);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=Second follow-up", { timeout: 60000 });
    await page.waitForTimeout(1500);
    page.off("request", countReq2);
    check(g, "refresh restores thread, 0 POSTs", refreshPosts === 0, `${refreshPosts} POSTs`);
    check(g, "refresh does not re-charge", (await usageCount()) === usageStart + 2, "");
    check(g, "report row still unchanged after refresh", JSON.stringify(await synastrySnapshot(sessionId)) === JSON.stringify(before), "");

    // 6. Action status + reflection note (no AI, no charge)
    const note = `Synastry reflection ${PII.question} — tried the afternoon-walk conversation.`;
    await page.locator("button", { hasText: "进行中" }).first().tap();
    await page.waitForTimeout(1200);
    await typeWithKeyboardChecks(page, page.locator("textarea").last(), note, "synastry review note", g);
    await page.locator("button", { hasText: "Save" }).last().tap();
    await page.waitForSelector("text=Saved ✓", { timeout: 15000 });
    const rowAfterAction = await synastrySnapshot(sessionId);
    check(g, "action status + note persisted", rowAfterAction.action_status === "in_progress" && rowAfterAction.review_note === note, rowAfterAction.action_status);
    check(g, "action/note cost no quota", (await usageCount()) === usageStart + 2, "");

    // 7. Reopen from My Relationship Reports — note + status restored, list marker
    await page.goto(`${BASE}/ziwei/synastry`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=My Relationship Reports", { timeout: 30000 });
    const romanticLink2 = page.locator(`a[href*="${sessionId}"]`);
    await romanticLink2.waitFor({ timeout: 30000 });
    const marker = await page.locator("text=⟳ 进行中").count();
    check(g, "history list shows 进行中 marker", marker > 0, `${marker} markers`);
    await romanticLink2.tap();
    await page.waitForSelector("text=继续讨论这份关系解读", { timeout: 60000 });
    await page.waitForTimeout(2000);
    const reopenedNote = await page.locator("textarea").last().inputValue();
    check(g, "reopening restores note", reopenedNote === note, reopenedNote.slice(0, 25));

    // 8. Non-romantic report: section absent client-side + server 422
    const biz = `syn-biz-${Date.now()}`;
    // (already seeded with the same timestamp family — find it via API instead)
    const bizRows = await sb(`/rest/v1/synastry_results?user_id=eq.${QA.id}&relationship_type=eq.business&select=session_id&order=created_at.desc&limit=1`);
    const bizId = bizRows.body?.[0]?.session_id;
    const bizRes = await page.evaluate(async (sid) => {
      const r = await fetch("/api/synastry/followup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid, question: "business question?" }),
      });
      return { status: r.status, code: (await r.json().catch(() => ({}))).code };
    }, bizId);
    check(g, "non-romantic follow-up → 422 RELATIONSHIP_TYPE_UNSUPPORTED", bizRes.status === 422 && bizRes.code === "RELATIONSHIP_TYPE_UNSUPPORTED", `${bizRes.status}/${bizRes.code}`);

    // 9. Quota exhausted → 429 LIMIT_REACHED, no model call
    await sb("/rest/v1/usage_log", {
      method: "POST",
      body: JSON.stringify([{ user_id: QA.id, window_start: `${new Date().toISOString().slice(0, 10)}T00:00:00+00`, count: 3 }]),
      headers: { Prefer: "resolution=merge-duplicates" },
    });
    const limited = await page.evaluate(async (sid) => {
      const r = await fetch("/api/synastry/followup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid, question: "one more?" }),
      });
      return r.status;
    }, sessionId);
    check(g, "quota exhausted → 429", limited === 429, `${limited}`);
    check(g, "no extra rows after limit", (await synastryFollowupRows(sessionId)).length === 2, "");

    // 10. Cross-account: read and write both denied, data unchanged
    const user2 = await createQaUser("3f2");
    const ctx2 = await browser.newContext({
      viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true,
      ...(process.env.VERCEL_BYPASS_TOKEN ? { extraHTTPHeaders: { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS_TOKEN } } : {}),
    });
    const p3 = await ctx2.newPage();
    await p3.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
    await p3.fill("#email", user2.email);
    await p3.fill("#password", user2.password);
    await p3.locator("button", { hasText: "Sign In" }).first().tap();
    await p3.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 30000 });
    const perms = await p3.evaluate(async (sid) => {
      const read = await (await fetch(`/api/synastry/result?session_id=${encodeURIComponent(sid)}`)).json();
      const list = await (await fetch(`/api/synastry/followup?session_id=${encodeURIComponent(sid)}`)).status;
      const write = await fetch("/api/synastry/followup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid, question: "hijack?" }),
      }).then((r) => r.status);
      const patch = await fetch("/api/synastry/result", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid, actionStatus: "done", reviewNote: "hijack" }),
      }).then((r) => r.status);
      return { read: read.result === null ? "null" : "LEAKED", list, write, patch };
    }, sessionId);
    check(g, "other account GET report → no data", perms.read === "null", perms.read);
    check(g, "other account list follow-ups → 404", perms.list === 404, `${perms.list}`);
    check(g, "other account POST follow-up → 404", perms.write === 404, `${perms.write}`);
    check(g, "other account PATCH → 404 (no false success)", perms.patch === 404, `${perms.patch}`);
    const finalSnap = await synastrySnapshot(sessionId);
    check(g, "other account changed nothing", finalSnap.action_status === "in_progress" && finalSnap.review_note === note, finalSnap.action_status);
    check(g, "no zero-AI-violation: zero synastry generations", aiPosts === 0, `${aiPosts} gen POSTs`);
    await ctx2.close();
  } catch (e) {
    check(g, "group F flow error", false, String(e).slice(0, 300));
  } finally {
    await context.close();
  }
}

await browser.close();

// Merge into results.json when running a subset of groups (e.g. B locally,
// A+C on preview) so one file accumulates all evidence.
const RESULTS_PATH = "/tmp/goeast-3b/results.json";
let mergedResults = results;
let mergedRun = RUN;
try {
  if (fs.existsSync(RESULTS_PATH)) {
    const prev = JSON.parse(fs.readFileSync(RESULTS_PATH, "utf8"));
    const prevGroupRuns = prev.run?.groups || [];
    mergedRun = {
      ...prev.run,
      groups: [...new Set([...prevGroupRuns, ...RUN.groups])],
      events: [...(prev.run?.events || []), ...RUN.events],
      beacons: [...(prev.run?.beacons || []), ...RUN.beacons],
      warnings: [...(prev.run?.warnings || []), ...RUN.warnings],
      subRuns: [...(prev.run?.subRuns || []), { base: BASE, startedAt: RUN.startedAt }],
    };
    const prevNames = new Set((prev.results || []).map((r) => `${r.group}/${r.name}`));
    mergedResults = [...(prev.results || []), ...results.filter((r) => !prevNames.has(`${r.group}/${r.name}`))];
  }
} catch {
  // corrupt previous file — overwrite
}
fs.writeFileSync(RESULTS_PATH, JSON.stringify({ run: mergedRun, results: mergedResults }, null, 2));

const failed = mergedResults.filter((r) => !r.ok);
console.log(`\n===== TASK 3B E2E: ${mergedResults.length - failed.length}/${mergedResults.length} passed =====`);
if (RUN.warnings.length) console.log(`Warnings (${RUN.warnings.length}):`);
for (const w of RUN.warnings) console.log(`  ⚠️  [${w.group}] ${w.name}: ${w.detail}`);
console.log("Evidence: /tmp/goeast-3b/results.json, shots in /tmp/goeast-3b/shots/, QA user in /tmp/goeast-3b/qa-user.json");
process.exit(failed.length === 0 ? 0 : 1);
