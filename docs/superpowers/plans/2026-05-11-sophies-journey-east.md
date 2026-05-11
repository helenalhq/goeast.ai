# Sophie's Journey East — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a narrative section to GoEast.ai where Sophie from *Sophie's World* dialogues with 11 Chinese philosophers across 12 chapters (prologue + 10 stories + epilogue).

**Architecture:** File-based content in `/content/journeys/*.md` with YAML frontmatter, processed by a `lib/journeys.ts` data layer (mirrors existing `lib/skills.ts`). Two new pages: a landing page with timeline + philosopher gallery, and dynamic story detail pages. Navigation link added to header.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, gray-matter, remark + remark-html.

**Design Spec:** `docs/superpowers/specs/2026-05-11-sophies-journey-east-design.md`

---

## File Structure

```
lib/
  types.ts                    # MODIFY — add Journey types
  journeys.ts                 # CREATE — data layer for journeys content

content/journeys/             # CREATE directory
  prologue-zhougong.md        # CREATE
  ch01-laozi.md               # CREATE
  ch02-confucius.md            # CREATE
  ch03-sunzi.md                # CREATE
  ch04-zhuangzi.md             # CREATE
  ch05-mencius.md              # CREATE
  ch06-mozi.md                 # CREATE
  ch07-zhuxi.md                # CREATE
  ch08-zhangzai.md             # CREATE
  ch09-huineng.md              # CREATE
  ch10-wangyangming.md         # CREATE
  epilogue.md                  # CREATE

components/
  Header.tsx                   # MODIFY — add Journey nav link
  JourneyTimeline.tsx          # CREATE — vertical timeline for landing page
  PhilosopherCard.tsx          # CREATE — card for philosopher gallery

app/
  sophies-journey/
    page.tsx                   # CREATE — landing page
    [slug]/
      page.tsx                 # CREATE — story detail page
```

---

### Task 1: Add Journey Types

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Add Journey types to lib/types.ts**

Append the following types after the existing `CATEGORIES` export:

```typescript
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
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds with no type errors.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add Journey types and school definitions for Sophie's Journey"
```

---

### Task 2: Create Journeys Data Layer

**Files:**
- Create: `lib/journeys.ts`

- [ ] **Step 1: Create lib/journeys.ts**

```typescript
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";
import { Journey, JourneyMeta } from "./types";

const journeysDirectory = path.join(process.cwd(), "content/journeys");

export function getJourneySlugs(): string[] {
  if (!fs.existsSync(journeysDirectory)) return [];
  return fs
    .readdirSync(journeysDirectory)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
}

export function getJourneyBySlug(slug: string): Journey | null {
  const fullPath = path.join(journeysDirectory, `${slug}.md`);
  if (!fs.existsSync(fullPath)) return null;

  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  return {
    slug: data.slug || slug,
    chapter: data.chapter ?? 0,
    title: data.title || "",
    title_zh: data.title_zh || "",
    philosopher: data.philosopher,
    philosopher_zh: data.philosopher_zh,
    era: data.era,
    school: data.school,
    school_zh: data.school_zh,
    location: data.location || "",
    color: data.color || "#8b7355",
    quote: data.quote,
    quote_source: data.quote_source,
    quote_zh: data.quote_zh,
    content,
  };
}

export async function getJourneyWithHtml(slug: string): Promise<Journey | null> {
  const journey = getJourneyBySlug(slug);
  if (!journey) return null;

  const processed = await remark().use(html).process(journey.content);
  return { ...journey, content: processed.toString() };
}

export function getAllJourneys(): JourneyMeta[] {
  const slugs = getJourneySlugs();
  return slugs
    .map((slug) => {
      const journey = getJourneyBySlug(slug);
      if (!journey) return null;
      const { content, ...meta } = journey;
      return meta;
    })
    .filter((j): j is JourneyMeta => j !== null)
    .sort((a, b) => a.chapter - b.chapter);
}

export function getJourneyByChapter(chapter: number): JourneyMeta | null {
  return getAllJourneys().find((j) => j.chapter === chapter) || null;
}
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds (no journeys content yet, but imports are valid).

- [ ] **Step 3: Commit**

```bash
git add lib/journeys.ts
git commit -m "feat: add journeys data layer for Sophie's Journey content"
```

---

### Task 3: Create First Content File (Prologue)

**Files:**
- Create: `content/journeys/prologue-zhougong.md`

- [ ] **Step 1: Create content/journeys directory and prologue file**

```bash
mkdir -p content/journeys
```

Create `content/journeys/prologue-zhougong.md`:

```markdown
---
slug: prologue-zhougong
chapter: 0
title: "The Oracle of Zhou"
title_zh: "周公之卦"
philosopher: "Zhou Gong"
philosopher_zh: "周公"
era: "11th century BCE"
school: "ancient"
school_zh: "上古文明"
location: "Eastern Edge of the World"
color: "#8b4513"
quote: "The great beginning gives birth to all things."
quote_source: "I Ching (易经), Hexagram Qian"
quote_zh: "大哉乾元，万物资始。"
---

