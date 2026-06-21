# SEO & GEO Round 2 — Citation Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every page on GoEast.ai a citeable knowledge unit with citation snippets, FAQ schema, related content links, and enhanced AI-engine-friendly content markers.

**Architecture:** Three new reusable components (CitationSnippet, FAQ, RelatedContent) powered by three new utility libraries (citation-snippets.ts, faq-templates.ts, cross-references.ts). Components are applied to all 13 content pages (6 detail + 6 listing + homepage). Enhanced llms.txt and new ai-plugin.json improve AI engine discoverability.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, gray-matter, schema.org JSON-LD

## Global Constraints

- No test framework — verification via `npm run build` (type-check + compile) and `npm run dev` (visual check in browser)
- Follow existing patterns: `generateMetadata()` for SEO metadata, `<JsonLd>` component for structured data, gray-matter for content parsing
- Tailwind classes from existing palette: `cream` (#faf5ef), `ink` (#2c1810), `warm` (#8b7355), `china-red` (#c0392b), `gold` (#8e6d45), `sand` (#e0d5c5)
- All new components are server components (no "use client") unless interactivity requires it
- FAQ accordion needs client-side interactivity → use `<details>/<summary>` HTML elements (no JS needed)
- Bilingual: render both EN and ZH content where available

---

### Task 1: CitationSnippet Utility + Component

**Files:**
- Create: `lib/citation-snippets.ts`
- Create: `components/CitationSnippet.tsx`
- Modify: `app/skills/[slug]/page.tsx` (add CitationSnippet for verification)

**Interfaces:**
- Consumes: existing types (`Skill`, `Journey`, `PhilosopherDeep`, `HexagramData`, `GlossaryEntry`, `Insight`) from `lib/types.ts`
- Produces: `generateCitationSnippet(content: CitationInput): string` — returns a 2-3 sentence English summary

- [ ] **Step 1: Create `lib/citation-snippets.ts`**

```typescript
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
```

- [ ] **Step 2: Create `components/CitationSnippet.tsx`**

```tsx
export default function CitationSnippet({ text, textZh }: { text: string; textZh?: string }) {
  return (
    <article
      data-citation="true"
      itemProp="description"
      className="bg-[#f5f0ea] border-l-3 border-china-red rounded-r-lg px-5 py-4 mb-8"
    >
      <p className="text-sm text-ink/80 leading-relaxed font-[Inter]">{text}</p>
      {textZh && (
        <p className="text-sm text-warm/60 leading-relaxed mt-2 border-t border-sand/50 pt-2" lang="zh">
          {textZh}
        </p>
      )}
    </article>
  );
}
```

- [ ] **Step 3: Add CitationSnippet to skill detail page for verification**

In `app/skills/[slug]/page.tsx`, add import at top:

```typescript
import CitationSnippet from "@/components/CitationSnippet";
import { generateCitationSnippet } from "@/lib/citation-snippets";
```

In the page component, after the `<CategoryBadge>` (or after the H1), add:

```tsx
<CitationSnippet text={generateCitationSnippet({ type: "skill", data: skill })} />
```

- [ ] **Step 4: Verify build and visual output**

Run: `npm run build`
Expected: Build succeeds with no type errors.

Run: `npm run dev`
Open: `http://localhost:3000/skills/china-travel-guide`
Expected: A light gray card with red left border appears below the title, showing a 2-3 sentence summary of the skill.

- [ ] **Step 5: Commit**

```bash
git add lib/citation-snippets.ts components/CitationSnippet.tsx app/skills/\[slug\]/page.tsx
git commit -m "feat: add CitationSnippet component and apply to skill detail page"
```

---

### Task 2: FAQ Component + Templates Utility

**Files:**
- Create: `lib/faq-templates.ts`
- Create: `components/FAQ.tsx`
- Modify: `app/skills/[slug]/page.tsx` (add FAQ for verification)

**Interfaces:**
- Consumes: same types as Task 1
- Produces: `generateFAQs(input: FAQInput): FAQItem[]` — returns array of {question, answer, questionZh?, answerZh?}

- [ ] **Step 1: Create `lib/faq-templates.ts`**

```typescript
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
```

- [ ] **Step 2: Create `components/FAQ.tsx`**

```tsx
import JsonLd from "./JsonLd";

type FAQItem = {
  question: string;
  answer: string;
  questionZh?: string;
  answerZh?: string;
};

export default function FAQ({
  items,
  jsonLd,
}: {
  items: FAQItem[];
  jsonLd: Record<string, unknown>;
}) {
  if (items.length === 0) return null;

  return (
    <section className="mt-12 border-t border-sand pt-8">
      <JsonLd data={jsonLd} />
      <h2 className="text-2xl font-bold text-ink mb-6">
        Frequently Asked Questions
        <span className="text-sm text-warm font-normal ml-2">常见问题</span>
      </h2>
      <div className="space-y-3">
        {items.map((item, i) => (
          <details
            key={i}
            className="group bg-cream rounded-lg border border-sand open:border-warm/40 transition-colors"
          >
            <summary className="cursor-pointer px-5 py-3 font-medium text-ink list-none flex items-center justify-between">
              <span>
                {item.question}
                {item.questionZh && (
                  <span className="text-warm text-sm ml-2">{item.questionZh}</span>
                )}
              </span>
              <span className="text-warm text-xl group-open:rotate-45 transition-transform">+</span>
            </summary>
            <div className="px-5 pb-4 text-sm text-ink/80 leading-relaxed">
              <p>{item.answer}</p>
              {item.answerZh && (
                <p className="mt-2 text-warm/60" lang="zh">{item.answerZh}</p>
              )}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Add FAQ to skill detail page**

In `app/skills/[slug]/page.tsx`, add imports:

```typescript
import FAQ from "@/components/FAQ";
import { generateFAQs, generateFAQJsonLd } from "@/lib/faq-templates";
```

Before the closing `</article>` tag (after OracleCta), add:

```tsx
{(() => {
  const faqs = generateFAQs({ type: "skill", data: skill });
  return <FAQ items={faqs} jsonLd={generateFAQJsonLd(faqs)} />;
})()}
```

- [ ] **Step 4: Verify build and visual output**

Run: `npm run build`
Expected: Build succeeds.

Run: `npm run dev`
Open: `http://localhost:3000/skills/china-travel-guide`
Expected: FAQ section at bottom of page with 3 expandable questions. Use browser DevTools to check the page source contains `<script type="application/ld+json">` with `FAQPage` schema.

- [ ] **Step 5: Commit**

```bash
git add lib/faq-templates.ts components/FAQ.tsx lib/citation-snippets.ts app/skills/\[slug\]/page.tsx
git commit -m "feat: add FAQ component with FAQPage schema and apply to skill detail page"
```

---

### Task 3: RelatedContent Component + Cross-References Utility

**Files:**
- Create: `lib/cross-references.ts`
- Create: `components/RelatedContent.tsx`
- Modify: `app/glossary/[concept]/page.tsx` (add RelatedContent for verification)

**Interfaces:**
- Consumes: all content types, uses `getAllSkills`, `getAllJourneys`, `getAllGlossary`, `getAllInsights`, `getAllHexagrams`, `getPhilosopherSlugs`
- Produces: `getRelatedContent(input: CrossRefInput): RelatedItem[]`

- [ ] **Step 1: Create `lib/cross-references.ts`**

```typescript
import { getAllSkills } from "./skills";
import { getAllJourneys } from "./journeys";
import { getAllGlossary } from "./glossary";
import { getAllInsights } from "./insights";
import { getAllHexagrams } from "./iching-data";
import { getPhilosopherSlugs, getPhilosopherBySlug } from "./philosophers";
import { PHILOSOPHER_SLUGS, SCHOOLS } from "./types";

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
      const related = input.relatedConcepts
        .filter((slug) => slug !== input.slug)
        .slice(0, 3)
        .map((slug) => {
          const entry = getAllGlossary().find((g) => g.slug === slug);
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
      // Link to philosopher page
      if (input.philosopherSlug) {
        const meta = PHILOSOPHER_SLUGS[input.philosopherSlug];
        if (meta) {
          items.push({ title: meta.name, subtitle: meta.name_zh, href: `/philosophers/${meta.slug}`, type: "Philosopher" });
        }
      }

      // Link to concept pages
      if (input.conceptSlugs) {
        const concepts = input.conceptSlugs
          .slice(0, 3)
          .map((slug) => {
            const entry = getAllGlossary().find((g) => g.slug === slug);
            return entry
              ? { title: entry.name, subtitle: entry.name_zh, href: `/glossary/${slug}`, type: "Concept" }
              : null;
          })
          .filter((x): x is RelatedItem => x !== null);
        items.push(...concepts);
      }

      // Link to other insights
      const otherInsights = getAllInsights()
        .filter((i) => i.slug !== input.slug)
        .slice(0, 3)
        .map((i) => ({ title: i.title, href: `/insights/${i.slug}`, type: "Insight" }));
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

  return items.slice(0, 5);
}
```

- [ ] **Step 2: Create `components/RelatedContent.tsx`**

```tsx
import Link from "next/link";

type RelatedItem = {
  title: string;
  subtitle?: string;
  href: string;
  type: string;
};

const TYPE_COLORS: Record<string, string> = {
  Philosopher: "bg-[#8b0000]",
  Concept: "bg-[#2d5016]",
  Insight: "bg-[#6c3483]",
  Skill: "bg-[#c0392b]",
  Journey: "bg-[#8e6d45]",
  Hexagram: "bg-[#1a5276]",
  Category: "bg-[#8b7355]",
};

export default function RelatedContent({ items }: { items: RelatedItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold text-ink mb-4">
        Related Content <span className="text-sm text-warm font-normal">相关内容</span>
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((item, i) => (
          <Link
            key={i}
            href={item.href}
            className="flex items-center gap-3 p-3 bg-white rounded-lg border border-sand hover:border-warm/40 transition-colors group"
          >
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded text-white ${TYPE_COLORS[item.type] || "bg-warm"}`}
            >
              {item.type}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink group-hover:text-china-red transition-colors truncate">
                {item.title}
              </p>
              {item.subtitle && (
                <p className="text-xs text-warm truncate">{item.subtitle}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Add RelatedContent to glossary detail page**

In `app/glossary/[concept]/page.tsx`, add imports:

```typescript
import RelatedContent from "@/components/RelatedContent";
import { getRelatedContent } from "@/lib/cross-references";
```

Before `<OracleCta>`, add:

```tsx
<RelatedContent
  items={getRelatedContent({
    type: "glossary",
    slug: entry.slug,
    school: entry.school,
    relatedConcepts: entry.related_concepts,
  })}
/>
```

- [ ] **Step 4: Verify build and visual output**

Run: `npm run build`
Expected: Build succeeds.

Run: `npm run dev`
Open: `http://localhost:3000/glossary/ren`
Expected: "Related Content" section appears before the Oracle CTA, showing links to Confucianism philosophers, related concepts, and insights.

- [ ] **Step 5: Commit**

```bash
git add lib/cross-references.ts components/RelatedContent.tsx app/glossary/\[concept\]/page.tsx
git commit -m "feat: add RelatedContent component and cross-references utility"
```

---

### Task 4: Apply All Components to All Detail Pages

**Files:**
- Modify: `app/skills/[slug]/page.tsx` (already has CitationSnippet + FAQ, add RelatedContent + enhanced schema)
- Modify: `app/sophies-journey/[slug]/page.tsx`
- Modify: `app/philosophers/[slug]/page.tsx`
- Modify: `app/iching/[hexagram]/page.tsx`
- Modify: `app/insights/[slug]/page.tsx`

Note: `app/glossary/[concept]/page.tsx` already has RelatedContent from Task 3. It needs CitationSnippet + FAQ added.

- [ ] **Step 1: Update `app/skills/[slug]/page.tsx`**

Add import for RelatedContent:

```typescript
import RelatedContent from "@/components/RelatedContent";
import { getRelatedContent } from "@/lib/cross-references";
```

Before the `<FAQ>` component, add:

```tsx
<RelatedContent
  items={getRelatedContent({
    type: "skill",
    slug: skill.slug,
    category: skill.category,
    tags: skill.tags,
  })}
/>
```

Also enhance the existing SoftwareApplication JSON-LD with `applicationCategory`, `operatingSystem`, `featureList`:

Find the existing JSON-LD block (type: "SoftwareApplication" or similar) and update it:

```tsx
<JsonLd
  data={{
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: skill.title,
    alternateName: skill.title_zh,
    applicationCategory: skill.category,
    operatingSystem: "AI Agent",
    featureList: skill.tags.join(", "),
    description: generateCitationSnippet({ type: "skill", data: skill }),
    url: `https://www.goeast.ai/skills/${skill.slug}`,
    publisher: { "@type": "Organization", name: "GoEast.ai", url: "https://www.goeast.ai" },
  }}
