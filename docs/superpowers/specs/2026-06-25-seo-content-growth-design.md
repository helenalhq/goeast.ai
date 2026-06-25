# SEO & Content Growth Design for GoEast.ai

**Date:** 2026-06-25
**Author:** Claude Code (with user collaboration)
**Status:** Approved for implementation

---

## Problem Statement

GoEast.ai has solid technical SEO infrastructure and rich bilingual content (19 AI skills, 12 journey chapters, 11 philosopher profiles, 20 glossary entries, 15 insight articles), but organic traffic is negligible. Google Search Console shows impressions (max 8 for "yin yang" over 3 months) but **zero clicks** across all queries.

The site is being indexed but not attracting clicks. Top queries are philosophy-related ("yin yang", "confucius leadership"), not AI-skills related, indicating a mismatch between content focus and search visibility.

## Goal

Achieve **100-500 organic visits/month** within 3-6 months through a combination of CTR optimization and targeted content creation.

## Target Audiences

1. **Expats/Travelers to China** — English speakers needing AI tools for travel, medical, shopping, navigation
2. **Chinese Culture Enthusiasts** — Global audience interested in Chinese philosophy, classical thought, cultural concepts

## Approach: "Quick Wins First" (Approach 1 of 3)

Fix the immediate CTR problem, then systematically add new content targeting low-competition long-tail keywords. This balances speed of results with sustainable effort.

---

## Phase 1: CTR Optimization (Week 1-2)

### Objective
Convert existing impressions into clicks by improving how pages appear in search results.

### Actions

#### 1.1 Audit & Rewrite Page Titles and Meta Descriptions

**Current problem:** Titles are generic and brand-focused rather than search-intent-focused.

**Examples of rewrites:**

| Page | Current Title | Proposed Title |
|------|---------------|----------------|
| Homepage | "GoEast.ai — Sophie's Journey East \| AI Skills for China" | "Best AI Tools for Traveling in China (2026 Guide) \| GoEast.ai" |
| Skills listing | "AI Skills Directory \| GoEast.ai" | "Top AI Apps for China: Translation, Travel, Shopping \| GoEast.ai" |
| Journey landing | "Sophie's Journey East \| Chinese Philosophy" | "Chinese Philosophy Through Stories: Laozi, Confucius, Zhuangzi \| GoEast.ai" |
| Individual skill pages | "[Skill Name] \| GoEast.ai" | "[Skill Name]: How to Use AI for [Task] in China \| GoEast.ai" |

**Meta description guidelines:**
- 150-160 characters
- Include primary keyword in first 60 characters
- Add a clear value proposition or call-to-action
- Example: "Discover the best AI tools for traveling in China. From translation apps to navigation helpers, find everything you need for your trip."

#### 1.2 Add FAQ Schema to Key Pages

Use the existing `JsonLd` component to add `FAQPage` structured data:

- Homepage: Add 5-6 general FAQs about GoEast.ai
- Skills listing: Add FAQs about AI tools in China
- Journey landing: Add FAQs about Chinese philosophy
- Individual journey chapters: Add chapter-specific FAQs

**Benefits:**
- Potential rich snippets in search results
- Higher CTR from expanded search result real estate
- Better understanding by search engines

#### 1.3 Improve Open Graph Images

- Create compelling, branded social share images for key pages
- Use consistent visual style matching the "Modern Song Book" aesthetic
- Include page title and key visual elements
- Ensure images are 1200x630px (Facebook/LinkedIn optimal)

#### 1.4 Fix Technical SEO Issues

- **robots.txt:** Currently exists as a directory; convert to a proper file
- **Sitemap freshness:** Add `<lastmod>` dates to sitemap entries
- **Crawl verification:** Check Search Console for crawl errors, fix any issues
- **Index verification:** Ensure all key pages are being indexed (site:goeast.ai search)

### Expected Outcome
2-5x improvement in CTR within 2-4 weeks of Google re-indexing.

---

## Phase 2: Targeted Content Creation (Week 3-8)

### Objective
Create 10-15 new articles targeting low-competition, high-intent keywords to build organic traffic.

### Content Clusters

#### Cluster A: AI Tools for China (Expats/Travelers)

| Article Title | Target Keyword | Est. Difficulty |
|---------------|----------------|-----------------|
| "Best AI Translation Apps for Traveling in China (2026)" | AI translation China | Low |
| "How to Use AI for Navigation in China" | AI navigation China | Low-Medium |
| "AI Tools for Ordering Food in China" | AI food ordering China | Low |
| "Best AI Travel Planners for China Trips" | AI travel planner China | Medium |

#### Cluster B: Chinese Philosophy (Culture Enthusiasts)

