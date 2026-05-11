# Sophie's Journey East — Design Spec

## Overview

A new narrative section on GoEast.ai inspired by Jostein Gaarder's *Sophie's World*. Sophie, having escaped the pages of the original book as a "free being," travels East and encounters China's greatest philosophers. Each encounter is a problem-driven story where a real travel dilemma leads to philosophical dialogue.

## Audience

Primary: Foreigners visiting or living in China (English).
Secondary: Chinese readers (toggle to Chinese supported).

## Content

### Story Structure

**Prologue + 10 stories + Epilogue**, following a journey line from the Silk Road through China's heartland to its eastern shores.

| Phase | Philosopher | Sophie's Dilemma | Philosophical Theme |
|-------|------------|-------------------|---------------------|
| Prologue | **Zhou Gong** 周公 | Arrives in the East knowing nothing about this civilization | I Ching, dream interpretation, the roots of Chinese civilization |
| Ch 1 | **Laozi** 老子 | Doesn't know which direction to go | Wu wei (non-action), flowing with the Tao |
| Ch 2 | **Confucius** 孔子 | Overwhelmed by complex social etiquette | Ren (仁) and Li (礼), relationships between people |
| Ch 3 | **Sunzi** 孙子 | Caught in a difficult negotiation | Know yourself and your opponent, strategic wisdom |
| Ch 4 | **Zhuangzi** 庄子 | Questions her identity as a fictional character who escaped a book | Freedom and authenticity, the butterfly dream |
| Ch 5 | **Mencius** 孟子 | Witnesses suffering, doubts whether human nature is good | Inherent goodness, the seed of compassion |
| Ch 6 | **Mozi** 墨子 | Sees communities divided and in conflict | Universal love (兼爱) and anti-warfare (非攻) |
| Ch 7 | **Zhu Xi** 朱熹 | Overwhelmed by the complexity of Chinese culture, can't grasp it | Investigating things to extend knowledge (格物致知) |
| Ch 8 | **Zhang Zai** 张载 | Lost sense of purpose — what does a "free being" live for? | "Set the heart for heaven and earth" (为天地立心) |
| Ch 9 | **Huineng** 惠能 | Seeks inner peace but cannot find it | Original nature is empty (本来无一物), sudden enlightenment |
| Ch 10 | **Wang Yangming** 王阳明 | Knows what is right but cannot act on it | Unity of knowledge and action (知行合一) |
| Epilogue | — | Reflects on the journey, East meets West | Synthesis of Eastern and Western thought |

### Philosophical Schools Covered

- Ancient civilization (周公)
- Daoism / 道家 (老子, 庄子)
- Confucianism / 儒家 (孔子, 孟子)
- Strategy / 兵家 (孙子)
- Mohism / 墨家 (墨子)
- Neo-Confucianism / 理学 & 心学 (朱熹, 张载, 王阳明)
- Zen Buddhism / 禅宗 (惠能)

### Narrative Connection to *Sophie's World*

The prologue continues directly from the original novel's ending. In the book's final act, Sophie realizes she is a fictional character and escapes into the "real world" during a garden party. In our story, Sophie — now a free being unbound by any author — is drawn eastward by an inexplicable pull. Zhou Gong's I Ching divination in the prologue reveals the philosophical journey ahead.

Zhuangzi's butterfly dream (Chapter 4) directly echoes Sophie's condition — is she a girl who dreamed she was a book character, or a book character dreaming she is free?

### Story Template (Flexible)

Stories are not required to follow a rigid structure. Each should adapt to the philosopher's unique style and thinking. The following is a reference anchor:

1. **Scene setting** (1-2 paragraphs): Where Sophie is, what problem she faces
2. **Philosopher's entrance** (1 paragraph): How the philosopher appears
3. **Dialogue and exploration** (3-5 paragraphs): Core philosophical conversation
4. **Moment of insight** (1-2 paragraphs): Sophie's realization
5. **Original quote**: Classic text excerpt in Chinese and English
6. **Transition**: Seeds for the next chapter

