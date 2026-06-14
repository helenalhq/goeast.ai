import { NextResponse } from "next/server";
import { CATEGORIES, SCHOOLS } from "@/lib/types";
import { getPhilosopherSlugs, getPhilosopherBySlug } from "@/lib/philosophers";
import { getAllHexagrams } from "@/lib/iching-data";
import { getGlossarySlugs, getGlossaryBySlug } from "@/lib/glossary";
import { getInsightSlugs, getInsightBySlug } from "@/lib/insights";
import fs from "fs";
import path from "path";
import matter from "gray-matter";

export async function GET() {
  const skillsDir = path.join(process.cwd(), "content/skills");
  const journeysDir = path.join(process.cwd(), "content/journeys");

  const sections: string[] = [
    "# GoEast.ai — Full Content",
    "",
    "> Complete text content of all AI skills, journey chapters, philosophers, I Ching hexagrams, glossary entries, and philosophical insights.",
    "> Generated for AI agents and crawlers.",
    "",
  ];

  // Skills section
  sections.push("## AI Skills\n");
  const skillFiles = fs
    .readdirSync(skillsDir)
    .filter((f) => f.endsWith(".md"))
    .sort();

  for (const file of skillFiles) {
    const raw = fs.readFileSync(path.join(skillsDir, file), "utf8");
    const { data, content } = matter(raw);
    const catInfo = CATEGORIES.find((c) => c.id === data.category);
    sections.push(`### ${data.title} / ${data.title_zh}`);
    sections.push(`- Category: ${catInfo?.name || data.category}`);
    sections.push(`- Tags: ${(data.tags || []).join(", ")}`);
    sections.push(`- URL: https://www.goeast.ai/skills/${data.slug}`);
    sections.push(`- Source: ${data.source}`);
    if (data.skill_url) {
      sections.push(`- Install: ${data.skill_url}`);
    }
    sections.push("");
    sections.push(content.trim());
    sections.push("");
  }

  // Journeys section
  sections.push("## Sophie's Journey East\n");
  const journeyFiles = fs
    .readdirSync(journeysDir)
    .filter((f) => f.endsWith(".md"))
    .sort();

  for (const file of journeyFiles) {
    const raw = fs.readFileSync(path.join(journeysDir, file), "utf8");
    const { data, content } = matter(raw);
    const chLabel =
      data.chapter === 0
        ? "Prologue"
        : data.chapter === 11
        ? "Epilogue"
        : `Chapter ${data.chapter}`;
    sections.push(`### ${chLabel}: ${data.title} / ${data.title_zh}`);
    if (data.philosopher) {
      sections.push(`- Philosopher: ${data.philosopher} ${data.philosopher_zh || ""}`);
    }
    if (data.era) sections.push(`- Era: ${data.era}`);
    if (data.school) sections.push(`- School: ${data.school} · ${data.school_zh || ""}`);
    sections.push(`- Location: ${data.location}`);
    sections.push(`- URL: https://www.goeast.ai/sophies-journey/${data.slug}`);
    if (data.quote) {
      sections.push(`- Quote: "${data.quote}" — ${data.quote_source || ""}`);
    }
    sections.push("");
    sections.push(content.trim());
    if (data.content_zh) {
      sections.push("");
      sections.push("#### 中文版");
      sections.push("");
      sections.push(String(data.content_zh).trim());
    }
    sections.push("");
  }

  // Philosophers section
  const philosopherSlugs = getPhilosopherSlugs();
  sections.push("## Chinese Philosophers (Deep Profiles)\n");
  sections.push(`Total: ${philosopherSlugs.length} philosophers\n`);

  for (const slug of philosopherSlugs) {
    const philosopher = getPhilosopherBySlug(slug);
    if (!philosopher) continue;

    sections.push(`### ${philosopher.name} / ${philosopher.name_zh}`);
    sections.push(`- Era: ${philosopher.era}${philosopher.era_zh ? ` (${philosopher.era_zh})` : ""}`);
    const schoolInfo = SCHOOLS.find((s) => s.id === philosopher.school);
    sections.push(`- School: ${schoolInfo?.name || philosopher.school} · ${philosopher.school_zh || ""}`);
    if (philosopher.location) {
      sections.push(`- Location: ${philosopher.location}${philosopher.location_zh ? ` (${philosopher.location_zh})` : ""}`);
    }
    sections.push(`- URL: https://www.goeast.ai/philosophers/${philosopher.slug}`);

    if (philosopher.core_concepts && philosopher.core_concepts.length > 0) {
      sections.push("");
      sections.push("**Core Concepts:**");
      for (const concept of philosopher.core_concepts) {
        sections.push(`- ${concept.name} / ${concept.name_zh}: ${concept.description}`);
      }
    }

    if (philosopher.quotes && philosopher.quotes.length > 0) {
      sections.push("");
      sections.push("**Notable Quotes:**");
      for (const q of philosopher.quotes) {
        sections.push(`- "${q.text}"${q.text_zh ? ` (${q.text_zh})` : ""} — ${q.source}`);
        if (q.interpretation) {
          sections.push(`  Interpretation: ${q.interpretation}`);
        }
      }
    }

    if (philosopher.modern_influence) {
      sections.push("");
      sections.push("**Modern Influence:**");
      sections.push(philosopher.modern_influence.trim());
    }

    if (philosopher.journey_slug) {
      sections.push("");
      sections.push(`Journey chapter: https://www.goeast.ai/sophies-journey/${philosopher.journey_slug}`);
    }

    sections.push("");
  }

  // I Ching section
  const hexagrams = getAllHexagrams();
  sections.push("## I Ching — Book of Changes (易经)\n");
  sections.push(`Total: ${hexagrams.length} hexagrams\n`);

  for (const hex of hexagrams) {
    sections.push(`### Hexagram ${hex.number}: ${hex.name} / ${hex.name_zh}`);
    sections.push(`- Upper Trigram: ${hex.upper_trigram}`);
    sections.push(`- Lower Trigram: ${hex.lower_trigram}`);
    sections.push(`- URL: https://www.goeast.ai/iching/${hex.slug}`);
    sections.push("");
    sections.push("**Judgment:**");
    sections.push(hex.judgment_en);
    sections.push(`(${hex.judgment_zh})`);
    sections.push("");
    sections.push("**Image:**");
    sections.push(hex.image_en);
    sections.push(`(${hex.image_zh})`);
    if (hex.modern_application) {
      sections.push("");
      sections.push("**Modern Application:**");
      sections.push(hex.modern_application);
    }
    sections.push("");
  }

  // Glossary section
  const glossarySlugs = getGlossarySlugs();
  sections.push("## Philosophy Glossary (哲学词汇表)\n");
  sections.push(`Total: ${glossarySlugs.length} concepts\n`);

  for (const slug of glossarySlugs) {
    const entry = getGlossaryBySlug(slug);
    if (!entry) continue;

    sections.push(`### ${entry.name} / ${entry.name_zh}`);
    sections.push(`- School: ${entry.school}${entry.school_zh ? ` · ${entry.school_zh}` : ""}`);
    sections.push(`- URL: https://www.goeast.ai/glossary/${entry.slug}`);

    if (entry.definition) {
      sections.push("");
      sections.push("**Definition:**");
      const defExcerpt = entry.definition.slice(0, 200).trim();
      sections.push(defExcerpt + (entry.definition.length > 200 ? "..." : ""));
    }

    if (entry.modern_application) {
      sections.push("");
      sections.push("**Modern Application:**");
      const appExcerpt = entry.modern_application.slice(0, 200).trim();
      sections.push(appExcerpt + (entry.modern_application.length > 200 ? "..." : ""));
    }

    if (entry.related_concepts && entry.related_concepts.length > 0) {
      sections.push("");
      sections.push(`**Related concepts:** ${entry.related_concepts.join(", ")}`);
    }

    sections.push("");
  }

  // Insights section
  const insightSlugs = getInsightSlugs();
  sections.push("## Philosophical Insights (哲学洞见)\n");
  sections.push(`Total: ${insightSlugs.length} articles\n`);

  for (const slug of insightSlugs) {
    const insight = getInsightBySlug(slug);
    if (!insight) continue;

    sections.push(`### ${insight.title}${insight.title_zh ? ` / ${insight.title_zh}` : ""}`);
    if (insight.philosopher_slug) {
      sections.push(`- Philosopher: ${insight.philosopher_slug}`);
    }
    if (insight.published_at) {
      sections.push(`- Published: ${insight.published_at}`);
    }
    if (insight.concept_slugs && insight.concept_slugs.length > 0) {
      sections.push(`- Key concepts: ${insight.concept_slugs.join(", ")}`);
    }
    sections.push(`- URL: https://www.goeast.ai/insights/${insight.slug}`);
    sections.push("");
    sections.push(insight.content.trim());
    sections.push("");
  }

  return new NextResponse(sections.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