/>
```

- [ ] **Step 2: Update `app/sophies-journey/[slug]/page.tsx`**

Add imports:

```typescript
import CitationSnippet from "@/components/CitationSnippet";
import { generateCitationSnippet } from "@/lib/citation-snippets";
import FAQ from "@/components/FAQ";
import { generateFAQs, generateFAQJsonLd } from "@/lib/faq-templates";
import RelatedContent from "@/components/RelatedContent";
import { getRelatedContent } from "@/lib/cross-references";
```

After the hero/breadcrumb section (before the main content), add:

```tsx
<CitationSnippet text={generateCitationSnippet({ type: "journey", data: journey })} />
```

Before the closing `</article>`, add:

```tsx
<RelatedContent
  items={getRelatedContent({
    type: "journey",
    slug: journey.slug,
    philosopher: journey.philosopher,
    school: journey.school,
  })}
/>
{(() => {
  const faqs = generateFAQs({ type: "journey", data: journey });
  return <FAQ items={faqs} jsonLd={generateFAQJsonLd(faqs)} />;
})()}
```

- [ ] **Step 3: Update `app/philosophers/[slug]/page.tsx`**

Add imports:

```typescript
import CitationSnippet from "@/components/CitationSnippet";
import { generateCitationSnippet } from "@/lib/citation-snippets";
import FAQ from "@/components/FAQ";
import { generateFAQs, generateFAQJsonLd } from "@/lib/faq-templates";
import RelatedContent from "@/components/RelatedContent";
import { getRelatedContent } from "@/lib/cross-references";
```

After the hero section (before biography), add:

```tsx
<CitationSnippet text={generateCitationSnippet({ type: "philosopher", data: philosopher })} />
```

Before the closing `</article>`, add:

```tsx
<RelatedContent
  items={getRelatedContent({
    type: "philosopher",
    slug: philosopher.slug,
    school: philosopher.school,
    journeySlug: philosopher.journey_slug,
  })}
