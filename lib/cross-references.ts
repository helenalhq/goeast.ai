import { getAllSkills } from "./skills";
import { getAllJourneys } from "./journeys";
import { getAllGlossary } from "./glossary";
import { getAllInsights } from "./insights";
import { getAllHexagrams } from "./iching-data";
import { PHILOSOPHER_SLUGS } from "./types";

type RelatedItem = {
  title: string;
  subtitle?: string;
  href: string;
  type: string;
};

type CrossRefInput =
  | { type: "glossary"; slug: string; school: string; relatedConcepts: string[] }
  | { type: "philosopher"; slug: string; school: string; journeySlug?: string }
  | { type: "hexagram"; slug: string; upperTrigram: string; lowerTrigram: string }
  | { type: "skill"; slug: string; category: string; tags: string[] }
  | { type: "insight"; slug: string; philosopherSlug?: string; conceptSlugs?: string[] }
  | { type: "journey"; slug: string; philosopher?: string; school?: string };

function toUnixTime(dateString?: string): number {
  if (!dateString) return 0;
  const parsed = Date.parse(dateString);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getTitleTokens(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length >= 4)
  );
}

function getInsightSimilarityScore(
  source: { title: string; philosopherSlug?: string; conceptSlugs?: string[] },
  target: { title: string; philosopher_slug?: string; concept_slugs?: string[]; published_at: string }
): number {
  let score = 0;

  if (source.philosopherSlug && target.philosopher_slug && source.philosopherSlug === target.philosopher_slug) {
    score += 4;
  }

  const sourceConcepts = new Set(source.conceptSlugs ?? []);
  const targetConcepts = new Set(target.concept_slugs ?? []);
  let conceptOverlap = 0;
  sourceConcepts.forEach((slug) => {
    if (targetConcepts.has(slug)) conceptOverlap += 1;
  });
  score += conceptOverlap * 3;

  const sourceTokens = getTitleTokens(source.title);
  const targetTokens = getTitleTokens(target.title);
  let tokenOverlap = 0;
  sourceTokens.forEach((token) => {
    if (targetTokens.has(token)) tokenOverlap += 1;
  });
  score += Math.min(3, tokenOverlap);

  if (toUnixTime(target.published_at) > Date.now() - 1000 * 60 * 60 * 24 * 45) {
    score += 1;
  }

  return score;
}

