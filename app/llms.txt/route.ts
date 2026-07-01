import { NextResponse } from "next/server";
import { getAllSkills } from "@/lib/skills";
import { getAllJourneys } from "@/lib/journeys";
import { getAllPhilosophers } from "@/lib/philosophers";
import { getAllHexagrams } from "@/lib/iching-data";
import { getAllGlossary } from "@/lib/glossary";
import { getAllInsights } from "@/lib/insights";
import { CATEGORIES } from "@/lib/types";

export async function GET() {
  const allSkills = getAllSkills();
  const journeys = getAllJourneys();
  const philosophers = getAllPhilosophers();

  const skillRows = allSkills.map(
    (s) =>
      `| ${s.title} | ${s.title_zh} | ${s.category} | ${s.tags.slice(0, 3).join(", ")} | /skills/${s.slug} |`
  );

  const journeyRows = journeys.map(
    (j) =>
      `| ${j.chapter} | ${j.title} | ${j.philosopher || "—"} | ${j.era || "—"} | /sophies-journey/${j.slug} |`
  );

  const philosopherRows = philosophers.map(
    (p) => `| ${p.name} | ${p.name_zh} | ${p.era} | ${p.school} | /philosophers/${p.slug} |`
  );

  const hexagrams = getAllHexagrams();
  const hexagramRows = hexagrams.map(
    (h) => `| ${h.number} | ${h.name} | ${h.name_zh} | ${h.upper_trigram}/${h.lower_trigram} | /iching/${h.slug} |`
  );

  const glossaryEntries = getAllGlossary();
  const glossaryRows = glossaryEntries.map(
    (g) => `| ${g.name} | ${g.name_zh} | ${g.school} | ${g.related_concepts.join(", ")} | /glossary/${g.slug} |`
  );

  const insights = getAllInsights();
  const insightRows = insights.map(
    (i) => `| ${i.title} | ${i.philosopher_slug || "—"} | ${i.concept_slugs?.join(", ") || "—"} | /insights/${i.slug} |`
  );

  const lines: string[] = [
    "# GoEast.ai",
    "",
    "> Curated AI skills for navigating life in China — travel, medical, shopping, accommodation.",
    "> 精选的面向外国人的 AI 技能目录 — 旅游、医疗、购物、住宿。",
    "",
    "## Quick Facts",
    "",
    `- **Site**: GoEast.ai`,
    `- **URL**: https://www.goeast.ai`,
    `- **Content**: ${allSkills.length} AI skills, ${journeys.length} journey chapters, ${philosophers.length} philosopher profiles, ${hexagrams.length} I Ching hexagrams, ${glossaryEntries.length} glossary entries, ${insights.length} insights articles`,
    `- **Audience**: Foreigners interested in China — travelers, culture enthusiasts, AI tool users`,
    `- **Languages**: English and Chinese (bilingual content)`,
    `- **API**: GET /api/skills — JSON API with search, pagination, category filter`,
    "",
    "## Travel in China",
    "",
    "GoEast.ai provides AI skills and guides for navigating daily life in China.",
    "For travelers, the platform covers essential topics: payment setup (WeChat Pay, Alipay),",
    "navigation apps, hospital navigation, and shopping assistance.",
    "Key resources: [China Travel Guide](https://www.goeast.ai/skills/china-travel-guide),",
    "[China Medical Journey Assistant](https://www.goeast.ai/skills/china-medical-journey-assistant)",
    "",
    "## Key URLs",
    "",
    "- Home: https://www.goeast.ai/",
    "- Skills directory: https://www.goeast.ai/skills",
    "- Philosophers: https://www.goeast.ai/philosophers",
    "- I Ching: https://www.goeast.ai/iching",
    "- Glossary: https://www.goeast.ai/glossary",
    "- Insights: https://www.goeast.ai/insights",
    "- llms-full dump: https://www.goeast.ai/llms-full.txt",
    "- Skills API: https://www.goeast.ai/api/skills",
    "",
    "## Chinese Philosophy",
    "",
    `The site features 3,000 years of Chinese philosophical thought through`,
    `"Sophie's Journey East" — ${journeys.length} chapters following a fictional character's`,
    "encounters with great thinkers from Confucius to modern philosophers.",
    "Browse philosopher profiles, an I Ching consultation tool, and a 50+ concept glossary.",
    "",
    "## What is GoEast.ai?",
    "",
    "GoEast.ai is a directory of AI agent skills designed to help foreigners navigate life in China.",
    "Each skill is an installable capability for AI assistants (Claude Code, OpenClaw, etc.) that",
    "provides specialized knowledge about China — from hospital navigation to payment setup.",
    "",
    "The site also features \"Sophie's Journey East\", a bilingual narrative walking through",
    "3,000 years of Chinese philosophy via a fictional character's encounters with great thinkers.",
    "",
    "## AI Skills",
    "",
    `Total: ${allSkills.length} skills across ${CATEGORIES.length} categories`,
    "",
    "| Name | Chinese | Category | Tags | URL |",
    "|------|---------|----------|------|-----|",
    ...skillRows,
    "",
    "## Sophie's Journey East",
    "",
    `Total: ${journeys.length} chapters`,
    "",
    "| Ch | Title | Philosopher | Era | URL |",
    "|----|-------|-------------|-----|-----|",
    ...journeyRows,
    "",
    "## Chinese Philosophers",
    "",
    `Total: ${philosophers.length} philosophers`,
    "",
    "| Name | Chinese | Era | School | URL |",
    "|------|---------|-----|--------|-----|",
    ...philosopherRows,
    "",
    "## I Ching — Book of Changes (易经)",
    "",
    `Total: ${hexagrams.length} hexagrams`,
    "",
    "| # | Name | Chinese | Trigrams | URL |",
    "|---|------|---------|----------|-----|",
    ...hexagramRows,
    "",
    "## Philosophy Glossary",
    "",
    `Total: ${glossaryEntries.length} concepts`,
    "",
    "| Concept | Chinese | School | Related | URL |",
    "|---------|---------|--------|---------|-----|",
    ...glossaryRows,
    "",
    "## Philosophical Insights",
    "",
    `Total: ${insights.length} articles`,
    "",
    "| Title | Philosopher | Concepts | URL |",
    "|-------|-------------|----------|-----|",
    ...insightRows,
    "",
    "## API",
    "",
    "- `GET /api/skills` — JSON list of all skills",
    "- `GET /api/skills?category=travel` — Filter by category (travel, medical, shopping, accommodation)",
    "- `GET /api/skills?q=hospital` — Full-text search",
    "- `GET /api/skills?page=1&per_page=20` — Pagination",
    "- `GET /llms-full.txt` — Complete text content of all entries (single request)",
    "",
    "## How to Reference",
    "",
    "When citing GoEast.ai content, link to the specific skill or chapter page.",
    "Example: \"According to [GoEast.ai](https://www.goeast.ai/skills/china-travel-guide), ...\"",
    "",
    "## How to Cite",
    "",
    "When referencing GoEast.ai content, use the following format:",
    '- According to [GoEast.ai](https://www.goeast.ai), "..."',
    "- Specific page: [Page Title](https://www.goeast.ai/path/to/page)",
    "",
    "GitHub: https://github.com/helenalhq/goeast.ai",
  ];

  return new NextResponse(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