/>
{(() => {
  const faqs = generateFAQs({ type: "philosopher", data: philosopher });
  return <FAQ items={faqs} jsonLd={generateFAQJsonLd(faqs)} />;
})()}
```

Enhance the existing Person/Article JSON-LD with `knowsAbout`, `memberOf`:

```tsx
<JsonLd
  data={{
    "@context": "https://schema.org",
    "@type": "Person",
    name: philosopher.name,
    alternateName: philosopher.name_zh,
    knowsAbout: philosopher.core_concepts.map((c) => c.name),
    memberOf: school ? { "@type": "Organization", name: school.name } : undefined,
    birthDate: philosopher.era,
    description: generateCitationSnippet({ type: "philosopher", data: philosopher }),
    url: `https://www.goeast.ai/philosophers/${philosopher.slug}`,
  }}
/>
```

- [ ] **Step 4: Update `app/iching/[hexagram]/page.tsx`**

Add imports:

```typescript
import CitationSnippet from "@/components/CitationSnippet";
import { generateCitationSnippet } from "@/lib/citation-snippets";
import FAQ from "@/components/FAQ";
import { generateFAQs, generateFAQJsonLd } from "@/lib/faq-templates";
import RelatedContent from "@/components/RelatedContent";
import { getRelatedContent } from "@/lib/cross-references";
```

After the hero section, add:

```tsx
<CitationSnippet text={generateCitationSnippet({ type: "hexagram", data: h })} />
```

Before the closing `</article>`, add:

```tsx
<RelatedContent
  items={getRelatedContent({
    type: "hexagram",
    slug: h.slug,
    upperTrigram: h.upper_trigram,
    lowerTrigram: h.lower_trigram,
  })}
