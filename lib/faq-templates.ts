import { Skill, Journey, PhilosopherDeep, HexagramData, GlossaryEntry, Insight, SCHOOLS, CATEGORIES } from "./types";

type FAQItem = {
  question: string;
  answer: string;
  questionZh?: string;
  answerZh?: string;
};

type FAQInput =
  | { type: "skill"; data: Skill }
  | { type: "journey"; data: Journey }
  | { type: "philosopher"; data: PhilosopherDeep }
  | { type: "hexagram"; data: HexagramData }
  | { type: "glossary"; data: GlossaryEntry }
  | { type: "insight"; data: Insight }
  | { type: "homepage"; totalSkills: number; totalJourneys: number }
  | { type: "skills_listing" }
  | { type: "journeys_listing" }
  | { type: "philosophers_listing" }
  | { type: "iching_listing" }
  | { type: "glossary_listing" }
  | { type: "insights_listing" };

function generateSkillFAQs(skill: Skill): FAQItem[] {
  return [
    {
      question: `What does ${skill.title} do?`,
      answer: `${skill.title} is an AI skill for ${skill.category} in China. ${skill.content.replace(/<[^>]*>/g, "").slice(0, 200).trim()}`,
      questionZh: `${skill.title_zh} 是什么？`,
    },
    {
      question: `How do I install ${skill.title}?`,
      answer: skill.skill_url
        ? `You can install ${skill.title} from ${skill.source}. Visit ${skill.skill_url} to get started.`
        : `${skill.title} is available from ${skill.source}. Visit ${skill.source_url} for installation instructions.`,
      questionZh: `如何安装 ${skill.title_zh}？`,
    },
    {
      question: `Is ${skill.title} free?`,
      answer: `${skill.title} is provided by ${skill.source}. Check the source page for pricing details.`,
      questionZh: `${skill.title_zh} 免费吗？`,
    },
  ];
}

function generatePhilosopherFAQs(p: PhilosopherDeep): FAQItem[] {
  const school = SCHOOLS.find((s) => s.id === p.school);
  const concepts = p.core_concepts.slice(0, 3).map((c) => c.name).join(", ");
  return [
    {
      question: `What is ${p.name} known for?`,
      answer: `${p.name} (${p.era}) is known for ${concepts || "foundational philosophical teachings"}. As a key figure in ${school?.name || p.school}, ${p.name}'s ideas shaped Chinese thought for centuries.`,
      questionZh: `${p.name_zh} 以什么著称？`,
    },
    {
      question: `What era did ${p.name} live in?`,
      answer: `${p.name} lived during the ${p.era}.${p.location ? ` Based in ${p.location}.` : ""}`,
      questionZh: `${p.name_zh} 生活在什么时代？`,
    },
    {
      question: `What school of thought did ${p.name} found or belong to?`,
      answer: `${p.name} belonged to the ${school?.name || p.school} school (${school?.name_zh || p.school_zh || ""}).`,
      questionZh: `${p.name_zh} 属于哪个学派？`,
    },
  ];
}

function generateGlossaryFAQs(g: GlossaryEntry): FAQItem[] {
  const school = SCHOOLS.find((s) => s.id === g.school);
  return [
    {
      question: `What is ${g.name} in Chinese philosophy?`,
      answer: `${g.name} (${g.name_zh}) is a concept from ${school?.name || g.school} philosophy. ${g.definition.replace(/<[^>]*>/g, "").slice(0, 200).trim()}`,
      questionZh: `中国哲学中的「${g.name_zh}」是什么？`,
    },
    {
      question: `Which school of thought does ${g.name} belong to?`,
      answer: `${g.name} belongs to the ${school?.name || g.school} school of Chinese philosophy.`,
      questionZh: `${g.name_zh} 属于哪个学派？`,
    },
  ];
}

function generateHexagramFAQs(h: HexagramData): FAQItem[] {
  return [
    {
      question: `What does Hexagram ${h.number} (${h.name}) mean?`,
      answer: `Hexagram ${h.number}, ${h.name} (${h.name_zh}), represents the interaction of ${h.upper_trigram} (above) and ${h.lower_trigram} (below). ${h.judgment_en.slice(0, 200).trim()}`,
      questionZh: `第 ${h.number} 卦 ${h.name_zh} 是什么意思？`,
    },
    {
      question: `What are the trigrams of Hexagram ${h.number}?`,
      answer: `Hexagram ${h.number} has ${h.upper_trigram} as the upper trigram and ${h.lower_trigram} as the lower trigram.`,
      questionZh: `第 ${h.number} 卦的上下卦是什么？`,
    },
  ];
}

