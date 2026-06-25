# SEO & Content Growth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Increase organic traffic from 0 to 100-500 visits/month within 3-6 months by optimizing click-through rates and creating targeted content.

**Architecture:** Three-phase approach: (1) Fix CTR by rewriting meta titles/descriptions and adding FAQ schema, (2) Create 7-8 targeted articles in two content clusters, (3) Optimize internal linking and technical SEO.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, gray-matter for markdown parsing

## Global Constraints

- All new content must be fully bilingual (English + Chinese via `content_zh` frontmatter field)
- New insight articles must follow existing frontmatter structure: `slug`, `title`, `title_zh`, `philosopher_slug`, `concept_slugs`, `published_at`
- Content files go in `content/insights/` directory
- Internal linking should be contextual (3-5 links per article to existing philosophers, glossary, skills, journeys)
- FAQ schema uses existing `JsonLd` component from `@/components/JsonLd`
- Meta descriptions should be 150-160 characters with primary keyword in first 60 characters

---

## Task 1: Optimize Meta Titles and Descriptions for CTR

**Files:**
- Modify: `app/layout.tsx` (lines 17-41)
- Modify: `app/skills/page.tsx` (lines 9-14)
- Modify: `app/sophies-journey/page.tsx` (lines 10-21)
- Modify: `app/insights/page.tsx` (lines 11-20)
- Modify: `app/skills/[slug]/page.tsx` (metadata export)
- Modify: `app/sophies-journey/[slug]/page.tsx` (metadata export)

**Interfaces:**
- Consumes: Existing Next.js Metadata pattern
- Produces: Updated metadata objects with SEO-optimized titles and descriptions

- [ ] **Step 1: Update homepage meta title and description**

Modify `app/layout.tsx` lines 17-20:

```typescript
export const metadata: Metadata = {
  title: "Best AI Tools for Traveling in China (2026 Guide) | GoEast.ai",
  description: "Discover the best AI tools for traveling in China. From translation apps to navigation helpers, find everything you need for your trip.",
  // ... rest of metadata unchanged
};
```

- [ ] **Step 2: Update skills listing page metadata**

Modify `app/skills/page.tsx` lines 9-14:

```typescript
export const metadata: Metadata = {
  title: "Top AI Apps for China: Translation, Travel, Shopping | GoEast.ai",
  description: "Browse curated AI skills for foreigners in China. Find the best tools for translation, navigation, shopping, medical, and more.",
  alternates: { canonical: "/skills" },
};
```

- [ ] **Step 3: Update journey landing page metadata**

Modify `app/sophies-journey/page.tsx` lines 10-15:

```typescript
export const metadata: Metadata = {
  title: "Chinese Philosophy Through Stories: Laozi, Confucius, Zhuangzi | GoEast.ai",
  description: "Explore 3,000 years of Chinese philosophy through Sophie's journey. Discover wisdom from Laozi, Confucius, Zhuangzi, and more.",
  alternates: { canonical: "/sophies-journey" },
  // ... openGraph and rest unchanged
};
```

- [ ] **Step 4: Update insights listing page metadata**

Modify `app/insights/page.tsx` lines 11-16:

```typescript
export const metadata: Metadata = {
  title: "Chinese Philosophy Explained: Yin Yang, Wu Wei, Confucius | GoEast.ai",
  description: "Explore Chinese philosophy in the modern world. Learn about yin yang, wu wei, Confucius leadership, and ancient wisdom for today.",
  alternates: { canonical: "/insights" },
  // ... openGraph and rest unchanged
};
```

- [ ] **Step 5: Update individual skill page metadata pattern**

In `app/skills/[slug]/page.tsx`, update the metadata export to follow this pattern:

```typescript
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const skill = await getSkillWithHtml(slug);
  if (!skill) return {};

  return {
    title: `${skill.title}: AI Tool for ${skill.category} in China | GoEast.ai`,
    description: `Learn how to use ${skill.title} for ${skill.category} tasks in China. Step-by-step guide with installation and usage tips.`,
    alternates: { canonical: `/skills/${slug}` },
  };
}
```

