import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";
import { Insight, InsightMeta } from "./types";

const insightsDirectory = path.join(process.cwd(), "content/insights");

export function getInsightSlugs(): string[] {
  if (!fs.existsSync(insightsDirectory)) return [];
  return fs
    .readdirSync(insightsDirectory)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
}

export function getInsightBySlug(slug: string): Insight | null {
  const fullPath = path.join(insightsDirectory, `${slug}.md`);
  if (!fs.existsSync(fullPath)) return null;

  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  return {
    slug: data.slug || slug,
    title: data.title || "",
    title_zh: data.title_zh,
    philosopher_slug: data.philosopher_slug,
    concept_slugs: data.concept_slugs || [],
    published_at: data.published_at || "",
    content,
    content_zh: data.content_zh,
  };
}

export async function getInsightWithHtml(slug: string): Promise<Insight | null> {
  const insight = getInsightBySlug(slug);
  if (!insight) return null;

  const processed = await remark().use(html).process(insight.content);
  const processedZh = insight.content_zh
    ? (await remark().use(html).process(insight.content_zh)).toString()
    : undefined;

  return { ...insight, content: processed.toString(), content_zh: processedZh };
}

export function getAllInsights(): InsightMeta[] {
  return getInsightSlugs()
    .map((slug) => {
      const insight = getInsightBySlug(slug);
      if (!insight) return null;
      const { content, content_zh, ...meta } = insight;
      return meta;
    })
    .filter((i): i is InsightMeta => i !== null);
}
