# SEO & GEO Optimization Design

**Date:** 2026-05-26
**Status:** Approved
**Approach:** Progressive Enhancement (方案 A)

## Goal

Improve GoEast.ai's discoverability for both traditional search engines (Google, Bing) and AI agents (ChatGPT, Perplexity, Gemini) without restructuring the routing architecture.

## Target Audience

Global English-speaking users interested in China — travelers, culture enthusiasts, and AI tool users.

---

## Part 1: Foundation SEO

### 1.1 Canonical URLs

- Root layout `metadata.alternates.canonical` set to `'/'` (resolved against metadataBase)
- All dynamic pages (`skills/[slug]`, `sophies-journey/[slug]`, `categories/[slug]`) return self-referencing canonical in `generateMetadata()`
- Static pages (about, contact, submit) set canonical in their metadata exports

### 1.2 Twitter Card Metadata

- Root layout adds:
  ```ts
  twitter: {
    card: 'summary_large_image',
    title: "GoEast.ai — AI Skills for China",
    description: '...',
  }
  ```
- Dynamic pages override `twitter.title` and `twitter.description` via generateMetadata

### 1.3 OpenGraph & Twitter Images

Create route-level image generators using Next.js `ImageResponse`:

- **`app/opengraph-image.tsx`** — Default OG image: brand name + tagline + China-red background
- **`app/skills/[slug]/opengraph-image.tsx`** — Skill name (EN + ZH) + category badge + brand logo
- **`app/sophies-journey/[slug]/opengraph-image.tsx`** — Philosopher name + chapter title + brand logo
- **`app/twitter-image.tsx`** — Same as default OG image (Next.js auto-uses opengraph-image if twitter-image absent)

Design: Clean layout with China-red (#c0392b) accent, cream (#faf5ef) background, Inter font. 1200x630px.

### 1.4 Structured Data (JSON-LD) Expansion

Add the following schemas:

| Page | Schema Type | Fields |
|------|-------------|--------|
| Homepage | `WebSite` | name, url, description, `potentialAction: SearchAction` targeting `/api/skills?q=` |
| Homepage | `Organization` | name, url, logo, sameAs (GitHub) |
| Skills listing | `CollectionPage` | name, description, url |
| Individual skill | `SoftwareApplication` | *(already exists, keep as-is)* |
| Journey listing | `CollectionPage` | name, description, url |
| Individual journey | `Article` | headline, author (philosopher), datePublished, image, publisher |
| All pages with breadcrumbs | `BreadcrumbList` | Extract from existing breadcrumb navigation |

Implementation: Extend existing `JsonLd` component usage; add new schemas in each page's render.

---

## Part 2: GEO (Generative Engine Optimization)

### 2.1 Enhanced `/llms.txt`

Expand from brief summary to comprehensive Markdown document:

```markdown
# GoEast.ai

> AI-powered skills directory for navigating China — travel, medical, shopping, accommodation.

## What is GoEast.ai?

[Site description, mission, target audience]

## Content

### AI Skills
[Table of all skills: name | category | url | description]

### Sophie's Journey East
[Table of all chapters: chapter | title | philosopher | url]

## API

- `GET /api/skills?q=&category=&page=&per_page=` — JSON API with pagination
- `GET /llms-full.txt` — Complete text content of all entries

## Usage

[How to reference/cite GoEast.ai content]
```

### 2.2 New `/llms-full.txt`

- Complete text content of all skills and journeys in a single Markdown file
- Each entry: title, category, tags, full description
- Allows AI agents to retrieve all content in one request
- Route: `app/llms-full.txt/route.ts`

### 2.3 robots.txt Enhancement

Update `app/robots.txt/route.ts`:

```
User-agent: *
Allow: /

# AI Agent Resources
# Full site content: https://goeast.ai/llms-full.txt
# Structured API: https://goeast.ai/api/skills

Disallow: /api/webhooks/
Disallow: /api/checkout/
Disallow: /api/oracle/
Disallow: /account/

Sitemap: https://goeast.ai/sitemap.xml
```

### 2.4 API Response Enhancement

`/api/skills` improvements:

- Add `category_name` (human-readable) alongside `category` (slug)
- Include `full_description` (HTML body) in individual skill responses
- Add `Link: <https://goeast.ai/llms.txt>` response header
- Ensure CORS headers allow cross-origin AI agent requests

### 2.5 Machine-Readable Content Markers

- Add `data-content-type` attributes to key content sections (skills, journeys, categories)
- Use `<article>` tags with appropriate `itemprop` attributes where beneficial
- Ensure all structured data is consistent with visible page content

---

## Part 3: Social Sharing & Internationalization

### 3.1 Social Sharing

Covered by 1.3 (OG/Twitter images) and 1.2 (Twitter metadata). Additionally:

- Ensure all OG descriptions are compelling and action-oriented
- Journey page OG descriptions highlight the philosopher and era
- Skill page OG descriptions include the category and key benefit

### 3.2 Bilingual Metadata (Without Route Restructuring)

Since the site serves bilingual content on single URLs:

- **Title format**: Include both languages — `"AI Travel Assistant for China | AI 旅行助手 — GoEast.ai"`
- **Description**: English primary, Chinese secondary in same field
- **`alternates.languages`**: Add `"en"` and `"zh"` pointing to same URL (signals bilingual page)
- **`Content-Language` header**: Set to `"en, zh"` in root layout
- **Lang attributes**: Use `lang="en"` and `lang="zh"` on respective content blocks in HTML

This is a pragmatic approach that avoids full i18n routing while signaling to search engines that content is bilingual.

### 3.3 Search Engine Registration Checklist

Manual steps for the site owner:
- [ ] Verify Google Search Console for goeast.ai
- [ ] Submit sitemap.xml to Google
- [ ] Register Bing Webmaster Tools and submit sitemap
- [ ] Test structured data with Google Rich Results Test
- [ ] Test OG images with Facebook Sharing Debugger and Twitter Card Validator

---

## Files to Create/Modify

### New files:
- `app/opengraph-image.tsx`
- `app/skills/[slug]/opengraph-image.tsx`
- `app/sophies-journey/[slug]/opengraph-image.tsx`
- `app/llms-full.txt/route.ts`

### Modified files:
- `app/layout.tsx` — canonical, Twitter card, OG metadata, Content-Language
- `app/sitemap.ts` — add contact page, verify completeness
- `app/robots.txt/route.ts` — AI agent comments, disallow sensitive routes
- `app/page.tsx` — WebSite + Organization JSON-LD
- `app/skills/page.tsx` — CollectionPage JSON-LD
- `app/skills/[slug]/page.tsx` — canonical in generateMetadata
- `app/sophies-journey/page.tsx` — CollectionPage JSON-LD
- `app/sophies-journey/[slug]/page.tsx` — Article JSON-LD, canonical
- `app/categories/[slug]/page.tsx` — canonical in generateMetadata
- `app/api/skills/route.ts` — enhanced response fields, Link header
- `app/about/page.tsx` — canonical
- `app/contact/page.tsx` — canonical
- `app/submit/page.tsx` — canonical
- `components/JsonLd.tsx` — possibly refactor for multiple schemas per page
- Root `llms.txt` content — expanded format

### No changes to:
- Content files (`content/skills/*.md`, `content/journeys/*.md`)
- Routing structure
- Database or external services

---

## Out of Scope

- Full i18n routing with `[locale]` prefix (future phase)
- Service worker / PWA manifest
- ISR configuration
- Performance optimization (font loading, script strategy)
- Rate limiting on API routes
- Image format conversion (PNG → WebP)