- [ ] **Step 6: Update individual journey page metadata pattern**

In `app/sophies-journey/[slug]/page.tsx`, update the metadata export:

```typescript
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const journey = await getJourneyWithHtml(slug);
  if (!journey) return {};

  return {
    title: `${journey.title} — ${journey.philosopher} Philosophy | GoEast.ai`,
    description: `Discover ${journey.philosopher}'s philosophy through Sophie's journey. ${journey.quote?.substring(0, 100) || ""}`,
    alternates: { canonical: `/sophies-journey/${slug}` },
  };
}
```

- [ ] **Step 7: Verify changes with build**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 8: Commit**

```bash
git add app/layout.tsx app/skills/page.tsx app/sophies-journey/page.tsx app/insights/page.tsx app/skills/\[slug\]/page.tsx app/sophies-journey/\[slug\]/page.tsx
git commit -m "seo: optimize meta titles and descriptions for better CTR"
```

---

## Task 2: Add FAQ Schema to Key Pages

**Files:**
- Modify: `app/page.tsx` (add FAQ schema after existing JsonLd)
- Modify: `app/skills/page.tsx` (add FAQ schema)
- Modify: `app/sophies-journey/page.tsx` (add FAQ schema)
- Modify: `app/insights/page.tsx` (add FAQ schema)

**Interfaces:**
- Consumes: `JsonLd` component from `@/components/JsonLd`
- Produces: FAQPage structured data for rich snippets

- [ ] **Step 1: Add homepage FAQ schema**

In `app/page.tsx`, add after the existing `<JsonLd>` components (around line 175):

```tsx
<JsonLd
  data={{
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is GoEast.ai?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "GoEast.ai is a curated directory of AI skills and tools for traveling and living in China, plus a narrative journey through Chinese philosophy.",
        },
      },
      {
        "@type": "Question",
        name: "What AI tools do I need for traveling in China?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Essential AI tools for China include translation apps (for Mandarin), navigation helpers (Baidu Maps alternatives), payment assistants (WeChat Pay setup), and travel planners.",
        },
      },
      {
        "@type": "Question",
        name: "Is GoEast.ai free to use?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, GoEast.ai is completely free. Browse AI skills, read philosophy stories, and access all content without any cost.",
        },
      },
      {
        "@type": "Question",
        name: "What Chinese philosophers are covered?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "We cover Laozi, Confucius, Sunzi, Zhuangzi, Mencius, Mozi, Zhu Xi, Zhang Zai, Huineng, and Wang Yangming through Sophie's Journey narrative.",
        },
      },
      {
        "@type": "Question",
        name: "How do I submit a new AI skill?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Visit our Submit page and create a GitHub issue with the skill details. We review submissions weekly.",
        },
      },
    ],
  }}
/>
```

- [ ] **Step 2: Add skills page FAQ schema**

In `app/skills/page.tsx`, add after the existing `<JsonLd>` component:

```tsx
<JsonLd
  data={{
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What are the best AI tools for China?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The best AI tools for China include translation apps, navigation assistants, shopping helpers, and medical tools. Browse our curated list by category.",
        },
      },
      {
        "@type": "Question",
        name: "Are these AI tools free?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Most AI skills listed are free or have free tiers. Check individual skill pages for pricing details.",
        },
      },
      {
        "@type": "Question",
        name: "Do these AI tools work in China?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, all skills in our directory are specifically curated for use in China, accounting for the Great Firewall and local services.",
        },
      },
    ],
  }}
/>
```

- [ ] **Step 3: Add journey page FAQ schema**

In `app/sophies-journey/page.tsx`, add after the existing `<JsonLd>` component:

