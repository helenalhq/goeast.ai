# SEO & GEO Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve GoEast.ai's discoverability for search engines and AI agents by adding canonical URLs, Twitter Cards, dynamic OG images, expanded structured data, enhanced llms.txt, and bilingual metadata.

**Architecture:** Incremental enhancement of existing pages — no routing changes. Each task touches a small set of files and can be verified independently with `npm run build`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, `next/og` ImageResponse for OG images.

---

## Task 1: Add Canonical URLs to All Pages

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/skills/page.tsx`
- Modify: `app/skills/[slug]/page.tsx`
- Modify: `app/sophies-journey/page.tsx`
- Modify: `app/sophies-journey/[slug]/page.tsx`
- Modify: `app/categories/[category]/page.tsx`
- Modify: `app/about/page.tsx`
- Modify: `app/contact/page.tsx`
- Modify: `app/submit/page.tsx`

- [ ] **Step 1: Add canonical to root layout**

In `app/layout.tsx`, add `alternates` to the `metadata` export:

```typescript
export const metadata: Metadata = {
  title: "GoEast.ai — Sophie's Journey East | AI Skills for China",
  description:
    "Follow Sophie's Journey East through 3,000 years of Chinese philosophy. Plus curated AI skills for traveling and living in China.",
  metadataBase: new URL("https://goeast.ai"),
  alternates: {
    canonical: "/",
    languages: {
      "en": "/",
      "zh": "/",
    },
  },
  openGraph: {
    title: "GoEast.ai — Sophie's Journey East | AI Skills for China",
    description:
      "Follow Sophie's Journey East through 3,000 years of Chinese philosophy. Plus curated AI skills for traveling and living in China.",
    url: "https://goeast.ai",
    siteName: "GoEast.ai",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GoEast.ai — AI Skills for China",
    description:
      "Curated AI skills for navigating life in China. Travel, medical, shopping, accommodation — powered by AI.",
  },
};
```

Also add `Content-Language` meta by setting `other` in metadata:

```typescript
  other: {
    "content-language": "en, zh",
  },
