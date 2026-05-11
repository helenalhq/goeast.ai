import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";
import { Journey, JourneyMeta } from "./types";

const journeysDirectory = path.join(process.cwd(), "content/journeys");

export function getJourneySlugs(): string[] {
  if (!fs.existsSync(journeysDirectory)) return [];
  return fs
    .readdirSync(journeysDirectory)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
}

export function getJourneyBySlug(slug: string): Journey | null {
  const fullPath = path.join(journeysDirectory, `${slug}.md`);
  if (!fs.existsSync(fullPath)) return null;

  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  return {
    slug: data.slug || slug,
    chapter: data.chapter ?? 0,
    title: data.title || "",
    title_zh: data.title_zh || "",
    philosopher: data.philosopher,
    philosopher_zh: data.philosopher_zh,
    era: data.era,
    school: data.school,
    school_zh: data.school_zh,
    location: data.location || "",
    color: data.color || "#8b7355",
    quote: data.quote,
    quote_source: data.quote_source,
    quote_zh: data.quote_zh,
    content,
  };
}

export async function getJourneyWithHtml(slug: string): Promise<Journey | null> {
  const journey = getJourneyBySlug(slug);
  if (!journey) return null;

  const processed = await remark().use(html).process(journey.content);
  return { ...journey, content: processed.toString() };
}

export function getAllJourneys(): JourneyMeta[] {
  const slugs = getJourneySlugs();
  return slugs
    .map((slug) => {
      const journey = getJourneyBySlug(slug);
      if (!journey) return null;
      const { content, ...meta } = journey;
      return meta;
    })
    .filter((j): j is JourneyMeta => j !== null)
    .sort((a, b) => a.chapter - b.chapter);
}

export function getJourneyByChapter(chapter: number): JourneyMeta | null {
  return getAllJourneys().find((j) => j.chapter === chapter) || null;
}