function generateJourneyFAQs(journey: Journey): FAQItem[] {
  const philPart = journey.philosopher ? journey.philosopher : "Chinese philosophers";
  return [
    {
      question: `Who is ${philPart} and what is their significance?`,
      answer: journey.philosopher
        ? `${journey.philosopher} (${journey.era || "ancient China"}) was a major figure in ${journey.school || "Chinese"} philosophy. This chapter of Sophie's Journey East explores their teachings through narrative.`
        : `This chapter explores key themes in Chinese philosophy through Sophie's encounters with ancient thinkers.`,
      questionZh: journey.philosopher_zh ? `${journey.philosopher_zh} 是谁？` : undefined,
    },
    {
      question: `What school of thought does this chapter cover?`,
      answer: journey.school ? `This chapter covers the ${journey.school} school of Chinese philosophy.` : `This chapter explores multiple schools of Chinese philosophical thought.`,
      questionZh: `本章涉及哪个学派？`,
    },
  ];
}

function generateInsightFAQs(insight: Insight): FAQItem[] {
  return [
    {
      question: `What is this article about?`,
      answer: `${insight.title}. ${insight.content.replace(/<[^>]*>/g, "").slice(0, 200).trim()}`,
      questionZh: insight.title_zh ? `这篇文章讲了什么？` : undefined,
    },
  ];
}

function generateHomepageFAQs(totalSkills: number, totalJourneys: number): FAQItem[] {
  return [
    {
      question: "What is GoEast.ai?",
      answer: `GoEast.ai is a platform combining Chinese philosophy education with AI-powered tools. It features Sophie's Journey East (${totalJourneys} chapters exploring 3,000 years of Chinese thought), a directory of ${totalSkills}+ AI skills for navigating life in China, an I Ching consultation tool, a philosophy glossary, and an AI Oracle that lets you converse with ancient Chinese philosophers.`,
      questionZh: "GoEast.ai 是什么？",
    },
    {
      question: "What AI skills are available on GoEast.ai?",
      answer: `GoEast.ai offers ${totalSkills}+ curated AI skills across four categories: Travel, Medical, Shopping, and Accommodation. Each skill helps AI assistants provide specialized knowledge about China for foreigners.`,
      questionZh: "GoEast.ai 上有哪些 AI 技能？",
    },
    {
      question: "Who is Sophie's Journey East for?",
      answer: `Sophie's Journey East is for anyone interested in Chinese philosophy, culture, or history. The ${totalJourneys}-chapter narrative follows a fictional character named Sophie as she travels through China and encounters great thinkers from Confucius to Wang Yangming, exploring 3,000 years of philosophical thought in both English and Chinese.`,
      questionZh: "苏菲的东方之旅适合谁？",
    },
  ];
}

function generateListingFAQs(type: string): FAQItem[] {
  switch (type) {
    case "skills_listing":
      return [
        { question: "What types of AI skills are available?", answer: "GoEast.ai offers AI skills across four categories: Travel (city guides, transport, payments), Medical (hospital navigation, health advice), Shopping (product recommendations, bargaining), and Accommodation (finding housing, neighborhood guides)." },
        { question: "How do I install an AI skill from GoEast.ai?", answer: "Each skill page includes installation instructions and a link to the source (such as ClawhHub). Click on a skill to see full details and installation steps." },
      ];
    case "glossary_listing":
      return [
        { question: "What Chinese philosophy concepts are covered?", answer: "The glossary covers key concepts from Confucianism, Daoism, Buddhism, Mohism, Neo-Confucianism, and other schools — including Ren, Dao, Wuwei, Qi, Yin-Yang, and 40+ more terms." },
      ];
    default:
      return [];
  }
}

export function generateFAQs(input: FAQInput): FAQItem[] {
  switch (input.type) {
    case "skill": return generateSkillFAQs(input.data);
    case "journey": return generateJourneyFAQs(input.data);
    case "philosopher": return generatePhilosopherFAQs(input.data);
    case "hexagram": return generateHexagramFAQs(input.data);
    case "glossary": return generateGlossaryFAQs(input.data);
    case "insight": return generateInsightFAQs(input.data);
    case "homepage": return generateHomepageFAQs(input.totalSkills, input.totalJourneys);
    case "skills_listing": return generateListingFAQs("skills_listing");
    case "journeys_listing": return generateListingFAQs("journeys_listing");
    case "philosophers_listing": return [];
    case "iching_listing": return [];
    case "glossary_listing": return generateListingFAQs("glossary_listing");
    case "insights_listing": return [];
  }
}

export function generateFAQJsonLd(faqs: FAQItem[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}