```tsx
<JsonLd
  data={{
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is Sophie's Journey East?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Sophie's Journey East is a narrative series exploring 3,000 years of Chinese philosophy through a fictional character's encounters with great thinkers like Laozi, Confucius, and Zhuangzi.",
        },
      },
      {
        "@type": "Question",
        name: "Is the content bilingual?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, all journey chapters are available in both English and Chinese. Use the language toggle to switch between EN, ZH, or bilingual view.",
        },
      },
      {
        "@type": "Question",
        name: "Who are the philosophers covered?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The journey covers Zhou Gong, Laozi, Confucius, Sunzi, Zhuangzi, Mencius, Mozi, Zhu Xi, Zhang Zai, Huineng, and Wang Yangming.",
        },
      },
    ],
  }}
/>
```

- [ ] **Step 4: Add insights page FAQ schema**

In `app/insights/page.tsx`, add after the existing `<JsonLd>` component:

```tsx
<JsonLd
  data={{
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is yin and yang?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yin and yang is a Chinese philosophical concept describing how opposite forces are interconnected and complementary. Yin represents passive, dark, feminine energy; yang represents active, light, masculine energy.",
        },
      },
      {
        "@type": "Question",
        name: "What is wu wei?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Wu wei means 'effortless action' or 'non-action' in Chinese philosophy. It's the practice of aligning with the natural flow of life rather than forcing outcomes.",
        },
      },
      {
        "@type": "Question",
        name: "How does Chinese philosophy apply to modern life?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Chinese philosophy offers timeless wisdom for modern challenges: Confucius for leadership, Laozi for stress management, Sunzi for strategy, and Zhuangzi for creativity.",
        },
      },
    ],
  }}
/>
```

- [ ] **Step 5: Verify FAQ schema with build**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 6: Validate structured data**

Visit each page and view page source to confirm FAQ schema JSON-LD is present:
- Homepage: https://www.goeast.ai
- Skills: https://www.goeast.ai/skills
- Journey: https://www.goeast.ai/sophies-journey
- Insights: https://www.goeast.ai/insights

- [ ] **Step 7: Commit**

```bash
git add app/page.tsx app/skills/page.tsx app/sophies-journey/page.tsx app/insights/page.tsx
git commit -m "seo: add FAQ schema to key pages for rich snippets"
```

---

## Task 3: Create Chinese Philosophy Content Cluster (4 Articles)

**Files:**
- Create: `content/insights/yin-yang-explained.md`
- Create: `content/insights/confucius-leadership.md`
- Create: `content/insights/wu-wei-philosophy.md`
- Create: `content/insights/difference-yin-yang.md`

**Interfaces:**
- Consumes: Existing insight frontmatter pattern, philosopher slugs from `content/philosophers/`
- Produces: 4 new insight articles with full bilingual content, internal links, and FAQ sections

- [ ] **Step 1: Create "Yin Yang Explained" article**

Create `content/insights/yin-yang-explained.md` with the following structure:

```markdown
---
slug: yin-yang-explained
title: "Yin Yang Explained: What It Really Means (Simple Guide)"
title_zh: "阴阳详解：真正的含义（简单指南）"
philosopher_slug: laozi
concept_slugs: [yin-yang, qi, dao]
published_at: 2026-06-25
content_zh: |
  [Chinese translation of the full article]
---

# Yin Yang Explained: What It Really Means

[1500-2500 word article covering:]

## What is Yin Yang?
- Simple definition and origin
- The taijitu symbol explained
- Common misconceptions

## Yin and Yang in Daily Life
- Examples from nature (day/night, seasons)
- Examples from the body (rest/activity)
- Examples from emotions (calm/excitement)

## The Philosophy Behind Yin Yang
- Connection to Daoism and Laozi
- How it differs from Western dualism
- The concept of dynamic balance

## Yin Yang in Traditional Chinese Medicine
- How practitioners use yin-yang theory
- Practical examples

## Modern Applications
- Work-life balance through yin-yang lens
- Decision-making with yin-yang thinking

## FAQ
### What is the difference between yin and yang?
[Answer]

### Is yin good or bad?
[Answer]

### How do I apply yin-yang in my life?
[Answer]

## Related
- Link to /glossary/yin-yang
- Link to /sophies-journey/ch01-laozi
- Link to /philosophers/laozi
- Link to insights about qi, dao
```

