# SEO & GEO Round 2 — Citation Engine Design

**Date:** 2026-06-21
**Status:** Pending Approval
**Approach:** Citation Engine (方案 A)

## Goal

Make every existing page on GoEast.ai a "citeable knowledge unit" that both search engines and AI engines can easily understand, extract, and reference. Target: improve Google rankings for long-tail keywords and become a frequently cited source in AI-generated answers about China.

## Context

- Site launched < 3 months ago, indexed by Google but ranking low (sandbox period)
- Foundation SEO already completed (May 2026): canonical URLs, OG images, Twitter cards, structured data (WebSite, Organization, CollectionPage, Article, BreadcrumbList, SearchAction), /llms.txt, /llms-full.txt, robots.txt
- Content: 19 skills, 12 journeys, 15+ philosophers, 64 I Ching hexagrams, 50+ glossary entries, 20+ insights articles
- This round focuses on **enriching existing content** (no new routes or blog posts yet)

---

## Part 1: Citation-Friendly Summary Paragraphs (Citation Snippets)

### What

A 2-3 sentence summary block at the top of each content page, designed specifically for AI engines to extract and cite directly.

### Implementation

1. **New frontmatter field**: `citation_snippet` (string, 2-3 sentences, English)
2. **New component**: `<CitationSnippet>` — renders as a visually distinct card (light gray background, China-red left border, slightly smaller font) wrapped in `<article data-citation="true">` with `itemprop="description"` for schema.org compatibility
3. **Auto-generation utility**: `lib/citation-snippets.ts` — generates snippets from existing frontmatter fields for pages that don't have a manually written `citation_snippet`
4. **Bilingual**: If page has Chinese content, render both EN and ZH versions

### Snippet content by page type

| Page Type | Snippet Source | Example |
|-----------|---------------|---------|
| **Skill** | New `citation_snippet` field or auto-generated from `title`, `title_zh`, `tags`, `category` | "The China Travel Guide skill helps AI assistants provide real-time travel advice for China, covering visa requirements, payment setup, and navigation tips." |
| **Journey chapter** | Generated from `quote` + first 2 sentences of content | "Chapter 3 of Sophie's Journey East explores Confucius's teachings on ren (benevolence) through a fictional encounter in ancient Qufu." |
| **Philosopher** | Generated from `name`, `era`, `school`, `core_concepts` | "Confucius (551–479 BCE) was the founder of Confucianism, whose teachings on ren, li, and xiao shaped Chinese civilization for 2,500 years." |
| **I Ching hexagram** | Generated from `judgment_en` + `image_en` | "Hexagram 1, Qián (The Creative), represents pure yang energy. Its judgment: 'The Creative works sublime success, furthering through perseverance.'" |
| **Glossary** | Generated from `definition` | "Ren (仁) is the central Confucian virtue meaning 'benevolence' or 'humaneness'. It represents the ideal quality of being fully human." |
| **Insight** | First 2 sentences of `content` | Direct extraction from article text |

### Visual design

