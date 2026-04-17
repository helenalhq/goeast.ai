import { NextResponse } from "next/server";
import { getAllSkills, getFeaturedSkills } from "@/lib/skills";
import { CATEGORIES } from "@/lib/types";

export async function GET() {
  const allSkills = getAllSkills();
  const featured = getFeaturedSkills();

  const lines: string[] = [
    "# GoEast.ai",
    "# Curated AI Skills for foreigners coming to China",
    `# Categories: ${CATEGORIES.map((c) => c.name).join(", ")}`,
    "",
    "## Quick Access",
    "- All skills (JSON): /api/skills",
    ...CATEGORIES.map((c) => `- Skills by category: /api/skills?category=${c.id}`),
    "- Individual skill: /skills/{slug}",
    "",
    "## Stats",
    `- Total skills: ${allSkills.length}`,
    ...CATEGORIES.map((c) => `- ${c.name}: ${allSkills.filter((s) => s.category === c.id).length}`),
    "",
    "## Featured Skills",
    ...featured.map((s) => `- [${s.category}] ${s.title}: /skills/${s.slug}`),
    "",
    "## All Skills",
    ...allSkills.map((s) => `- [${s.category}] ${s.title} | ${s.title_zh}: /skills/${s.slug}`),
  ];

  return new NextResponse(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