- [ ] **Step 2: Create "Confucius Leadership" article**

Create `content/insights/confucius-leadership.md`:

```markdown
---
slug: confucius-leadership
title: "Confucius Leadership Principles for Modern Managers"
title_zh: "孔子领导原则：现代管理者的指南"
philosopher_slug: confucius
concept_slugs: [ren, li, junzi]
published_at: 2026-06-27
content_zh: |
  [Chinese translation]
---

# Confucius Leadership Principles for Modern Managers

[1500-2500 word article covering:]

## The Timeless Wisdom of Confucius
- Brief biography relevant to leadership
- Why his ideas still matter today

## 5 Key Leadership Principles

### 1. Lead by Example (德治)
- Explanation with quote from Analects
- Modern workplace application

### 2. Cultivate Ren (仁) — Humaneness
- What ren means in leadership context
- Practical examples

### 3. Practice Li (礼) — Proper Conduct
- Ritual and respect in modern teams
- Building organizational culture

### 4. Develop Junzi (君子) — The Noble Person
- Characteristics of a junzi leader
- Self-cultivation for managers

### 5. Govern with Virtue, Not Force
- Contrast with authoritarian management
- Long-term vs. short-term thinking

## Case Studies
- Modern companies applying Confucian principles
- Lessons from successful leaders

## FAQ
### What are Confucius's main leadership principles?
### How is Confucian leadership different from Western leadership?
### Can Confucius's ideas work in startups?

## Related
- Link to /philosophers/confucius
- Link to /sophies-journey/ch02-confucius
- Link to /glossary/ren, /glossary/li, /glossary/junzi
```

- [ ] **Step 3: Create "Wu Wei Philosophy" article**

Create `content/insights/wu-wei-philosophy.md`:

```markdown
---
slug: wu-wei-philosophy
title: "Wu Wei: The Chinese Philosophy of Effortless Action"
title_zh: "无为： effortless action 的中国哲学"
philosopher_slug: laozi
concept_slugs: [wuwei, dao, ziran]
published_at: 2026-06-30
content_zh: |
  [Chinese translation]
---

# Wu Wei: The Chinese Philosophy of Effortless Action

[1500-2500 word article covering:]

## What is Wu Wei?
- Literal translation: "non-action" or "effortless action"
- Origin in Dao De Jing
- Common misunderstandings

## The Water Metaphor
- How water exemplifies wu wei
- Flexibility and persistence

## Wu Wei vs. Western Productivity Culture
- Contrast with hustle culture
- When to act vs. when to let go

## Practical Applications

### In Decision Making
- Knowing when not to decide
- Trusting the process

### In Leadership
- Leading without micromanaging
- Creating conditions for success

### In Creative Work
- Flow state and wu wei
- Letting ideas emerge naturally

### In Daily Life
- Reducing unnecessary effort
- Finding the path of least resistance

## Wu Wei in Modern Psychology
- Connection to flow state
- Mindfulness and acceptance

## FAQ
### Does wu wei mean doing nothing?
### How do I practice wu wei?
### Is wu wei compatible with ambition?

## Related
- Link to /philosophers/laozi
- Link to /sophies-journey/ch01-laozi
- Link to /glossary/wuwei, /glossary/dao, /glossary/ziran
- Link to insights about Dao of Design
```

- [ ] **Step 4: Create "Difference Between Yin and Yang" article**

Create `content/insights/difference-yin-yang.md`:

```markdown
---
slug: difference-yin-yang
title: "The Difference Between Yin and Yang (With Examples)"
title_zh: "阴和阳的区别（附例子）"
philosopher_slug: laozi
concept_slugs: [yin-yang, qi]
published_at: 2026-07-02
content_zh: |
  [Chinese translation]
---

# The Difference Between Yin and Yang

[1500-2500 word article covering:]

## Quick Summary
- Yin: passive, dark, feminine, receptive, cold, soft
- Yang: active, light, masculine, creative, hot, hard

## Detailed Comparison Table
| Aspect | Yin | Yang |
|--------|-----|------|
| Energy | Receptive | Creative |
| Time | Night | Day |
| Season | Winter | Summer |
| Direction | Down | Up |
| Element | Water | Fire |
| Body | Rest | Activity |

## Examples in Nature
- Day and night cycle
- Seasonal changes
- Weather patterns

## Examples in the Human Body
- Yin organs vs. Yang organs in TCM
- Rest and activity balance
- Nutrition and exercise

## Examples in Emotions
- Calm (yin) vs. Excitement (yang)
- Introspection vs. Expression
- Patience vs. Action

## The Key Insight: They Need Each Other
- No pure yin or pure yang
- Dynamic balance, not static
- The dot in each half of the symbol

## Common Misconceptions
- Yin is not "bad" and yang is not "good"
- It's not about gender stereotypes
- Balance doesn't mean 50/50 split

## FAQ
### Which is yin and which is yang?
### Can you have too much yin or yang?
### How do I balance yin and yang in my life?

## Related
- Link to /glossary/yin-yang
- Link to insights/yin-yang-explained
- Link to /philosophers/laozi
- Link to /sophies-journey/ch01-laozi
```

- [ ] **Step 5: Verify all 4 articles render correctly**

Run: `npm run dev`
Visit each page:
- https://localhost:3000/insights/yin-yang-explained
- https://localhost:3000/insights/confucius-leadership
- https://localhost:3000/insights/wu-wei-philosophy
- https://localhost:3000/insights/difference-yin-yang

Expected: All pages render with proper bilingual content, internal links, and FAQ sections

- [ ] **Step 6: Commit**

```bash
git add content/insights/yin-yang-explained.md content/insights/confucius-leadership.md content/insights/wu-wei-philosophy.md content/insights/difference-yin-yang.md
git commit -m "content: add Chinese Philosophy cluster (4 articles)"
```

---

## Task 4: Create Practical Guides Content Cluster (3 Articles)

**Files:**
- Create: `content/insights/wechat-pay-foreigner.md`
- Create: `content/insights/ai-apps-expats-china.md`
- Create: `content/insights/chinese-culture-guide.md`

**Interfaces:**
- Consumes: Existing insight pattern, skill slugs from `content/skills/`
- Produces: 3 new practical guide articles with bilingual content

- [ ] **Step 1: Create "WeChat Pay for Foreigners" article**

Create `content/insights/wechat-pay-foreigner.md`:

```markdown
---
slug: wechat-pay-foreigner
title: "How to Set Up WeChat Pay as a Foreigner in China (2026)"
title_zh: "外国人在中国如何设置微信支付（2026）"
philosopher_slug: null
concept_slugs: []
published_at: 2026-07-05
content_zh: |
  [Chinese translation]
---

# How to Set Up WeChat Pay as a Foreigner in China

[1500-2500 word practical guide covering:]

## Why You Need WeChat Pay
- Cashless society in China
- Where WeChat Pay is accepted
- Alternatives (Alipay) comparison

## Step-by-Step Setup

### Step 1: Download WeChat
- App Store / Google Play links
- Account creation with foreign phone number

### Step 2: Verify Your Identity
- Required documents (passport)
- Verification process timeline

### Step 3: Link Your Bank Card
- Supported foreign cards
- Chinese bank account option
- Verification steps

### Step 4: Add Money
- Top-up methods
- Limits for foreign users

### Step 5: Start Paying
- How to scan QR codes
- How to show your payment code
- Tips for first-time users

## Common Issues & Solutions
- Verification failed
- Card not supported
- Transaction limits

## Alternatives to WeChat Pay
- Alipay setup guide
- Cash usage (where still accepted)
- International cards

## FAQ
### Can foreigners use WeChat Pay?
### What documents do I need?
### Is WeChat Pay safe?
### What if I don't have a Chinese bank account?

## Related
- Link to /skills/china-payment-setup
- Link to /skills/alipay-integration-expert
- Link to /skills/travel-in-china
- Link to insights about AI apps for China
```

