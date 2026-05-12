# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server on localhost:3000
npm run build    # Production build
npm run lint     # ESLint (uses eslint-config-next with core-web-vitals + typescript)
```

No test framework is configured.

## Architecture

GoEast.ai is a content-driven directory of curated AI skills for China, plus a narrative feature ("Sophie's Journey East") that walks through Chinese philosophy via a fictional character. Built on **Next.js 16** (App Router), **React 19**, **Tailwind CSS 4**, and **TypeScript**.

### Content layer — Markdown + gray-matter

All data lives as Markdown files with YAML frontmatter under `content/`:

- `content/skills/*.md` — AI skill entries. Frontmatter fields: `slug`, `title`, `title_zh`, `category` (travel|medical|shopping|accommodation), `tags[]`, `source`, `source_url`, `skill_url`, `featured`, `updated_at`.
- `content/journeys/*.md` — Story chapters. Frontmatter fields: `slug`, `chapter`, `title`, `title_zh`, `philosopher`, `philosopher_zh`, `era`, `school`, `school_zh`, `location`, `color`, `quote`, `quote_source`, `quote_zh`, `content_zh`. Body is English prose; Chinese text lives in the `content_zh` frontmatter field.

### Data access — `lib/`

- `lib/types.ts` — Shared TypeScript types (`Skill`, `SkillMeta`, `Journey`, `JourneyMeta`, `Category`, `CategoryInfo`, `SchoolInfo`) and constants (`CATEGORIES`, `SCHOOLS`).
- `lib/skills.ts` — Reads `content/skills/`, parses frontmatter with `gray-matter`, converts markdown to HTML with `remark`. Exports `getSkillSlugs`, `getSkillBySlug`, `getSkillWithHtml`, `getAllSkills`, `getSkillsByCategory`, `getFeaturedSkills`, `searchSkills`.
- `lib/journeys.ts` — Same pattern for `content/journeys/`. Exports `getJourneySlugs`, `getJourneyBySlug`, `getJourneyWithHtml`, `getAllJourneys`, `getJourneyByChapter`.

### Routing — `app/`

Standard Next.js App Router with Server Components. Key routes:

| Route | Purpose |
|---|---|
| `app/page.tsx` | Homepage — Hero, JourneyBanner, CategoryGrid, featured skills |
| `app/skills/[slug]/page.tsx` | Individual skill detail pages |
| `app/skills/page.tsx` | Skills listing |
| `app/categories/[slug]/page.tsx` | Category-filtered skill pages |
| `app/sophies-journey/page.tsx` | Journey landing — timeline + philosopher grid |
| `app/sophies-journey/[slug]/page.tsx` | Individual chapter with bilingual reader |
| `app/api/skills/route.ts` | JSON API with pagination, category filter, and text search (`?q=&category=&page=&per_page=`) |
| `app/sitemap.ts` | Dynamic sitemap covering all skill + category pages |
| `app/submit/page.tsx` | Submit-a-skill form linking to GitHub Issues |
| `app/about/page.tsx` | About page |
| `app/contact/page.tsx` | Contact page |

### Components — `components/`

Presentational React components: `Header`, `Footer`, `Hero`, `CategoryGrid`, `SkillCard`, `SkillList`, `JourneyBanner`, `JourneyTimeline`, `JourneyReader` (bilingual toggle), `PhilosopherCard`, `CategoryBadge`, `JsonLd` (structured data).

### Styling

- Tailwind 4 with `@tailwindcss/typography` plugin.
- Custom color palette: `cream` (#faf5ef), `ink` (#2c1810), `warm` (#8b7355), `china-red` (#c0392b), `gold` (#8e6d45), `sand` (#e0d5c5).
- Path alias: `@/*` maps to project root.

## Next.js 16 caveat

This project uses Next.js 16 which has breaking changes from earlier versions. When unsure about APIs or conventions, consult `node_modules/next/dist/docs/` before writing code.

## Adding content

**New skill**: Create `content/skills/<slug>.md` with required frontmatter fields. It will automatically appear in the directory, API, and sitemap.

**New journey chapter**: Create `content/journeys/<slug>.md` with `chapter` number set correctly for sort order. Include both English body and `content_zh` frontmatter for bilingual support.

## GitHub repository

The live repository is at `https://github.com/helenalhq/goeast.ai`. Issue submission links should point to `https://github.com/helenalhq/goeast.ai/issues/new`.
