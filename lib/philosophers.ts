import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";
import { PhilosopherDeep, PhilosopherMeta, PHILOSOPHER_SLUGS, SCHOOLS } from "./types";

const philosophersDirectory = path.join(process.cwd(), "content/philosophers");

export function getPhilosopherSlugs(): string[] {
  return Object.keys(PHILOSOPHER_SLUGS);
}

export function getPhilosopherBySlug(slug: string): PhilosopherDeep | null {
  const meta = PHILOSOPHER_SLUGS[slug];
  if (!meta) return null;

  const fullPath = path.join(philosophersDirectory, `${slug}.md`);
  if (!fs.existsSync(fullPath)) {
    // Return philosopher with empty content fields if markdown file doesn't exist yet
    return {
      ...meta,
      school_zh: SCHOOLS.find((s) => s.id === meta.school)?.name_zh,
      biography: "",
      core_concepts: [],
      quotes: [],
      modern_influence: "",
    };
  }

  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  return {
    ...meta,
    school_zh: data.school_zh || SCHOOLS.find((s) => s.id === meta.school)?.name_zh,
    biography: data.biography || content,
    biography_zh: data.biography_zh,
    core_concepts: data.core_concepts || [],
    quotes: data.quotes || [],
    modern_influence: data.modern_influence || "",
    modern_influence_zh: data.modern_influence_zh,
    journey_slug: data.journey_slug,
  };
}

export async function getPhilosopherWithHtml(slug: string): Promise<PhilosopherDeep | null> {
  const philosopher = getPhilosopherBySlug(slug);
  if (!philosopher) return null;

  const processedBiography = philosopher.biography
    ? (await remark().use(html).process(philosopher.biography)).toString()
    : "";

  const processedBiographyZh = philosopher.biography_zh
    ? (await remark().use(html).process(philosopher.biography_zh)).toString()
    : undefined;

  const processedModernInfluence = philosopher.modern_influence
    ? (await remark().use(html).process(philosopher.modern_influence)).toString()
    : "";

  const processedModernInfluenceZh = philosopher.modern_influence_zh
    ? (await remark().use(html).process(philosopher.modern_influence_zh)).toString()
    : undefined;

  return {
    ...philosopher,
    biography: processedBiography,
    biography_zh: processedBiographyZh,
    modern_influence: processedModernInfluence,
    modern_influence_zh: processedModernInfluenceZh,
  };
}

export function getAllPhilosophers(): PhilosopherMeta[] {
  return Object.values(PHILOSOPHER_SLUGS);
}