- [ ] **Step 2: Create "AI Apps for Expats" article**

Create `content/insights/ai-apps-expats-china.md`:

```markdown
---
slug: ai-apps-expats-china
title: "Best AI Apps Every Expat in China Should Have (2026)"
title_zh: "每个在中国的外国人都应该拥有的最佳AI应用（2026）"
philosopher_slug: null
concept_slugs: []
published_at: 2026-07-07
content_zh: |
  [Chinese translation]
---

# Best AI Apps Every Expat in China Should Have

[1500-2500 word article covering:]

## Essential Categories

### 1. Translation Apps
- Best AI translation tools for Mandarin
- Real-time conversation translation
- Menu and sign translation

### 2. Navigation & Maps
- AI-powered navigation in China
- Baidu Maps vs. Amap for foreigners
- Public transit planners

### 3. Shopping Assistants
- Taobao translation helpers
- Price comparison tools
- Fake review detectors

### 4. Medical & Health
- AI symptom checkers with Chinese hospital data
- Medicine translation apps
- Finding English-speaking doctors

### 5. Daily Life Helpers
- AI recipe translators for Chinese cooking
- Document translation for bureaucracy
- Voice assistants that understand Mandarin

## Top 10 AI Apps for China (Ranked)
1. [App name] — Best for [use case]
2. [App name] — Best for [use case]
...

## Free vs. Paid Options
- What's worth paying for
- Free alternatives that work well

## Privacy Considerations
- Data handling in Chinese apps
- VPN requirements
- Alternatives with better privacy

## FAQ
### Which AI translation app is best for China?
### Do these apps work without VPN?
### Are Chinese AI apps safe for foreigners?
### What's the best AI app for ordering food?

## Related
- Link to /skills (multiple relevant skills)
- Link to insights/wechat-pay-foreigner
- Link to insights/chinese-culture-guide
```

- [ ] **Step 3: Create "Chinese Culture Guide" article**

Create `content/insights/chinese-culture-guide.md`:

```markdown
---
slug: chinese-culture-guide
title: "Chinese Culture Guide: Essential Concepts Before You Visit"
title_zh: "中国文化指南：访问前必知的基本概念"
philosopher_slug: null
concept_slugs: [ren, li, dao]
published_at: 2026-07-09
content_zh: |
  [Chinese translation]
---

# Chinese Culture Guide: Essential Concepts Before You Visit

[1500-2500 word guide covering:]

## Why Understanding Culture Matters
- Avoiding faux pas
- Building deeper connections
- Enhancing your travel experience

## Core Concepts Every Visitor Should Know

### 1. Face (面子 Miànzi)
- What it means and why it matters
- How to give face
- How to avoid causing loss of face

### 2. Guanxi (关系)
- The importance of relationships
- Building guanxi as a foreigner
- Business and social implications

### 3. Harmony (和 Hé)
- Conflict avoidance in Chinese culture
- Indirect communication style
- Reading between the lines

### 4. Filial Piety (孝 Xiào)
- Respect for elders
- Family dynamics
- How it affects social interactions

### 5. The Middle Way (中庸 Zhōngyōng)
- Balance and moderation
- Avoiding extremes
- Practical examples in daily life

## Practical Cultural Tips

### Dining Etiquette
- Chopstick rules
- Seating arrangements
- Toasting customs

### Business Culture
- Gift-giving etiquette
- Business card exchange
- Meeting protocols

### Social Interactions
- Greetings and gestures
- Topics to avoid
- Showing respect

## Common Mistakes Foreigners Make
- Direct criticism
- Tipping (don't do it)
- Discussing sensitive topics

## FAQ
### What is the most important Chinese cultural concept?
### How do I show respect in China?
### What topics should I avoid?
### Is it okay to disagree with Chinese colleagues?

## Related
- Link to /glossary/ren, /glossary/li, /glossary/zhongyong
- Link to /philosophers/confucius
- Link to insights about Chinese philosophy
- Link to skills for travel in China
```