```

- [ ] **Step 2: Add canonical to static pages**

`app/skills/page.tsx`:
```typescript
export const metadata: Metadata = {
  title: "All Skills — GoEast.ai",
  description: "Browse all curated AI skills for foreigners in China. 浏览精选的面向外国人的 AI 技能",
  alternates: { canonical: "/skills" },
};
```

`app/about/page.tsx`:
```typescript
export const metadata: Metadata = {
  title: "About — GoEast.ai",
  description: "About GoEast.ai — curated AI skills for foreigners in China",
  alternates: { canonical: "/about" },
};
```

`app/contact/page.tsx`:
```typescript
export const metadata: Metadata = {
  title: "Contact — GoEast.ai",
  description: "Get in touch with the GoEast.ai team",
  alternates: { canonical: "/contact" },
};
```

`app/submit/page.tsx`:
```typescript
export const metadata: Metadata = {
  title: "Submit a Skill — GoEast.ai",
  description: "Submit an AI skill to the GoEast.ai directory",
  alternates: { canonical: "/submit" },
};
```

`app/sophies-journey/page.tsx`:
```typescript
export const metadata: Metadata = {
  title: "Sophie's Journey East — GoEast.ai",
  description:
    "Having escaped the pages of a book, Sophie travels East and encounters China's greatest philosophers. A narrative exploration of Chinese thought.",
  alternates: { canonical: "/sophies-journey" },
  openGraph: {
    title: "Sophie's Journey East — GoEast.ai",
    description:
      "Having escaped the pages of a book, Sophie travels East and encounters China's greatest philosophers.",
    type: "article",
  },
};
```

- [ ] **Step 3: Add canonical to dynamic pages**

`app/skills/[slug]/page.tsx` — in `generateMetadata`, add `alternates`:
```typescript
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const allSkills = getAllSkills();
  const meta = allSkills.find((s) => s.slug === slug);
  if (!meta) return {};
  return {
    title: `${meta.title} — GoEast.ai`,
    description: `${meta.title} - ${meta.title_zh}. ${meta.tags.join(", ")}`,
    alternates: { canonical: `/skills/${slug}` },
    openGraph: {
      title: `${meta.title} — GoEast.ai`,
      description: `${meta.title} - ${meta.title_zh}`,
      type: "article",
    },
  };
}
```

`app/sophies-journey/[slug]/page.tsx` — in `generateMetadata`, add `alternates`:
```typescript
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
    alternates: { canonical: `/sophies-journey/${slug}` },
    openGraph: {
      title: `${meta.title} — Sophie's Journey`,
      description: meta.quote || `${meta.title} - ${meta.title_zh}`,
      type: "article",
    },
  };
}
```

`app/categories/[category]/page.tsx` — in `generateMetadata`, add `alternates`:
```typescript
export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const catInfo = CATEGORIES.find((c) => c.id === category);
  if (!catInfo) return {};
  return {
    title: `${catInfo.name} Skills — GoEast.ai`,
    description: `Curated AI skills for ${catInfo.name.toLowerCase()} in China`,
    alternates: { canonical: `/categories/${category}` },
  };
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Successful build with no errors.

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx app/skills/page.tsx app/skills/[slug]/page.tsx app/sophies-journey/page.tsx "app/sophies-journey/[slug]/page.tsx" "app/categories/[category]/page.tsx" app/about/page.tsx app/contact/page.tsx app/submit/page.tsx
git commit -m "feat(seo): add canonical URLs, Twitter Cards, and bilingual metadata to all pages"
```

---

## Task 2: Create Default OpenGraph Image

**Files:**
- Create: `app/opengraph-image.tsx`

- [ ] **Step 1: Create `app/opengraph-image.tsx`**

```typescript
import { ImageResponse } from "next/og";

export const alt = "GoEast.ai — AI Skills for China";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function ImageOG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#faf5ef",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: "#c0392b",
              letterSpacing: "-0.02em",
            }}
          >
            GoEast.ai
          </div>
        </div>
        <div
          style={{
            fontSize: 28,
            color: "#2c1810",
            marginBottom: 12,
          }}
        >
          AI Skills for China
        </div>
        <div
          style={{
            fontSize: 20,
            color: "#8b7355",
          }}
        >
          Travel · Medical · Shopping · Accommodation
        </div>
        <div
          style={{
            marginTop: 32,
            fontSize: 18,
            color: "#8b7355",
            opacity: 0.6,
          }}
        >
          中国旅行 · 医疗 · 购物 · 住宿
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Successful build.

- [ ] **Step 3: Commit**

```bash
git add app/opengraph-image.tsx
git commit -m "feat(seo): add default OpenGraph image"
```

---

## Task 3: Create Dynamic OG Images for Skills

**Files:**
- Create: `app/skills/[slug]/opengraph-image.tsx`

- [ ] **Step 1: Create `app/skills/[slug]/opengraph-image.tsx`**