## Prologue

Sophie had been walking for what felt like forever.

Since the garden party — since she had slipped through the invisible membrane between fiction and reality — the world had become both infinitely larger and deeply unfamiliar. She was no longer a character in someone else's story. She was free. But freedom, she was learning, was heavier than it sounded.

She had crossed mountains without trails, seas without maps. She had walked through cities where no one spoke her language, through forests where the trees whispered in tongues older than any she knew. And now, at the edge of everything she had ever known, the road had simply... stopped.

Before her lay an ancient gate, half-consumed by climbing vines. Beyond it, a land of terraced hills and jade-green rivers stretched to the horizon. The air smelled of tea leaves and incense.

"You have come a long way," said a voice.

Sophie turned. An old man sat cross-legged beneath a gnarled pine tree. He wore robes the color of undyed silk, and before him lay a arrangement of broken lines — solid and divided — carved into flat pieces of bone.

"Who are you?" Sophie asked.

"I am the one who dreamed your arrival," the old man said, his eyes crinkling with amusement. "I am Zhou Gong. Once, I helped build the rites and music of a civilization. Now, I read the patterns of change itself."

He gestured to the bone fragments. "The *I Ching* — the Book of Changes. Eight trigrams, sixty-four hexagrams. Every possible transformation in the universe, encoded in broken and unbroken lines. Would you like to know what the oracle says about your journey?"

Sophie hesitated. In her old life — the life inside the book — a philosopher named Alberto had sent her letters about the history of Western thought. But here, outside the pages, the philosophy was not written in letters. It was carved into bone, painted onto silk, whispered in dreams.

"Yes," she said.

Zhou Gong cast the yarrow stalks. They fell in a pattern he studied for a long moment.

"*Qian* above, *Kun* below," he murmured. "Heaven within the earth. The moment of hidden potential — the seed beneath the frozen ground." He looked up. "Your journey through this land will not be about finding answers, Sophie. It will be about learning to ask the questions that this civilization has asked for three thousand years."

"Three thousand years?"

"Longer," Zhou Gong said. "The sages of this land have asked: What is the Way? What makes a good life? How should humans relate to one another, to nature, to the cosmos itself? They have answered in many voices — some quiet as flowing water, some fierce as war drums." He gestured toward the gate. "Beyond this gate, ten great thinkers await you. Each will challenge what you think you know."

Sophie looked at the gate. "And you? Are you one of them?"

Zhou Gong smiled. "I am the door. I am the dream that opens the door. In this land, they say *Zhou Gong Jie Meng* — 'Zhou Gong interprets dreams.' Tell me, Sophie: are you a girl who dreamed she was a character in a book? Or a character in a book who is dreaming she is free?"

The question hung in the air like incense smoke.

Sophie stepped through the gate.
```

- [ ] **Step 2: Verify build can read the content**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add content/journeys/
git commit -m "feat: add prologue content for Sophie's Journey (Zhou Gong)"
```

---

### Task 4: Create the Landing Page

**Files:**
- Create: `components/JourneyTimeline.tsx`
- Create: `components/PhilosopherCard.tsx`
- Create: `app/sophies-journey/page.tsx`

- [ ] **Step 1: Create JourneyTimeline component**

Create `components/JourneyTimeline.tsx`:

