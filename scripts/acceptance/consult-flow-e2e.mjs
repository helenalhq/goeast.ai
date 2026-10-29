// Unified consult flow E2E: /consult entry → guided wizard → confirm → guest
// login redirect (drafts preserved) → result page structure (seeded result).
// Run against a built local server: BASE_URL=http://localhost:3100 node scripts/acceptance/consult-flow-e2e.mjs
import { chromium } from "playwright-core";
import fs from "fs";

const EXEC =
  process.env.PLAYWRIGHT_EXEC_PATH ||
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const BASE = process.env.BASE_URL || "http://localhost:3100";
const SHOTS = "/tmp/goeast-consult-e2e";
fs.mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch({ executablePath: EXEC, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1600 } });
const log = (...a) => console.log("[consult-e2e]", ...a);
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  log(ok ? "PASS" : "FAIL", name, detail);
};

try {
  // 1. /consult entry page
  await page.goto(`${BASE}/consult`, { waitUntil: "networkidle" });
  const entryText = await page.textContent("body");
  check("entry shows I Ching choice", entryText.includes("Organize a question"));
  check("entry shows Zi Wei choice", entryText.includes("Understand yourself or a relationship"));
  check("entry shows login/quota info", entryText.includes("3/day") && entryText.includes("10/day"));
  check("entry links to example", (await page.getAttribute('a[href="/examples/iching-writing-habit"]', "href")) !== null);
  check("entry links to /ziwei", (await page.getAttribute('a[href="/ziwei"]', "href")) !== null);
  await page.screenshot({ path: `${SHOTS}/01_entry.png` });

  // 2. Click "Organize a question" → guided flow
  await page.click("text=Organize a question");
  await page.waitForURL(/\/consult\/iching$/, { timeout: 10000 });
  await page.waitForSelector("text=What would you like to discuss?", { timeout: 5000 });
  check("guided flow step 1 shown", true);

  // 3. Fill steps 1-3
  await page.click("text=A writing habit");
  await page.click("text=Continue");
  await page.waitForSelector("text=Where are you stuck?");
  await page.fill("textarea", "I start strong but abandon it after a few days.");
  await page.click("text=Continue");
  await page.waitForSelector("text=Any constraints");
  await page.fill("textarea", "I have 30 minutes a day and want something sustainable.");
  await page.click("text=Review question");

  // 4. Confirm page shows assembled question (editable)
  await page.waitForSelector("text=This is the question", { timeout: 5000 });
  const confirmText = await page.textContent("body");
  check(
    "confirm shows assembled question from steps 1-3",
    confirmText.includes("A writing habit") &&
      confirmText.includes("I start strong but abandon it") &&
      confirmText.includes("30 minutes a day")
  );
  check("confirm has Start Reading button", (await page.locator("text=Start Reading").count()) > 0);
  const draft = await page.evaluate(() => sessionStorage.getItem("goeast:draft:consult-flow"));
  check("wizard draft persisted to sessionStorage", !!draft && draft.includes("writing habit"));
  await page.screenshot({ path: `${SHOTS}/02_confirm.png` });

  // 5. Guest clicks Start Reading → 401 → login redirect with next, drafts preserved
  await page.click("text=Start Reading");
  await page.waitForURL(/\/login/, { timeout: 15000 });
  check(
    "guest Start Reading → login redirect with next=/consult/iching",
    decodeURIComponent(page.url()).includes("next=/consult/iching"),
    page.url()
  );
  const draftAfterRedirect = await page.evaluate(() => sessionStorage.getItem("goeast:draft:consult-flow"));
  check("draft preserved through login redirect", !!draftAfterRedirect && draftAfterRedirect.includes("writing habit"));

  // 6. Simulate return after login: go back to /consult/iching → confirm restored
  await page.goto(`${BASE}/consult/iching`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=This is the question", { timeout: 5000 });
  check("draft restored to confirm page after returning", true);

  // 7. Result page structure — seed a stored result (page reads it from
  //    sessionStorage; refresh must never re-cast or re-call the API).
  const fakeResult = {
    sessionId: "test-session-0001",
    question: "I would like to consult the I Ching about: A writing habit.",
    context: { topic: "A writing habit", stuck: "", constraint: "" },
    cast: { mode: "cast", hexagramNumber: 32, changingLines: [3], transformedNumber: 40 },
    aiResponse:
      "## TRADITIONAL TEACHING\nHeng: duration. Thunder and wind reinforce each other.\n\n## AI INTERPRETATION\nYour habit fails not from weakness but from rhythm.\n\n## REFLECTION\n- What time of day is truly yours?\n- What would a smaller commitment look like?",
    completedAt: new Date().toISOString(),
  };
  await page.evaluate((r) => {
    sessionStorage.setItem("goeast:draft:consult:result:" + r.sessionId, JSON.stringify(r));
  }, fakeResult);
  await page.goto(`${BASE}/consult/iching/result?session=test-session-0001`, { waitUntil: "networkidle" });
  const resultText = await page.textContent("body");
  check("result shows question", resultText.includes("A writing habit"));
  check("result shows hexagram 32 Heng", resultText.includes("Hexagram 32") && resultText.includes("Heng"));
  check("result shows changing line 3", resultText.includes("Changing lines: 3"));
  check("result shows transformed hexagram 40 Jie", resultText.includes("Hexagram 40") && resultText.includes("Jie"));
  check("result shows traditional teaching", resultText.includes("Traditional Teaching") && resultText.includes("Thunder and wind"));
  check("result shows AI interpretation", resultText.includes("AI Interpretation") && resultText.includes("rhythm"));
  check("result shows reflection perspectives", resultText.includes("truly yours") && resultText.includes("smaller commitment"));
  check("result has next-step input", (await page.locator('input[placeholder*="15 minutes"]').count()) > 0);
  check("result has new-consultation + back links", (await page.locator('a[href="/consult/iching"]').count()) > 0 && (await page.locator('a[href="/consult"]').count()) > 0);
  await page.screenshot({ path: `${SHOTS}/03_result.png` });

  // 8. Next-step save persists across refresh
  await page.fill('input[placeholder*="15 minutes"]', "Write 15 minutes before breakfast");
  await page.click("text=Save");
  await page.waitForTimeout(300);
  await page.reload({ waitUntil: "networkidle" });
  const restoredInput = await page.inputValue('input[placeholder*="15 minutes"]');
  check("next step persists across refresh", restoredInput === "Write 15 minutes before breakfast", restoredInput);

  // 9. Refresh does not re-cast: cast numbers identical after reload
  const castAfterRefresh = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem("goeast:draft:consult:result:test-session-0001") || "null")?.cast
  );
  check(
    "cast unchanged after refresh (no re-cast)",
    castAfterRefresh?.hexagramNumber === 32 && castAfterRefresh?.transformedNumber === 40,
    JSON.stringify(castAfterRefresh)
  );
} catch (err) {
  check("script completed without exception", false, String(err));
  await page.screenshot({ path: `${SHOTS}/error.png` }).catch(() => {});
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log("FAILED:", failed.map((f) => f.name).join(", "));
  process.exit(1);
}
