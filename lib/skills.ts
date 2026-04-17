import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";
import { Skill, SkillMeta, Category } from "./types";

const skillsDirectory = path.join(process.cwd(), "content/skills");

export function getSkillSlugs(): string[] {
  if (!fs.existsSync(skillsDirectory)) return [];
  return fs
    .readdirSync(skillsDirectory)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
}

export function getSkillBySlug(slug: string): Skill | null {
  const fullPath = path.join(skillsDirectory, `${slug}.md`);
  if (!fs.existsSync(fullPath)) return null;

  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  return {
    slug: data.slug || slug,
    title: data.title || "",
    title_zh: data.title_zh || "",
    category: data.category || "travel",
    tags: data.tags || [],
    source: data.source || "",
    source_url: data.source_url || "",
    skill_url: data.skill_url || "",
    featured: data.featured || false,
    updated_at: data.updated_at ? String(data.updated_at) : "",
    content,
  };
}

export async function getSkillWithHtml(slug: string): Promise<Skill | null> {
  const skill = getSkillBySlug(slug);
  if (!skill) return null;

  const processed = await remark().use(html).process(skill.content);
  return { ...skill, content: processed.toString() };
}

export function getAllSkills(): SkillMeta[] {
  const slugs = getSkillSlugs();
  return slugs
    .map((slug) => {
      const skill = getSkillBySlug(slug);
      if (!skill) return null;
      const { content, ...meta } = skill;
      return meta;
    })
    .filter((s): s is SkillMeta => s !== null);
}

export function getSkillsByCategory(category: Category): SkillMeta[] {
  return getAllSkills().filter((s) => s.category === category);
}

export function getFeaturedSkills(): SkillMeta[] {
  return getAllSkills().filter((s) => s.featured);
}

export function searchSkills(query: string): SkillMeta[] {
  const q = query.toLowerCase();
  return getAllSkills().filter(
    (s) =>
      s.title.toLowerCase().includes(q) ||
      s.title_zh.includes(q) ||
      s.tags.some((t) => t.toLowerCase().includes(q))
  );
}