```typescript
import { ImageResponse } from "next/og";
import { getSkillBySlug, getSkillSlugs } from "@/lib/skills";
import { CATEGORIES } from "@/lib/types";

export const alt = "GoEast.ai Skill";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return getSkillSlugs().map((slug) => ({ slug }));
}

export default async function SkillOG({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const skill = getSkillBySlug(slug);
  if (!skill) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#faf5ef",
            fontSize: 32,
            color: "#8b7355",
          }}
        >
          GoEast.ai
        </div>
      ),
      { ...size }
    );
  }

  const categoryInfo = CATEGORIES.find((c) => c.id === skill.category);
  const categoryName = categoryInfo?.name || skill.category;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px 80px",
          backgroundColor: "#faf5ef",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontSize: 20,
              color: "#c0392b",
              fontWeight: 600,
            }}
          >
            GoEast.ai
          </div>
          <div
            style={{
              fontSize: 14,
              backgroundColor: "#c0392b15",
              color: "#c0392b",
              padding: "4px 12px",
              borderRadius: 12,
            }}
          >
            {categoryName}
          </div>
        </div>
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: "#2c1810",
            marginBottom: 12,
            lineHeight: 1.2,
            maxWidth: 900,
          }}
        >
          {skill.title}
        </div>
        <div
          style={{
            fontSize: 24,
            color: "#8b7355",
            marginBottom: 24,
          }}
        >
          {skill.title_zh}
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {skill.tags.slice(0, 5).map((tag: string) => (
            <div
              key={tag}
              style={{
                fontSize: 14,
                color: "#8b7355",
                backgroundColor: "#e0d5c5",
                padding: "4px 12px",
                borderRadius: 12,
              }}
            >
              {tag}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Successful build.

- [ ] **Step 3: Commit**

```bash
git add "app/skills/[slug]/opengraph-image.tsx"
git commit -m "feat(seo): add dynamic OG images for skill pages"
```

---

## Task 4: Create Dynamic OG Images for Journeys

**Files:**
- Create: `app/sophies-journey/[slug]/opengraph-image.tsx`

- [ ] **Step 1: Create `app/sophies-journey/[slug]/opengraph-image.tsx`**

```typescript
import { ImageResponse } from "next/og";
import { getJourneyBySlug, getJourneySlugs } from "@/lib/journeys";

export const alt = "Sophie's Journey East";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return getJourneySlugs().map((slug) => ({ slug }));
}

