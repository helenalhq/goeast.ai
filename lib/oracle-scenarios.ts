export type OracleScenario = {
  label: string;
  question: string;
};

export type PhilosopherScenarioConfig = {
  specialty: string;
  specialtyZh: string;
  consultLabel: string;
  ritualText: string;
  scenarios: OracleScenario[];
};

const ORACLE_SCENARIOS: Record<string, PhilosopherScenarioConfig> = {
  "prologue-zhougong": {
    specialty: "I Ching Divination",
    specialtyZh: "周易卜卦",
    consultLabel: "Cast the Oracle",
    ritualText: "The yarrow stalks fall...",
    scenarios: [
      { label: "Oracle Reading", question: "What does the oracle say about my path?" },
      { label: "Cast a Hexagram", question: "Cast a hexagram for my situation" },
      { label: "Crossroads", question: "I face a crossroads — read the signs" },
      { label: "Career Signs", question: "I'm considering a career change. What signs should I read?" },
      { label: "Relationship Transition", question: "A relationship is in transition. Cast a reading for us" },
      { label: "Preparing for Change", question: "I feel change coming. How should I prepare?" },
    ],
  },
  "ch01-laozi": {
    specialty: "The Way of Water",
    specialtyZh: "上善若水",
    consultLabel: "Seek the Way",
    ritualText: "Water finds its course...",
    scenarios: [
      { label: "Finding Flow", question: "I feel stuck. How do I find flow?" },
      { label: "Letting Go", question: "Help me see what I'm forcing" },
      { label: "Water's Wisdom", question: "What would water do in my situation?" },
      { label: "Natural Career Path", question: "My career path feels forced. How can I find a more natural direction?" },
      { label: "Water in Love", question: "I'm trying too hard in this relationship. What would water teach me?" },
      { label: "Stop Striving", question: "I've been striving for years. What if I stopped striving?" },
    ],
  },
  "ch02-confucius": {
    specialty: "The Right Action",
    specialtyZh: "礼仪仁智",
    consultLabel: "Ask the Teacher",
    ritualText: "The bamboo scroll unfurls...",
    scenarios: [
      { label: "Right Action", question: "What is the right thing to do?" },
      { label: "Relationships", question: "How should I handle this relationship?" },
      { label: "Duty", question: "What does duty demand of me?" },
      { label: "Work's Duty", question: "What duty does my work require of me?" },
      { label: "Obligations Balance", question: "How do I balance my obligations to family and to myself?" },
      { label: "Better Person", question: "I want to become a better person. Where should I start?" },
    ],
  },
  "ch03-sunzi": {
    specialty: "Strategic Mind",
    specialtyZh: "知己知彼",
    consultLabel: "Plan Strategy",
    ritualText: "The stone is placed on the board...",
    scenarios: [
      { label: "Competition", question: "Analyze my competition" },
      { label: "Best Move", question: "What is my best move right now?" },
      { label: "Winning Peace", question: "How do I win without fighting?" },
      { label: "Professional Terrain", question: "Map the terrain of my professional landscape" },
      { label: "Conflict Dynamics", question: "Analyze the dynamics of a conflict I'm navigating" },
      { label: "Strategic Advantage", question: "What strategic advantage am I not seeing?" },
    ],
  },
  "ch04-zhuangzi": {
    specialty: "Dream Reading",
    specialtyZh: "蝴蝶之梦",
    consultLabel: "Interpret Dreams",
    ritualText: "The butterfly opens its wings...",
    scenarios: [
      { label: "Dream Interpretation", question: "Interpret my dream" },
      { label: "New Perspective", question: "Help me see from a different perspective" },
      { label: "Butterfly's Question", question: "Am I the butterfly or the dreamer?" },
      { label: "Trapped in Work", question: "I feel trapped in my work. Show me the way out of the well" },
      { label: "Seeing Clearly", question: "Am I seeing this person clearly, or through my own dream?" },
      { label: "False Story", question: "What story am I telling myself that isn't true?" },
    ],
  },
  "ch05-mencius": {
    specialty: "The Heart's Compass",
    specialtyZh: "恻隐之心",
    consultLabel: "Follow the Heart",
    ritualText: "The sprouts of goodness grow...",
    scenarios: [
      { label: "Compassion", question: "I saw someone suffer and couldn't act. Why?" },
      { label: "Human Nature", question: "Is human nature really good?" },
      { label: "Moral Growth", question: "How do I cultivate compassion?" },
      { label: "Work Alignment", question: "Does my work align with my moral compass?" },
      { label: "Repairing Harm", question: "I hurt someone I care about. How do I repair it?" },
      { label: "Watering the Sprouts", question: "My compassion is fading. How do I water the sprouts?" },
    ],
  },
  "ch06-mozi": {
    specialty: "The Builder's Logic",
    specialtyZh: "兼爱非攻",
    consultLabel: "Build Solutions",
    ritualText: "The compass draws its circle...",
    scenarios: [
      { label: "Conflict Resolution", question: "How do I resolve this conflict fairly?" },
      { label: "Universal Care", question: "Why should I care about strangers?" },
      { label: "Practical Solution", question: "Build me a practical solution" },
      { label: "Equal Benefit", question: "Does my work benefit others equally, or only a few?" },
      { label: "Extended Care", question: "How can I extend my care beyond my immediate circle?" },
      { label: "Community Problem", question: "I see a practical problem in my community. How should I approach it?" },
    ],
  },
  "ch07-zhuxi": {
    specialty: "The Principle Seeker",
    specialtyZh: "格物致知",
    consultLabel: "Seek Principle",
    ritualText: "The pattern reveals itself...",
    scenarios: [
      { label: "Understanding", question: "Help me understand what's really going on" },
      { label: "Investigation", question: "Investigate this situation for me" },
      { label: "Missing Principle", question: "What principle am I missing?" },
      { label: "Career Principle", question: "What principle should guide my career decisions?" },
      { label: "Relationship Pattern", question: "I see a pattern in my relationships. Investigate it for me" },
      { label: "Missing Knowledge", question: "What knowledge am I missing that would change my understanding?" },
    ],
  },
  "ch08-zhangzai": {
    specialty: "The Great Purpose",
    specialtyZh: "为天地立心",
    consultLabel: "Find Purpose",
    ritualText: "Heaven and earth align...",
    scenarios: [
      { label: "Life's Purpose", question: "What should I dedicate my life to?" },
      { label: "Alignment", question: "Am I aligned with heaven and earth?" },
      { label: "Responsibility", question: "What is my responsibility?" },
      { label: "Heaven and Earth Work", question: "Is my work serving heaven and earth, or just myself?" },
      { label: "Disconnection", question: "I feel disconnected from the people around me. Why?" },
      { label: "Life Vow", question: "What vow should I make for this stage of my life?" },
    ],
  },
  "ch09-huineng": {
    specialty: "The Clear Mind",
    specialtyZh: "本来无一物",
    consultLabel: "Clear the Mind",
    ritualText: "The ink circle is drawn...",
    scenarios: [
      { label: "Stillness", question: "My mind is too noisy. Help me find stillness" },
      { label: "Letting Go", question: "What am I clinging to?" },
      { label: "Direct Pointing", question: "Point directly to my heart" },
      { label: "Clear Ambitions", question: "My mind is cluttered with ambitions. Clear it for me" },
      { label: "See What's Real", question: "I'm attached to how this person should be. Point to what's real" },
      { label: "Already Have It", question: "What am I seeking that I already have?" },
    ],
  },
  "ch10-wangyangming": {
    specialty: "Knowledge in Action",
    specialtyZh: "知行合一",
    consultLabel: "Ignite Action",
    ritualText: "The flame of knowing-kindling ignites...",
    scenarios: [
      { label: "Knowing vs Doing", question: "I know what's right but I can't act. Why?" },
      { label: "Close the Gap", question: "Close the gap between knowing and doing" },
      { label: "Hidden Truth", question: "What is my mind hiding from me?" },
      { label: "Career Inaction", question: "I know I should change my career. Why haven't I acted?" },
      { label: "Act on Knowing", question: "I know this relationship isn't working. Help me act on what I know" },
      { label: "Unify Knowledge", question: "My knowledge and my actions are split. How do I unify them?" },
    ],
  },
};

export function getOracleScenarios(slug: string): PhilosopherScenarioConfig | null {
  return ORACLE_SCENARIOS[slug] || null;
}
