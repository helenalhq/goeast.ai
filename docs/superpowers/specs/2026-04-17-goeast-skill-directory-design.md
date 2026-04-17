# GoEast.ai — AI Skill Curated Directory Design

## Overview

**GoEast.ai** is a curated AI Skill directory site focused on China-related scenarios for foreigners. It serves both humans and AI agents by providing a browsable, searchable collection of useful AI skills sourced from platforms like Claude Hub, skills.sh, and others.

**Core identity**: "Go East" — a gateway for foreigners (and their AI agents) to discover tools that help them navigate life in China.

## Target Users

- **Primary**: Foreigners planning to visit or currently in China
- **Secondary**: AI Agents acting on behalf of foreigners (travel assistants, chatbots, etc.)
- **Tertiary**: Skill creators who want to submit and promote their China-related skills

## Visual Style: China Fusion

Warm, East-meets-modern aesthetic:

| Element | Value | Usage |
|---------|-------|-------|
| Background | `#faf5ef` | Page background (warm cream) |
| Surface | `#ffffff` | Cards, containers |
| Text primary | `#2c1810` | Headings, body text (ink black) |
| Text secondary | `#8b7355` | Descriptions, captions (warm brown) |
| Accent primary | `#c0392b` | CTAs, highlights, links (China red) |
| Accent secondary | `#8e6d45` | Tags, badges (gold) |
| Border | `#e0d5c5` | Card borders, dividers |

Typography: Clean sans-serif (Inter or similar), modern layout. Cultural identity through color palette, not decorative motifs.

## Site Structure

| Path | Purpose | Agent Support |
|------|---------|---------------|
| `/` | Homepage — Hero + category grid + featured skill cards | JSON-LD structured data |
| `/skills` | All skills list (filter, search, paginate) | Paginated JSON: `/api/skills?page=1&category=travel` |
| `/skills/[slug]` | Skill detail page | Structured HTML + JSON-LD |
| `/categories/[category]` | Category page (travel/medical/shopping/accommodation) | JSON-LD |
| `/llms.txt` | Agent entry point — plain text site summary | Core agent resource |
| `/api/skills` | JSON API returning all skill data | Primary agent endpoint |
| `/about` | About the project | — |
| `/submit` | Submit a skill (GitHub Issue link) | — |

## Page Designs

### Homepage (`/`)

1. **Hero section**: "GoEast.ai" logo + tagline "Curated AI Skills for Living & Traveling in China" + CTA buttons ("Browse Skills" / "For Agents →")
2. **Category grid**: 2x2 grid of cards (Travel, Medical, Shopping, Accommodation) with icon, name, and skill count
3. **Featured skills**: Horizontal card list of 4-6 curated skills with title, description, tags, and source badge

### Skills List (`/skills`)

- Top: Search bar + category filter pills
- Body: Card grid/list of all skills with pagination
- Each card: title, description snippet, category tag, source badge

### Skill Detail (`/skills/[slug]`)

- Header: title (bilingual), category badge, source link
- Body: full description (EN + ZH), how-to-use guide, applicable scenarios
- Sidebar/meta: tags, source platform, last updated date
- JSON-LD in `<head>` for agent parsing

### Category Page (`/categories/[category]`)

- Same as skills list but pre-filtered to one category
- Category description at top

## Agent-Friendly Design

### `/llms.txt`

Implemented as a Next.js Route Handler (`app/llms.txt/route.ts`) returning `text/plain`. Dynamically generated from skill data at build time.

Plain text file following the llms.txt convention:

```
# GoEast.ai
# Curated AI Skills for foreigners coming to China
# Categories: Travel, Medical, Shopping, Accommodation

## Quick Access
- All skills (JSON): /api/skills
- Skills by category: /api/skills?category=travel
- Individual skill: /skills/{slug}

## Featured Skills
- [Travel] China Travel Planner: /skills/china-travel-planner
- [Medical] Hospital Appointment Helper: /skills/hospital-appointment
...
```

### `/api/skills` JSON API

```json
{
  "total": 31,
  "page": 1,
  "per_page": 20,
  "skills": [
    {
      "slug": "china-travel-planner",
      "title": "China Travel Planner",
      "title_zh": "中国旅行规划",
      "description": "Plan your perfect China trip with AI assistance",
      "description_zh": "用 AI 辅助规划你的完美中国之旅",
      "category": "travel",
      "tags": ["planning", "itinerary", "visa"],
      "source": "claudehub",
      "source_url": "https://claudehub.com/skills/xxx",
      "skill_url": "https://claudehub.com/skills/xxx/install",
      "featured": true,
      "updated_at": "2026-04-10"
    }
  ]
}
```

Query parameters: `page`, `per_page`, `category` (travel|medical|shopping|accommodation), `q` (search)

### Other Agent Measures

- `sitemap.xml` — standard sitemap for all pages
- `robots.txt` — allow all crawlers, reference sitemap and llms.txt
- JSON-LD on every skill page (Schema.org `SoftwareApplication` type)
- Semantic HTML (`<article>`, `<header>`, `<section>`)
- Open Graph meta tags on all pages

## Data Management

### File Structure

```
content/skills/
  china-travel-planner.md
  hospital-appointment.md
  alipay-wechat-pay.md
  ...
```

### Skill Markdown Format

```markdown
---
slug: china-travel-planner
title: China Travel Planner
title_zh: 中国旅行规划
category: travel
tags: [planning, itinerary, visa, flights]
source: claudehub
source_url: https://claudehub.com/skills/xxx
skill_url: https://claudehub.com/skills/xxx/install
featured: true
updated_at: 2026-04-10
---

## Description

Plan your perfect China trip with AI assistance. Covers itinerary planning, visa requirements, domestic transportation, and more.

## Description (中文)

用 AI 辅助规划你的完美中国之旅。涵盖行程规划、签证要求、国内交通等。

## How to Use

1. Install the skill from [Claude Hub](...)
2. Open your AI assistant
3. Ask: "Plan a 7-day trip to Beijing and Shanghai"

## 适用场景

- 首次来华旅行规划
- 商务出行行程安排
```

### Build Pipeline

- Next.js `generateStaticParams` reads all `.md` files at build time
- Frontmatter → structured data for lists, API, JSON-LD
- Markdown body → rendered HTML on detail pages
- Adding a skill = add `.md` file + push → Vercel auto-rebuilds

## Categories

| ID | English | Chinese | Icon |
|----|---------|---------|------|
| travel | Travel | 旅游 | Airplane |
| medical | Medical | 医疗 | Hospital |
| shopping | Shopping | 购物 | Shopping bag |
| accommodation | Accommodation | 住宿 | House |

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Content**: Markdown files with frontmatter (gray-matter + remark)
- **Deployment**: Vercel
- **Domain**: goeast.ai

## Out of Scope (V1)

- User accounts / authentication
- Skill rating / comments
- Online playground to test skills
- CMS or admin panel
- Real-time data scraping from source platforms
- i18n beyond EN/ZH (only bilingual)
- RSS feed (can add later)