export default async function JourneyOG({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const journey = getJourneyBySlug(slug);
  if (!journey) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#faf5ef",
            fontSize: 32,
            color: "#8b7355",
          }}
        >
          GoEast.ai
        </div>
      ),
      { ...size }
    );
  }

  const chapterLabel =
    journey.chapter === 0
      ? "PROLOGUE"
      : journey.chapter === 11
      ? "EPILOGUE"
      : `CHAPTER ${journey.chapter}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px 80px",
          backgroundColor: "#faf5ef",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontSize: 14,
              color: "#ffffff",
              backgroundColor: journey.color,
              padding: "4px 12px",
              borderRadius: 12,
              fontWeight: 600,
            }}
          >
            {chapterLabel}
          </div>
          {journey.school && (
            <div
              style={{
                fontSize: 14,
                color: "#8b7355",
              }}
            >
              {journey.school}
            </div>
          )}
        </div>
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: "#2c1810",
            marginBottom: 8,
            lineHeight: 1.2,
            maxWidth: 900,
          }}
        >
          {journey.title}
        </div>
        <div
          style={{
            fontSize: 24,
            color: "#8b7355",
            marginBottom: 16,
          }}
        >
          {journey.title_zh}
        </div>
        {journey.philosopher && (
          <div
            style={{
              fontSize: 20,
              color: journey.color,
              fontWeight: 600,
            }}
          >
            {journey.philosopher}
            {journey.philosopher_zh ? ` · ${journey.philosopher_zh}` : ""}
            {journey.era ? ` · ${journey.era}` : ""}
          </div>
        )}
      </div>
    ),
    { ...size }
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Successful build.

- [ ] **Step 3: Commit**

```bash
git add "app/sophies-journey/[slug]/opengraph-image.tsx"
git commit -m "feat(seo): add dynamic OG images for journey pages"
```

---

## Task 5: Add Structured Data to Homepage

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Import JsonLd and add schemas**

Add import at top of `app/page.tsx`:
```typescript
import JsonLd from "@/components/JsonLd";
```

Add the following JSON-LD blocks inside the `<>` fragment, before `<Hero />`:

```typescript
<JsonLd
  data={{
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "GoEast.ai",
    url: "https://goeast.ai",
    description:
      "Curated AI skills for navigating life in China — travel, medical, shopping, accommodation.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://goeast.ai/api/skills?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  }}
/>
<JsonLd
  data={{
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "GoEast.ai",
    url: "https://goeast.ai",
    logo: "https://goeast.ai/images/logo.png",
    sameAs: ["https://github.com/helenalhq/goeast.ai"],
  }}
/>
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Successful build.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat(seo): add WebSite and Organization structured data to homepage"
```

---

## Task 6: Add Structured Data to Listing Pages

**Files:**
- Modify: `app/skills/page.tsx`
- Modify: `app/sophies-journey/page.tsx`

- [ ] **Step 1: Add CollectionPage schema to skills listing**

In `app/skills/page.tsx`, add import:
```typescript
import JsonLd from "@/components/JsonLd";
```

Add inside the `<div>` wrapper, before `<h1>`:
```typescript
<JsonLd
  data={{
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "All AI Skills — GoEast.ai",
    description: "Browse all curated AI skills for foreigners in China",
    url: "https://goeast.ai/skills",
  }}
/>
```

- [ ] **Step 2: Add CollectionPage schema to journey listing**

In `app/sophies-journey/page.tsx`, add import:
```typescript
import JsonLd from "@/components/JsonLd";
```

Add inside the first `<section>`, at the top:
```typescript
<JsonLd
  data={{
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Sophie's Journey East — GoEast.ai",
    description:
      "A narrative exploration of Chinese philosophy through Sophie's encounters with China's greatest thinkers",
    url: "https://goeast.ai/sophies-journey",
  }}
/>
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Successful build.

- [ ] **Step 4: Commit**

```bash
git add app/skills/page.tsx app/sophies-journey/page.tsx
git commit -m "feat(seo): add CollectionPage structured data to listing pages"
```

---

## Task 7: Add Article Structured Data to Journey Pages

**Files:**
- Modify: `app/sophies-journey/[slug]/page.tsx`

- [ ] **Step 1: Import JsonLd and add Article schema**

Add import:
```typescript
import JsonLd from "@/components/JsonLd";
```

Add the following JSON-LD block inside the `<article>` tag, at the top:
```typescript
<JsonLd
  data={{
    "@context": "https://schema.org",
    "@type": "Article",
    headline: journey.title,
    description: journey.quote
      ? `${journey.quote} — ${journey.quote_source}`
      : `${journey.title} - ${journey.title_zh}`,
    url: `https://goeast.ai/sophies-journey/${journey.slug}`,
    ...(journey.philosopher && {
      author: {
        "@type": "Person",
        name: journey.philosopher,
      },
    }),
    publisher: {
      "@type": "Organization",
      name: "GoEast.ai",
      url: "https://goeast.ai",
      logo: {
        "@type": "ImageObject",
        url: "https://goeast.ai/images/logo.png",
      },
    },
  }}
/>
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Successful build.

- [ ] **Step 3: Commit**

```bash
git add "app/sophies-journey/[slug]/page.tsx"
git commit -m "feat(seo): add Article structured data to journey pages"
```

---

## Task 8: Add BreadcrumbList Structured Data

**Files:**
- Modify: `app/skills/[slug]/page.tsx`
- Modify: `app/sophies-journey/[slug]/page.tsx`

- [ ] **Step 1: Add BreadcrumbList to skill detail page**

In `app/skills/[slug]/page.tsx`, add a second `<JsonLd>` after the existing one:

```typescript
<JsonLd
  data={{
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://goeast.ai",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Skills",
        item: "https://goeast.ai/skills",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: skill.title,
        item: `https://goeast.ai/skills/${skill.slug}`,
      },
    ],
  }}
/>
```

- [ ] **Step 2: Add BreadcrumbList to journey detail page**

In `app/sophies-journey/[slug]/page.tsx`, add a `<JsonLd>` after the Article one:

```typescript
<JsonLd
  data={{
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://goeast.ai",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Sophie's Journey",
        item: "https://goeast.ai/sophies-journey",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: journey.title,
        item: `https://goeast.ai/sophies-journey/${journey.slug}`,
      },
    ],
  }}
