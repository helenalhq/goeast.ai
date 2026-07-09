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
  | { type: "insights_listing" }
  | { type: "china_travel_guide" }
  | { type: "chinese_philosophy_guide" };

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
  if (insight.faqs && insight.faqs.length > 0) {
    return insight.faqs.map((faq) => ({
      question: faq.question,
      answer: faq.answer,
      questionZh: faq.question_zh,
      answerZh: faq.answer_zh,
    }));
  }

  const plainContent = insight.content.replace(/<[^>]*>/g, "").slice(0, 240).trim();
  return [
    {
      question: `What is ${insight.title}?`,
      answer: `${insight.title} is a bilingual guide from GoEast.ai. ${plainContent}`,
      questionZh: insight.title_zh ? `什么是${insight.title_zh}？` : undefined,
    },
    {
      question: `Why does ${insight.title} matter today?`,
      answer: `It connects Chinese philosophy and practical guidance to modern questions in travel, work, decision-making, and cross-cultural understanding.`,
      questionZh: insight.title_zh ? `为什么${insight.title_zh}在今天仍有价值？` : undefined,
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
    case "china_travel_guide": return [
      { question: "What should foreigners prepare before traveling to China?", answer: "Install Alipay and WeChat Pay, buy a China eSIM or local SIM plan, download offline translation packs, save hospital options, and install DiDi and a maps app.", questionZh: "外国人来中国旅行前应准备什么？", answerZh: "安装支付宝和微信支付，购买中国 eSIM 或本地 SIM 套餐，下载离线翻译包，保存医院选项，并安装滴滴和地图应用。" },
      { question: "Can foreigners use mobile payments in China?", answer: "Yes. Foreigners can verify Alipay and WeChat Pay with a passport and link an international Visa, Mastercard, or JCB card. A Chinese bank card offers the best experience if available.", questionZh: "外国人可以在中国使用移动支付吗？", answerZh: "可以。外国人可以使用护照验证支付宝和微信支付，并绑定国际 Visa、Mastercard 或 JCB 卡。如果有中国银行卡，体验会更佳。" },
      { question: "Is it safe to go to a Chinese hospital as a foreigner?", answer: "Yes, especially at Grade 3A hospitals in major cities. Bring your passport, insurance details, and a bilingual symptom list. International clinics and VIP departments often have English-speaking staff.", questionZh: "外国人去中国医院安全吗？", answerZh: "安全，尤其是在大城市的三甲医院。携带护照、保险详情和双语症状清单。国际诊所和特需门诊通常有英语工作人员。" },
    ];
    case "chinese_philosophy_guide": return [
      { question: "What is Chinese philosophy?", answer: "Chinese philosophy is a broad tradition of thought spanning roughly 3,000 years, including Confucianism, Daoism, Legalism, Mohism, Buddhism in China, and later schools such as Neo-Confucianism. It addresses ethics, politics, cosmology, and personal cultivation.", questionZh: "什么是中国哲学？", answerZh: "中国哲学是跨越约三千年的广泛思想传统，包括儒家、道家、法家、墨家、中国佛教以及后来的理学等学派。它关注伦理、政治、宇宙论和个人修养。" },
      { question: "Who are the most important Chinese philosophers?", answer: "The most influential thinkers include Confucius, Laozi, Sunzi, Mencius, Zhuangzi, Han Fei, Mozi, Xunzi, and later Wang Yangming and Zhu Xi.", questionZh: "最重要的中国哲学家有哪些？", answerZh: "最具影响力的思想家包括孔子、老子、孙子、孟子、庄子、韩非、墨子、荀子，以及后来的王阳明和朱熹。" },
      { question: "How can Chinese philosophy help modern life?", answer: "Chinese philosophy offers frameworks for decision-making, leadership, conflict resolution, and personal well-being. Concepts like Wu Wei (effortless action), Yin Yang balance, and Sunzi's strategic thinking are widely applied in business, psychology, and design today.", questionZh: "中国哲学如何帮助现代生活？", answerZh: "中国哲学为决策、领导力、冲突解决和个人福祉提供框架。无为、阴阳平衡、孙子的战略思想等概念如今广泛应用于商业、心理学和设计领域。" },
    ];
    case "insights_listing": return [
      { question: "What topics do GoEast.ai Insights cover?", answer: "GoEast.ai Insights cover Chinese philosophy (Wu Wei, Yin Yang, Confucius, Laozi, I Ching), practical China travel guides (payments, transport, hospitals, eSIM), and how ancient wisdom applies to modern work and life.", questionZh: "GoEast.ai 的 Insights 涵盖哪些主题？", answerZh: "GoEast.ai 的 Insights 涵盖中国哲学（无为、阴阳、孔子、老子、易经）、实用中国旅行指南（支付、交通、医院、eSIM），以及古代智慧如何应用于现代工作和生活。" },
      { question: "Are the China travel guides updated for 2026?", answer: "Yes. Our practical guides for payments, high-speed rail, hospital visits, translation apps, and eSIM are reviewed and updated to reflect 2026 app versions, regulations, and on-the-ground workflows.", questionZh: "中国旅行指南是否已更新至2026年？", answerZh: "是的。我们的支付、高铁、就医、翻译应用和 eSIM 实用指南均经过审核和更新，以反映2026年的应用版本、法规和实际流程。" },
      { question: "Can I use these insights for commercial or educational purposes?", answer: "You may link to and quote our insights with attribution. For commercial licensing or republication, please contact us through the contact page.", questionZh: "我可以将这些洞察用于商业或教育目的吗？", answerZh: "你可以链接和引用我们的洞察内容，请注明出处。如需商业授权或转载，请通过联系页面与我们联系。" },
    ];
  }
}

export function generateFAQJsonLd(faqs: FAQItem[]): Record<string, unknown> | null {
  if (faqs.length === 0) return null;
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
