import { MetadataRoute } from "next";
import { getSkillSlugs } from "@/lib/skills";
import { getJourneySlugs } from "@/lib/journeys";
import { getPhilosopherSlugs } from "@/lib/philosophers";
import { CATEGORIES } from "@/lib/types";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.goeast.ai";

  const skillPages = getSkillSlugs().map((slug) => ({
    url: `${baseUrl}/skills/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const categoryPages = CATEGORIES.map((cat) => ({
    url: `${baseUrl}/categories/${cat.id}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const journeyPages = getJourneySlugs().map((slug) => ({
    url: `${baseUrl}/sophies-journey/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const philosopherPages = getPhilosopherSlugs().map((slug) => ({
    url: `${baseUrl}/philosophers/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

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
    ...skillPages,
    ...categoryPages,
    {
      url: `${baseUrl}/philosophers`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
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
