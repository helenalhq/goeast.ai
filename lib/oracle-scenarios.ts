export type OracleScenario = {
  label: string;
  question: string;
};

export type PhilosopherScenarioConfig = {
  specialty: string;
  specialtyZh: string;
  scenarios: OracleScenario[];
};

const ORACLE_SCENARIOS: Record<string, PhilosopherScenarioConfig> = {
  "prologue-zhougong": {
    specialty: "I Ching Divination",
    specialtyZh: "周易卜卦",
    scenarios: [
      { label: "Oracle Reading", question: "What does the oracle say about my path?" },
      { label: "Cast a Hexagram", question: "Cast a hexagram for my situation" },
      { label: "Crossroads", question: "I face a crossroads — read the signs" },
    ],
  },
  "ch01-laozi": {
    specialty: "The Way of Water",
    specialtyZh: "上善若水",
    scenarios: [
      { label: "Finding Flow", question: "I feel stuck. How do I find flow?" },
      { label: "Letting Go", question: "Help me see what I'm forcing" },
      { label: "Water's Wisdom", question: "What would water do in my situation?" },
    ],
  },
  "ch02-confucius": {
    specialty: "The Right Action",
    specialtyZh: "礼仪仁智",
    scenarios: [
      { label: "Right Action", question: "What is the right thing to do?" },
      { label: "Relationships", question: "How should I handle this relationship?" },
      { label: "Duty", question: "What does duty demand of me?" },
    ],
  },
  "ch03-sunzi": {
    specialty: "Strategic Mind",
    specialtyZh: "知己知彼",
    scenarios: [
      { label: "Competition", question: "Analyze my competition" },
      { label: "Best Move", question: "What is my best move right now?" },
      { label: "Winning Peace", question: "How do I win without fighting?" },
    ],
  },
  "ch04-zhuangzi": {
    specialty: "Dream Reading",
    specialtyZh: "蝴蝶之梦",
    scenarios: [
      { label: "Dream Interpretation", question: "Interpret my dream" },
      { label: "New Perspective", question: "Help me see from a different perspective" },
      { label: "Butterfly's Question", question: "Am I the butterfly or the dreamer?" },
    ],
  },
  "ch05-mencius": {
    specialty: "The Heart's Compass",
    specialtyZh: "恻隐之心",
    scenarios: [
      { label: "Compassion", question: "I saw someone suffer and couldn't act. Why?" },
      { label: "Human Nature", question: "Is human nature really good?" },
      { label: "Moral Growth", question: "How do I cultivate compassion?" },
    ],
  },
  "ch06-mozi": {
    specialty: "The Builder's Logic",
    specialtyZh: "兼爱非攻",
    scenarios: [
      { label: "Conflict Resolution", question: "How do I resolve this conflict fairly?" },
      { label: "Universal Care", question: "Why should I care about strangers?" },
      { label: "Practical Solution", question: "Build me a practical solution" },
    ],
  },
  "ch07-zhuxi": {
    specialty: "The Principle Seeker",
    specialtyZh: "格物致知",
    scenarios: [
      { label: "Understanding", question: "Help me understand what's really going on" },
      { label: "Investigation", question: "Investigate this situation for me" },
      { label: "Missing Principle", question: "What principle am I missing?" },
    ],
  },
  "ch08-zhangzai": {
    specialty: "The Great Purpose",
    specialtyZh: "为天地立心",
    scenarios: [
      { label: "Life's Purpose", question: "What should I dedicate my life to?" },
      { label: "Alignment", question: "Am I aligned with heaven and earth?" },
      { label: "Responsibility", question: "What is my responsibility?" },
    ],
  },
  "ch09-huineng": {
    specialty: "The Clear Mind",
    specialtyZh: "本来无一物",
    scenarios: [
      { label: "Stillness", question: "My mind is too noisy. Help me find stillness" },
      { label: "Letting Go", question: "What am I clinging to?" },
      { label: "Direct Pointing", question: "Point directly to my heart" },
    ],
  },
  "ch10-wangyangming": {
    specialty: "Knowledge in Action",
    specialtyZh: "知行合一",
    scenarios: [
      { label: "Knowing vs Doing", question: "I know what's right but I can't act. Why?" },
      { label: "Close the Gap", question: "Close the gap between knowing and doing" },
      { label: "Hidden Truth", question: "What is my mind hiding from me?" },
    ],
  },
};

export function getOracleScenarios(slug: string): PhilosopherScenarioConfig | null {
  return ORACLE_SCENARIOS[slug] || null;
}