| Article Title | Target Keyword | Est. Difficulty |
|---------------|----------------|-----------------|
| "Yin Yang Explained: What It Really Means (Simple Guide)" | yin yang explained | Medium |
| "Confucius Leadership Principles for Modern Managers" | confucius leadership | Low-Medium |
| "Wu Wei: The Chinese Philosophy of Effortless Action" | wu wei philosophy | Low |
| "The Difference Between Yin and Yang (With Examples)" | difference yin yang | Low |

#### Cluster C: Practical Guides (Both Audiences)

| Article Title | Target Keyword | Est. Difficulty |
|---------------|----------------|-----------------|
| "How to Set Up WeChat Pay as a Foreigner in China" | WeChat Pay foreigner | Medium |
| "Best AI Apps Every Expat in China Should Have" | AI apps expats China | Low |
| "Chinese Culture Guide: Essential Concepts Before You Visit" | Chinese culture guide | Medium |

### Content Specifications

- **Length:** 1500-2500 words per article
- **Language:** Fully bilingual (English + Chinese)
- **Structure:**
  - Clear H2/H3 hierarchy
  - Practical examples and screenshots where relevant
  - Internal links to 3-5 existing pages (philosophers, glossary, skills, journeys)
  - FAQ section at bottom (for schema markup)
  - Related articles section

### Publishing Cadence
- 1-2 articles per week
- Prioritize by estimated search volume vs. competition
- Submit new URLs to Google via Search Console immediately after publishing

### Content Creation Workflow
1. Keyword research (use free tools: Google Keyword Planner, Ubersuggest, AnswerThePublic)
2. Create outline with target keyword and secondary keywords
3. Write draft (bilingual)
4. Add internal links to existing content
5. Add FAQ schema
6. Publish and submit to Search Console

---

## Phase 3: Ongoing Growth & Technical Enhancements

### Ongoing Activities

#### 3.1 Content Calendar & Publishing
- Maintain 1-2 articles/week cadence
- Track performance in Search Console weekly
- Double down on topics gaining traction
- Deprioritize topics with no traction after 3 months

#### 3.2 Internal Linking Optimization
- Systematically add contextual links between new articles and existing content
- Each new article links to 3-5 existing pages
- Update existing high-traffic pages to link to new content
- Build topic clusters with pillar pages

#### 3.3 Technical SEO Enhancements
- Add `lastmod` dates to sitemap for freshness signals
- Implement breadcrumb schema on all content pages
- Add "related articles" sections to increase time-on-site
- Set up newsletter signup (leverage existing Resend integration)

#### 3.4 Future Content Expansion (After Initial 10-15 Articles)
- Comparison pages ("ChatGPT vs. Chinese AI tools for travel")
- "Best of" listicles that attract backlinks
- Video content (YouTube embeds) for visual learners
- Chinese-language SEO (Baidu optimization) as secondary channel

### Success Metrics

| Timeframe | Target | Leading Indicators |
|-----------|--------|-------------------|
| Month 1-2 | 20-50 visits/month | CTR improvement, indexation rate |
| Month 3-4 | 50-150 visits/month | New content ranking, impressions growth |
| Month 5-6 | 100-500 visits/month | Content library compounding, returning visitors |

### Key Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Slow indexing | Submit URLs manually via Search Console, share on social media |
| No traffic after 3 months | Pivot to different keyword clusters, analyze competitor content |
| Writing burnout | Batch content creation, use AI-assisted drafting with human editing |
| Algorithm changes | Diversify traffic sources (social, newsletter), don't rely solely on Google |

---

## Implementation Priority

1. **Week 1:** Fix robots.txt, audit/rewrite all page titles and meta descriptions
2. **Week 2:** Add FAQ schema to key pages, improve OG images
3. **Week 3-4:** Publish first 4 articles (2 from Cluster A, 2 from Cluster B)
4. **Week 5-8:** Publish remaining 6-8 articles, optimize internal linking
5. **Ongoing:** Maintain cadence, monitor performance, iterate

---

## Files to Modify

- `app/layout.tsx` — Update default meta title and description
- `app/page.tsx` — Add homepage FAQ schema
- `app/skills/page.tsx` — Update title, add FAQ schema
- `app/sophies-journey/page.tsx` — Update title, add FAQ schema
- `app/robots.txt` — Convert from directory to file
- `app/sitemap.ts` — Add `lastmod` dates
- `components/JsonLd.tsx` — Ensure FAQ schema support
- New content files in `content/insights/` — 10-15 new articles

---

## Notes

- All new content should follow existing markdown frontmatter conventions
- Bilingual support (EN/ZH) is mandatory for all new articles
- Internal linking should be contextual and relevant, not forced
- Track all changes in a simple spreadsheet: URL, target keyword, publish date, impressions, clicks, CTR
