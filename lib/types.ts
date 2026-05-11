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

export interface JourneyMeta {
  slug: string;
  chapter: number;
  title: string;
  title_zh: string;
  philosopher?: string;
  philosopher_zh?: string;
  era?: string;
  school?: string;
  school_zh?: string;
  location: string;
  color: string;
  quote?: string;
  quote_source?: string;
  quote_zh?: string;
}

export interface Journey extends JourneyMeta {
  content: string;
}

export interface SchoolInfo {
  id: string;
  name: string;
  name_zh: string;
  color: string;
  symbol: string;
}

export const SCHOOLS: SchoolInfo[] = [
  { id: "ancient", name: "Ancient Civilization", name_zh: "上古文明", color: "#8b4513", symbol: "卦" },
  { id: "daoism", name: "Daoism", name_zh: "道家", color: "#2d5016", symbol: "☯" },
  { id: "confucianism", name: "Confucianism", name_zh: "儒家", color: "#8b0000", symbol: "仁" },
  { id: "strategy", name: "Strategy", name_zh: "兵家", color: "#4a4a4a", symbol: "⚔" },
  { id: "mohism", name: "Mohism", name_zh: "墨家", color: "#1a5276", symbol: "✦" },
  { id: "neo-confucianism", name: "Neo-Confucianism", name_zh: "理学", color: "#6c3483", symbol: "理" },
  { id: "zen", name: "Zen Buddhism", name_zh: "禅宗", color: "#d4a017", symbol: "禅" },
  { id: "mind-school", name: "School of Mind", name_zh: "心学", color: "#c0392b", symbol: "心" },
];
