export type Category = "travel" | "medical" | "shopping" | "accommodation";

export interface SkillMeta {
  slug: string;
  title: string;
  title_zh: string;
  category: Category;
  tags: string[];
  source: string;
  source_url: string;
  skill_url: string;
  featured: boolean;
  updated_at: string;
}

export interface Skill extends SkillMeta {
  content: string;
}

export interface CategoryInfo {
  id: Category;
  name: string;
  name_zh: string;
  icon: string;
}

export const CATEGORIES: CategoryInfo[] = [
  { id: "travel", name: "Travel", name_zh: "旅游", icon: "✈️" },
  { id: "medical", name: "Medical", name_zh: "医疗", icon: "🏥" },
  { id: "shopping", name: "Shopping", name_zh: "购物", icon: "🛒" },
  { id: "accommodation", name: "Accommodation", name_zh: "住宿", icon: "🏠" },
];