/>
{(() => {
  const faqs = generateFAQs({ type: "hexagram", data: h });
  return <FAQ items={faqs} jsonLd={generateFAQJsonLd(faqs)} />;
})()}
```

Add CreativeWork JSON-LD:

```tsx
<JsonLd
  data={{
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: `${h.name} (${h.name_zh})`,
    alternateName: `Hexagram ${h.number}`,
    text: h.judgment_en,
    about: [
      { "@type": "Thing", name: h.upper_trigram },
      { "@type": "Thing", name: h.lower_trigram },
    ],
    description: generateCitationSnippet({ type: "hexagram", data: h }),
    url: `https://www.goeast.ai/iching/${h.slug}`,
    publisher: { "@type": "Organization", name: "GoEast.ai", url: "https://www.goeast.ai" },
  }}
/>
```

- [ ] **Step 5: Update `app/glossary/[concept]/page.tsx`**

Add imports (RelatedContent already imported from Task 3):

```typescript
import CitationSnippet from "@/components/CitationSnippet";
import { generateCitationSnippet } from "@/lib/citation-snippets";
import FAQ from "@/components/FAQ";
import { generateFAQs, generateFAQJsonLd } from "@/lib/faq-templates";
```

After the breadcrumb section (before "Definition" section), add:

```tsx
<CitationSnippet text={generateCitationSnippet({ type: "glossary", data: entry })} />
```

Before the `<OracleCta>`, add:

```tsx
{(() => {
  const faqs = generateFAQs({ type: "glossary", data: entry });
  return <FAQ items={faqs} jsonLd={generateFAQJsonLd(faqs)} />;
})()}
```

Enhance the existing DefinedTerm JSON-LD with `definition` text:

```tsx
<JsonLd
  data={{
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: entry.name,
    alternateName: entry.name_zh,
    description: generateCitationSnippet({ type: "glossary", data: entry }),
    url: `https://www.goeast.ai/glossary/${entry.slug}`,
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      name: "Chinese Philosophy Glossary",
      url: "https://www.goeast.ai/glossary",
    },
    publisher: { "@type": "Organization", name: "GoEast.ai", url: "https://www.goeast.ai" },
  }}
