import { NextResponse } from "next/server";
import { CATEGORIES } from "@/lib/types";
import fs from "fs";
import path from "path";
import matter from "gray-matter";

export async function GET() {
  const skillsDir = path.join(process.cwd(), "content/skills");
  const journeysDir = path.join(process.cwd(), "content/journeys");

  const sections: string[] = [
    "# GoEast.ai — Full Content",
    "",
    "> Complete text content of all AI skills and journey chapters.",
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

  return new NextResponse(sections.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