- [ ] **Step 4: Verify all 3 articles render correctly**

Run: `npm run dev`
Visit each page:
- https://localhost:3000/insights/wechat-pay-foreigner
- https://localhost:3000/insights/ai-apps-expats-china
- https://localhost:3000/insights/chinese-culture-guide

Expected: All pages render with proper bilingual content and internal links

- [ ] **Step 5: Commit**

```bash
git add content/insights/wechat-pay-foreigner.md content/insights/ai-apps-expats-china.md content/insights/chinese-culture-guide.md
git commit -m "content: add Practical Guides cluster (3 articles)"
```

---

## Task 5: Optimize Internal Linking and Technical SEO

**Files:**
- Modify: `app/sitemap.ts` (verify lastmod dates are present)
- Modify: Existing insight pages (add links to new content)
- Modify: `app/insights/page.tsx` (add related articles section if missing)

**Interfaces:**
- Consumes: New insight articles from Tasks 3-4
- Produces: Improved internal link structure, verified sitemap

- [ ] **Step 1: Verify sitemap has lastmod dates**

Read `app/sitemap.ts` and confirm all entries include `lastModified` field. The sitemap should already have this based on the existing pattern:

```typescript
{
  url: `${baseUrl}/insights/${slug}`,
  lastModified: new Date(),
  changeFrequency: "monthly",
  priority: 0.7,
}
```

If any entries are missing `lastModified`, add them.

- [ ] **Step 2: Update existing high-traffic pages to link to new content**

Add contextual links from existing pages to new articles:

In `app/page.tsx` (homepage), add to the insights section:
```tsx
<Link href="/insights/yin-yang-explained">Yin Yang Explained</Link>
<Link href="/insights/confucius-leadership">Confucius Leadership</Link>
```

In `app/sophies-journey/page.tsx`, add links to relevant philosophy articles.

- [ ] **Step 3: Add breadcrumb schema to insight pages**

In `app/insights/[slug]/page.tsx`, add breadcrumb structured data:

```tsx
<JsonLd
  data={{
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.goeast.ai" },
      { "@type": "ListItem", position: 2, name: "Insights", item: "https://www.goeast.ai/insights" },
      { "@type": "ListItem", position: 3, name: insight.title },
    ],
  }}
/>
```

- [ ] **Step 4: Run final build verification**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 5: Submit URLs to Google Search Console**

Manually submit these new URLs via Search Console:
- /insights/yin-yang-explained
- /insights/confucius-leadership
- /insights/wu-wei-philosophy
- /insights/difference-yin-yang
- /insights/wechat-pay-foreigner
- /insights/ai-apps-expats-china
- /insights/chinese-culture-guide

- [ ] **Step 6: Commit**

```bash
git add app/sitemap.ts app/page.tsx app/sophies-journey/page.tsx app/insights/\[slug\]/page.tsx
git commit -m "seo: optimize internal linking and add breadcrumb schema"
```

---

## Summary

This plan delivers:
1. **CTR optimization** — Better titles/descriptions to convert impressions to clicks
2. **FAQ schema** — Rich snippets for expanded search presence
3. **7 new articles** — 4 philosophy + 3 practical guides targeting low-competition keywords
4. **Technical SEO** — Internal linking, breadcrumbs, verified sitemap

**Timeline:** 2-6 weeks for full implementation
**Expected results:** 100-500 organic visits/month within 3-6 months
