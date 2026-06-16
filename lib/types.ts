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
  content_zh?: string;
}

export interface PhilosopherMeta {
  slug: string;
  name: string;
  name_zh: string;
  era: string;
  era_zh?: string;
  school: string;
  school_zh?: string;
  location?: string;
  location_zh?: string;
  portrait_slug?: string;
}

export interface PhilosopherDeep extends PhilosopherMeta {
  biography: string;
  biography_zh?: string;
  core_concepts: { name: string; name_zh: string; description: string; description_zh?: string }[];
  quotes: { text: string; text_zh?: string; source: string; source_zh?: string; interpretation?: string; interpretation_zh?: string }[];
  modern_influence: string;
  modern_influence_zh?: string;
  journey_slug?: string;
}

export interface SchoolInfo {
  id: string;
  name: string;
  name_zh: string;
  color: string;
  symbol: string;
}

const PHILOSOPHER_IMAGES: Record<string, string> = {
  "prologue-zhougong": "zhougong",
  "ch01-laozi": "laozi",
  "ch02-confucius": "confucius",
  "ch03-sunzi": "sunzi",
  "ch04-zhuangzi": "zhuangzi",
  "ch05-mencius": "mencius",
  "ch06-mozi": "mozi",
  "ch07-zhuxi": "zhuxi",
  "ch08-zhangzai": "zhangzai",
  "ch09-huineng": "huineng",
  "ch10-wangyangming": "wangyangming",
};

export function getPhilosopherImage(slug: string): string | null {
  return PHILOSOPHER_IMAGES[slug] ? `/images/${PHILOSOPHER_IMAGES[slug]}.png` : null;
}

export function getOraclePortrait(slug: string): string | null {
  return PHILOSOPHER_IMAGES[slug] ? `/images/oracle/${PHILOSOPHER_IMAGES[slug]}.png` : null;
}

const PHILOSOPHER_INTROS: Record<string, string> = {
  "prologue-zhougong":
    "I am the Duke of Zhou. In the 11th century BCE, I helped establish the rites and music that would become the foundation of Chinese civilization for three thousand years. I am known as the interpreter of dreams, but what I truly read is the language of change itself. The I Ching, the Book of Changes, encodes every transformation in the universe within its broken and unbroken lines. You have come a long way, Sophie. Let me cast the yarrow stalks and see what the oracle says about your journey.",
  "ch01-laozi":
    "I am Laozi, the Old Master. I once kept the archives of the Zhou dynasty, and in that silence I watched every empire rise and fall. I wrote the Tao Te Ching, five thousand characters that say only one thing: the Tao that can be told is not the eternal Tao. The highest good is like water, which benefits all things and does not compete. You ask me how to live? Let go. The soft overcomes the hard. The empty is more useful than the full. Wu wei, doing nothing, leaves nothing undone.",
  "ch02-confucius":
    "I am Kong Qiu of Lu. I spent my life wandering from state to state, seeking a ruler who would practice benevolence. I edited the Book of Songs, the Book of History, the Book of Rites, and the Spring and Autumn Annals. I had three thousand students and seventy-two disciples. My teaching comes down to two words: ren and li. Ren is humaneness, the seed of goodness in every heart. Li is ritual, the shape that gives goodness form. Is it not a joy to learn and to practice what you have learned?",
  "ch03-sunzi":
    "I am Sun Wu of Qi, later serving the state of Wu. They call me the Sage of War, but what I wrote in The Art of War is not about glorifying battle. It is about ending it. Thirteen chapters, six thousand characters, and the core message is this: know yourself and know your enemy, and you will never be defeated. The supreme art of war is to subdue the opponent without fighting. The greatest victory is the one no one notices.",
  "ch04-zhuangzi":
    "I am Zhuang Zhou of Meng. People say I am a dreamer, and they are right. I dreamed I was a butterfly, fluttering freely, with no thought of being Zhuang Zhou. When I woke, I could not tell: was I Zhuang Zhou dreaming I was a butterfly, or a butterfly now dreaming I am Zhuang Zhou? I wrote to celebrate freedom, the kind that cannot be captured by rules or rituals. The fish trap exists because of the fish. Once you have the meaning, let go of the words.",
  "ch05-mencius":
    "I am Meng Ke of Zou. They call me the Second Sage. I inherited the teachings of Confucius and took them further. My central conviction: human nature is fundamentally good. Every person carries within them the seeds of compassion, shame, respect, and the sense of right and wrong. These sprouts need cultivation, that is all. The people are the most important, the state comes next, and the ruler is the least. My life's work is to help every heart rediscover its own goodness.",
  "ch06-mozi":
    "I am Mo Di. Some call me Mozi. I am a craftsman and a philosopher. I taught jian ai, universal love, the radical idea that you should care for everyone's family as much as your own. I also taught fei gong, opposition to offensive warfare. My followers were the finest engineers in the ancient world. We built fortifications not to conquer cities but to defend them. Universal love and mutual benefit: this is the path to peace.",
  "ch07-zhuxi":
    "I am Zhu Xi of Wuyuan. They call me the great synthesizer of Neo-Confucianism. I spent my life on one practice: ge wu zhi zhi, the investigation of things. Every blade of grass, every stream, every bamboo stalk contains within it a principle, and by examining one thing thoroughly you can begin to grasp the principle of all things. I annotated the Four Books and compiled the Jinsilu. Knowledge must precede action, but action must follow, or the knowledge is hollow.",
  "ch08-zhangzai":
    "I am Zhang Zai of Guanzhong, known as Master Hengqu. I began life wanting to be a general, but a wiser man redirected me toward philosophy. I proposed that all of reality is qi, the vital energy that flows through stars and soil, rivers and mountains, the living and the dead, you and me. I made four vows that define my life: to set my heart for heaven and earth, to establish destiny for the people, to continue the lost learning of past sages, and to open peace for ten thousand generations.",
  "ch09-huineng":
    "I am Huineng of Lingnan, a woodcutter who could not read. Yet I received the robe and bowl of the Fifth Patriarch and became the Sixth Patriarch of Zen. My verse won the dharma: Bodhi has no tree, the mirror has no stand. Originally there is not a single thing, so where could dust gather? True practice is not sitting in meditation or chanting sutras. It is awareness in this very moment. You ask what is Zen? Go drink tea.",
  "ch10-wangyangming":
    "I am Wang Shouren, known as Yangming. In my youth I sat before bamboo for seven days trying to discover its principle, and only found illness. Later I was beaten, imprisoned, and exiled to Longchang, the edge of the empire. There, in that ruin, facing death, I had a breakthrough: knowledge and action are one. To know and not to act is not truly to know. The mind itself is principle. This is not theory. It is something I lived, suffered, and proved with my entire life.",
};