Some stories may be dialogue-heavy (like Zhuangzi), others more experiential (like Huineng). The original *Sophie's World* varies its approach chapter by chapter — we do the same.

### Language

Stories are written in English as the primary language. Chinese translations are provided for titles, key quotes, and optionally for the full narrative. A language toggle on each page switches between English and Chinese.

## Page Structure

### Landing Page: `/sophies-journey`

Three sections:

1. **Hero**: Atmospheric introduction with bilingual title ("Sophie's Journey East / 苏菲的东方之旅"), a brief tagline, and "Begin the Journey" CTA button.

2. **Journey Timeline**: Vertical timeline with nodes for each chapter. Each node shows chapter number, poetic title, philosopher name (bilingual), and philosophical school. Clicking a node navigates to the story page.

3. **Philosopher Gallery**: Grid of cards, each showing a philosopher's representative symbol/character, name (bilingual), and school. Grouped or color-coded by philosophical school.

### Story Page: `/sophies-journey/[slug]`

- Breadcrumb navigation (Home > Sophie's Journey > Chapter title)
- Chapter header: school badge, bilingual chapter title, philosopher name, era, location
- Long-form narrative content (prose with philosophical dialogue)
- Quote callouts: styled blockquotes from original Chinese texts with English translation
- Prev/Next chapter navigation at bottom

## Technical Architecture

### Content Storage

Markdown files in `/content/journeys/`:

```
content/journeys/
├── prologue-zhougong.md
├── ch01-laozi.md
├── ch02-confucius.md
├── ch03-sunzi.md
├── ch04-zhuangzi.md
├── ch05-mencius.md
├── ch06-mozi.md
├── ch07-zhuxi.md
├── ch08-zhangzai.md
├── ch09-huineng.md
├── ch10-wangyangming.md
└── epilogue.md
```

### Frontmatter Schema

Prologue and epilogue use the same schema. For the epilogue, `philosopher` and `school` fields are omitted; `chapter` is 11.

```yaml
slug: laozi              # URL slug
chapter: 1               # Chapter number (0 = prologue, 11 = epilogue)
title: "The Way Without Direction"
title_zh: "無為之道的方向"
philosopher: "Laozi"
philosopher_zh: "老子"
era: "6th century BCE"
school: "Daoism"
school_zh: "道家"
location: "Silk Road"
color: "#2d5016"          # School color — used for timeline dots, school badges, and quote borders
quote: "The Tao that can be told is not the eternal Tao."
quote_source: "Tao Te Ching, Chapter 1"
quote_zh: "道可道，非常道。"
```

### New Pages/Routes

- `app/sophies-journey/page.tsx` — Landing page
- `app/sophies-journey/[slug]/page.tsx` — Story detail page
- `lib/journeys.ts` — Data layer (similar to existing `lib/skills.ts`)

### Navigation

Add "Journey" link to the main header navigation, positioned between Skills and About. This is a top-level section, not a subcategory of Skills.

### Styling

Reuses the existing design system:
- Background: cream (#faf5ef)
- Text: ink (#2c1810), warm (#8b7355)
- Accent: china-red (#c0392b)
- Cards: white with sand (#e0d5c5) borders
- Typography: prose classes via @tailwindcss/typography
- Each philosophical school gets a subtle color accent for visual differentiation

### Static Generation

All pages use `generateStaticParams` for static generation, consistent with existing skill pages.

## Tone

Deep, contemplative. Philosophical depth that respects the reader's intelligence. Not dumbed down, but accessible — the narrative story makes complex ideas approachable without sacrificing their substance.

## Scope

This spec covers the initial release:
- Landing page with timeline and philosopher gallery
- 12 content pages (prologue + 10 stories + epilogue)
- Bilingual support (English primary, Chinese toggle)
- Static site generation

**Out of scope** for initial release (future iteration):
- Interactive features (card-based pagination, chat-style dialogue, map exploration)
- Illustrations/artwork for each chapter
- Audio narration
- Reader progress tracking
