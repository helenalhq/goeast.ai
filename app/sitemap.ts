import { MetadataRoute } from "next";
import { getSkillSlugs, getSkillBySlug } from "@/lib/skills";
import { getJourneySlugs } from "@/lib/journeys";
import { getPhilosopherSlugs } from "@/lib/philosophers";
import { CATEGORIES } from "@/lib/types";
import { getAllHexagrams } from "@/lib/iching-data";
import { getGlossarySlugs } from "@/lib/glossary";
import { getInsightSlugs, getInsightBySlug } from "@/lib/insights";
import { getAllStars, getAllPalaces } from "@/lib/ziwei-data";
import fs from "fs";
import path from "path";

/** Get the last modified date for a content file, with optional frontmatter date override */
function getContentDate(slug: string, dir: string, frontmatterDate?: string): Date {
  if (frontmatterDate) {
    const parsed = new Date(frontmatterDate);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  const filePath = path.join(process.cwd(), "content", dir, `${slug}.md`);
  if (fs.existsSync(filePath)) {
    return fs.statSync(filePath).mtime;
  }
  return new Date();
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.goeast.ai";

  const skillPages = getSkillSlugs().map((slug) => {
    const skill = getSkillBySlug(slug);
    return {
      url: `${baseUrl}/skills/${slug}`,
      lastModified: getContentDate(slug, "skills", skill?.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    };
  });

  const categoryPages = CATEGORIES.map((cat) => ({
    url: `${baseUrl}/categories/${cat.id}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const journeyPages = getJourneySlugs().map((slug) => ({
    url: `${baseUrl}/sophies-journey/${slug}`,
    lastModified: getContentDate(slug, "journeys"),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const philosopherPages = getPhilosopherSlugs().map((slug) => ({
    url: `${baseUrl}/philosophers/${slug}`,
    lastModified: getContentDate(slug, "philosophers"),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const ichingHexagramPages = getAllHexagrams().map((h) => ({
    url: `${baseUrl}/iching/${h.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const ziweiStarPages = getAllStars().map((s) => ({
    url: `${baseUrl}/ziwei/stars/${s.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const ziweiPalacePages = getAllPalaces().map((p) => ({
    url: `${baseUrl}/ziwei/palaces/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const glossaryPages = getGlossarySlugs().map((slug) => ({
    url: `${baseUrl}/glossary/${slug}`,
    lastModified: getContentDate(slug, "glossary"),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const insightPages = getInsightSlugs().map((slug) => {
    const insight = getInsightBySlug(slug);
    return {
      url: `${baseUrl}/insights/${slug}`,
      lastModified: getContentDate(slug, "insights", insight?.published_at),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    };
  });

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/sophies-journey`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/skills`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    ...journeyPages,
    ...philosopherPages,
    ...ichingHexagramPages,
    ...ziweiStarPages,
    ...ziweiPalacePages,
    ...glossaryPages,
    ...insightPages,
    ...skillPages,
    ...categoryPages,
    {
      url: `${baseUrl}/philosophers`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/iching`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/ziwei`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/ziwei/stars`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/ziwei/palaces`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/glossary`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/insights`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/submit`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];
}