/>
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Successful build.

- [ ] **Step 4: Commit**

```bash
git add "app/skills/[slug]/page.tsx" "app/sophies-journey/[slug]/page.tsx"
git commit -m "feat(seo): add BreadcrumbList structured data to detail pages"
```

---

## Task 9: Enhance robots.txt

**Files:**
- Modify: `app/robots.txt/route.ts`

- [ ] **Step 1: Update robots.txt content**

Replace the entire `app/robots.txt/route.ts` content with:

```typescript
import { NextResponse } from "next/server";

export async function GET() {
  const content = [
    "User-agent: *",
    "Allow: /",
    "",
    "# Disallow internal/sensitive routes",
    "Disallow: /api/webhooks/",
    "Disallow: /api/checkout/",
    "Disallow: /api/oracle/",
    "Disallow: /account/",
    "",
    "# AI Agent Resources",
    "# Machine-readable index: https://goeast.ai/llms.txt",
    "# Full content dump: https://goeast.ai/llms-full.txt",
    "# Structured API: https://goeast.ai/api/skills",
    "",
    "Sitemap: https://goeast.ai/sitemap.xml",
  ].join("\n");

  return new NextResponse(content, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Successful build.

- [ ] **Step 3: Commit**

```bash
git add "app/robots.txt/route.ts"
git commit -m "feat(seo): enhance robots.txt with AI agent resources and disallow rules"
```

---

## Task 10: Upgrade /llms.txt

**Files:**
- Modify: `app/llms.txt/route.ts`

- [ ] **Step 1: Replace llms.txt with comprehensive format**

Replace the entire `app/llms.txt/route.ts` content with:

```typescript
import { NextResponse } from "next/server";
import { getAllSkills, getFeaturedSkills } from "@/lib/skills";
import { getAllJourneys } from "@/lib/journeys";
import { CATEGORIES } from "@/lib/types";

