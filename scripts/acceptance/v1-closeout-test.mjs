// V1 Closeout verification — hexagram data, contrast, H1, keyboard, reduced-motion
// Run: node goeast-v1-closeout-test.mjs (requires local server on :3100)
import { chromium } from "playwright-core";
import fs from "fs";

const EXEC = `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const BASE = "http://localhost:3100";
const browser = await chromium.launch({ executablePath: EXEC, headless: true });
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(ok ? "✅" : "❌", name, detail);
};

// === 1. Homepage hexagram data accuracy ===
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });

// Check H1
const h1 = await page.textContent("h1");
check("H1 features consultation products", h1.includes("I Ching") && h1.includes("Zi Wei"), h1);

// Check hexagram lines (Hexagram 32, binary "011100")
// binary[0]=line1(bottom)=yin, binary[1]=line2=yang, binary[2]=line3=yang(changing)
// binary[3]=line4=yang, binary[4]=line5=yin, binary[5]=line6(top)=yin
// Display is top-to-bottom: line6, line5, line4, line3(changing), line2, line1
const hexLines = await page.evaluate(() => {
  const hero = document.querySelector("section");
  const mono = hero?.querySelector('[style*="JetBrains Mono"]');
  if (!mono) return null;
  return mono.textContent;
});

if (hexLines) {
  // Verify yin lines are 2-segment ("━━ ━━") not 3-segment ("━ ━ ━")
  check("yin lines are 2-segment (not 3)", !hexLines.includes("━ ━ ━"), `"${hexLines.substring(0, 100)}..."`);
  check("changing line marked with ◦", hexLines.includes("◦"));
  check("hexagram has 6 lines", (hexLines.match(/━/g) || []).length >= 12); // each line has at least 2 ━
} else {
  check("hexagram lines rendered", false, "JetBrains Mono element not found");
}

// === 2. Contrast check ===
const contrast = await page.evaluate(() => {
  function getLuminance(rgb) {
    const [r, g, b] = rgb.match(/\d+/g).map(Number).map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  function getContrast(el) {
    const style = getComputedStyle(el);
    const fg = style.color;
    let bg = "rgb(255,255,255)";
    let parent = el.parentElement;
    while (parent) {
      const parentBg = getComputedStyle(parent).backgroundColor;
      if (parentBg !== "rgba(0, 0, 0, 0)" && parentBg !== "transparent") {
        bg = parentBg;
        break;
      }
      parent = parent.parentElement;
    }
    const fgRgb = fg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    const bgRgb = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!fgRgb || !bgRgb) return null;
    const l1 = getLuminance(fgRgb[0]);
    const l2 = getLuminance(bgRgb[0]);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  // Check the "示例 Example" tag
  const tags = document.querySelectorAll("span");
  const exampleTag = [...tags].find(t => t.textContent.includes("示例") || t.textContent.includes("Example"));
  if (exampleTag) {
    return { example: getContrast(exampleTag) };
  }
  return { example: null };
});

if (contrast?.example) {
  check("示例 Example tag contrast ≥ 4.5:1", contrast.example >= 4.5, `${contrast.example.toFixed(2)}:1`);
} else {
  check("示例 Example tag found for contrast check", false, "not found");
}

// === 3. Mobile responsive (375px) ===
const mobilePage = await browser.newPage({ viewport: { width: 375, height: 812 } });
await mobilePage.goto(`${BASE}/`, { waitUntil: "networkidle" });

const mobileH1 = await mobilePage.textContent("h1");
check("H1 visible on mobile", mobileH1.length > 0);

const ctaVisible = await mobilePage.evaluate(() => {
  const cta = document.querySelector('a[href="/consult"]');
  if (!cta) return false;
  const rect = cta.getBoundingClientRect();
  return rect.top < 812 && rect.height > 0;
});
check("CTA visible on 375px first screen", ctaVisible);

await mobilePage.close();

// === 4. Reduced motion ===
const rmPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await rmPage.emulateMedia({ reducedMotion: "reduce" });
await rmPage.goto(`${BASE}/`, { waitUntil: "networkidle" });
// Content should still be visible (opacity 1)
const contentVisible = await rmPage.evaluate(() => {
  const h1 = document.querySelector("h1");
  return h1 && getComputedStyle(h1).opacity !== "0";
});
check("content visible with reduced-motion", contentVisible);
await rmPage.close();

// === 5. Keyboard navigation (result page) ===
// Seed a test result in sessionStorage first
const resultPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const testSession = "test-keyboard-check";
const testResult = {
  sessionId: testSession,
  question: "Test question for keyboard check",
  context: { topic: "test", stuck: "test", constraint: "" },
  cast: { mode: "cast", hexagramNumber: 32, changingLines: [3] },
  aiResponse: "## 1. TRADITIONAL TEACHING\nTest\n\n## 2. AI INTERPRETATION\nTest\n\n## 3. REFLECTION\n- Q1",
  completedAt: new Date().toISOString(),
};
await resultPage.goto(`${BASE}/consult/iching/result?session=${testSession}`);
await resultPage.evaluate((data) => {
  sessionStorage.setItem(`goeast:draft:consult:result:${data.sessionId}`, JSON.stringify(data));
}, testResult);
await resultPage.reload({ waitUntil: "networkidle" });

// Try keyboard navigation to hexagram line buttons
const lineButtons = await resultPage.locator('button[aria-label*="Line"]').count();
check("hexagram lines are buttons (keyboard accessible)", lineButtons === 6, `found ${lineButtons}`);

if (lineButtons > 0) {
  // Click line 3 (the changing line)
  await resultPage.locator('button[aria-label*="Line 3"]').click();
  const lineInfo = await resultPage.locator("text=Changing line 变爻").count();
  check("clicking changing line shows info", lineInfo > 0);

  // Click again to deselect
  await resultPage.locator('button[aria-label*="Line 3"]').click();
  const lineInfoAfter = await resultPage.locator("text=Changing line 变爻").count();
  check("clicking again deselects", lineInfoAfter === 0);

  // Click a static line (line 1)
  await resultPage.locator('button[aria-label*="Line 1"]').click();
  const staticInfo = await resultPage.locator("text=static line").count();
  check("clicking static line shows info", staticInfo > 0);
}
await resultPage.close();

// === 6. Performance baseline ===
const perfPage = await browser.newPage();
const startTime = Date.now();
await perfPage.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
const domTime = Date.now() - startTime;
check("homepage DOMContentLoaded < 3s", domTime < 3000, `${domTime}ms`);

const pageSize = await perfPage.evaluate(() => document.documentElement.outerHTML.length);
check("homepage HTML < 500KB", pageSize < 500000, `${(pageSize / 1024).toFixed(0)}KB`);
await perfPage.close();

await browser.close();

const pass = results.filter(r => r.ok).length;
console.log(`\nV1 CLOSEOUT: ${pass}/${results.length} passed`);
fs.writeFileSync("/tmp/v1-closeout-results.json", JSON.stringify(results, null, 2));
process.exit(pass === results.length ? 0 : 1);