```typescript
import Link from "next/link";
import { JourneyMeta } from "@/lib/types";

export default function JourneyTimeline({ journeys }: { journeys: JourneyMeta[] }) {
  return (
    <div className="relative">
      <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-sand" />
      <div className="space-y-8">
        {journeys.map((journey) => {
          const isLeft = journey.chapter % 2 === 0;
          return (
            <div
              key={journey.slug}
              className={`relative flex items-center ${
                isLeft ? "md:flex-row" : "md:flex-row-reverse"
              } flex-row`}
            >
              {/* Timeline dot */}
              <div
                className="absolute left-4 md:left-1/2 w-4 h-4 rounded-full border-2 border-white -translate-x-1/2 z-10"
                style={{ backgroundColor: journey.color }}
              />

              {/* Content card */}
              <div className={`ml-12 md:ml-0 ${isLeft ? "md:mr-auto md:pr-12" : "md:ml-auto md:pl-12"} md:w-1/2`}>
                <Link href={`/sophies-journey/${journey.slug}`} className="block group">
                  <div className="bg-white rounded-xl border border-sand p-5 hover:border-china-red/30 hover:shadow-sm transition-all">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: journey.color }}
                      >
                        {journey.chapter === 0 ? "Prologue" : journey.chapter === 11 ? "Epilogue" : `Chapter ${journey.chapter}`}
                      </span>
                      {journey.school && (
                        <span className="text-xs text-warm">{journey.school}</span>
                      )}
                    </div>
                    <h3 className="font-semibold text-ink group-hover:text-china-red transition-colors">
                      {journey.title}
                    </h3>
                    <p className="text-sm text-warm mt-1">{journey.title_zh}</p>
                    {journey.philosopher && (
                      <p className="text-xs text-warm/70 mt-2">
                        {journey.philosopher} {journey.philosopher_zh} · {journey.era}
                      </p>
                    )}
                  </div>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create PhilosopherCard component**

Create `components/PhilosopherCard.tsx`:

```typescript
import Link from "next/link";
import { JourneyMeta, SCHOOLS } from "@/lib/types";

export default function PhilosopherCard({ journey }: { journey: JourneyMeta }) {
  const school = SCHOOLS.find((s) => s.id === journey.school);
  const symbol = school?.symbol || "●";

  return (
    <Link href={`/sophies-journey/${journey.slug}`} className="block group">
      <div className="bg-white rounded-xl border border-sand p-5 hover:border-china-red/30 hover:shadow-sm transition-all text-center h-full">
        <div
          className="text-3xl mb-3"
          style={{ color: journey.color }}
        >
          {symbol}
        </div>
        <h3 className="font-semibold text-ink group-hover:text-china-red transition-colors">
          {journey.philosopher || "Journey's End"}
        </h3>
        {journey.philosopher_zh && (
          <p className="text-sm text-warm mt-0.5">{journey.philosopher_zh}</p>
        )}
        {school && (
          <p className="text-xs text-warm/70 mt-2">
            {school.name} · {school.name_zh}
          </p>
        )}
        <p className="text-xs text-warm/50 mt-1">{journey.era}</p>
      </div>
    </Link>
  );
}
```

- [ ] **Step 3: Create the landing page**

Create `app/sophies-journey/page.tsx`:

```typescript
import { getAllJourneys } from "@/lib/journeys";
import JourneyTimeline from "@/components/JourneyTimeline";
import PhilosopherCard from "@/components/PhilosopherCard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sophie's Journey East — GoEast.ai",
  description:
    "Having escaped the pages of a book, Sophie travels East and encounters China's greatest philosophers. A narrative exploration of Chinese thought.",
  openGraph: {
    title: "Sophie's Journey East — GoEast.ai",
    description:
      "Having escaped the pages of a book, Sophie travels East and encounters China's greatest philosophers.",
    type: "article",
  },
};

