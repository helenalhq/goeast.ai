# Content Matrix + Monetization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a ~115-page SEO content matrix across 4 content types (philosophers, I Ching, glossary, insights) to attract Chinese culture enthusiasts, then reposition Oracle Pro as a value-add monetization layer.

**Architecture:** Each content type follows the established pattern: Markdown files in `content/` → gray-matter parsing via `lib/*.ts` data layer → Next.js App Router pages → SEO integration (sitemap, JsonLd, llms.txt). I Ching uses a structured TypeScript data file instead of 64 individual markdown files. All pages include Oracle CTA for conversion.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, gray-matter, remark/remark-html

**Note:** No test framework is configured. Verification is via `npm run build` (compile check) and `npm run dev` (visual check).

---

## Phase 1: Philosopher Deep Pages

### Task 1: Add Philosopher types to lib/types.ts

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Add PhilosopherMeta and PhilosopherDeep interfaces**

Add after the existing `Journey` interface (after line 54):

```typescript
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
```

- [ ] **Step 2: Add PHILOSOPHER_SLUGS constant and mapping**

Add after the `SCHOOLS` constant (after line 124):

```typescript
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
```

- [ ] **Step 3: Verify build compiles**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add PhilosopherMeta and PhilosopherDeep types with PHILOSOPHER_SLUGS constant"
```

---

### Task 2: Create lib/philosophers.ts data layer

**Files:**
- Create: `lib/philosophers.ts`

- [ ] **Step 1: Write the data layer module**

Create `lib/philosophers.ts`:

```typescript
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";
import { PhilosopherDeep, PhilosopherMeta, PHILOSOPHER_SLUGS, SCHOOLS } from "./types";

const philosophersDirectory = path.join(process.cwd(), "content/philosophers");

export function getPhilosopherSlugs(): string[] {
  return Object.keys(PHILOSOPHER_SLUGS);
}

export function getPhilosopherBySlug(slug: string): PhilosopherDeep | null {
  const meta = PHILOSOPHER_SLUGS[slug];
  if (!meta) return null;

  const fullPath = path.join(philosophersDirectory, `${slug}.md`);
  if (!fs.existsSync(fullPath)) {
    // Return philosopher with empty content fields if markdown file doesn't exist yet
    return {
      ...meta,
      school_zh: SCHOOLS.find((s) => s.id === meta.school)?.name_zh,
      biography: "",
      core_concepts: [],
      quotes: [],
      modern_influence: "",
    };
  }

  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  return {
    ...meta,
    school_zh: data.school_zh || SCHOOLS.find((s) => s.id === meta.school)?.name_zh,
    biography: data.biography || content,
    biography_zh: data.biography_zh,
    core_concepts: data.core_concepts || [],
    quotes: data.quotes || [],
    modern_influence: data.modern_influence || "",
    modern_influence_zh: data.modern_influence_zh,
    journey_slug: data.journey_slug,
  };
}

export async function getPhilosopherWithHtml(slug: string): Promise<PhilosopherDeep | null> {
  const philosopher = getPhilosopherBySlug(slug);
  if (!philosopher) return null;

  const processedBiography = philosopher.biography
    ? (await remark().use(html).process(philosopher.biography)).toString()
    : "";

  const processedBiographyZh = philosopher.biography_zh
    ? (await remark().use(html).process(philosopher.biography_zh)).toString()
    : undefined;

  const processedModernInfluence = philosopher.modern_influence
    ? (await remark().use(html).process(philosopher.modern_influence)).toString()
    : "";

  const processedModernInfluenceZh = philosopher.modern_influence_zh
    ? (await remark().use(html).process(philosopher.modern_influence_zh)).toString()
    : undefined;

  return {
    ...philosopher,
    biography: processedBiography,
    biography_zh: processedBiographyZh,
    modern_influence: processedModernInfluence,
    modern_influence_zh: processedModernInfluenceZh,
  };
}

export function getAllPhilosophers(): PhilosopherMeta[] {
  return Object.values(PHILOSOPHER_SLUGS);
}
```

- [ ] **Step 2: Verify build compiles**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add lib/philosophers.ts
git commit -m "feat: add philosophers data layer (getPhilosopherBySlug, getPhilosopherWithHtml, getAllPhilosophers)"
```

---

### Task 3: Create philosopher content files

**Files:**
- Create: `content/philosophers/` directory
- Create: 11 markdown files (laozi.md, confucius.md, etc.)

The frontmatter schema for philosopher content files:

```yaml
---
slug: laozi
name: Laozi
name_zh: 老子
era: 6th century BCE
era_zh: 公元前6世纪
school: daoism
school_zh: 道家
journey_slug: ch01-laozi
biography_zh: |
  (Chinese biography text)
modern_influence: |
  (Markdown — English modern influence text)
modern_influence_zh: |
  (Chinese modern influence text)
core_concepts:
  - name: Dao
    name_zh: 道
    description: The fundamental concept...
    description_zh: 道是...
  - name: Wuwei
    name_zh: 无为
    description: ...
    description_zh: ...
quotes:
  - text: "The Tao that can be told..."
    text_zh: "道可道，非常道"
    source: Tao Te Ching, Chapter 1
    source_zh: 《道德经》第一章
    interpretation: ...
    interpretation_zh: ...
---
(English biography as markdown body)
```

- [ ] **Step 1: Create content/philosophers directory**

```bash
mkdir -p content/philosophers
```

- [ ] **Step 2: Create laozi.md as the first example content file**

Create `content/philosophers/laozi.md` with full bilingual content covering biography, core concepts (Dao, Wuwei, Ziran, Pu, De), 5+ quotes with interpretations, and modern influence section. This establishes the template for all other philosopher files.

- [ ] **Step 3: Create confucius.md as the second example**

Create `content/philosophers/confucius.md` with full bilingual content covering biography, core concepts (Ren, Li, Junzi, Zhongyong), quotes, and modern influence.

- [ ] **Step 4: Create remaining 9 philosopher content files**

Create files for: `zhou-gong.md`, `sunzi.md`, `zhuangzi.md`, `mencius.md`, `mozi.md`, `zhu-xi.md`, `zhang-zai.md`, `huineng.md`, `wang-yangming.md`. Each follows the same frontmatter schema with biography body, core_concepts, quotes, modern_influence sections. Content quality matters for SEO — write substantive, original English prose for each philosopher.

- [ ] **Step 5: Verify data layer reads content correctly**

Run: `npm run dev` and open browser to check that `getAllPhilosophers()` and `getPhilosopherBySlug('laozi')` return populated data.

- [ ] **Step 6: Commit**

```bash
git add content/philosophers/
git commit -m "feat: add 11 philosopher deep content markdown files"
```

---

### Task 4: Create PhilosopherCardDeep component

**Files:**
- Create: `components/PhilosopherCardDeep.tsx`

- [ ] **Step 1: Write the component**

Create `components/PhilosopherCardDeep.tsx` — a card for the philosopher list page, building on the existing PhilosopherCard pattern but showing more info:

```tsx
import Image from "next/image";
import Link from "next/link";
import { PhilosopherMeta, SCHOOLS, getPhilosopherImage } from "@/lib/types";

export default function PhilosopherCardDeep({ philosopher }: { philosopher: PhilosopherMeta }) {
  const school = SCHOOLS.find((s) => s.id === philosopher.school);
  const portrait = philosopher.portrait_slug ? getPhilosopherImage(philosopher.portrait_slug) : null;

  return (
    <Link href={`/philosophers/${philosopher.slug}`} className="group block">
      <div className="bg-white rounded-xl border border-sand hover:border-warm/40 transition-all overflow-hidden">
        <div className="relative aspect-[2/3] overflow-hidden">
          {portrait ? (
            <Image
              src={portrait}
              alt={`${philosopher.name} — ${philosopher.name_zh}`}
              fill
              className="object-cover object-top group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div
              className="flex items-center justify-center w-full h-full text-6xl"
              style={{ backgroundColor: school?.color || "#8b7355" }}
            >
              <span className="text-white/80">{school?.symbol || "?"}</span>
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="text-lg font-semibold text-ink group-hover:text-china-red transition-colors">
            {philosopher.name}
          </h3>
          <p className="text-sm text-warm">{philosopher.name_zh}</p>
          {school && (
            <p className="text-xs text-warm/60 mt-1">
              {school.name} · {school.name_zh}
            </p>
          )}
          <p className="text-xs text-warm/50 mt-1">{philosopher.era}</p>
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Success.

- [ ] **Step 3: Commit**

```bash
git add components/PhilosopherCardDeep.tsx
git commit -m "feat: add PhilosopherCardDeep component for philosopher list page"
```

---

### Task 5: Create Oracle CTA component

**Files:**
- Create: `components/OracleCta.tsx`

- [ ] **Step 1: Write the reusable Oracle CTA component**

This component appears at the bottom of every content page to drive conversion:

```tsx
import Link from "next/link";
import { SCHOOLS } from "@/lib/types";