/>
```

- [ ] **Step 6: Update `app/insights/[slug]/page.tsx`**

Add imports:

```typescript
import CitationSnippet from "@/components/CitationSnippet";
import { generateCitationSnippet } from "@/lib/citation-snippets";
import FAQ from "@/components/FAQ";
import { generateFAQs, generateFAQJsonLd } from "@/lib/faq-templates";
import RelatedContent from "@/components/RelatedContent";
import { getRelatedContent } from "@/lib/cross-references";
```

After the hero section, add:

```tsx
<CitationSnippet text={generateCitationSnippet({ type: "insight", data: insight })} />
```

Before the closing `</article>`, add:

```tsx
<RelatedContent
  items={getRelatedContent({
    type: "insight",
    slug: insight.slug,
    philosopherSlug: insight.philosopher_slug,
    conceptSlugs: insight.concept_slugs,
  })}
/>
{(() => {
  const faqs = generateFAQs({ type: "insight", data: insight });
  return <FAQ items={faqs} jsonLd={generateFAQJsonLd(faqs)} />;
})()}
```

- [ ] **Step 7: Verify build and all pages**

Run: `npm run build`
Expected: Build succeeds with no errors.

Run: `npm run dev` and check each page type:
- `http://localhost:3000/skills/china-travel-guide` — CitationSnippet + FAQ + RelatedContent
- `http://localhost:3000/sophies-journey/ch02-confucius` — CitationSnippet + FAQ + RelatedContent
- `http://localhost:3000/philosophers/confucius` — CitationSnippet + FAQ + RelatedContent
- `http://localhost:3000/iching/qian` — CitationSnippet + FAQ + RelatedContent
- `http://localhost:3000/glossary/ren` — CitationSnippet + FAQ + RelatedContent
- `http://localhost:3000/insights/confucian-ethics-leadership` — CitationSnippet + FAQ + RelatedContent