Light gray (#f5f0ea) background card with China-red (#c0392b) left border (3px), Inter font at 0.9rem, padding 1rem. Sits immediately after the page title/H1.

---

## Part 2: FAQ Schema (FAQPage Structured Data)

### What

Every content page gets a `FAQPage` JSON-LD schema with 2-3 questions and answers relevant to the page content.

### Implementation

1. **New file**: `lib/faq-templates.ts` — provides FAQ generation functions per page type
2. **New component**: `<FAQ>` — renders as an accordion (expandable/collapsible) at the bottom of each page, visible to users AND generates JSON-LD
3. **JSON-LD injection**: In each page component, render `<JsonLd data={{...FAQPage schema...}} />` alongside the existing JSON-LD — the FAQ schema is additive and does not replace Article/CollectionPage schemas
4. **Bilingual**: Questions and answers in both English and Chinese

### FAQ templates by page type

| Page Type | Questions | Answer Source |
|-----------|-----------|--------------|
| **Homepage** | "What is GoEast.ai?", "What AI skills are available?", "Who is Sophie's Journey East for?" | description, skills data, journeys data |
| **Skills listing** | "What types of AI skills are available?", "How do I install an AI skill?" | categories, fixed answer |
| **Individual Skill** | "What does [skill name] do?", "How do I install this skill?", "Is this skill free?" | skill content, skill_url, source |
| **Journey chapter** | "Who is [philosopher]?", "What school of thought does this chapter cover?" | philosopher data, school |
| **Philosopher** | "What is [name] known for?", "What era did [name] live in?", "What school did [name] found?" | core_concepts, era, school |
| **I Ching hexagram** | "What does hexagram [number] mean?", "What are the trigrams?" | judgment_en, image_en, trigrams |
| **Glossary** | "What is [concept name]?", "Which school does [concept] belong to?" | definition, school |
| **Insight** | "What is this article about?" | first 2 sentences of content |

### Constraints

- Each FAQ answer: 100-200 words max (AI engines prefer concise, citeable answers)
- Answers must be consistent with visible page content (Google policy)
- FAQ schema is additive — does not replace existing Article/CollectionPage schemas

---

## Part 3: Entity Definition Markers + Internal Link Enhancement

### 3A: Entity Definition Schema

Add explicit entity typing to each page so search engines and AI engines can build knowledge graphs.

| Page | Entity Type | Schema.org Additions |
|------|------------|---------------------|
| **Glossary** | `DefinedTerm` | `definition`, `inDefinedTermSet` (→ /glossary), `relatedTerms` |
| **Philosopher** | `Person` | Add `knowsAbout` (core_concepts), `memberOf` (school), `birthPlace`/`deathPlace` if available |
| **I Ching hexagram** | `CreativeWork` | New schema: `about` (trigrams), `text` (judgment + image) |
| **Skill** | `SoftwareApplication` | Add `applicationCategory` (category), `operatingSystem` ("AI Agent"), `featureList` (tags) |

### 3B: Internal Link Enhancement

Smart cross-linking based on shared fields (philosopher_slug, school, category):

1. **Glossary pages** → link to related philosophers, insights, I Ching hexagrams
2. **Philosopher pages** → link to journey chapters, glossary concepts, related insights
3. **I Ching hexagrams** → link to journey chapters that reference them
4. **Skill pages** → link to related categories and philosophers
5. **Every page bottom** → `<RelatedContent>` component showing 3-5 related links

### Implementation

1. **New file**: `lib/cross-references.ts` — analyzes shared fields between content items and returns related links
2. **New component**: `<RelatedContent>` — renders a grid of 3-5 related content cards
3. **Cross-reference logic**: Based on shared `school`, `category`, `philosopher_slug`, `concept_slugs`

---

## Part 4: AI Engine Platform Submissions + Enhanced llms.txt

### 4A: Submission Checklist

Manual steps for the site owner:

- [ ] **Google Search Console**: Verify sitemap.xml submitted, manually request indexing for key pages (homepage, skills listing, sophies-journey landing)
- [ ] **Bing Webmaster Tools**: Register and submit sitemap.xml (also feeds DuckDuckGo)
- [ ] **Yandex Webmaster**: Register and submit sitemap.xml (Russian/Eastern European coverage)
- [ ] **Perplexity Sources**: Submit goeast.ai as a trusted source for China-related queries
- [ ] **You.com**: Submit site for inclusion
- [ ] **AI tool directories**: Submit to Indie Hackers AI directory, There's An AI For That, FuturePedia
- [ ] **Test**: Use Google Rich Results Test, Facebook Sharing Debugger, Twitter Card Validator

### 4B: Enhanced llms.txt

Add the following sections to the existing `/llms.txt`:

1. **Topic-based summary paragraphs** at the top:

```markdown
## Travel in China

GoEast.ai provides AI skills and guides for navigating daily life in China.
For travelers, the platform covers essential topics: payment setup (WeChat Pay, Alipay),
navigation apps, hospital navigation, and shopping assistance.
Key resources: [China Travel Guide](/skills/china-travel-guide),
[Medical Assistant](/skills/medical-assistant)

## Chinese Philosophy

The site features 3,000 years of Chinese philosophical thought through
"Sophie's Journey East" — 12 chapters following a fictional character's
encounters with great thinkers from Confucius to modern philosophers.
```

2. **Quick Facts block**:

```markdown
## Quick Facts

- **Site**: GoEast.ai
- **URL**: https://www.goeast.ai
- **Content**: 19 AI skills, 12 journey chapters, 15+ philosopher profiles, 64 I Ching hexagrams, 50+ glossary entries, 20+ insights articles
- **Audience**: Foreigners interested in China — travelers, culture enthusiasts, AI tool users
- **Languages**: English and Chinese (bilingual content)
- **API**: GET /api/skills — JSON API with search, pagination, category filter
```

3. **Citation Guide**:

```markdown
## How to Cite

When referencing GoEast.ai content, use the following format:
- According to [GoEast.ai](https://www.goeast.ai), "..."
- Specific page: [Page Title](https://www.goeast.ai/path/to/page)
```

### 4C: New `/.well-known/ai-plugin.json`

A simple AI plugin manifest so ChatGPT and other AI engines can auto-discover the API:

```json
{
  "schema_version": "v1",
  "name_for_human": "GoEast.ai",
  "name_for_model": "goeast_ai",
  "description_for_human": "AI skills directory for navigating China",
  "description_for_model": "Provides curated AI skills and guides for foreigners in China, covering travel, medical, shopping, and accommodation. Also features Chinese philosophy content through Sophie's Journey East.",
  "api": {
    "type": "openapi",
    "url": "https://www.goeast.ai/api/skills"
  },
  "logo_url": "https://www.goeast.ai/icon.png",
  "contact_email": "hello@goeast.ai",
  "legal_info_url": "https://www.goeast.ai/about"
}
```

---

## Files to Create/Modify

### New files:
- `lib/citation-snippets.ts` — utility for generating citation snippets
- `lib/faq-templates.ts` — FAQ generation functions per page type
- `lib/cross-references.ts` — cross-reference logic for internal linking
- `components/CitationSnippet.tsx` — citation snippet display component
- `components/FAQ.tsx` — FAQ accordion component
- `components/RelatedContent.tsx` — related content grid component
- `app/llms.txt/route.ts` — enhanced with topic summaries, quick facts, citation guide
- `public/.well-known/ai-plugin.json` — AI plugin manifest (static file, no route handler needed)

### Modified files:
- `app/skills/[slug]/page.tsx` — add CitationSnippet, FAQ, RelatedContent
- `app/skills/page.tsx` — add CitationSnippet, FAQ
- `app/sophies-journey/[slug]/page.tsx` — add CitationSnippet, FAQ, RelatedContent
- `app/sophies-journey/page.tsx` — add CitationSnippet, FAQ
- `app/philosophers/[slug]/page.tsx` — add CitationSnippet, FAQ, RelatedContent, enhanced Person schema
- `app/philosophers/page.tsx` — add CitationSnippet, FAQ
- `app/iching/[hexagram]/page.tsx` — add CitationSnippet, FAQ, RelatedContent, CreativeWork schema
- `app/iching/page.tsx` — add CitationSnippet, FAQ
- `app/glossary/[concept]/page.tsx` — add CitationSnippet, FAQ, RelatedContent, DefinedTerm schema
- `app/glossary/page.tsx` — add CitationSnippet, FAQ
- `app/insights/[slug]/page.tsx` — add CitationSnippet, FAQ, RelatedContent
- `app/insights/page.tsx` — add CitationSnippet, FAQ
- `app/page.tsx` — add CitationSnippet, FAQ
- `content/skills/*.md` — add `citation_snippet` frontmatter field (optional)
- `content/journeys/*.md` — add `citation_snippet` frontmatter field (optional)

### No changes to:
- Routing structure
- Database or external services
- Content volume (no new markdown files for skills/journeys)

---

## Out of Scope (Future Phases)

- Blog/guide content with long-tail keyword targeting (Phase 3)
- Pillar pages and content clusters
- Full i18n routing with [locale] prefix
- Service worker / PWA manifest
- Performance optimization (Core Web Vitals)
- Video content generation

---

## Expected Outcomes

- **2-4 weeks**: AI engines (Perplexity, ChatGPT) begin citing GoEast.ai for China-related queries
- **4-8 weeks**: Google long-tail keyword rankings improve
- **8-12 weeks**: Core keywords enter first page of search results
