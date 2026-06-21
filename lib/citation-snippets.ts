import { Skill, Journey, PhilosopherDeep, HexagramData, GlossaryEntry, Insight, SCHOOLS } from "./types";

type CitationInput =
  | { type: "skill"; data: Skill }
  | { type: "journey"; data: Journey }
  | { type: "philosopher"; data: PhilosopherDeep }
  | { type: "hexagram"; data: HexagramData }
  | { type: "glossary"; data: GlossaryEntry }
  | { type: "insight"; data: Insight };

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\n+/g, " ").trim();
}

function firstSentences(text: string, count: number): string {
  const clean = stripHtml(text);
  const sentences = clean.match(/[^.!?]+[.!?]+/g) || [clean];
  return sentences.slice(0, count).join(" ").trim();
}

function generateSkillSnippet(skill: Skill): string {
  const catName = skill.category.charAt(0).toUpperCase() + skill.category.slice(1);
  const tagsPreview = skill.tags.slice(0, 3).join(", ");
  return `${skill.title} is an AI ${catName.toLowerCase()} skill for navigating life in China. It covers ${tagsPreview} and more, helping AI assistants provide accurate guidance for foreigners.`;
}

function generateJourneySnippet(journey: Journey): string {
  const chLabel = journey.chapter === 0 ? "Prologue" : journey.chapter === 11 ? "Epilogue" : `Chapter ${journey.chapter}`;
  const philPart = journey.philosopher ? ` featuring ${journey.philosopher}` : "";
  const schoolPart = journey.school ? ` (${journey.school})` : "";
  const quotePart = journey.quote ? ` Opening quote: "${journey.quote}"` : "";
  return `${chLabel} of Sophie's Journey East${philPart}${schoolPart}. ${quotePart}`;
}

function generatePhilosopherSnippet(p: PhilosopherDeep): string {
  const school = SCHOOLS.find((s) => s.id === p.school);
  const concepts = p.core_concepts.slice(0, 3).map((c) => c.name.toLowerCase()).join(", ");
  const locationPart = p.location ? ` from ${p.location}` : "";
  return `${p.name}${locationPart} (${p.era}) was a foundational figure in ${school?.name || p.school}. Known for teachings on ${concepts || "philosophical thought"}, ${p.name} shaped Chinese civilization for millennia.`;
}

function generateHexagramSnippet(h: HexagramData): string {
  const judgmentFirst = firstSentences(h.judgment_en, 1);
  return `Hexagram ${h.number}, ${h.name} (${h.name_zh}), combines the ${h.upper_trigram} (upper) and ${h.lower_trigram} (lower) trigrams. ${judgmentFirst}`;
}

function generateGlossarySnippet(g: GlossaryEntry): string {
  const defFirst = firstSentences(g.definition, 2);
  return `${g.name} (${g.name_zh}) is a key concept in Chinese philosophy. ${defFirst}`;
}

function generateInsightSnippet(insight: Insight): string {
  const opening = firstSentences(insight.content, 2);
  return `${insight.title}. ${opening}`;
}

export function generateCitationSnippet(input: CitationInput): string {
  switch (input.type) {
    case "skill": return generateSkillSnippet(input.data);
    case "journey": return generateJourneySnippet(input.data);
    case "philosopher": return generatePhilosopherSnippet(input.data);
    case "hexagram": return generateHexagramSnippet(input.data);
    case "glossary": return generateGlossarySnippet(input.data);
    case "insight": return generateInsightSnippet(input.data);
  }
}