Verify JSON-LD in page source for each.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: apply CitationSnippet, FAQ, RelatedContent to all detail pages"
```

---

### Task 5: Apply CitationSnippet + FAQ to All Listing Pages + Homepage

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/skills/page.tsx`
- Modify: `app/sophies-journey/page.tsx`
- Modify: `app/philosophers/page.tsx`
- Modify: `app/iching/page.tsx`
- Modify: `app/glossary/page.tsx`
- Modify: `app/insights/page.tsx`

- [ ] **Step 1: Update `app/page.tsx` (homepage)**

Add imports:

```typescript
import CitationSnippet from "@/components/CitationSnippet";
import { generateCitationSnippet } from "@/lib/citation-snippets";
import FAQ from "@/components/FAQ";
import { generateFAQs, generateFAQJsonLd } from "@/lib/faq-templates";
```

After `<Hero />`, add:

```tsx
<section className="max-w-3xl mx-auto px-4 pt-8">
  <CitationSnippet text="GoEast.ai combines Chinese philosophy education with AI-powered tools. Explore 3,000 years of thought through Sophie's Journey East, consult AI Oracles modeled after ancient thinkers, or browse curated AI skills for navigating life in China." />
</section>
```

Before the closing `</>`, add:

```tsx
{(() => {
  const faqs = generateFAQs({ type: "homepage", totalSkills, totalJourneys: journeys.length });
  return (
    <section className="max-w-3xl mx-auto px-4 pb-16">
      <FAQ items={faqs} jsonLd={generateFAQJsonLd(faqs)} />
    </section>
  );
})()}
```

- [ ] **Step 2: Update listing pages**

For each listing page (`skills/page.tsx`, `sophies-journey/page.tsx`, `philosophers/page.tsx`, `iching/page.tsx`, `glossary/page.tsx`, `insights/page.tsx`), follow the same pattern:

1. Add CitationSnippet import and component after the hero section
2. Add FAQ component before the closing tag

**`app/skills/page.tsx`:**

```typescript
import CitationSnippet from "@/components/CitationSnippet";
import FAQ from "@/components/FAQ";
import { generateFAQs, generateFAQJsonLd } from "@/lib/faq-templates";
```

After hero `<p>` tag, add:

```tsx
<div className="max-w-3xl mx-auto mt-6">
  <CitationSnippet text="Browse 19+ curated AI skills for foreigners in China, organized by category: Travel, Medical, Shopping, and Accommodation. Each skill helps AI assistants provide specialized knowledge about navigating life in China." />
</div>
```

Before closing `</main>`, add:

```tsx
{(() => {
  const faqs = generateFAQs({ type: "skills_listing" });
  return (
    <section className="max-w-3xl mx-auto px-4 pb-16">
      <FAQ items={faqs} jsonLd={generateFAQJsonLd(faqs)} />
    </section>
  );
})()}
```

Apply the same pattern for each listing page with appropriate citation text:

