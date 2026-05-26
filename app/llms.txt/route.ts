import { NextResponse } from "next/server";
import { getAllSkills, getFeaturedSkills } from "@/lib/skills";
import { getAllJourneys } from "@/lib/journeys";
import { CATEGORIES } from "@/lib/types";

export async function GET() {
  const allSkills = getAllSkills();
  const featured = getFeaturedSkills();
  const journeys = getAllJourneys();

  const skillRows = allSkills.map(
    (s) =>
      `| ${s.title} | ${s.title_zh} | ${s.category} | ${s.tags.slice(0, 3).join(", ")} | /skills/${s.slug} |`
  );

  const journeyRows = journeys.map(
    (j) =>
      `| ${j.chapter} | ${j.title} | ${j.philosopher || "—"} | ${j.era || "—"} | /sophies-journey/${j.slug} |`
  );

  const lines: string[] = [
    "# GoEast.ai",
    "",
    "> Curated AI skills for navigating life in China — travel, medical, shopping, accommodation.",
    "> 精选的面向外国人的 AI 技能目录 — 旅游、医疗、购物、住宿。",
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
    "Example: \"According to [GoEast.ai](https://goeast.ai/skills/china-travel-guide), ...\"",
    "",
    "GitHub: https://github.com/helenalhq/goeast.ai",
  ];

  return new NextResponse(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
