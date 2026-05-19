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