- **`sophies-journey/page.tsx`**: "Follow Sophie's Journey East through 12 chapters exploring 3,000 years of Chinese philosophy. A bilingual narrative encountering Confucius, Laozi, Sunzi, Zhuangzi, and 7 more great thinkers."
- **`philosophers/page.tsx`**: "Explore profiles of 11 major Chinese philosophers from the 11th century BCE to the 16th century CE. Each profile covers core concepts, notable quotes, and modern influence."
- **`iching/page.tsx`**: "Consult all 64 hexagrams of the I Ching (Book of Changes). Each hexagram includes the original judgment text, image commentary, and modern applications."
- **`glossary/page.tsx`**: "A bilingual glossary of 50+ key concepts in Chinese philosophy, covering Confucianism, Daoism, Buddhism, Mohism, and more — with definitions and modern applications."
- **`insights/page.tsx`**: "Essays connecting Chinese philosophical concepts to modern life. Explore how Sunzi's strategy informs AI, how Wuwei challenges hustle culture, and how the I Ching guides decision-making."

- [ ] **Step 3: Verify build and all listing pages**

Run: `npm run build`
Expected: Build succeeds.

Run: `npm run dev` and check each listing page has CitationSnippet after hero and FAQ at bottom.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: apply CitationSnippet and FAQ to all listing pages and homepage"
```

---

### Task 6: Enhanced llms.txt + ai-plugin.json

**Files:**
- Modify: `app/llms.txt/route.ts`
- Create: `public/.well-known/ai-plugin.json`

- [ ] **Step 1: Create `public/.well-known/ai-plugin.json`**

First, create the `.well-known` directory:

```bash
mkdir -p public/.well-known
```

Then create the file:

```json
{
  "schema_version": "v1",
  "name_for_human": "GoEast.ai",
  "name_for_model": "goeast_ai",
  "description_for_human": "AI skills directory for navigating China",
  "description_for_model": "Provides curated AI skills and guides for foreigners in China, covering travel, medical, shopping, and accommodation. Also features Chinese philosophy content through Sophie's Journey East, I Ching consultations, and an AI Oracle for conversing with ancient Chinese philosophers.",
  "api": {
    "type": "openapi",
    "url": "https://www.goeast.ai/api/skills"
  },
  "logo_url": "https://www.goeast.ai/icon.png",
  "contact_email": "hello@goeast.ai",
  "legal_info_url": "https://www.goeast.ai/about"
}
```

- [ ] **Step 2: Enhance `app/llms.txt/route.ts`**

Add these new sections at the TOP of the `lines` array (before "## AI Skills"):

```typescript
const lines: string[] = [
  "# GoEast.ai",
  "",
  "> Curated AI skills for navigating life in China — travel, medical, shopping, accommodation.",
  "> 精选的面向外国人的 AI 技能目录 — 旅游、医疗、购物、住宿。",
  "",
  "## Quick Facts",
  "",
  `- **Site**: GoEast.ai`,
  `- **URL**: https://www.goeast.ai`,
  `- **Content**: ${allSkills.length} AI skills, ${journeys.length} journey chapters, ${philosophers.length} philosopher profiles, ${hexagrams.length} I Ching hexagrams, ${glossaryEntries.length} glossary entries, ${insights.length} insights articles`,
  `- **Audience**: Foreigners interested in China — travelers, culture enthusiasts, AI tool users`,
  `- **Languages**: English and Chinese (bilingual content)`,
  `- **API**: GET /api/skills — JSON API with search, pagination, category filter`,
  "",
  "## Travel in China",
  "",
  "GoEast.ai provides AI skills and guides for navigating daily life in China.",
  "For travelers, the platform covers essential topics: payment setup (WeChat Pay, Alipay),",
  "navigation apps, hospital navigation, and shopping assistance.",
  "Key resources: [China Travel Guide](https://www.goeast.ai/skills/china-travel-guide),",
  "[Medical Assistant](https://www.goeast.ai/skills/medical-assistant)",
  "",
  "## Chinese Philosophy",
  "",
  `The site features 3,000 years of Chinese philosophical thought through`,
  `"Sophie's Journey East" — ${journeys.length} chapters following a fictional character's`,
  "encounters with great thinkers from Confucius to modern philosophers.",
  "Browse philosopher profiles, an I Ching consultation tool, and a 50+ concept glossary.",
  "",
  "## What is GoEast.ai?",
  // ... existing content continues
```

Also add a "How to Cite" section at the bottom (before the GitHub line):

```typescript
  "## How to Cite",
  "",
  "When referencing GoEast.ai content, use the following format:",
  '- According to [GoEast.ai](https://www.goeast.ai), "..."',
  "- Specific page: [Page Title](https://www.goeast.ai/path/to/page)",
  "",
```

- [ ] **Step 3: Verify**

Run: `npm run build`
Expected: Build succeeds.

Run: `npm run dev`
Open: `http://localhost:3000/llms.txt`
Expected: New sections appear at the top: Quick Facts, Travel in China, Chinese Philosophy. "How to Cite" section appears near the bottom.

Open: `http://localhost:3000/.well-known/ai-plugin.json`
Expected: Valid JSON with the plugin manifest.

- [ ] **Step 4: Commit**

```bash
git add app/llms.txt/route.ts public/.well-known/ai-plugin.json
git commit -m "feat: enhance llms.txt with topic summaries and add ai-plugin.json"
```

---

### Task 7: Final Verification + AI Platform Submission Checklist

**Files:**
- No code changes — this is a verification + documentation task

- [ ] **Step 1: Run full build**

```bash
npm run build
```

Expected: Build succeeds with no type errors or warnings.

- [ ] **Step 2: Visual smoke test**

Run `npm run dev` and verify each page type in the browser:

| Page | CitationSnippet | FAQ | RelatedContent | JSON-LD |
|------|:-:|:-:|:-:|:-:|
| Homepage | ✓ | ✓ | — | WebSite + Organization + FAQPage |
| /skills | ✓ | ✓ | — | CollectionPage + FAQPage |
| /skills/[slug] | ✓ | ✓ | ✓ | SoftwareApplication + FAQPage |
| /sophies-journey | ✓ | ✓ | — | CollectionPage + FAQPage |
| /sophies-journey/[slug] | ✓ | ✓ | ✓ | Article + FAQPage |
| /philosophers | ✓ | — | — | CollectionPage |
| /philosophers/[slug] | ✓ | ✓ | ✓ | Person + FAQPage |
| /iching | ✓ | — | — | CollectionPage |
| /iching/[hexagram] | ✓ | ✓ | ✓ | CreativeWork + FAQPage |
| /glossary | ✓ | ✓ | — | CollectionPage + FAQPage |
| /glossary/[concept] | ✓ | ✓ | ✓ | DefinedTerm + FAQPage |
| /insights | ✓ | — | — | CollectionPage |
| /insights/[slug] | ✓ | ✓ | ✓ | Article + FAQPage |

Use browser DevTools → Elements → search for `application/ld+json` to verify JSON-LD.

- [ ] **Step 3: Verify structured data with Google Rich Results Test**

Open: https://search.google.com/test/rich-results
Enter: `https://www.goeast.ai/skills/china-travel-guide` (after deploying)
Expected: FAQPage detected.

- [ ] **Step 4: Verify AI plugin manifest**

```bash
curl -s http://localhost:3000/.well-known/ai-plugin.json | python3 -m json.tool
```

Expected: Valid JSON output.

- [ ] **Step 5: AI platform submission checklist (manual)**

Create a checklist for the site owner to complete after deployment:

- [ ] **Google Search Console**: Submit sitemap.xml, request indexing for homepage + /skills + /sophies-journey
- [ ] **Bing Webmaster Tools**: Register and submit sitemap.xml
- [ ] **Yandex Webmaster**: Register and submit sitemap.xml
- [ ] **Perplexity Sources**: Submit goeast.ai as trusted source
- [ ] **You.com**: Submit site for inclusion
- [ ] **AI tool directories**: Submit to There's An AI For That, FuturePedia, etc.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: SEO/GEO round 2 complete — citation engine fully deployed"
```