export function getPhilosopherIntro(slug: string): string | null {
  return PHILOSOPHER_INTROS[slug] || null;
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

export const PHILOSOPHER_SLUGS: Record<string, PhilosopherMeta> = {
  "zhou-gong": { slug: "zhou-gong", name: "Zhou Gong", name_zh: "周公", era: "11th century BCE", era_zh: "公元前11世纪", school: "ancient", school_zh: "上古文明", portrait_slug: "prologue-zhougong" },
  "laozi": { slug: "laozi", name: "Laozi", name_zh: "老子", era: "6th century BCE", era_zh: "公元前6世纪", school: "daoism", school_zh: "道家", location: "State of Chu", location_zh: "楚国", portrait_slug: "ch01-laozi" },
  "confucius": { slug: "confucius", name: "Confucius", name_zh: "孔子", era: "551–479 BCE", era_zh: "公元前551–479年", school: "confucianism", school_zh: "儒家", location: "State of Lu", location_zh: "鲁国", portrait_slug: "ch02-confucius" },
  "sunzi": { slug: "sunzi", name: "Sunzi", name_zh: "孙子", era: "544–496 BCE", era_zh: "公元前544–496年", school: "strategy", school_zh: "兵家", portrait_slug: "ch03-sunzi" },
  "zhuangzi": { slug: "zhuangzi", name: "Zhuangzi", name_zh: "庄子", era: "4th century BCE", era_zh: "公元前4世纪", school: "daoism", school_zh: "道家", portrait_slug: "ch04-zhuangzi" },
  "mencius": { slug: "mencius", name: "Mencius", name_zh: "孟子", era: "372–289 BCE", era_zh: "公元前372–289年", school: "confucianism", school_zh: "儒家", portrait_slug: "ch05-mencius" },
  "mozi": { slug: "mozi", name: "Mozi", name_zh: "墨子", era: "470–391 BCE", era_zh: "公元前470–391年", school: "mohism", school_zh: "墨家", portrait_slug: "ch06-mozi" },
  "zhu-xi": { slug: "zhu-xi", name: "Zhu Xi", name_zh: "朱熹", era: "1130–1200 CE", era_zh: "1130–1200年", school: "neo-confucianism", school_zh: "理学", location: "Wuyuan", location_zh: "婺源", portrait_slug: "ch07-zhuxi" },
  "zhang-zai": { slug: "zhang-zai", name: "Zhang Zai", name_zh: "张载", era: "1020–1077 CE", era_zh: "1020–1077年", school: "neo-confucianism", school_zh: "理学", location: "Guanzhong", location_zh: "关中", portrait_slug: "ch08-zhangzai" },
  "huineng": { slug: "huineng", name: "Huineng", name_zh: "慧能", era: "638–713 CE", era_zh: "638–713年", school: "zen", school_zh: "禅宗", location: "Lingnan", location_zh: "岭南", portrait_slug: "ch09-huineng" },
  "wang-yangming": { slug: "wang-yangming", name: "Wang Yangming", name_zh: "王阳明", era: "1472–1529 CE", era_zh: "1472–1529年", school: "mind-school", school_zh: "心学", location: "Yuyao", location_zh: "余姚", portrait_slug: "ch10-wangyangming" },
};

export function getPhilosopherMeta(slug: string): PhilosopherMeta | null {
  return PHILOSOPHER_SLUGS[slug] || null;
}

export function getAllPhilosopherMetas(): PhilosopherMeta[] {
  return Object.values(PHILOSOPHER_SLUGS);
}

export interface TrigramInfo {
  name: string;
  name_zh: string;
  symbol: string;
  nature: string;
  nature_zh: string;
  attribute: string;
  attribute_zh: string;
  image: string;
  image_zh: string;
  binary: string; // e.g. "111" for ☰ Qian
}

export const TRIGRAMS: TrigramInfo[] = [
  { name: "Qian", name_zh: "乾", symbol: "☰", nature: "Heaven", nature_zh: "天", attribute: "Creative, Strong", attribute_zh: "刚健", image: "Dragon, Sky", image_zh: "龙、天", binary: "111" },
  { name: "Kun", name_zh: "坤", symbol: "☷", nature: "Earth", nature_zh: "地", attribute: "Receptive, Yielding", attribute_zh: "柔顺", image: "Field, Mother", image_zh: "田、母", binary: "000" },
  { name: "Zhen", name_zh: "震", symbol: "☳", nature: "Thunder", nature_zh: "雷", attribute: "Inciting, Movement", attribute_zh: "动", image: "Horse, Lightning", image_zh: "马、电", binary: "100" },
  { name: "Xun", name_zh: "巽", symbol: "☴", nature: "Wind", nature_zh: "风", attribute: "Gentle, Penetrating", attribute_zh: "入", image: "Tree, Penetration", image_zh: "木、入", binary: "011" },
  { name: "Kan", name_zh: "坎", symbol: "☵", nature: "Water", nature_zh: "水", attribute: "Abysmal, Dangerous", attribute_zh: "险", image: "Rain, River", image_zh: "雨、河", binary: "010" },
  { name: "Li", name_zh: "离", symbol: "☲", nature: "Fire", nature_zh: "火", attribute: "Clinging, Light", attribute_zh: "明", image: "Sun, Bird", image_zh: "日、鸟", binary: "101" },
  { name: "Gen", name_zh: "艮", symbol: "☶", nature: "Mountain", nature_zh: "山", attribute: "Keeping Still, Resting", attribute_zh: "止", image: "Dog, Boundary", image_zh: "狗、边界", binary: "001" },
  { name: "Dui", name_zh: "兑", symbol: "☱", nature: "Lake", nature_zh: "泽", attribute: "Joyous, Open", attribute_zh: "悦", image: "Sheep, Marsh", image_zh: "羊、泽", binary: "110" },
];

export interface HexagramData {
  number: number;
  name: string;
  name_zh: string;
  slug: string;
  upper_trigram: string; // Trigram name
  lower_trigram: string;
  binary: string; // 6-digit binary, e.g. "111111" for Qian
  judgment_en: string;
  judgment_zh: string;
  image_en: string;
  image_zh: string;
  modern_application?: string;
  modern_application_zh?: string;
}

export interface GlossaryEntryMeta {
  slug: string;
  name: string;
  name_zh: string;
  school: string;
  school_zh?: string;
  related_concepts: string[];
}

export interface GlossaryEntry extends GlossaryEntryMeta {
  definition: string;
  definition_zh?: string;
  modern_application?: string;
  modern_application_zh?: string;
}

export interface InsightMeta {
  slug: string;
  title: string;
  title_zh?: string;
  philosopher_slug?: string;
  concept_slugs?: string[];
  published_at: string;
}

export interface Insight extends InsightMeta {
  content: string;
  content_zh?: string;
}

export interface SiteConfig {
  paymentEnabled: boolean;
}