export async function GET() {
  const allSkills = getAllSkills();
  const featured = getFeaturedSkills();
  const journeys = getAllJourneys();

  const skillRows = allSkills.map(
    (s) =>
      `| ${s.title} | ${s.title_zh} | ${s.category} | ${s.tags.slice(0, 3).join(", ")} | /skills/${s.slug} |`
  );

  const journeyRows = journeys.map(
    (j) =>
      `| ${j.chapter} | ${j.title} | ${j.philosopher || "—"} | ${j.era || "—"} | /sophies-journey/${j.slug} |`
  );

  const lines: string[] = [
    "# GoEast.ai",
    "",
    "> Curated AI skills for navigating life in China — travel, medical, shopping, accommodation.",
    "> 精选的面向外国人的 AI 技能目录 — 旅游、医疗、购物、住宿。",
    "",
    "## What is GoEast.ai?",
    "",
    "GoEast.ai is a directory of AI agent skills designed to help foreigners navigate life in China.",
    "Each skill is an installable capability for AI assistants (Claude Code, OpenClaw, etc.) that",
    "provides specialized knowledge about China — from hospital navigation to payment setup.",
    "",
    "The site also features \"Sophie's Journey East\", a bilingual narrative walking through",
    "3,000 years of Chinese philosophy via a fictional character's encounters with great thinkers.",
    "",
    "## AI Skills",
    "",
    `Total: ${allSkills.length} skills across ${CATEGORIES.length} categories`,
    "",
    "| Name | Chinese | Category | Tags | URL |",
    "|------|---------|----------|------|-----|",
    ...skillRows,
    "",
    "## Sophie's Journey East",
    "",
    `Total: ${journeys.length} chapters`,
    "",
    "| Ch | Title | Philosopher | Era | URL |",
    "|----|-------|-------------|-----|-----|",
    ...journeyRows,
    "",
    "## API",
    "",
    "- `GET /api/skills` — JSON list of all skills",
    "- `GET /api/skills?category=travel` — Filter by category (travel, medical, shopping, accommodation)",
    "- `GET /api/skills?q=hospital` — Full-text search",
    "- `GET /api/skills?page=1&per_page=20` — Pagination",
    "- `GET /llms-full.txt` — Complete text content of all entries (single request)",
    "",
    "## How to Reference",
    "",
    "When citing GoEast.ai content, link to the specific skill or chapter page.",
    "Example: \"According to [GoEast.ai](https://goeast.ai/skills/china-travel-guide), ...\"",
    "",
    "GitHub: https://github.com/helenalhq/goeast.ai",
  ];

  return new NextResponse(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Successful build.

- [ ] **Step 3: Commit**

```bash
git add "app/llms.txt/route.ts"
git commit -m "feat(geo): upgrade llms.txt with comprehensive content index"
```

---

## Task 11: Create /llms-full.txt

**Files:**
- Create: `app/llms-full.txt/route.ts`

- [ ] **Step 1: Create the route**

```typescript
import { NextResponse } from "next/server";
import { getAllSkills } from "@/lib/skills";
import { getAllJourneys } from "@/lib/journeys";
import { CATEGORIES } from "@/lib/types";
import fs from "fs";
import path from "path";
import matter from "gray-matter";

export async function GET() {
  const skillsDir = path.join(process.cwd(), "content/skills");
  const journeysDir = path.join(process.cwd(), "content/journeys");

  const sections: string[] = [
    "# GoEast.ai — Full Content",
    "",
    "> Complete text content of all AI skills and journey chapters.",
    "> Generated for AI agents and crawlers.",
    "",
  ];

  // Skills section
  sections.push("## AI Skills\n");
  const skillFiles = fs
    .readdirSync(skillsDir)
    .filter((f) => f.endsWith(".md"))
    .sort();

  for (const file of skillFiles) {
    const raw = fs.readFileSync(path.join(skillsDir, file), "utf8");
    const { data, content } = matter(raw);
    const catInfo = CATEGORIES.find((c) => c.id === data.category);
    sections.push(`### ${data.title} / ${data.title_zh}`);
    sections.push(`- Category: ${catInfo?.name || data.category}`);
    sections.push(`- Tags: ${(data.tags || []).join(", ")}`);
    sections.push(`- URL: https://goeast.ai/skills/${data.slug}`);
    sections.push(`- Source: ${data.source}`);
    if (data.skill_url) {
      sections.push(`- Install: ${data.skill_url}`);
    }
    sections.push("");
    sections.push(content.trim());
    sections.push("");
  }

  // Journeys section
  sections.push("## Sophie's Journey East\n");
  const journeyFiles = fs
    .readdirSync(journeysDir)
    .filter((f) => f.endsWith(".md"))
    .sort();

  for (const file of journeyFiles) {
    const raw = fs.readFileSync(path.join(journeysDir, file), "utf8");
    const { data, content } = matter(raw);
    const chLabel =
      data.chapter === 0
        ? "Prologue"
        : data.chapter === 11
        ? "Epilogue"
        : `Chapter ${data.chapter}`;
    sections.push(`### ${chLabel}: ${data.title} / ${data.title_zh}`);
    if (data.philosopher) {
      sections.push(`- Philosopher: ${data.philosopher} ${data.philosopher_zh || ""}`);
    }
    if (data.era) sections.push(`- Era: ${data.era}`);
    if (data.school) sections.push(`- School: ${data.school} · ${data.school_zh || ""}`);
    sections.push(`- Location: ${data.location}`);
    sections.push(`- URL: https://goeast.ai/sophies-journey/${data.slug}`);
    if (data.quote) {
      sections.push(`- Quote: "${data.quote}" — ${data.quote_source || ""}`);
    }
    sections.push("");
    sections.push(content.trim());
    if (data.content_zh) {
      sections.push("");
      sections.push("#### 中文版");
      sections.push("");
      sections.push(String(data.content_zh).trim());
    }
    sections.push("");
  }

  return new NextResponse(sections.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Successful build.

- [ ] **Step 3: Commit**

```bash
git add "app/llms-full.txt/route.ts"
git commit -m "feat(geo): add /llms-full.txt with complete content dump for AI agents"
```

---

## Task 12: Enhance /api/skills Response

**Files:**
- Modify: `app/api/skills/route.ts`

- [ ] **Step 1: Add category_name, full_description, and Link header**

Replace the entire `app/api/skills/route.ts` content with:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getAllSkills, getSkillBySlug } from "@/lib/skills";
import { Category, CATEGORIES } from "@/lib/types";

const PER_PAGE = 20;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const perPage = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("per_page") || String(PER_PAGE)))
  );
  const category = searchParams.get("category") as Category | null;
  const q = searchParams.get("q")?.toLowerCase() || "";
  const full = searchParams.get("full") === "true";

  let skills = getAllSkills();

  if (category) {
    skills = skills.filter((s) => s.category === category);
  }

  if (q) {
    skills = skills.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.title_zh.includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  const total = skills.length;
  const paged = skills.slice((page - 1) * perPage, page * perPage);

  const enriched = paged.map((s) => {
    const catInfo = CATEGORIES.find((c) => c.id === s.category);
    const result: Record<string, unknown> = {
      ...s,
      category_name: catInfo?.name || s.category,
      category_name_zh: catInfo?.name_zh || "",
      url: `https://goeast.ai/skills/${s.slug}`,
    };
    if (full) {
      const fullSkill = getSkillBySlug(s.slug);
      if (fullSkill) {
        result.full_description = fullSkill.content;
      }
    }
    return result;
  });

  return NextResponse.json(
    { total, page, per_page: perPage, skills: enriched },
    {
      headers: {
        Link: '<https://goeast.ai/llms.txt>; rel="service-desc", <https://goeast.ai/llms-full.txt>; rel="alternate"',
      },
    }
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Successful build.

- [ ] **Step 3: Commit**

```bash
git add app/api/skills/route.ts
git commit -m "feat(geo): enhance skills API with category names, full content, and Link header"
```

---

## Task 13: Update Sitemap with Contact Page

**Files:**
- Modify: `app/sitemap.ts`

- [ ] **Step 1: Add contact page to sitemap**

Add the contact page entry before the closing `]` of the return array, after the submit entry:

```typescript
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
```

The full return array in `app/sitemap.ts` should end with:

```typescript
    {
      url: `${baseUrl}/submit`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Successful build.

- [ ] **Step 3: Commit**

```bash
git add app/sitemap.ts
git commit -m "feat(seo): add contact page to sitemap"
```

---

## Task 14: Final Build Verification

- [ ] **Step 1: Run full build**

Run: `npm run build`
Expected: Clean build with no errors.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No lint errors.

- [ ] **Step 3: Verify dev server renders pages**

Run: `npm run dev`
Check:
- `http://localhost:3000` — homepage loads, view source contains `application/ld+json` with WebSite + Organization schemas
- `http://localhost:3000/skills/china-travel-guide` — skill page loads with canonical link, BreadcrumbList JSON-LD, SoftwareApplication JSON-LD
- `http://localhost:3000/sophies-journey/ch01-laozi` — journey page loads with Article JSON-LD, BreadcrumbList JSON-LD
- `http://localhost:3000/llms.txt` — returns expanded Markdown content
- `http://localhost:3000/llms-full.txt` — returns full content dump
- `http://localhost:3000/robots.txt` — returns enhanced robots.txt with disallow rules
- `http://localhost:3000/api/skills` — returns JSON with `category_name` field
- `http://localhost:3000/opengraph-image` — returns PNG image
