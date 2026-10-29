import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

const INSIGHTS_DIR = path.join(process.cwd(), "content/insights");
const EDITED = [
  "wechat-pay-foreigner.md",
  "china-esim-foreigner-guide.md",
  "china-food-delivery-foreigner-guide.md",
  "wu-wei-philosophy.md",
];

describe("content regression — editorial hygiene", () => {
  it("no internal SEO editorial phrases in any insight", () => {
    for (const f of fs.readdirSync(INSIGHTS_DIR)) {
      const text = fs.readFileSync(path.join(INSIGHTS_DIR, f), "utf8");
      expect(text, f).not.toMatch(/SEO takeaway|Search intent here|optimized landing/i);
    }
  });

  it("the four edited articles link to guide pages, not developer skills", () => {
    for (const f of EDITED) {
      const text = fs.readFileSync(path.join(INSIGHTS_DIR, f), "utf8");
      expect(text.includes("/skills/"), f).toBe(false);
    }
  });

  it("takeaways always end with sentence punctuation (no dangling fragments)", () => {
    for (const f of EDITED) {
      const text = fs.readFileSync(path.join(INSIGHTS_DIR, f), "utf8");
      const m = text.match(/takeaways:\n((?:\s*-\s*.+\n)+)/);
      expect(m, `${f}: takeaways block not found`).toBeTruthy();
      const items = m![1].trim().split("\n");
      expect(items.length, f).toBeGreaterThanOrEqual(2);
      for (const item of items) {
        const t = item.replace(/^\s*-\s*/, "").trim();
        expect(/[.!?。！？]$/.test(t), `${f}: takeaway lacks terminal punctuation: "${t}"`).toBe(true);
      }
    }
  });

  it("no duplicate FAQ questions within an article", () => {
    for (const f of EDITED) {
      const text = fs.readFileSync(path.join(INSIGHTS_DIR, f), "utf8");
      const qs = [...text.matchAll(/question:\s*"(.+?)"/g)].map((m) => m[1].toLowerCase().trim());
      expect(new Set(qs).size, `${f}: duplicate questions`).toBe(qs.length);
    }
  });

  it("edited articles carry the re-verification date and sources where facts were verified", () => {
    const withSources = ["wechat-pay-foreigner.md", "china-esim-foreigner-guide.md", "china-food-delivery-foreigner-guide.md"];
    for (const f of EDITED) {
      const text = fs.readFileSync(path.join(INSIGHTS_DIR, f), "utf8");
      // Articles are updated on different dates; verify a recent date is present
      // published_at keeps the original publish date; updated_at has the re-verification date
      expect(text, f).toMatch(/updated_at: "2026-10-(22|29)"|published_at: 2026-10-(22|29)/);
    }
    for (const f of withSources) {
      const text = fs.readFileSync(path.join(INSIGHTS_DIR, f), "utf8");
      expect(text, f).toMatch(/## Sources\n/);
      expect(text, f).toMatch(/checked 2026-10-(22|29)/);
    }
  });

  it("homepage no longer says 'optimized landing guides'", () => {
    const home = fs.readFileSync(path.join(process.cwd(), "app/page.tsx"), "utf8");
    expect(home).not.toMatch(/optimized landing/i);
  });

  it("no article renders two FAQ sets (body FAQ section forbidden when frontmatter faqs exist)", () => {
    for (const f of fs.readdirSync(INSIGHTS_DIR)) {
      const text = fs.readFileSync(path.join(INSIGHTS_DIR, f), "utf8");
      const hasFrontmatterFaqs = /^faqs:/m.test(text);
      const body = text.replace(/^---[\s\S]*?---/, "");
      if (hasFrontmatterFaqs) {
        expect(body.includes("## FAQ"), f).toBe(false);
      }
    }
  });

  it("no insight links to developer skill pages (site-wide, not just the four edited)", () => {
    for (const f of fs.readdirSync(INSIGHTS_DIR)) {
      const text = fs.readFileSync(path.join(INSIGHTS_DIR, f), "utf8");
      expect(text.includes("/skills/"), f).toBe(false);
    }
  });
});
