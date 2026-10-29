import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";
import remarkGfm from "remark-gfm";
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
    // gray-matter parses unquoted YAML dates as Date objects — coerce to ISO string
    published_at: typeof data.published_at === "string" ? data.published_at : data.published_at?.toISOString?.() || "",
    updated_at: typeof data.updated_at === "string" ? data.updated_at : data.updated_at?.toISOString?.() || undefined,
    takeaways: Array.isArray(data.takeaways) ? data.takeaways : undefined,
    faqs: Array.isArray(data.faqs) ? data.faqs : undefined,
    how_to: data.how_to && typeof data.how_to === "object" && Array.isArray(data.how_to.steps) ? data.how_to : undefined,
    content,
    content_zh: data.content_zh,
  };
}

/**
 * The article page renders its own H1 from the frontmatter title; strip a
 * leading body H1 when it duplicates that title so pages never get two.
 */
export function stripDuplicateTitleH1(content: string, title: string): string {
  const match = content.match(/^\s*#\s+(.+?)\s*(?:\n|$)/);
  if (!match) return content;
  const bodyH1 = match[1].trim().replace(/^["“'](.*)["”']$/, "$1");
  if (bodyH1.toLowerCase() === title.trim().toLowerCase()) {
    return content.slice(match[0].length);
  }
  return content;
}

export async function getInsightWithHtml(slug: string): Promise<Insight | null> {
  const insight = getInsightBySlug(slug);
  if (!insight) return null;

  const bodyMarkdown = stripDuplicateTitleH1(insight.content, insight.title);
  const processed = await remark().use(remarkGfm).use(html).process(bodyMarkdown);
  const processedZh = insight.content_zh
    ? (await remark().use(remarkGfm).use(html).process(insight.content_zh)).toString()
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
    .filter((i): i is InsightMeta => i !== null)
    .sort((a, b) => {
      const aTime = Number.isNaN(Date.parse(a.published_at)) ? 0 : Date.parse(a.published_at);
      const bTime = Number.isNaN(Date.parse(b.published_at)) ? 0 : Date.parse(b.published_at);
      if (bTime !== aTime) return bTime - aTime;
      return a.slug.localeCompare(b.slug);
    });
}