export default function OracleCta({
  philosopherSlug,
  philosopherName,
  philosopherNameZh,
  schoolId,
  message,
}: {
  philosopherSlug?: string;
  philosopherName?: string;
  philosopherNameZh?: string;
  schoolId?: string;
  message?: string;
}) {
  const school = schoolId ? SCHOOLS.find((s) => s.id === schoolId) : null;
  const accentColor = school?.color || "#c0392b";
  const defaultMsg = philosopherName
    ? `Want to speak with ${philosopherName} ${philosopherNameZh || ""}? Try the Oracle.`
    : "Want to consult a Chinese philosopher? Try the Oracle.";
  const displayMsg = message || defaultMsg;

  return (
    <div className="mt-12 p-6 bg-cream rounded-xl border border-sand text-center">
      <p className="text-ink font-serif text-lg mb-4">{displayMsg}</p>
      <Link
        href="/sophies-journey"
        className="inline-block px-6 py-2.5 rounded-full text-white font-medium text-sm transition-colors hover:opacity-90"
        style={{ backgroundColor: accentColor }}
      >
        Consult the Oracle →
      </Link>
      <p className="text-xs text-warm/50 mt-2">Free: 3 consultations per day · Pro: 10 per day + deep features</p>
    </div>
  );
}
```

Note: The CTA links to `/sophies-journey` where the Oracle overlay can be opened from any philosopher. In a later phase, we may add a direct `/oracle` page.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Success.

- [ ] **Step 3: Commit**

```bash
git add components/OracleCta.tsx
git commit -m "feat: add reusable OracleCta component for content page conversion"
```

---

### Task 6: Create philosopher list page

**Files:**
- Create: `app/philosophers/page.tsx`

- [ ] **Step 1: Write the list page**

Create `app/philosophers/page.tsx`:

```tsx
import { getAllPhilosophers } from "@/lib/philosophers";
import { SCHOOLS } from "@/lib/types";
import PhilosopherCardDeep from "@/components/PhilosopherCardDeep";
import OracleCta from "@/components/OracleCta";
import JsonLd from "@/components/JsonLd";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chinese Philosophers — GoEast.ai",
  description: "Explore 3,000 years of Chinese philosophy. Deep profiles of 11 great thinkers from Laozi to Wang Yangming, with core concepts, quotes, and modern influence.",
  alternates: { canonical: "/philosophers" },
  openGraph: {
    title: "Chinese Philosophers — GoEast.ai",
    description: "Explore 3,000 years of Chinese philosophy through 11 great thinkers.",
    type: "website",
  },
};

export default function PhilosophersPage() {
  const philosophers = getAllPhilosophers();

  return (
    <main>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Chinese Philosophers",
          description: "Deep profiles of 11 great Chinese thinkers from Laozi to Wang Yangming.",
          url: "https://www.goeast.ai/philosophers",
          partOf: {
            "@type": "WebSite",
            name: "GoEast.ai",
            url: "https://www.goeast.ai",
          },
        }}
      />

      {/* Hero */}
      <section className="bg-cream py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-ink mb-3">
            Chinese Philosophers
          </h1>
          <p className="text-xl text-warm">中国哲学家</p>
          <p className="text-base text-warm/70 mt-4 max-w-2xl mx-auto">
            Explore 3,000 years of Chinese thought through 11 great thinkers.
            From the I Ching of Zhou Gong to the unity of knowledge and action of Wang Yangming.
          </p>
        </div>
      </section>

      {/* School sections */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        {SCHOOLS.map((school) => {
          const schoolPhilosophers = philosophers.filter((p) => p.school === school.id);
          if (schoolPhilosophers.length === 0) return null;
          return (
            <div key={school.id} className="mb-12">
              <h2 className="text-2xl font-bold text-ink mb-1">
                <span style={{ color: school.color }}>{school.symbol}</span> {school.name}
              </h2>
              <p className="text-sm text-warm mb-6">{school.name_zh}</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {schoolPhilosophers.map((p) => (
                  <PhilosopherCardDeep key={p.slug} philosopher={p} />
                ))}
              </div>
            </div>
          );
        })}
      </section>

      <div className="max-w-3xl mx-auto px-4">
        <OracleCta message="Want to consult a Chinese philosopher directly? Try the Oracle." />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify page renders**

Run: `npm run dev` and open `http://localhost:3000/philosophers`
Expected: Page renders with school sections, philosopher cards, Oracle CTA.

- [ ] **Step 3: Commit**

```bash
git add app/philosophers/page.tsx
git commit -m "feat: add philosopher list page with school sections and Oracle CTA"
```

---

### Task 7: Create philosopher detail page

**Files:**
- Create: `app/philosophers/[slug]/page.tsx`

- [ ] **Step 1: Write the detail page**

Create `app/philosophers/[slug]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getPhilosopherWithHtml, getPhilosopherSlugs } from "@/lib/philosophers";
import { SCHOOLS, getPhilosopherImage } from "@/lib/types";
import OracleCta from "@/components/OracleCta";
import JsonLd from "@/components/JsonLd";
import type { Metadata } from "next";

export async function generateStaticParams() {
  return getPhilosopherSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const philosophers = getPhilosopherSlugs();
  if (!philosophers.includes(slug)) return {};
  // Import meta directly from types to avoid reading content files at build time
  const { PHILOSOPHER_SLUGS } = await import("@/lib/types");
  const meta = PHILOSOPHER_SLUGS[slug];
  if (!meta) return {};
  return {
    title: `${meta.name} (${meta.name_zh}) — Chinese Philosopher — GoEast.ai`,
    description: `Explore ${meta.name}'s philosophy: core concepts, quotes, and modern influence. ${meta.era}.`,
    alternates: { canonical: `/philosophers/${slug}` },
    openGraph: {
      title: `${meta.name} (${meta.name_zh}) — GoEast.ai`,
      description: `Explore ${meta.name}'s philosophy: core concepts, quotes, and modern influence.`,
      type: "article",
    },
  };
}