export function getRelatedContent(input: CrossRefInput): RelatedItem[] {
  const items: RelatedItem[] = [];

  switch (input.type) {
    case "glossary": {
      // Link to philosophers of same school
      const philosophers = Object.entries(PHILOSOPHER_SLUGS)
        .filter(([_, meta]) => meta.school === input.school)
        .slice(0, 3)
        .map(([slug, meta]) => ({
          title: meta.name,
          subtitle: meta.name_zh,
          href: `/philosophers/${slug}`,
          type: "Philosopher",
        }));
      items.push(...philosophers);

      // Link to related glossary concepts
      const allGlossary = getAllGlossary();
      const related = input.relatedConcepts
        .filter((slug) => slug !== input.slug)
        .slice(0, 3)
        .map((slug): RelatedItem | null => {
          const entry = allGlossary.find((g) => g.slug === slug);
          return entry
            ? { title: entry.name, subtitle: entry.name_zh, href: `/glossary/${slug}`, type: "Concept" }
            : null;
        })
        .filter((x): x is RelatedItem => x !== null);
      items.push(...related);

      // Link to insights referencing this concept
      const insights = getAllInsights()
        .filter((i) => i.concept_slugs?.includes(input.slug))
        .slice(0, 2)
        .map((i) => ({
          title: i.title,
          href: `/insights/${i.slug}`,
          type: "Insight",
        }));
      items.push(...insights);
      break;
    }
    case "philosopher": {
      // Link to journey chapter
      if (input.journeySlug) {
        const journey = getAllJourneys().find((j) => j.slug === input.journeySlug);
        if (journey) {
          items.push({ title: journey.title, subtitle: journey.title_zh, href: `/sophies-journey/${journey.slug}`, type: "Journey" });
        }
      }

      // Link to glossary concepts of same school
      const concepts = getAllGlossary()
        .filter((g) => g.school === input.school)
        .slice(0, 4)
        .map((g) => ({ title: g.name, subtitle: g.name_zh, href: `/glossary/${g.slug}`, type: "Concept" }));
      items.push(...concepts);

      // Link to insights by this philosopher
      const insights = getAllInsights()
        .filter((i) => i.philosopher_slug === input.slug)
        .slice(0, 2)
        .map((i) => ({ title: i.title, href: `/insights/${i.slug}`, type: "Insight" }));
      items.push(...insights);
      break;
    }
    case "skill": {
      // Link to other skills in same category
      const relatedSkills = getAllSkills()
        .filter((s) => s.category === input.category && s.slug !== input.slug)
        .slice(0, 3)
        .map((s) => ({ title: s.title, subtitle: s.title_zh, href: `/skills/${s.slug}`, type: "Skill" }));
      items.push(...relatedSkills);

      // Link to category page
      items.push({
        title: `All ${input.category.charAt(0).toUpperCase() + input.category.slice(1)} Skills`,
        href: `/categories/${input.category}`,
        type: "Category",
      });
      break;
    }
    case "insight": {
      const allInsights = getAllInsights();
      const currentInsight = allInsights.find((item) => item.slug === input.slug);

      // Link to philosopher page
      if (input.philosopherSlug) {
        const meta = PHILOSOPHER_SLUGS[input.philosopherSlug];
        if (meta) {
          items.push({ title: meta.name, subtitle: meta.name_zh, href: `/philosophers/${meta.slug}`, type: "Philosopher" });
        }
      }

      // Link to concept pages
      if (input.conceptSlugs) {
        const allGlossary = getAllGlossary();
        const concepts = input.conceptSlugs
          .slice(0, 3)
          .map((slug): RelatedItem | null => {
            const entry = allGlossary.find((g) => g.slug === slug);
            return entry
              ? { title: entry.name, subtitle: entry.name_zh, href: `/glossary/${slug}`, type: "Concept" }
              : null;
          })
          .filter((x): x is RelatedItem => x !== null);
        items.push(...concepts);
      }

      // Link to most relevant insights using a weighted similarity score.
      const otherInsights = allInsights
        .filter((i) => i.slug !== input.slug)
        .map((candidate) => ({
          candidate,
          score: getInsightSimilarityScore(
            {
              title: currentInsight?.title ?? input.slug.replace(/-/g, " "),
              philosopherSlug: input.philosopherSlug,
              conceptSlugs: input.conceptSlugs,
            },
            candidate
          ),
        }))
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return toUnixTime(b.candidate.published_at) - toUnixTime(a.candidate.published_at);
        })
        .slice(0, 4)
        .map(({ candidate }) => ({ title: candidate.title, href: `/insights/${candidate.slug}`, type: "Insight" }));
      items.push(...otherInsights);
      break;
    }
    case "hexagram": {
      // Link to other hexagrams with same trigrams
      const related = getAllHexagrams()
        .filter((h) => h.slug !== input.slug && (h.upper_trigram === input.upperTrigram || h.lower_trigram === input.lowerTrigram))
        .slice(0, 3)
        .map((h) => ({ title: `${h.name} (${h.name_zh})`, subtitle: `Hexagram ${h.number}`, href: `/iching/${h.slug}`, type: "Hexagram" }));
      items.push(...related);
      break;
    }
    case "journey": {
      // Link to philosopher page
      if (input.philosopher) {
        const phil = Object.entries(PHILOSOPHER_SLUGS).find(([_, m]) => m.name === input.philosopher);
        if (phil) {
          items.push({ title: phil[1].name, subtitle: phil[1].name_zh, href: `/philosophers/${phil[0]}`, type: "Philosopher" });
        }
      }

      // Link to other journey chapters
      const allJourneys = getAllJourneys();
      const currentIdx = allJourneys.findIndex((j) => j.slug === input.slug);
      const adjacent = [
        currentIdx > 0 ? allJourneys[currentIdx - 1] : null,
        currentIdx < allJourneys.length - 1 ? allJourneys[currentIdx + 1] : null,
      ].filter((j): j is NonNullable<typeof j> => j !== null && j.slug !== input.slug);
      items.push(...adjacent.map((j) => ({ title: j.title, subtitle: j.title_zh, href: `/sophies-journey/${j.slug}`, type: "Journey" })));
      break;
    }
  }

  const deduped = items.filter((item, index) => items.findIndex((x) => x.href === item.href) === index);
  return deduped.slice(0, 6);
}
