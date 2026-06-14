import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";
import { GlossaryEntry, GlossaryEntryMeta } from "./types";

const glossaryDirectory = path.join(process.cwd(), "content/glossary");

export function getGlossarySlugs(): string[] {
  if (!fs.existsSync(glossaryDirectory)) return [];
  return fs
    .readdirSync(glossaryDirectory)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
}

export function getGlossaryBySlug(slug: string): GlossaryEntry | null {
  const fullPath = path.join(glossaryDirectory, `${slug}.md`);
  if (!fs.existsSync(fullPath)) return null;

  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  return {
    slug: data.slug || slug,
    name: data.name || "",
    name_zh: data.name_zh || "",
    school: data.school || "",
    school_zh: data.school_zh,
    related_concepts: data.related_concepts || [],
    definition: content,
    definition_zh: data.definition_zh,
    modern_application: data.modern_application || "",
    modern_application_zh: data.modern_application_zh,
  };
}

export async function getGlossaryWithHtml(slug: string): Promise<GlossaryEntry | null> {
  const entry = getGlossaryBySlug(slug);
  if (!entry) return null;

  const processed = await remark().use(html).process(entry.definition);
  const processedZh = entry.definition_zh
    ? (await remark().use(html).process(entry.definition_zh)).toString()
    : undefined;
  const processedModern = entry.modern_application
    ? (await remark().use(html).process(entry.modern_application)).toString()
    : "";
  const processedModernZh = entry.modern_application_zh
    ? (await remark().use(html).process(entry.modern_application_zh)).toString()
    : undefined;

  return {
    ...entry,
    definition: processed.toString(),
    definition_zh: processedZh,
    modern_application: processedModern,
    modern_application_zh: processedModernZh,
  };
}

export function getAllGlossary(): GlossaryEntryMeta[] {
  return getGlossarySlugs()
    .map((slug) => {
      const entry = getGlossaryBySlug(slug);
      if (!entry) return null;
      const { definition, definition_zh, modern_application, modern_application_zh, ...meta } = entry;
      return meta;
    })
    .filter((e): e is GlossaryEntryMeta => e !== null);
}
