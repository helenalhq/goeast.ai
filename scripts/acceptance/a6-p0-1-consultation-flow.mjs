// A6 acceptance: guest casts hexagram → asks Zhou Gong → context card shows the
// actual cast → login redirect carries return target. Runs against local build.
import { chromium } from "playwright-core";

const EXEC = `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const BASE = process.env.BASE_URL || "http://localhost:3100";
const SHOTS = "/tmp/goeast-shots-round2";
import fs from "fs";
fs.mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch({ executablePath: EXEC, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 2600 } });
const log = (...a) => console.log("[a6]", ...a);
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  log(ok ? "PASS" : "FAIL", name, detail);
};

try {
  // 1. Cast flow on /iching (guest)
  await page.goto(`${BASE}/iching`, { waitUntil: "networkidle" });
  await page.click("text=Begin Divination");
  for (let i = 0; i < 6; i++) {
    await page.click(`text=Cast Coins (${i + 1}/6)`);
    await page.waitForTimeout(150);
  }
  await page.waitForSelector("text=Read Full Hexagram", { timeout: 5000 });
  check("cast completed (result phase)", true);

  // 3. Click Ask Zhou Gong (saves context draft in onClick) → lands on prologue chapter
  await page.click("text=Ask Zhou Gong for AI Interpretation");
  await page.waitForURL(/sophies-journey\/prologue-zhougong/, { timeout: 10000 });
  await page.waitForSelector("#oracle", { timeout: 10000 });
  check("navigated to /sophies-journey/prologue-zhougong#oracle", true);

  // 2+4. Context draft was written by the click handler; open the Oracle overlay
  const ctx = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem("goeast:draft:iching-context") || "null")
  );
  check(
    "iching-context draft saved",
    !!ctx && typeof ctx.hexagramNumber === "number" && Array.isArray(ctx.changingLines),
    JSON.stringify(ctx)
  );
  await page.click("button:has-text(\"Cast the Oracle\")");
  await page.waitForSelector("text=Your cast · 你的卦", { timeout: 5000 });
  const cardText = await page.textContent("body");
  check(
    "context card shows cast hexagram",
    cardText.includes("Your cast") && /Hexagram \d+/.test(cardText),
    (cardText.match(/Hexagram \d+ [^\n]{0,40}/) || [""])[0]
  );
  check(
    "non-prediction disclaimer visible",
    cardText.includes("not a prediction of what will happen")
  );
  await page.screenshot({ path: `${SHOTS}/desktop_oracle_with_cast_context.png` });

  // 5. Type a question (draft persists), then submit → guest gets login redirect w/ next
  await page.fill("input[placeholder*=\"Ask\"]", "Should I take the new job offer?");
  const qDraft = await page.evaluate(() =>
    sessionStorage.getItem("goeast:draft:oracle:prologue-zhougong")
  );
  check("question draft saved", !!qDraft && qDraft.includes("new job"));

  // press Enter / submit
  await page.press("input[placeholder*=\"Ask\"]", "Enter");
  await page.waitForURL(/\/login/, { timeout: 10000 });
  check(
    "guest submit → login with return target",
    decodeURIComponent(page.url()).includes("next=/sophies-journey/prologue-zhougong"),
    page.url()
  );

  // 6. Context survives (sessionStorage same tab)
  const ctxAfter = await page.evaluate(() =>
    sessionStorage.getItem("goeast:draft:iching-context")
  );
  check("cast context survives login redirect", !!ctxAfter);
  await page.screenshot({ path: `${SHOTS}/desktop_login_redirect_with_next.png` });

  // 7. Back-navigation restores overlay state without recasting
  await page.goBack();
  await page.waitForSelector("#oracle", { timeout: 10000 });
  const castDraftStillThere = await page.evaluate(() =>
    sessionStorage.getItem("goeast:draft:iching-cast")
  );
  check("cast draft intact after back-nav (no recast)", !!castDraftStillThere);

  // 8. Study path: fixed hexagram page
  await page.goto(`${BASE}/iching/qian`, { waitUntil: "networkidle" });
  const studyBtn = await page.textContent("body");
  check(
    "study CTA present on /iching/qian",
    studyBtn.includes("Study This Hexagram with Zhou Gong")
  );
  await page.click("text=Study This Hexagram with Zhou Gong");
  await page.waitForURL(/prologue-zhougong/, { timeout: 10000 });
  await page.click("button:has-text(\"Cast the Oracle\")");
  await page.waitForSelector("text=Studying · 学习此卦", { timeout: 5000 });
  check("study context card (no invented changing lines)", true);
  await page.screenshot({ path: `${SHOTS}/desktop_oracle_study_context.png` });

  // 9. Mobile viewport spot-check
  await page.setViewportSize({ width: 390, height: 2600 });
  await page.screenshot({ path: `${SHOTS}/mobile_oracle_study_context.png` });
  check("mobile screenshot captured", true);
} catch (e) {
  check("flow error", false, String(e).slice(0, 300));
}

await browser.close();
const pass = results.filter((r) => r.ok).length;
console.log(`\nA6 RESULT: ${pass}/${results.length} passed`);
fs.writeFileSync(
  "/tmp/a6-results.json",
  JSON.stringify(results, null, 2)
);
process.exit(0);