export default async function PhilosopherDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const philosopher = await getPhilosopherWithHtml(slug);
  if (!philosopher) notFound();

  const school = SCHOOLS.find((s) => s.id === philosopher.school);
  const portrait = philosopher.portrait_slug ? getPhilosopherImage(philosopher.portrait_slug) : null;

  return (
    <article>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: `${philosopher.name} (${philosopher.name_zh})`,
          description: `Explore ${philosopher.name}'s philosophy: core concepts, quotes, and modern influence.`,
          url: `https://www.goeast.ai/philosophers/${philosopher.slug}`,
          author: {
            "@type": "Person",
            name: philosopher.name,
          },
          publisher: {
            "@type": "Organization",
            name: "GoEast.ai",
            url: "https://www.goeast.ai",
          },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://www.goeast.ai" },
            { "@type": "ListItem", position: 2, name: "Philosophers", item: "https://www.goeast.ai/philosophers" },
            { "@type": "ListItem", position: 3, name: philosopher.name, item: `https://www.goeast.ai/philosophers/${philosopher.slug}` },
          ],
        }}
      />

      {/* Hero */}
      <section className="relative w-full bg-cream">
        <div className="max-w-5xl mx-auto px-4 py-12 md:py-16 flex flex-col md:flex-row items-center gap-8 md:gap-12">
          {/* Text */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-4">
              <span
                className="text-xs font-medium px-2.5 py-1 rounded-full text-white"
                style={{ backgroundColor: school?.color || "#8b7355" }}
              >
                {school?.symbol} {school?.name}
              </span>
              <span className="text-xs text-warm">{philosopher.era}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-ink mb-2">
              {philosopher.name}
            </h1>
            <p className="text-lg text-warm mb-1">{philosopher.name_zh}</p>
            {philosopher.location && (
              <p className="text-sm text-warm/70">{philosopher.location} {philosopher.location_zh && `· ${philosopher.location_zh}`}</p>
            )}
          </div>
          {/* Portrait */}
          {portrait && (
            <div className="flex-shrink-0 w-56 md:w-64">
              <div className="relative aspect-[2/3] rounded-2xl overflow-hidden shadow-xl ring-1 ring-sand">
                <Image
                  src={portrait}
                  alt={`${philosopher.name} — ${philosopher.name_zh}`}
                  fill
                  className="object-cover object-top"
                  priority
                />
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <nav className="text-sm text-warm mb-6 flex items-center gap-2">
          <Link href="/" className="hover:text-china-red transition-colors">Home</Link>
          <span>/</span>
          <Link href="/philosophers" className="hover:text-china-red transition-colors">Philosophers</Link>
          <span>/</span>
          <span className="text-ink">{philosopher.name}</span>
        </nav>

        {/* Biography */}
        {philosopher.biography && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">Biography</h2>
            <div className="prose prose-warm max-w-none" dangerouslySetInnerHTML={{ __html: philosopher.biography }} />
          </section>
        )}

        {/* Core Concepts */}
        {philosopher.core_concepts.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">Core Concepts</h2>
            <div className="space-y-6">
              {philosopher.core_concepts.map((concept, i) => (
                <div key={i} className="p-4 bg-cream rounded-lg border border-sand">
                  <h3 className="text-lg font-semibold text-ink mb-1">
                    {concept.name} <span className="text-warm text-base">({concept.name_zh})</span>
                  </h3>
                  <p className="text-sm text-ink/80 leading-relaxed">{concept.description}</p>
                  {concept.description_zh && (
                    <p className="text-sm text-warm/60 leading-relaxed mt-2 border-t border-sand/50 pt-2">
                      {concept.description_zh}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Quotes */}
        {philosopher.quotes.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">Notable Quotes</h2>
            <div className="space-y-4">
              {philosopher.quotes.map((q, i) => (
                <blockquote
                  key={i}
                  className="pl-4 border-l-3 text-ink/80 italic"
                  style={{ borderColor: school?.color || "#8b7355" }}
                >
                  <p className="leading-relaxed">&ldquo;{q.text}&rdquo;</p>
                  {q.text_zh && (
                    <p className="text-warm/60 mt-1 not-italic text-sm">{q.text_zh}</p>
                  )}
                  <footer className="mt-1 text-xs text-warm/50 not-italic">
                    — {q.source} {q.source_zh && `(${q.source_zh})`}
                  </footer>
                  {q.interpretation && (
                    <p className="mt-2 not-italic text-sm text-ink/70 border-t border-sand/30 pt-2">
                      {q.interpretation}
                    </p>
                  )}
                </blockquote>
              ))}
            </div>
          </section>
        )}

        {/* Modern Influence */}
        {philosopher.modern_influence && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">Modern Influence</h2>
            <div className="prose prose-warm max-w-none" dangerouslySetInnerHTML={{ __html: philosopher.modern_influence }} />
          </section>
        )}

        {/* Journey Link */}
        {philosopher.journey_slug && (
          <section className="mb-10 p-4 bg-cream rounded-lg border border-sand">
            <h3 className="text-lg font-semibold text-ink mb-2">Read the Story</h3>
            <p className="text-sm text-warm/70 mb-3">
              Experience {philosopher.name}'s philosophy through Sophie's narrative journey.
            </p>
            <Link
              href={`/sophies-journey/${philosopher.journey_slug}`}
              className="inline-block px-4 py-2 rounded-full text-white font-medium text-sm hover:opacity-90 transition-opacity"
              style={{ backgroundColor: school?.color || "#8b7355" }}
            >
              Read Chapter →
            </Link>
          </section>
        )}

        {/* Oracle CTA */}
        <OracleCta
          philosopherSlug={philosopher.slug}
          philosopherName={philosopher.name}
          philosopherNameZh={philosopher.name_zh}
          schoolId={philosopher.school}
        />
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Verify page renders**

Run: `npm run dev` and open `http://localhost:3000/philosophers/laozi`
Expected: Full detail page with biography, concepts, quotes, modern influence, journey link, Oracle CTA.

- [ ] **Step 3: Commit**

```bash
git add app/philosophers/[slug]/page.tsx
git commit -m "feat: add philosopher detail page with biography, concepts, quotes, modern influence, Oracle CTA"
```

---

### Task 8: Update sitemap for philosopher pages

**Files:**
- Modify: `app/sitemap.ts`

- [ ] **Step 1: Add philosopher pages to sitemap**

Add imports and entries. In `app/sitemap.ts`, add:

```typescript
import { getPhilosopherSlugs } from "@/lib/philosophers";
```

Add after the `journeyPages` definition:

```typescript
const philosopherPages = getPhilosopherSlugs().map((slug) => ({
  url: `${baseUrl}/philosophers/${slug}`,
  lastModified: new Date(),
  changeFrequency: "monthly" as const,
  priority: 0.8,
}));
```

Add `...philosopherPages` to the return array (after `...journeyPages`), and add a listing page entry:

```typescript
{
  url: `${baseUrl}/philosophers`,
  lastModified: new Date(),
  changeFrequency: "weekly",
  priority: 0.9,
},
```

- [ ] **Step 2: Verify sitemap includes philosopher entries**

Run: `npm run dev` and open `http://localhost:3000/sitemap.xml`
Expected: Sitemap contains `/philosophers`, `/philosophers/laozi`, etc.

- [ ] **Step 3: Commit**

```bash
git add app/sitemap.ts
git commit -m "feat: add philosopher pages to sitemap"
```

---

### Task 9: Update llms.txt for philosopher pages

**Files:**
- Modify: `app/llms.txt/route.ts`

- [ ] **Step 1: Add philosopher section to llms.txt**

In `app/llms.txt/route.ts`, add import:

```typescript
import { getAllPhilosophers } from "@/lib/philosophers";
```

Add philosopher rows and section. After `getAllJourneys` call, add:

```typescript
const philosophers = getAllPhilosophers();
const philosopherRows = philosophers.map(
  (p) => `| ${p.name} | ${p.name_zh} | ${p.era} | ${p.school} | /philosophers/${p.slug} |`
);
```

Insert philosopher section in the `lines` array after the Journey section:

```typescript
"",
"## Chinese Philosophers",
"",
`Total: ${philosophers.length} philosophers`,
"",
"| Name | Chinese | Era | School | URL |",
"|------|---------|-----|--------|-----|",
...philosopherRows,
```

- [ ] **Step 2: Verify llms.txt output**

Run: `npm run dev` and open `http://localhost:3000/llms.txt`
Expected: Contains "Chinese Philosophers" section with 11 rows.

- [ ] **Step 3: Commit**

```bash
git add app/llms.txt/route.ts
git commit -m "feat: add philosopher section to llms.txt"
```

---

### Task 10: Phase 1 build verification

- [ ] **Step 1: Run full build**

Run: `npm run build`
Expected: Build succeeds with no errors. All philosopher pages pre-rendered.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No new lint errors.

- [ ] **Step 3: Visual check all 11 philosopher pages**

Run: `npm run dev` and manually visit:
- `/philosophers` — list page renders correctly
- `/philosophers/laozi` — detail page with all sections
- `/philosophers/confucius` — detail page renders
- `/philosophers/zhou-gong` — renders (may have minimal content initially)

Expected: All pages render without errors, Oracle CTA visible on each.

---

## Phase 2: I Ching Interactive Guide + 64 Hexagram Pages

### Task 11: Add I Ching types to lib/types.ts

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Add Trigram and Hexagram interfaces**

Add after `PHILOSOPHER_SLUGS` definitions:

```typescript
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
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Success.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add TrigramInfo, TRIGRAMS constant, and HexagramData types"
```

---

### Task 12: Create lib/iching-data.ts with all 64 hexagrams

**Files:**
- Create: `lib/iching-data.ts`

- [ ] **Step 1: Create the hexagram data file with all 64 entries**

This is a structured data file (not markdown) because hexagram data is a reference dataset. Create `lib/iching-data.ts` with a `HEXAGRAMS: HexagramData[]` array containing all 64 hexagrams with number, name, name_zh, slug, upper/lower trigram, binary, judgment (English + Chinese), image text (English + Chinese).

The 64 hexagrams in King Wen sequence:
1. Qian (乾) - 111111
2. Kun (坤) - 000000
3. Zhun (屯) - 100010
4. Meng (蒙) - 010001
5. Xu (需) - 010111
... through 64. Wei Ji (未济) - 010110

Each entry format:
```typescript
{ number: 1, name: "Qian", name_zh: "乾", slug: "qian", upper_trigram: "Qian", lower_trigram: "Qian", binary: "111111", judgment_en: "The Creative works sublime success...", judgment_zh: "元亨利贞...", image_en: "Heaven in motion...", image_zh: "天行健...", modern_application: "Leadership and initiative...", modern_application_zh: "领导力与主动性..." }
```

Write all 64 entries with substantive judgment and image translations. The slug format: use the pinyin name in lowercase (qian, kun, zhun, meng, xu, song, shi, bi, etc.).

- [ ] **Step 2: Add accessor functions**

```typescript
export function getHexagramByNumber(number: number): HexagramData | null {
  return HEXAGRAMS.find((h) => h.number === number) || null;
}

export function getHexagramBySlug(slug: string): HexagramData | null {
  return HEXAGRAMS.find((h) => h.slug === slug) || null;
}

export function getAllHexagrams(): HexagramData[] {
  return HEXAGRAMS;
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Success.

- [ ] **Step 4: Commit**

```bash
git add lib/iching-data.ts
git commit -m "feat: add I Ching hexagram data file with all 64 hexagrams and accessor functions"
```

---

### Task 13: Create TrigramChart client component

**Files:**
- Create: `components/TrigramChart.tsx`

- [ ] **Step 1: Write the interactive trigram chart**

Create `components/TrigramChart.tsx` as a `"use client"` component that renders the 8 trigrams in an octagonal arrangement (following the Later Heaven arrangement / King Wen arrangement). Each trigram is clickable and shows its attributes in a tooltip/expand.

```tsx
"use client";

import { useState } from "react";
import { TRIGRAMS } from "@/lib/types";

// Later Heaven (King Wen) arrangement: S=Li, W=Dui, N=Kan, E=Zhen, NW=Qian, NE=Gen, SE=Xun, SW=Kun
const LATER_HEAVEN_ORDER = ["li", "kun", "xun", "dui", "qian", "kan", "gen", "zhen"];

export default function TrigramChart() {
  const [selected, setSelected] = useState<string | null>(null);

  const getPosition = (name: string, index: number) => {
    const positions = [
      { x: 50, y: 15 },  // N - Kan (top)
      { x: 85, y: 50 },  // E - Zhen (right)
      { x: 50, y: 85 },  // S - Li (bottom)
      { x: 15, y: 50 },  // W - Dui (left)
      { x: 85, y: 15 },  // NE - Gen
      { x: 15, y: 85 },  // SW - Kun
      { x: 85, y: 85 },  // SE - Xun
      { x: 15, y: 15 },  // NW - Qian
    ];
    return positions[index];
  };

  const orderedTrigrams = LATER_HEAVEN_ORDER.map((name) => TRIGRAMS.find((t) => t.name.toLowerCase() === name)!);
  const selectedTrigram = selected ? TRIGRAMS.find((t) => t.name === selected) : null;

  return (
    <div className="relative w-full max-w-md mx-auto aspect-square">
      {/* Center circle */}
      <div className="absolute inset-[30%] rounded-full border-2 border-sand bg-cream flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold text-ink">太极</p>
          <p className="text-xs text-warm">Taiji · Supreme Ultimate</p>
        </div>
      </div>

      {/* Trigram nodes */}
      {orderedTrigrams.map((trigram, index) => {
        const pos = getPosition(trigram.name.toLowerCase(), index);
        const isSelected = selected === trigram.name;
        return (
          <button
            key={trigram.name}
            onClick={() => setSelected(isSelected ? null : trigram.name)}
            className={`absolute w-16 h-16 -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 transition-all cursor-pointer ${
              isSelected
                ? "border-china-red bg-china-red/10 scale-110 shadow-lg"
                : "border-sand bg-white hover:border-warm hover:scale-105"
            }`}
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          >
            <div className="flex flex-col items-center justify-center h-full">
              <span className="text-xl">{trigram.symbol}</span>
              <span className="text-xs text-warm">{trigram.name_zh}</span>
            </div>
          </button>
        );
      })}

      {/* Selected detail */}
      {selectedTrigram && (
        <div className="mt-4 p-4 bg-cream rounded-lg border border-sand text-center">
          <p className="text-lg font-bold text-ink">
            {selectedTrigram.symbol} {selectedTrigram.name} ({selectedTrigram.name_zh})
          </p>
          <p className="text-sm text-warm">
            Nature: {selectedTrigram.nature} ({selectedTrigram.nature_zh})
          </p>
          <p className="text-sm text-warm">
            Attribute: {selectedTrigram.attribute} ({selectedTrigram.attribute_zh})
          </p>
          <p className="text-sm text-warm/60">
            Image: {selectedTrigram.image} ({selectedTrigram.image_zh})
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Success.

- [ ] **Step 3: Commit**

```bash
git add components/TrigramChart.tsx
git commit -m "feat: add TrigramChart interactive client component with Later Heaven arrangement"
```

---

### Task 14: Create IChingDivination client component

**Files:**
- Create: `components/IChingDivination.tsx`

- [ ] **Step 1: Write the coin-based divination client component**

Create `components/IChingDivination.tsx` — a `"use client"` component that simulates the three-coin method. User clicks "Cast coins" 6 times, each cast generates 3 coin values (2/3 for yin, 3 for yang with special values), builds the hexagram bottom-up.

```tsx
"use client";

import { useState } from "react";
import { HexagramData, TRIGRAMS } from "@/lib/types";
import Link from "next/link";

interface CoinCast {
  values: [number, number, number]; // 3 coins, each 2 or 3
  line: number; // 6=old yang, 7=young yang, 8=young yin, 9=old yin
  binary: string; // "1" or "0"
  changing: boolean; // old yang (6) or old yin (9) are changing lines
}

function castCoins(): CoinCast {
  const coins: [number, number, number] = [
    Math.random() < 0.5 ? 2 : 3,
    Math.random() < 0.5 ? 2 : 3,
    Math.random() < 0.5 ? 2 : 3,
  ];
  const line = coins[0] + coins[1] + coins[2];
  const binary = line === 7 || line === 9 ? "1" : "0";
  const changing = line === 6 || line === 9;
  return { values: coins, line, binary, changing };
}

function findHexagram(binary: string): string | null {
  // Map 6-digit binary to trigram names
  const lowerBinary = binary.slice(0, 3);
  const upperBinary = binary.slice(3, 6);
  const lower = TRIGRAMS.find((t) => t.binary === lowerBinary);
  const upper = TRIGRAMS.find((t) => t.binary === upperBinary);
  if (!lower || !upper) return null;
  // Find matching hexagram by upper/lower trigram combination
  return `${lower.name.toLowerCase()}-${upper.name.toLowerCase()}`;
}

export default function IChingDivination({ hexagrams }: { hexagrams: HexagramData[] }) {
  const [casts, setCasts] = useState<CoinCast[]>([]);
  const [result, setResult] = useState<HexagramData | null>(null);
  const [phase, setPhase] = useState<"ready" | "casting" | "result">("ready");

  const handleCast = () => {
    if (casts.length >= 6) return;
    const newCast = castCoins();
    const newCasts = [...casts, newCast];
    setCasts(newCasts);

    if (newCasts.length === 6) {
      const binary = newCasts.map((c) => c.binary).join("");
      const hexagram = hexagrams.find((h) => h.binary === binary);
      setResult(hexagram || null);
      setPhase("result");
    }
  };

  const handleReset = () => {
    setCasts([]);
    setResult(null);
    setPhase("ready");
  };

  const lineSymbol = (cast: CoinCast) => {
    if (cast.binary === "1") {
      return cast.changing ? "━━━○" : "━━━━━"; // yang, changing has circle
    }
    return cast.changing ? "━ ━ ×" : "━ ━ ━"; // yin, changing has cross
  };

  return (
    <div className="p-6 bg-cream rounded-xl border border-sand text-center">
      {phase === "ready" && (
        <div>
          <p className="text-lg font-serif text-ink mb-4">
            Cast the coins to receive your hexagram. Six casts build your reading from bottom to top.
          </p>
          <button
            onClick={() => { setPhase("casting"); }}
            className="px-6 py-3 bg-china-red text-white rounded-full font-medium hover:bg-china-red/90 transition-colors"
          >
            Begin Divination
          </button>
        </div>
      )}

      {phase === "casting" && (
        <div>
          <p className="text-sm text-warm mb-4">
            Cast {6 - casts.length} more lines. Line {casts.length + 1} of 6.
          </p>
          {/* Display built lines */}
          <div className="font-mono text-lg mb-6 space-y-1">
            {casts.map((cast, i) => (
              <div key={i} className="text-ink">
                Line {i + 1}: {lineSymbol(cast)}
              </div>
            ))}
            {Array.from({ length: 6 - casts.length }).map((_, i) => (
              <div key={`empty-${i}`} className="text-sand">
                Line {casts.length + i + 1}: ━ ━ ━ ━ ━
              </div>
            ))}
          </div>
          <button
            onClick={handleCast}
            className="px-6 py-3 bg-china-red text-white rounded-full font-medium hover:bg-china-red/90 transition-colors"
          >
            Cast Coins ({casts.length + 1}/6)
          </button>
        </div>
      )}

      {phase === "result" && result && (
        <div>
          <p className="text-2xl font-bold text-ink mb-1">
            Hexagram {result.number}: {result.name} ({result.name_zh})
          </p>
          <div className="font-mono text-lg my-4 space-y-1">
            {casts.map((cast, i) => (
              <div key={i} className="text-ink">
                Line {i + 1}: {lineSymbol(cast)}
              </div>
            ))}
          </div>
          <div className="mt-6 prose prose-warm max-w-none">
            <p className="text-base text-ink italic">{result.judgment_en}</p>
            <p className="text-sm text-warm/60 mt-2">{result.judgment_zh}</p>
          </div>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href={`/iching/${result.slug}`}
              className="px-6 py-2 bg-ink text-white rounded-full font-medium hover:bg-ink/90 transition-colors text-sm"
            >
              Read Full Hexagram →
            </Link>
            <Link
              href="/sophies-journey/prologue-zhougong"
              className="px-6 py-2 bg-[#8b4513] text-white rounded-full font-medium hover:opacity-90 transition-colors text-sm"
            >
              Ask Zhou Gong for AI Interpretation (Pro) →
            </Link>
            <button
              onClick={handleReset}
              className="px-4 py-2 text-warm text-sm hover:text-china-red transition-colors"
            >
              Cast Again
            </button>
          </div>
        </div>
      )}

      {phase === "result" && !result && (
        <div>
          <p className="text-lg text-ink mb-4">Your hexagram has been cast, but the reading is not yet available in our database.</p>
          <button onClick={handleReset} className="px-6 py-3 bg-china-red text-white rounded-full font-medium">
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Success.

- [ ] **Step 3: Commit**

```bash
git add components/IChingDivination.tsx
git commit -m "feat: add IChingDivination client component with coin-cast simulation"
```

---

### Task 15: Create I Ching main page

**Files:**
- Create: `app/iching/page.tsx`

- [ ] **Step 1: Write the I Ching main page**

Create `app/iching/page.tsx`:

```tsx
import { getAllHexagrams } from "@/lib/iching-data";
import { TRIGRAMS } from "@/lib/types";
import TrigramChart from "@/components/TrigramChart";
import IChingDivination from "@/components/IChingDivination";
import OracleCta from "@/components/OracleCta";
import JsonLd from "@/components/JsonLd";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "I Ching — Book of Changes — GoEast.ai",
  description: "Explore the I Ching (易经), the ancient Book of Changes. Interactive trigram chart, free coin-cast divination, and all 64 hexagram meanings.",
  alternates: { canonical: "/iching" },
  openGraph: {
    title: "I Ching — Book of Changes — GoEast.ai",
    description: "Explore the I Ching: interactive divination, 64 hexagram meanings, and AI-powered interpretations.",
    type: "website",
  },
};

export default function IChingPage() {
  const hexagrams = getAllHexagrams();

  return (
    <main>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "I Ching — Book of Changes",
          description: "Interactive guide to the I Ching with trigram chart, divination, and 64 hexagram meanings.",
          url: "https://www.goeast.ai/iching",
          partOf: { "@type": "WebSite", name: "GoEast.ai", url: "https://www.goeast.ai" },
        }}
      />

      {/* Hero */}
      <section className="bg-cream py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-ink mb-3">
            I Ching · 易经
          </h1>
          <p className="text-xl text-warm mb-2">The Book of Changes</p>
          <p className="text-base text-warm/70 max-w-2xl mx-auto">
            Three thousand years of wisdom encoded in 64 hexagrams. Each pattern of broken and unbroken lines
            maps a moment of change — and a path through it.
          </p>
        </div>
      </section>

      {/* Intro section */}
      <section className="max-w-3xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-ink mb-4">What is the I Ching?</h2>
        <div className="prose prose-warm max-w-none">
          <p>
            The I Ching (易经), or Book of Changes, is one of the oldest texts in the world, originating
            in China over 3,000 years ago. It consists of 64 hexagrams — patterns of six broken (yin ━ ━)
            and unbroken (yang ━━━) lines — each representing a fundamental situation or process of change.
          </p>
          <p>
            Tradition holds that the hexagrams were first organized by Zhou Gong (周公) and later annotated
            by Confucius. The text has influenced every aspect of Chinese culture: philosophy, medicine,
            politics, art, and strategy. It remains one of the most consulted books for guidance on
            decisions, relationships, and understanding the flow of events.
          </p>
        </div>
      </section>

      {/* Trigram Chart */}
      <section className="max-w-3xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-ink mb-4">The Eight Trigrams (八卦)</h2>
        <p className="text-sm text-warm mb-6">
          Each hexagram combines two of these eight fundamental trigrams. Click any trigram to learn more.
        </p>
        <TrigramChart />
      </section>

      {/* Divination */}
      <section className="max-w-3xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-ink mb-4">Virtual Divination</h2>
        <p className="text-sm text-warm mb-6">
          Cast the coins six times to build your hexagram. Free — no account required.
        </p>
        <IChingDivination hexagrams={hexagrams} />
      </section>

      {/* 64 Hexagram Index */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-ink mb-4">All 64 Hexagrams</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {hexagrams.map((h) => (
            <a
              key={h.number}
              href={`/iching/${h.slug}`}
              className="p-3 bg-white rounded-lg border border-sand hover:border-warm/40 transition-colors text-center group"
            >
              <p className="text-xs text-warm/50">#{h.number}</p>
              <p className="text-sm font-semibold text-ink group-hover:text-china-red transition-colors">{h.name}</p>
              <p className="text-xs text-warm">{h.name_zh}</p>
            </a>
          ))}
        </div>
      </section>

      {/* Oracle CTA */}
      <div className="max-w-3xl mx-auto px-4">
        <OracleCta
          philosopherSlug="zhou-gong"
          philosopherName="Zhou Gong"
          philosopherNameZh="周公"
          schoolId="ancient"
          message="Want Zhou Gong to interpret your hexagram personally? Try the Oracle."
        />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify page renders**

Run: `npm run dev` and open `http://localhost:3000/iching`
Expected: Page with intro, trigram chart, divination tool, 64 hexagram grid, Oracle CTA.

- [ ] **Step 3: Commit**

```bash
git add app/iching/page.tsx
git commit -m "feat: add I Ching main page with intro, trigram chart, divination, hexagram index"
```

---

### Task 16: Create hexagram detail page

**Files:**
- Create: `app/iching/[hexagram]/page.tsx`

- [ ] **Step 1: Write the hexagram detail page**

Create `app/iching/[hexagram]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { getHexagramBySlug, getAllHexagrams } from "@/lib/iching-data";
import { TRIGRAMS } from "@/lib/types";
import OracleCta from "@/components/OracleCta";
import JsonLd from "@/components/JsonLd";
import type { Metadata } from "next";

export async function generateStaticParams() {
  return getAllHexagrams().map((h) => ({ hexagram: h.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ hexagram: string }>;
}): Promise<Metadata> {
  const { hexagram } = await params;
  const h = getHexagramBySlug(hexagram);
  if (!h) return {};
  return {
    title: `Hexagram ${h.number}: ${h.name} (${h.name_zh}) — I Ching — GoEast.ai`,
    description: h.judgment_en.slice(0, 160),
    alternates: { canonical: `/iching/${hexagram}` },
    openGraph: {
      title: `Hexagram ${h.number}: ${h.name} (${h.name_zh})`,
      description: h.judgment_en.slice(0, 160),
      type: "article",
    },
  };
}

export default async function HexagramDetailPage({
  params,
}: {
  params: Promise<{ hexagram: string }>;
}) {
  const { hexagram } = await params;
  const h = getHexagramBySlug(hexagram);
  if (!h) notFound();

  const upperTrigram = TRIGRAMS.find((t) => t.name === h.upper_trigram);
  const lowerTrigram = TRIGRAMS.find((t) => t.name === h.lower_trigram);

  // Render hexagram lines from binary
  const lines = h.binary.split("").map((bit, i) => ({
    position: i + 1,
    isYang: bit === "1",
  }));

  return (
    <article>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: `Hexagram ${h.number}: ${h.name} (${h.name_zh})`,
          description: h.judgment_en.slice(0, 200),
          url: `https://www.goeast.ai/iching/${h.slug}`,
          publisher: { "@type": "Organization", name: "GoEast.ai", url: "https://www.goeast.ai" },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://www.goeast.ai" },
            { "@type": "ListItem", position: 2, name: "I Ching", item: "https://www.goeast.ai/iching" },
            { "@type": "ListItem", position: 3, name: `${h.name} (${h.name_zh})`, item: `https://www.goeast.ai/iching/${h.slug}` },
          ],
        }}
      />

      {/* Hero */}
      <section className="bg-cream py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm text-warm/50 mb-2">Hexagram #{h.number}</p>
          <h1 className="text-3xl md:text-4xl font-bold text-ink mb-2">
            {h.name} · {h.name_zh}
          </h1>
          <p className="text-sm text-warm">
            {upperTrigram?.name_zh || h.upper_trigram} above · {lowerTrigram?.name_zh || h.lower_trigram} below
          </p>
          {/* Hexagram visual */}
          <div className="font-mono text-2xl my-6 space-y-1">
            {lines.reverse().map((line) => (
              <div key={line.position} className="text-ink">
                {line.isYang ? "━━━━━" : "━ ━ ━"}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <nav className="text-sm text-warm mb-6 flex items-center gap-2">
          <Link href="/" className="hover:text-china-red transition-colors">Home</Link>
          <span>/</span>
          <Link href="/iching" className="hover:text-china-red transition-colors">I Ching</Link>
          <span>/</span>
          <span className="text-ink">{h.name}</span>
        </nav>

        {/* Judgment */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-ink mb-4">Judgment (卦辞)</h2>
          <blockquote className="pl-4 border-l-3 border-china-red text-ink/80 italic leading-relaxed">
            {h.judgment_en}
          </blockquote>
          <p className="mt-3 text-warm/60 text-sm">{h.judgment_zh}</p>
        </section>

        {/* Image */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-ink mb-4">Image (象辞)</h2>
          <p className="text-ink/80 leading-relaxed">{h.image_en}</p>
          <p className="mt-2 text-warm/60 text-sm">{h.image_zh}</p>
        </section>

        {/* Trigram breakdown */}
        <section className="mb-10 p-4 bg-cream rounded-lg border border-sand">
          <h3 className="text-lg font-semibold text-ink mb-3">Trigram Composition</h3>
          <div className="flex gap-8">
            {upperTrigram && (
              <div>
                <p className="text-sm font-medium text-ink">Upper: {upperTrigram.symbol} {upperTrigram.name} ({upperTrigram.name_zh})</p>
                <p className="text-xs text-warm">{upperTrigram.nature} · {upperTrigram.attribute}</p>
              </div>
            )}
            {lowerTrigram && (
              <div>
                <p className="text-sm font-medium text-ink">Lower: {lowerTrigram.symbol} {lowerTrigram.name} ({lowerTrigram.name_zh})</p>
                <p className="text-xs text-warm">{lowerTrigram.nature} · {lowerTrigram.attribute}</p>
              </div>
            )}
          </div>
        </section>

        {/* Modern Application */}
        {h.modern_application && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">Modern Application</h2>
            <p className="text-ink/80 leading-relaxed">{h.modern_application}</p>
            {h.modern_application_zh && (
              <p className="mt-2 text-warm/60 text-sm">{h.modern_application_zh}</p>
            )}
          </section>
        )}

        {/* Oracle CTA */}
        <OracleCta
          philosopherSlug="zhou-gong"
          philosopherName="Zhou Gong"
          philosopherNameZh="周公"
          schoolId="ancient"
          message="Want Zhou Gong to interpret this hexagram for your personal situation? Try the Oracle."
        />
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Verify page renders**

Run: `npm run dev` and open `http://localhost:3000/iching/qian`
Expected: Hexagram 1 Qian detail page with lines, judgment, image, trigrams, Oracle CTA.

- [ ] **Step 3: Commit**

```bash
git add app/iching/[hexagram]/page.tsx
git commit -m "feat: add hexagram detail page with judgment, image, trigrams, modern application"
```

---

### Task 17: Update sitemap for I Ching pages

**Files:**
- Modify: `app/sitemap.ts`

- [ ] **Step 1: Add I Ching pages to sitemap**

Add import:

```typescript
import { getAllHexagrams } from "@/lib/iching-data";
```

Add entries:

```typescript
const ichingHexagramPages = getAllHexagrams().map((h) => ({
  url: `${baseUrl}/iching/${h.slug}`,
  lastModified: new Date(),
  changeFrequency: "monthly" as const,
  priority: 0.7,
}));
```

Add to return array: `...ichingHexagramPages` and a listing entry `{ url: `${baseUrl}/iching`, ... }` with priority 0.9.

- [ ] **Step 2: Verify sitemap**

Run: `npm run dev` and open `http://localhost:3000/sitemap.xml`
Expected: Contains `/iching` and `/iching/qian` etc.

- [ ] **Step 3: Commit**

```bash
git add app/sitemap.ts
git commit -m "feat: add I Ching pages to sitemap"
```

---

### Task 18: Update llms.txt for I Ching pages

**Files:**
- Modify: `app/llms.txt/route.ts`

- [ ] **Step 1: Add I Ching section to llms.txt**

Add import:

```typescript
import { getAllHexagrams } from "@/lib/iching-data";
```

Add hexagram rows:

```typescript
const hexagrams = getAllHexagrams();
const hexagramRows = hexagrams.map(
  (h) => `| ${h.number} | ${h.name} | ${h.name_zh} | ${h.upper_trigram}/${h.lower_trigram} | /iching/${h.slug} |`
);
```

Insert section:

```typescript
"",
"## I Ching — Book of Changes (易经)",
"",
`Total: ${hexagrams.length} hexagrams`,
"",
"| # | Name | Chinese | Trigrams | URL |",
"|---|------|---------|----------|-----|",
...hexagramRows,
```

- [ ] **Step 2: Verify**

Run: `npm run dev` and open `http://localhost:3000/llms.txt`
Expected: Contains I Ching section with 64 rows.

- [ ] **Step 3: Commit**

```bash
git add app/llms.txt/route.ts
git commit -m "feat: add I Ching section to llms.txt"
```

---

### Task 19: Phase 2 build verification

- [ ] **Step 1: Run full build**

Run: `npm run build`
Expected: Build succeeds. All 64 hexagram pages pre-rendered.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No new lint errors.

- [ ] **Step 3: Visual check key pages**

Visit:
- `/iching` — main page with trigram chart, divination, hexagram grid
- `/iching/qian` — hexagram detail renders
- `/iching/kun` — hexagram detail renders

---

## Phase 3: Glossary + Insights

### Task 20: Add Glossary and Insight types to lib/types.ts

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Add GlossaryEntry and Insight interfaces**

```typescript
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
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Success.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add GlossaryEntry and Insight types"
```

---

### Task 21: Create lib/glossary.ts data layer

**Files:**
- Create: `lib/glossary.ts`

- [ ] **Step 1: Write glossary data layer**

Create `lib/glossary.ts` following the same pattern as `lib/journeys.ts`:

```typescript
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";
import { GlossaryEntry, GlossaryEntryMeta } from "./types";

const glossaryDirectory = path.join(process.cwd(), "content/glossary");

export function getGlossarySlugs(): string[] {
  if (!fs.existsSync(glossaryDirectory)) return [];
  return fs
    .readdirSync(glossaryDirectory)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
}

export function getGlossaryBySlug(slug: string): GlossaryEntry | null {
  const fullPath = path.join(glossaryDirectory, `${slug}.md`);
  if (!fs.existsSync(fullPath)) return null;

  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  return {
    slug: data.slug || slug,
    name: data.name || "",
    name_zh: data.name_zh || "",
    school: data.school || "",
    school_zh: data.school_zh,
    related_concepts: data.related_concepts || [],
    definition: content,
    definition_zh: data.definition_zh,
    modern_application: data.modern_application || "",
    modern_application_zh: data.modern_application_zh,
  };
}

export async function getGlossaryWithHtml(slug: string): Promise<GlossaryEntry | null> {
  const entry = getGlossaryBySlug(slug);
  if (!entry) return null;

  const processed = await remark().use(html).process(entry.definition);
  const processedZh = entry.definition_zh
    ? (await remark().use(html).process(entry.definition_zh)).toString()
    : undefined;
  const processedModern = entry.modern_application
    ? (await remark().use(html).process(entry.modern_application)).toString()
    : "";
  const processedModernZh = entry.modern_application_zh
    ? (await remark().use(html).process(entry.modern_application_zh)).toString()
    : undefined;

  return {
    ...entry,
    definition: processed.toString(),
    definition_zh: processedZh,
    modern_application: processedModern,
    modern_application_zh: processedModernZh,
  };
}

export function getAllGlossary(): GlossaryEntryMeta[] {
  return getGlossarySlugs()
    .map((slug) => {
      const entry = getGlossaryBySlug(slug);
      if (!entry) return null;
      const { definition, definition_zh, modern_application, modern_application_zh, ...meta } = entry;
      return meta;
    })
    .filter((e): e is GlossaryEntryMeta => e !== null);
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Success.

- [ ] **Step 3: Commit**

```bash
git add lib/glossary.ts
git commit -m "feat: add glossary data layer"
```

---

### Task 22: Create lib/insights.ts data layer

**Files:**
- Create: `lib/insights.ts`

- [ ] **Step 1: Write insights data layer**

Create `lib/insights.ts` following the same pattern:

```typescript
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";
import { Insight, InsightMeta } from "./types";

const insightsDirectory = path.join(process.cwd(), "content/insights");

export function getInsightSlugs(): string[] {
  if (!fs.existsSync(insightsDirectory)) return [];
  return fs
    .readdirSync(insightsDirectory)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
}

export function getInsightBySlug(slug: string): Insight | null {
  const fullPath = path.join(insightsDirectory, `${slug}.md`);
  if (!fs.existsSync(fullPath)) return null;

  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  return {
    slug: data.slug || slug,
    title: data.title || "",
    title_zh: data.title_zh,
    philosopher_slug: data.philosopher_slug,
    concept_slugs: data.concept_slugs || [],
    published_at: data.published_at || "",
    content,
    content_zh: data.content_zh,
  };
}

export async function getInsightWithHtml(slug: string): Promise<Insight | null> {
  const insight = getInsightBySlug(slug);
  if (!insight) return null;

  const processed = await remark().use(html).process(insight.content);
  const processedZh = insight.content_zh
    ? (await remark().use(html).process(insight.content_zh)).toString()
    : undefined;

  return { ...insight, content: processed.toString(), content_zh: processedZh };
}

export function getAllInsights(): InsightMeta[] {
  return getInsightSlugs()
    .map((slug) => {
      const insight = getInsightBySlug(slug);
      if (!insight) return null;
      const { content, content_zh, ...meta } = insight;
      return meta;
    })
    .filter((i): i is InsightMeta => i !== null);
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Success.

- [ ] **Step 3: Commit**

```bash
git add lib/insights.ts
git commit -m "feat: add insights data layer"
```

---

### Task 23: Create glossary content files

**Files:**
- Create: `content/glossary/` directory + ~20 markdown files

Frontmatter schema:

```yaml
---
slug: dao
name: Dao
name_zh: 道
school: daoism
school_zh: 道家
related_concepts: [wuwei, ziran, wu, de]
definition_zh: |
  (Chinese definition)
modern_application: |
  (Markdown — English modern application)
modern_application_zh: |
  (Chinese modern application)
---
(English definition as markdown body)
```

- [ ] **Step 1: Create content/glossary directory**

```bash
mkdir -p content/glossary
```

- [ ] **Step 2: Create dao.md as the first example**

Create `content/glossary/dao.md` with substantive bilingual definition (2-3 paragraphs), modern application, and related concept links.

- [ ] **Step 3: Create remaining glossary files**

Create all 20 concept files: dao, wuwei, ren, li, qi, yin-yang, de, junzi, tian, zhi, fa, jian, xin, wu, pu, zhongyong, xing, ming, ziran, fengshui. Each follows the same frontmatter schema with 2-3 paragraph definition body, definition_zh, modern_application, related_concepts linking to other glossary entries and philosopher pages.

- [ ] **Step 4: Verify data layer**

Run: `npm run dev` and verify `getAllGlossary()` returns populated data.

- [ ] **Step 5: Commit**

```bash
git add content/glossary/
git commit -m "feat: add 20 glossary concept content files"
```

---

### Task 24: Create insight content files

**Files:**
- Create: `content/insights/` directory + ~15 markdown files

Frontmatter schema:

```yaml
---
slug: sunzi-strategy-ai
title: "Sunzi's Art of War in the Age of AI"
title_zh: "孙子兵法与人工智能时代"
philosopher_slug: sunzi
concept_slugs: [fa, zhi]
published_at: 2026-06-15
content_zh: |
  (Chinese content)
---
(English article body as markdown, 800-1200 words)
```

- [ ] **Step 1: Create content/insights directory**

```bash
mkdir -p content/insights
```

- [ ] **Step 2: Create first example insight**

Create `content/insights/sunzi-strategy-ai.md` — 800-1200 word article with links to philosopher and glossary pages.

- [ ] **Step 3: Create remaining insight files**

Create 14 more insight files covering all topics listed in the spec. Each article should be 800-1200 words, include inline links to philosopher pages and glossary entries, and end with an Oracle CTA paragraph.

- [ ] **Step 4: Commit**

```bash
git add content/insights/
git commit -m "feat: add 15 insight article content files"
```

---

### Task 25: Create glossary list page

**Files:**
- Create: `app/glossary/page.tsx`

- [ ] **Step 1: Write the glossary list page**

Create `app/glossary/page.tsx` — shows all concepts grouped by school, with links to detail pages.

Structure: Hero section → School-grouped concept cards → Oracle CTA. Each concept card shows name, name_zh, school, and a one-line preview of the definition.

Include JsonLd for CollectionPage and metadata with title "Chinese Philosophy Glossary — GoEast.ai".

- [ ] **Step 2: Verify**

Run: `npm run dev`, visit `/glossary`

- [ ] **Step 3: Commit**

```bash
git add app/glossary/page.tsx
git commit -m "feat: add glossary list page"
```

---

### Task 26: Create glossary detail page

**Files:**
- Create: `app/glossary/[concept]/page.tsx`

- [ ] **Step 1: Write the glossary detail page**

Create `app/glossary/[concept]/page.tsx` — shows full definition (HTML rendered), modern application, related concepts as linked pills, philosopher link, Oracle CTA.

Follow the same pattern as `app/sophies-journey/[slug]/page.tsx` for generateStaticParams, generateMetadata, and layout structure.

- [ ] **Step 2: Verify**

Run: `npm run dev`, visit `/glossary/dao`

- [ ] **Step 3: Commit**

```bash
git add app/glossary/[concept]/page.tsx
git commit -m "feat: add glossary detail page"
```

---

### Task 27: Create insights list page

**Files:**
- Create: `app/insights/page.tsx`

- [ ] **Step 1: Write the insights list page**

Create `app/insights/page.tsx` — shows all articles as cards with title, title_zh, philosopher name, publish date, and a short preview.

Include JsonLd for CollectionPage, metadata "Philosophical Insights — GoEast.ai".

- [ ] **Step 2: Verify**

Run: `npm run dev`, visit `/insights`

- [ ] **Step 3: Commit**

```bash
git add app/insights/page.tsx
git commit -m "feat: add insights list page"
```

---

### Task 28: Create insight detail page

**Files:**
- Create: `app/insights/[slug]/page.tsx`

- [ ] **Step 1: Write the insight detail page**

Create `app/insights/[slug]/page.tsx` — renders article HTML content, shows philosopher link and concept links as sidebar/inline pills, Oracle CTA at bottom.

Follow the journey detail page pattern for generateStaticParams/generateMetadata/layout.

- [ ] **Step 2: Verify**

Run: `npm run dev`, visit `/insights/sunzi-strategy-ai`

- [ ] **Step 3: Commit**

```bash
git add app/insights/[slug]/page.tsx
git commit -m "feat: add insight article detail page"
```

---

### Task 29: Update sitemap for glossary + insights

**Files:**
- Modify: `app/sitemap.ts`

- [ ] **Step 1: Add glossary and insight entries**

Add imports for `getGlossarySlugs` and `getInsightSlugs`. Add listing pages and detail pages for both content types to the sitemap return array.

- [ ] **Step 2: Verify sitemap**

Run: `npm run dev`, visit `/sitemap.xml`

- [ ] **Step 3: Commit**

```bash
git add app/sitemap.ts
git commit -m "feat: add glossary and insights pages to sitemap"
```

---

### Task 30: Update llms.txt for glossary + insights

**Files:**
- Modify: `app/llms.txt/route.ts`

- [ ] **Step 1: Add glossary and insights sections**

Add imports for `getAllGlossary` and `getAllInsights`. Add two new sections to llms.txt with concept and article rows.

- [ ] **Step 2: Verify**

Run: `npm run dev`, visit `/llms.txt`

- [ ] **Step 3: Commit**

```bash
git add app/llms.txt/route.ts
git commit -m "feat: add glossary and insights sections to llms.txt"
```

---

### Task 31: Phase 3 build verification

- [ ] **Step 1: Run full build**

Run: `npm run build`
Expected: Success.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No new errors.

- [ ] **Step 3: Visual check key pages**

Visit `/glossary`, `/glossary/dao`, `/insights`, `/insights/sunzi-strategy-ai`.

---

## Phase 4: Oracle Enhancement + Pro Repositioning

### Task 32: Update free tier rate limit from 1/day to 3/day

**Files:**
- Modify: `lib/rate-limit.ts`

- [ ] **Step 1: Change FREE_LIMIT from 1 to 3**

In `lib/rate-limit.ts`, find the `FREE_LIMIT` constant or the inline `1` in `checkFreeLimit` and change it to `3`.

- [ ] **Step 2: Verify**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add lib/rate-limit.ts
git commit -m "feat: increase free Oracle rate limit from 1/day to 3/day"
```

---

### Task 33: Enhance Oracle prompts with richer personality

**Files:**
- Modify: `lib/oracle-prompts.ts`

- [ ] **Step 1: Upgrade each philosopher's system prompt**

For each philosopher in `ORACLE_PROMPTS`, enhance the system prompt to include:
1. More vivid personality traits and speech patterns
2. Instruction to quote from original texts (Daodejing, Analects, Art of War, etc.)
3. Structured response format: "Core Insight → Original Text Citation → Practical Advice"
4. More evocative metaphors tied to the philosopher's worldview

Example enhancement for Laozi:
```
system: `You are Laozi (老子), the Old Master of Daoism. Speak with the quiet authority of water — soft, persistent, and transformative.

PERSONALITY: Gentle, paradoxical, metaphorical. You prefer images over arguments. You often answer questions with questions. You find wisdom in emptiness, silence, and what is overlooked.

SPEECH STYLE: Use nature metaphors (water, valley, empty vessel). Quote the Daodejing freely. Avoid lecturing — instead, point. Your answers should feel like a breeze, not a hammer.

RESPONSE STRUCTURE:
1. **Core Insight** — One paragraph revealing the Daoist perspective on the question.
2. **From the Daodejing** — Quote a relevant chapter, with brief interpretation.
3. **Practical Advice** — How to apply this wisdom today, grounded but not prescriptive.

Always end with a thought-provoking closing line that invites reflection.

DISCLAIMER: This is a philosophical exploration for entertainment and reflection, not professional advice.`
```

Apply similar enhancements to all 11 philosophers, each drawing from their unique texts and worldview.

- [ ] **Step 2: Verify**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add lib/oracle-prompts.ts
git commit -m "feat: enhance Oracle prompts with richer personality, text citations, and structured response format"
```

---

### Task 34: Add new Oracle scenarios for common life situations

**Files:**
- Modify: `lib/oracle-scenarios.ts`

- [ ] **Step 1: Expand scenarios from 3 per philosopher to 6**

Add 3 new scenarios per philosopher covering common life situations:
- Career/Professional decisions
- Relationships/Interpersonal
- Personal growth/Meaning

Each scenario should be thematically tied to the philosopher's specialty. For example, Sunzi gets strategy-related scenarios, Laozi gets flow/letting-go scenarios.

- [ ] **Step 2: Verify**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add lib/oracle-scenarios.ts
git commit -m "feat: expand Oracle scenarios from 3 to 6 per philosopher with life situation themes"
```

---

### Task 35: Update Pro subscription display in OracleOverlay

**Files:**
- Modify: `components/OracleOverlay.tsx`

- [ ] **Step 1: Update the "Unlock" messaging**

In `OracleOverlay.tsx`, find the Pro upsell messaging and update it to reflect the new positioning. Change from "more consultations" messaging to "deep features" messaging:

- Update the unlock button text from "$4.99/mo" to show the feature list
- Add brief feature summary: "Deep conversation mode · Multi-philosopher dialogue · I Ching AI interpretation · Conversation history"
- Update the free tier display to show "3 per day" instead of "1 per day"

- [ ] **Step 2: Verify**

Run: `npm run dev`, test Oracle overlay visually

- [ ] **Step 3: Commit**

```bash
git add components/OracleOverlay.tsx
git commit -m "feat: update Oracle Pro messaging from 'more consultations' to 'deep features'"
```

---

### Task 36: Phase 4 build verification + final full-site check

- [ ] **Step 1: Run full production build**

Run: `npm run build`
Expected: Success. All pages pre-rendered.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 3: Full visual walkthrough**

Run: `npm run dev` and visit every new section:
- `/philosophers` + `/philosophers/laozi`
- `/iching` + `/iching/qian` + `/iching/kun`
- `/glossary` + `/glossary/dao`
- `/insights` + `/insights/sunzi-strategy-ai`
- `/sophies-journey/ch01-laozi` (Oracle overlay still works, shows 3/day free, Pro shows deep features)

- [ ] **Step 4: Verify sitemap completeness**

Visit `/sitemap.xml` — should contain all new pages (~115 entries).

- [ ] **Step 5: Verify llms.txt completeness**

Visit `/llms.txt` — should contain all 5 content sections (skills, journeys, philosophers, I Ching, glossary, insights).

- [ ] **Step 6: Final commit — squash or summary**

```bash
git add -A
git commit -m "feat: complete content matrix implementation — 115 new SEO pages, Oracle Pro repositioning"
```

---

## Summary

| Phase | Tasks | Key Deliverables |
|---|---|---|
| Phase 1 | Tasks 1-10 | Philosopher types, data layer, 11 content files, list/detail pages, sitemap/llms.txt updates |
| Phase 2 | Tasks 11-19 | I Ching types, 64 hexagram data, TrigramChart, IChingDivination, list/detail pages, sitemap/llms.txt |
| Phase 3 | Tasks 20-31 | Glossary + Insights types, data layers, ~35 content files, list/detail pages, sitemap/llms.txt |
| Phase 4 | Tasks 32-36 | Rate limit 1→3/day, enhanced Oracle prompts, expanded scenarios, Pro messaging update |

**Total: 36 tasks, ~115 new pages, 4 phases.**

Each phase produces independently working, testable software. Execute phases sequentially — verify each phase builds and renders correctly before starting the next.