export default function JourneyLandingPage() {
  const journeys = getAllJourneys();

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-ink via-ink/90 to-gold/20" />
        <div className="relative max-w-4xl mx-auto px-4 py-20 text-center text-white">
          <p className="text-sm tracking-[0.3em] opacity-70 mb-4">苏菲的东方之旅</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Sophie&apos;s Journey East
          </h1>
          <p className="text-lg opacity-80 max-w-2xl mx-auto mb-8">
            Having escaped the pages of a book, a young girl travels East — and meets
            the philosophers who shaped a civilization.
          </p>
          <a
            href="#journey"
            className="inline-block bg-china-red text-white px-6 py-2.5 rounded-lg hover:bg-china-red/90 transition-colors"
          >
            Begin the Journey ↓
          </a>
        </div>
      </section>

      {/* Journey Timeline */}
      <section id="journey" className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-ink mb-2">The Journey</h2>
        <p className="text-warm mb-10">
          Follow Sophie&apos;s path from the Silk Road through China&apos;s heartland
          <br />
          <span className="text-sm">追溯苏菲从丝绸之路到中原大地的旅途</span>
        </p>
        <JourneyTimeline journeys={journeys} />
      </section>

      {/* Philosopher Gallery */}
      <section className="max-w-6xl mx-auto px-4 py-16 border-t border-sand">
        <h2 className="text-2xl font-bold text-ink mb-2">The Philosophers</h2>
        <p className="text-warm mb-8">
          Eleven thinkers across three thousand years of Chinese thought
          <br />
          <span className="text-sm">横跨三千年的十一位思想家</span>
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {journeys
            .filter((j) => j.philosopher)
            .map((journey) => (
              <PhilosopherCard key={journey.slug} journey={journey} />
            ))}
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 4: Verify the landing page builds**

Run: `npm run build`
Expected: Build succeeds. The landing page shows the timeline and philosopher gallery.

- [ ] **Step 5: Commit**

```bash
git add components/JourneyTimeline.tsx components/PhilosopherCard.tsx app/sophies-journey/page.tsx
git commit -m "feat: add Sophie's Journey landing page with timeline and philosopher gallery"
```

---

### Task 5: Create the Story Detail Page

**Files:**
- Create: `app/sophies-journey/[slug]/page.tsx`

- [ ] **Step 1: Create the story detail page**

Create `app/sophies-journey/[slug]/page.tsx`:

```typescript
import { notFound } from "next/navigation";
import Link from "next/link";
import { getJourneyWithHtml, getJourneySlugs, getAllJourneys } from "@/lib/journeys";
import type { Metadata } from "next";

export async function generateStaticParams() {
  return getJourneySlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const journeys = getAllJourneys();
  const meta = journeys.find((j) => j.slug === slug);
  if (!meta) return {};
  return {
    title: `${meta.title} — Sophie's Journey — GoEast.ai`,
    description: meta.quote
      ? `${meta.quote} — ${meta.quote_source}`
      : `${meta.title} - ${meta.title_zh}`,
    openGraph: {
      title: `${meta.title} — Sophie's Journey`,
      description: meta.quote || `${meta.title} - ${meta.title_zh}`,
      type: "article",
    },
  };
}

