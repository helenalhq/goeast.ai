// E4 evidence: capture [analytics] debug events emitted during real flows.
// Runs against the DEV server (debug logging fires outside production).
import { chromium } from "playwright-core";
import fs from "fs";

const EXEC = `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const BASE = process.env.BASE_URL || "http://localhost:3100";

const browser = await chromium.launch({ executablePath: EXEC, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 2000 } });

const events = [];
page.on("console", (msg) => {
  const text = msg.text();
  if (text.includes("[analytics]")) events.push(text.replace(/^[^\[]*/, "").trim());
});

const log = (...a) => console.log("[e4]", ...a);
try {
  // Flow 1: cast on /iching (guest)
  await page.goto(`${BASE}/iching`, { waitUntil: "networkidle" });
  await page.click("text=Begin Divination");
  for (let i = 0; i < 6; i++) {
    await page.click(`text=Cast Coins (${i + 1}/6)`);
    await page.waitForTimeout(120);
  }
  log("cast done");

  // Flow 2: hand off to Zhou Gong → context restore event
  await page.click("text=Ask Zhou Gong for AI Interpretation");
  await page.waitForSelector("#oracle", { timeout: 10000 });
  await page.click("button:has-text(\"Cast the Oracle\")");
  await page.waitForTimeout(800); // mount effect + restore + event
  log("oracle opened");

  // Flow 3: ziwei chart generation (client-side)
  await page.goto(`${BASE}/ziwei`, { waitUntil: "networkidle" });
  await page.fill("input[type=\"date\"]", "1990-05-20");
  await page.click("button:has-text(\"Generate Chart\")");
  await page.waitForTimeout(800);
  log("chart generated");
} catch (e) {
  log("ERROR", String(e).slice(0, 200));
}

await browser.close();
console.log("\n=== captured analytics events ===");
events.forEach((e) => console.log(e));
fs.writeFileSync("/tmp/e4-events.json", JSON.stringify(events, null, 2));
console.log(`total: ${events.length}`);