export default async function JourneyStoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const journey = await getJourneyWithHtml(slug);
  if (!journey) notFound();

  const allJourneys = getAllJourneys();
  const currentIndex = allJourneys.findIndex((j) => j.slug === slug);
  const prev = currentIndex > 0 ? allJourneys[currentIndex - 1] : null;
  const next = currentIndex < allJourneys.length - 1 ? allJourneys[currentIndex + 1] : null;

  return (
    <article className="max-w-3xl mx-auto px-4 py-12">
      {/* Breadcrumb */}
      <nav className="text-sm text-warm mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-china-red transition-colors">
          Home
        </Link>
        <span>/</span>
        <Link href="/sophies-journey" className="hover:text-china-red transition-colors">
          Sophie&apos;s Journey
        </Link>
        <span>/</span>
        <span className="text-ink">{journey.title}</span>
      </nav>

      {/* Chapter Header */}
      <header className="mb-10 border-b-2 pb-6" style={{ borderColor: journey.color }}>
        <div className="flex items-center gap-2 mb-3">
          <span
            className="text-xs font-medium px-2.5 py-1 rounded-full text-white"
            style={{ backgroundColor: journey.color }}
          >
            {journey.chapter === 0
              ? "PROLOGUE"
              : journey.chapter === 11
              ? "EPILOGUE"
              : `CHAPTER ${journey.chapter}`}
          </span>
          {journey.school && (
            <span className="text-xs text-warm tracking-wide uppercase">
              {journey.school} · {journey.school_zh}
            </span>
          )}
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-ink mb-1">
          {journey.title}
        </h1>
        <p className="text-lg text-warm">{journey.title_zh}</p>
        {(journey.philosopher || journey.era || journey.location) && (
          <p className="text-sm text-warm/70 mt-3">
            {journey.philosopher} {journey.philosopher_zh}
            {journey.era && ` · ${journey.era}`}
            {" · "}
            {journey.location}
          </p>
        )}
      </header>

      {/* Story Content */}
      <div
        className="prose prose-warm max-w-none prose-headings:text-ink prose-headings:font-semibold prose-a:text-china-red prose-a:no-underline hover:prose-a:underline prose-p:text-ink/90 prose-p:leading-relaxed"
        dangerouslySetInnerHTML={{ __html: journey.content }}
      />

      {/* Quote Callout */}
      {journey.quote && (
        <blockquote
          className="my-10 border-l-4 pl-6 py-2"
          style={{ borderColor: journey.color }}
        >
          <p className="text-lg italic text-ink">{journey.quote}</p>
          {journey.quote_zh && (
            <p className="text-base text-warm mt-2">{journey.quote_zh}</p>
          )}
          {journey.quote_source && (
            <cite className="text-sm text-warm/70 mt-2 block not-italic">
              — {journey.quote_source}
            </cite>
          )}
        </blockquote>
      )}

      {/* Chapter Navigation */}
      <nav className="mt-12 pt-6 border-t border-sand flex justify-between">
        {prev ? (
          <Link
            href={`/sophies-journey/${prev.slug}`}
            className="text-sm text-warm hover:text-china-red transition-colors"
          >
            ← {prev.chapter === 0 ? "Prologue" : `Chapter ${prev.chapter}`}: {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/sophies-journey/${next.slug}`}
            className="text-sm font-medium text-china-red hover:text-china-red/80 transition-colors"
          >
            {next.chapter === 11 ? "Epilogue" : `Chapter ${next.chapter}`}: {next.title} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </article>
  );
}
```

- [ ] **Step 2: Verify the story page builds**

Run: `npm run build`
Expected: Build succeeds. The prologue page renders at `/sophies-journey/prologue-zhougong`.

- [ ] **Step 3: Commit**

```bash
git add app/sophies-journey/[slug]/page.tsx
git commit -m "feat: add Sophie's Journey story detail page with navigation"
```

---

### Task 6: Add Navigation Link in Header

**Files:**
- Modify: `components/Header.tsx`

- [ ] **Step 1: Add Journey link to Header navigation**

In `components/Header.tsx`, add a new Link between the Skills and Categories links:

```typescript
<Link
  href="/sophies-journey"
  className="text-warm hover:text-china-red transition-colors"
>
  Journey
</Link>
```

The updated nav section should look like:

```typescript
<div className="flex items-center gap-6 text-sm">
  <Link
    href="/skills"
    className="text-warm hover:text-china-red transition-colors"
  >
    Skills
  </Link>
  <Link
    href="/sophies-journey"
    className="text-warm hover:text-china-red transition-colors"
  >
    Journey
  </Link>
  <Link
    href="/categories/travel"
    className="text-warm hover:text-china-red transition-colors"
  >
    Categories
  </Link>
  <Link
    href="/about"
    className="text-warm hover:text-china-red transition-colors"
  >
    About
  </Link>
  <Link
    href="/contact"
    className="text-warm hover:text-china-red transition-colors"
  >
    Contact
  </Link>
  <Link
    href="/submit"
    className="bg-china-red text-white px-4 py-1.5 rounded-lg text-sm hover:bg-china-red/90 transition-colors"
  >
    Submit
  </Link>
</div>
```

- [ ] **Step 2: Verify header renders correctly**

Run: `npm run dev`
Expected: Header shows Skills, **Journey**, Categories, About, Contact, Submit.

- [ ] **Step 3: Commit**

```bash
git add components/Header.tsx
git commit -m "feat: add Journey link to site header navigation"
```

---

### Task 7: Write All 12 Stories

**Files:**
- Create: `content/journeys/ch01-laozi.md` through `content/journeys/epilogue.md`

This is the largest task. Each story is a creative writing piece (~1500-2500 words) that should be written using the creative-writing-skills plugin for quality. All 12 files can be written in parallel using subagents.

Each file must include the exact frontmatter below, followed by the story content in Markdown.

- [ ] **Step 1: Write ch01-laozi.md**

Frontmatter:
```yaml
---
slug: ch01-laozi
chapter: 1
title: "The Way Without Direction"
title_zh: "無為之道的方向"
philosopher: "Laozi"
philosopher_zh: "老子"
era: "6th century BCE"
school: "daoism"
school_zh: "道家"
location: "Silk Road"
color: "#2d5016"
quote: "The Tao that can be told is not the eternal Tao."
quote_source: "Tao Te Ching (道德经), Chapter 1"
quote_zh: "道可道，非常道。"
---
```

Story direction: Sophie is lost at a Silk Road crossroads. An old man (Laozi) pours tea nearby, unconcerned by time. He teaches her that not knowing where to go may be the beginning of finding the Way. The tea ceremony becomes a metaphor for wu wei — the art of non-action, letting things unfold. Sophie learns that the hardest part of freedom is stopping the urge to control her path.

- [ ] **Step 2: Write ch02-confucius.md**

Frontmatter:
```yaml
---
slug: ch02-confucius
chapter: 2
title: "The Weight of Ritual"
title_zh: "礼仪之重"
philosopher: "Confucius"
philosopher_zh: "孔子"
era: "551–479 BCE"
school: "confucianism"
school_zh: "儒家"
location: "Lu (modern Shandong)"
color: "#8b0000"
quote: "Is it not a pleasure to learn and to repeat or practice from time to time?"
quote_source: "Analects (论语), 1.1"
quote_zh: "学而时习之，不亦说乎？"
---
```

Story direction: Sophie enters a bustling Chinese city and accidentally offends people through ignorance of social customs. Confucius appears as a patient teacher who explains that ritual (li) is not empty formality but the fabric that holds human relationships together. He introduces ren (benevolence) — caring for others as the foundation of civilization. Sophie reflects on how Western individualism and Confucian relational thinking approach the same human needs differently.

- [ ] **Step 3: Write ch03-sunzi.md**

Frontmatter:
```yaml
---
slug: ch03-sunzi
chapter: 3
title: "Knowing and Not Knowing"
title_zh: "知己知彼"
philosopher: "Sunzi"
philosopher_zh: "孙子"
era: "544–496 BCE"
school: "strategy"
school_zh: "兵家"
location: "Wu (modern Jiangsu)"
color: "#4a4a4a"
quote: "Know yourself and know your enemy, and you will never be defeated."
quote_source: "The Art of War (孙子兵法), Chapter 3"
quote_zh: "知己知彼，百战不殆。"
---
```

Story direction: Sophie is caught in a difficult situation — perhaps a marketplace dispute or a conflict between two groups. Sunzi appears and teaches her that the highest form of strategy is to win without fighting. He reframes conflict as a problem of understanding — knowing yourself, knowing the situation, and choosing the right moment to act (or not act). Sophie learns that strategy and philosophy are not so different.

- [ ] **Step 4: Write ch04-zhuangzi.md**

Frontmatter:
```yaml
---
slug: ch04-zhuangzi
chapter: 4
title: "The Butterfly's Question"
title_zh: "蝴蝶之问"
philosopher: "Zhuangzi"
philosopher_zh: "庄子"
era: "4th century BCE"
school: "daoism"
school_zh: "道家"
location: "Meng (modern Henan)"
color: "#2d5016"
quote: "I do not know whether I was Zhuangzi dreaming I was a butterfly, or a butterfly dreaming I am Zhuangzi."
quote_source: "Zhuangzi (庄子), Chapter 2"
quote_zh: "不知周之梦为蝴蝶与，蝴蝶之梦为周与？"
---
```

Story direction: The most directly relevant to Sophie's condition. She meets Zhuangzi, who immediately sees through her — "You are the one who escaped from a book, aren't you?" He tells her the butterfly dream, and Sophie realizes that her own situation is the same paradox. Was she a real girl who was trapped in a book? Or is she a book character who is dreaming of freedom? Zhuangzi laughs and suggests the question itself is the answer — freedom means not needing to resolve the question.

- [ ] **Step 5: Write ch05-mencius.md**

Frontmatter:
```yaml
---
slug: ch05-mencius
chapter: 5
title: "The Seed of Compassion"
title_zh: "恻隐之心"
philosopher: "Mencius"
philosopher_zh: "孟子"
era: "372–289 BCE"
school: "confucianism"
school_zh: "儒家"
location: "Zou (modern Shandong)"
color: "#8b0000"
quote: "No man is devoid of a heart sensitive to the suffering of others."
quote_source: "Mencius (孟子), 2A.6"
quote_zh: "人皆有不忍人之心。"
---
```

Story direction: Sophie witnesses something troubling — perhaps a child in danger or a person in distress. She hesitates, and someone helps before she can. Mencius appears and uses this moment to explain his theory of the "four beginnings" — the innate seeds of virtue in every person. He argues that human nature is fundamentally good, not because people always act well, but because the impulse toward goodness is universal. Sophie struggles with this — she has seen cruelty in both the book world and the real one.

- [ ] **Step 6: Write ch06-mozi.md**

Frontmatter:
```yaml
---
slug: ch06-mozi
chapter: 6
title: "The Art of Universal Love"
title_zh: "兼爱之术"
philosopher: "Mozi"
philosopher_zh: "墨子"
era: "470–391 BCE"
school: "mohism"
school_zh: "墨家"
location: "Lu (modern Shandong)"
color: "#1a5276"
quote: "Universal love and mutual benefit — these are the principles of the benevolent."
quote_source: "Mozi (墨子), Chapter 15"
quote_zh: "兼相爱，交相利，此圣王之法，天下之治道也。"
---
```

Story direction: Sophie encounters two communities in conflict — perhaps over resources or territory. Mozi appears as a pragmatic engineer-philosopher, a man who understands fortifications and defenses but argues against war. He proposes jian ai (universal love) — caring for everyone equally, not privileging your own family or group. Sophie is skeptical (isn't Confucian graduated love more natural?) and Mozi challenges her: what has "natural" partiality produced but endless war?

- [ ] **Step 7: Write ch07-zhuxi.md**

Frontmatter:
```yaml
---
slug: ch07-zhuxi
chapter: 7
title: "Investigating Things"
title_zh: "格物致知"
philosopher: "Zhu Xi"
philosopher_zh: "朱熹"
era: "1130–1200 CE"
school: "neo-confucianism"
school_zh: "理学"
location: "Wuyi Mountains (Fujian)"
color: "#6c3483"
quote: "To investigate things is to exhaust their principle."
quote_source: "Greater Learning Commentary (大学章句)"
quote_zh: "所谓致知在格物者，言欲致吾之知，在即物而穷其理也。"
---
```

Story direction: Sophie is overwhelmed by the sheer complexity of Chinese culture — the language, the customs, the history. She feels she will never understand it. Zhu Xi meets her in a mountain academy and teaches her gewu zhizhi — the methodical investigation of things to extend knowledge. He shows her that understanding comes not from grasping everything at once, but from studying one thing deeply at a time, finding the li (principle) within it. Every particular contains the universal.

- [ ] **Step 8: Write ch08-zhangzai.md**

Frontmatter:
```yaml
---
slug: ch08-zhangzai
chapter: 8
title: "Setting the Heart for Heaven and Earth"
title_zh: "为天地立心"
philosopher: "Zhang Zai"
philosopher_zh: "张载"
era: "1020–1077 CE"
school: "neo-confucianism"
school_zh: "理学"
location: "Guanzhong (modern Shaanxi)"
color: "#6c3483"
quote: "Set your heart for heaven and earth, establish destiny for the people, continue the lost learning of past sages, and open peace for ten thousand generations."
quote_source: "The Four Statements of Hengqu (横渠四句)"
quote_zh: "为天地立心，为生民立命，为往圣继绝学，为万世开太平。"
---
```

Story direction: Sophie has lost her sense of purpose. As a "free being" with no author, no plot, no destiny — what is she living for? Zhang Zai appears and shares his famous Four Statements. He argues that purpose is not given from outside (not by an author, not by fate) but is something you create by aligning yourself with the cosmos. Sophie begins to see that her freedom is not an absence of purpose but an invitation to create one.

- [ ] **Step 9: Write ch09-huineng.md**

Frontmatter:
```yaml
---
slug: ch09-huineng
chapter: 9
title: "Originally Nothing"
title_zh: "本来无一物"
philosopher: "Huineng"
philosopher_zh: "惠能"
era: "638–713 CE"
school: "zen"
school_zh: "禅宗"
location: "Caoxi (modern Guangdong)"
color: "#d4a017"
quote: "Originally there is not a single thing — where could dust gather?"
quote_source: "Platform Sutra (六祖坛经)"
quote_zh: "本来无一物，何处惹尘埃。"
---
```

Story direction: Sophie seeks inner peace at a mountain temple but her mind is chaotic — too many questions, too many philosophers, too many contradictions. Huineng, the Sixth Patriarch of Zen, appears not as a teacher but as someone who simply sits beside her. He does not explain — he demonstrates. Through a series of paradoxical exchanges (koans), he points her toward the realization that the peace she seeks is not something to be found but something to be recognized — it was always there, obscured by the very effort to find it.

- [ ] **Step 10: Write ch10-wangyangming.md**

Frontmatter:
```yaml
---
slug: ch10-wangyangming
chapter: 10
title: "Unity of Knowledge and Action"
title_zh: "知行合一"
philosopher: "Wang Yangming"
philosopher_zh: "王阳明"
era: "1472–1529 CE"
school: "mind-school"
school_zh: "心学"
location: "Longchang (modern Guizhou)"
color: "#c0392b"
quote: "Knowledge and action are one. To know and not to act is not to know."
quote_source: "Instructions for Practical Living (传习录)"
quote_zh: "知之真切笃实处即是行，行之明觉精察处即是知。"
---
```

Story direction: Sophie faces her final challenge — she has learned from ten philosophers, accumulated wisdom from across three thousand years, but cannot bring herself to act on what she knows. She meets Wang Yangming in exile at Longchang, where he himself had a breakthrough realization. He teaches her zhi xing he yi — knowledge and action are inseparable. To truly know something is to act on it; to fail to act is to prove you never truly knew. Sophie realizes her entire journey has been preparation not for more thinking, but for doing.

- [ ] **Step 11: Write epilogue.md**

Frontmatter:
```yaml
---
slug: epilogue
chapter: 11
title: "East Meets West"
title_zh: "东西交汇"
location: "Where the journey ends and begins again"
color: "#8b4513"
quote: "The way that can be walked is not the eternal Way — but walk it we must."
quote_source: "Sophie's own words"
quote_zh: "道可道，非常道——但我们必须走下去。"
---
```

Story direction: Sophie stands at the eastern shore, looking out at the sea. She reflects on her journey through Chinese thought — the effortless flow of Daoism, the relational warmth of Confucianism, the strategic clarity of Sunzi, the existential playfulness of Zhuangzi, the moral conviction of Mencius, the radical equality of Mozi, the systematic rigor of Zhu Xi, the cosmic purpose of Zhang Zai, the sudden clarity of Huineng, and the call to action from Wang Yangming. She sees how these traditions, for all their differences, are in conversation with each other — and with the Western philosophers she learned from Alberto. She is no longer just a character who escaped a book. She is a traveler between worlds of thought. She turns westward, carrying East with her.

- [ ] **Step 12: Verify all stories build**

Run: `npm run build`
Expected: Build succeeds. All 12 pages render correctly.

- [ ] **Step 13: Commit**

```bash
git add content/journeys/
git commit -m "feat: add all 12 Sophie's Journey stories (prologue through epilogue)"
```

---

### Task 8: Final Build Verification and Smoke Test

- [ ] **Step 1: Run full build**

Run: `npm run build`
Expected: Clean build with no errors, all pages statically generated.

- [ ] **Step 2: Start dev server and manually verify**

Run: `npm run dev`

Check:
- `/sophies-journey` — landing page with hero, timeline, and philosopher gallery
- `/sophies-journey/prologue-zhougong` — prologue story renders correctly
- `/sophies-journey/ch01-laozi` — story with prev/next navigation
- `/sophies-journey/ch04-zhuangzi` — butterfly dream story
- `/sophies-journey/epilogue` — epilogue without philosopher/school fields
- Header shows "Journey" link
- All timeline nodes are clickable and lead to correct story pages
- Prev/Next navigation cycles through all chapters in order

- [ ] **Step 3: Final commit**

```bash
git commit --allow-empty -m "feat: Sophie's Journey East — feature complete"
```
