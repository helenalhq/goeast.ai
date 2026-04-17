# GoEast.ai Skill Directory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a curated AI Skill directory site at goeast.ai serving both humans and AI agents, with bilingual EN/ZH content and China Fusion visual style.

**Architecture:** Static Next.js 14 App Router site. Content lives as Markdown files in `content/skills/`, loaded at build time. Pages are statically generated. A JSON API and `llms.txt` provide agent-friendly access. Deployed to Vercel.

**Tech Stack:** Next.js 14 (App Router), Tailwind CSS, TypeScript, gray-matter, remark, Vercel

---

## File Structure

```
go-east/
├── app/
│   ├── layout.tsx                    # Root layout (Inter font, Header/Footer, global meta)
│   ├── page.tsx                      # Homepage (Hero + CategoryGrid + featured SkillCards)
│   ├── globals.css                   # Tailwind directives + China Fusion custom properties
│   ├── skills/
│   │   ├── page.tsx                  # Skills list (search, filter, paginate)
│   │   └── [slug]/
│   │       └── page.tsx              # Skill detail (full content + JSON-LD)
│   ├── categories/
│   │   └── [category]/
│   │       └── page.tsx              # Category-filtered skills list
│   ├── about/
│   │   └── page.tsx                  # About page
│   ├── submit/
│   │   └── page.tsx                  # Submit skill (links to GitHub Issues)
│   ├── api/
│   │   └── skills/
│   │       └── route.ts              # JSON API (GET /api/skills)
│   ├── llms.txt/
│   │   └── route.ts                  # Agent text entry point
│   ├── robots.txt/
│   │   └── route.ts                  # robots.txt
│   └── sitemap.ts                    # sitemap.xml generator
├── components/
│   ├── Header.tsx                    # Site header with navigation
│   ├── Footer.tsx                    # Site footer
│   ├── Hero.tsx                      # Homepage hero section
│   ├── CategoryGrid.tsx              # 2x2 category cards
│   ├── SkillCard.tsx                 # Skill card (used in lists and featured)
│   ├── SkillList.tsx                 # Skills list with search/filter/pagination (client component)
│   ├── JsonLd.tsx                    # JSON-LD script injection
│   └── CategoryBadge.tsx             # Category tag/badge
├── lib/
│   ├── skills.ts                     # Read/parse markdown skill files
│   └── types.ts                      # TypeScript interfaces
├── content/
│   └── skills/                       # Markdown skill files
│       ├── china-travel-planner.md
│       ├── hospital-appointment-helper.md
│       ├── alipay-wechat-pay-guide.md
│       ├── accommodation-finder.md
│       ├── visa-assistant.md
│       └── food-delivery-guide.md
├── public/
│   └── favicon.ico
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── .gitignore
```

---

### Task 1: Project Scaffolding & Tailwind Configuration

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `tailwind.config.ts`
- Create: `app/globals.css`
- Create: `app/layout.tsx`
- Create: `.gitignore`

- [ ] **Step 1: Initialize Next.js project**

Run:
```bash
cd /Users/liupengcheng/develop/open_source/go-east
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm --no-turbopack
```

When prompted, accept defaults. This creates `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `app/globals.css`, `app/layout.tsx`.

- [ ] **Step 2: Update .gitignore**

Make sure `.gitignore` includes `.superpowers/` at the end:

```
# existing Next.js entries ...
.superpowers/
```

- [ ] **Step 3: Configure Tailwind with China Fusion theme**

Replace the contents of `tailwind.config.ts`:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#faf5ef",
        ink: "#2c1810",
        warm: "#8b7355",
        "china-red": "#c0392b",
        gold: "#8e6d45",
        sand: "#e0d5c5",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 4: Set up globals.css with China Fusion base**

Replace the contents of `app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html {
  scroll-behavior: smooth;
}

body {
  background-color: #faf5ef;
  color: #2c1810;
}
```

- [ ] **Step 5: Update root layout with Inter font**

Replace `app/layout.tsx`:

```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GoEast.ai — Curated AI Skills for China",
  description:
    "Discover curated AI skills for traveling, living, and doing business in China. Built for humans and AI agents.",
  metadataBase: new URL("https://goeast.ai"),
  openGraph: {
    title: "GoEast.ai — Curated AI Skills for China",
    description:
      "Discover curated AI skills for traveling, living, and doing business in China.",
    url: "https://goeast.ai",
    siteName: "GoEast.ai",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}
```

- [ ] **Step 6: Install content parsing dependencies**

```bash
npm install gray-matter remark remark-html
```

- [ ] **Step 7: Verify dev server starts**

```bash
npm run dev
```

Expected: Server starts at http://localhost:3000, default Next.js page renders.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with China Fusion Tailwind theme"
```

---

### Task 2: Types & Data Layer

**Files:**
- Create: `lib/types.ts`
- Create: `lib/skills.ts`

- [ ] **Step 1: Create TypeScript types**

Create `lib/types.ts`:

```typescript
export type Category = "travel" | "medical" | "shopping" | "accommodation";

export interface SkillMeta {
  slug: string;
  title: string;
  title_zh: string;
  category: Category;
  tags: string[];
  source: string;
  source_url: string;
  skill_url: string;
  featured: boolean;
  updated_at: string;
}

export interface Skill extends SkillMeta {
  content: string;
}

export interface CategoryInfo {
  id: Category;
  name: string;
  name_zh: string;
  icon: string;
}

export const CATEGORIES: CategoryInfo[] = [
  { id: "travel", name: "Travel", name_zh: "旅游", icon: "✈️" },
  { id: "medical", name: "Medical", name_zh: "医疗", icon: "🏥" },
  { id: "shopping", name: "Shopping", name_zh: "购物", icon: "🛒" },
  { id: "accommodation", name: "Accommodation", name_zh: "住宿", icon: "🏠" },
];
```

- [ ] **Step 2: Create skill data loader**

Create `lib/skills.ts`:

```typescript
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";
import { Skill, SkillMeta, Category } from "./types";

const skillsDirectory = path.join(process.cwd(), "content/skills");

export function getSkillSlugs(): string[] {
  if (!fs.existsSync(skillsDirectory)) return [];
  return fs
    .readdirSync(skillsDirectory)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
}

export function getSkillBySlug(slug: string): Skill | null {
  const fullPath = path.join(skillsDirectory, `${slug}.md`);
  if (!fs.existsSync(fullPath)) return null;

  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  return {
    slug: data.slug || slug,
    title: data.title || "",
    title_zh: data.title_zh || "",
    category: data.category || "travel",
    tags: data.tags || [],
    source: data.source || "",
    source_url: data.source_url || "",
    skill_url: data.skill_url || "",
    featured: data.featured || false,
    updated_at: data.updated_at || "",
    content,
  };
}

export async function getSkillWithHtml(slug: string): Promise<Skill | null> {
  const skill = getSkillBySlug(slug);
  if (!skill) return null;

  const processed = await remark().use(html).process(skill.content);
  return { ...skill, content: processed.toString() };
}

export function getAllSkills(): SkillMeta[] {
  const slugs = getSkillSlugs();
  return slugs
    .map((slug) => {
      const skill = getSkillBySlug(slug);
      if (!skill) return null;
      const { content, ...meta } = skill;
      return meta;
    })
    .filter((s): s is SkillMeta => s !== null);
}

export function getSkillsByCategory(category: Category): SkillMeta[] {
  return getAllSkills().filter((s) => s.category === category);
}

export function getFeaturedSkills(): SkillMeta[] {
  return getAllSkills().filter((s) => s.featured);
}

export function searchSkills(query: string): SkillMeta[] {
  const q = query.toLowerCase();
  return getAllSkills().filter(
    (s) =>
      s.title.toLowerCase().includes(q) ||
      s.title_zh.includes(q) ||
      s.tags.some((t) => t.toLowerCase().includes(q)) ||
      s.description?.toLowerCase().includes(q)
  );
}
```

Note: The `searchSkills` function references `description` which is not in `SkillMeta`. Remove that filter since we only have frontmatter fields. Updated version — replace `searchSkills`:

```typescript
export function searchSkills(query: string): SkillMeta[] {
  const q = query.toLowerCase();
  return getAllSkills().filter(
    (s) =>
      s.title.toLowerCase().includes(q) ||
      s.title_zh.includes(q) ||
      s.tags.some((t) => t.toLowerCase().includes(q))
  );
}
```

Use this corrected version when writing the file (exclude the `description` filter).

- [ ] **Step 3: Verify module compiles**

```bash
npx tsc --noEmit
```

Expected: No type errors (only unused import warnings are fine).

- [ ] **Step 4: Commit**

```bash
git add lib/
git commit -m "feat: add types and skill data loading from markdown files"
```

---

### Task 3: Sample Skill Content

**Files:**
- Create: `content/skills/china-travel-planner.md`
- Create: `content/skills/hospital-appointment-helper.md`
- Create: `content/skills/alipay-wechat-pay-guide.md`
- Create: `content/skills/accommodation-finder.md`
- Create: `content/skills/visa-assistant.md`
- Create: `content/skills/food-delivery-guide.md`

- [ ] **Step 1: Create skill markdown files**

Create each file in `content/skills/`:

**`china-travel-planner.md`:**
```markdown
---
slug: china-travel-planner
title: China Travel Planner
title_zh: 中国旅行规划
category: travel
tags: [planning, itinerary, flights, trains, visa]
source: claudehub
source_url: https://example.com/skills/china-travel-planner
skill_url: https://example.com/skills/china-travel-planner/install
featured: true
updated_at: 2026-04-10
---

## Description

Plan your perfect China trip with AI assistance. This skill helps you create detailed itineraries covering must-see attractions, local transportation (high-speed rail, domestic flights), visa requirements, and budget planning for cities across China.

## Description (中文)

用 AI 辅助规划你的完美中国之旅。涵盖必游景点、本地交通（高铁、国内航班）、签证要求和各大城市的预算规划。

## How to Use

1. Install the skill from the source platform
2. Open your AI assistant
3. Describe your trip: dates, interests, budget, and cities you want to visit
4. Get a personalized day-by-day itinerary with practical tips

## 适用场景

- First-time visitors planning a China trip
- Business travelers needing efficient itineraries
- Families looking for kid-friendly routes
```

**`hospital-appointment-helper.md`:**
```markdown
---
slug: hospital-appointment-helper
title: Hospital Appointment Helper
title_zh: 医院预约助手
category: medical
tags: [hospital, appointment, health, insurance, translation]
source: skills.sh
source_url: https://example.com/skills/hospital-appointment
skill_url: https://example.com/skills/hospital-appointment/install
featured: true
updated_at: 2026-04-08
---

## Description

Navigate the Chinese healthcare system with AI guidance. This skill helps you find international-friendly hospitals, understand appointment booking procedures, prepare necessary documents, and communicate symptoms effectively with medical staff.

## Description (中文)

用 AI 指引你了解中国医疗体系。帮助你找到国际友好型医院，了解预约挂号流程，准备所需文件，并有效地向医护人员描述症状。

## How to Use

1. Install the skill from the source platform
2. Describe your medical concern and location
3. Get guidance on which hospital to visit, how to book, and what to bring
4. Receive helpful medical phrases in Chinese

## 适用场景

- Foreigners needing medical care in China
- Understanding health insurance coverage
- Emergency medical situations
```

**`alipay-wechat-pay-guide.md`:**
```markdown
---
slug: alipay-wechat-pay-guide
title: Alipay & WeChat Pay Guide
title_zh: 支付宝与微信支付指南
category: shopping
tags: [payment, alipay, wechat, mobile-pay, shopping]
source: claudehub
source_url: https://example.com/skills/alipay-wechat-pay
skill_url: https://example.com/skills/alipay-wechat-pay/install
featured: true
updated_at: 2026-04-09
---

## Description

Master mobile payments in China. This skill walks you through setting up Alipay and WeChat Pay with foreign credit cards, understanding QR code payments, splitting bills, and handling refunds — essential skills since cash is rarely used in China today.

## Description (中文)

掌握中国移动支付。本技能指导你用外卡绑定支付宝和微信支付，了解扫码支付、AA收款和退款流程——在几乎无现金的中国，这是必备技能。

## How to Use

1. Install the skill from the source platform
2. Ask about setting up payments, scanning QR codes, or specific payment scenarios
3. Follow step-by-step instructions with screenshots guidance

## 适用场景

- Setting up mobile payments upon arrival
- Paying at restaurants, shops, and taxis
- Transferring money to Chinese contacts
```

**`accommodation-finder.md`:**
```markdown
---
slug: accommodation-finder
title: Accommodation Finder
title_zh: 住宿搜索助手
category: accommodation
tags: [hotel, apartment, rental, booking, housing]
source: skills.sh
source_url: https://example.com/skills/accommodation-finder
skill_url: https://example.com/skills/accommodation-finder/install
featured: true
updated_at: 2026-04-07
---

## Description

Find the perfect place to stay in China. This skill helps you compare hotels, serviced apartments, and short-term rentals across Chinese booking platforms, understand lease terms, and navigate deposit and payment processes.

## Description (中文)

在中国找到理想的住处。帮助你在国内预订平台上比较酒店、服务式公寓和短租房，了解租约条款，以及处理押金和支付流程。

## How to Use

1. Install the skill from the source platform
2. Specify your city, budget, duration, and preferences
3. Get recommendations with links to booking platforms and tips for negotiating

## 适用场景

- Short-term hotel booking for tourists
- Finding monthly apartments for expats
- Understanding Chinese rental contracts
```

**`visa-assistant.md`:**
```markdown
---
slug: visa-assistant
title: China Visa Assistant
title_zh: 中国签证助手
category: travel
tags: [visa, documents, embassy, application]
source: claudehub
source_url: https://example.com/skills/visa-assistant
skill_url: https://example.com/skills/visa-assistant/install
featured: false
updated_at: 2026-04-05
---

## Description

Navigate the China visa application process with step-by-step AI guidance. Covers tourist visas (L), business visas (M), student visas (X1/X2), work visas (Z), and transit visas. Includes document checklists, embassy contacts, and common rejection reasons.

## Description (中文)

用 AI 分步指导中国签证申请流程。涵盖旅游签（L）、商务签（M）、学生签（X1/X2）、工作签（Z）和过境签。包含材料清单、使馆联系方式和常见拒签原因。

## How to Use

1. Install the skill from the source platform
2. Tell the skill your nationality, purpose of visit, and duration
3. Get a personalized document checklist and application timeline

## 适用场景

- First-time China visa applicants
- Visa renewal or extension
- Understanding visa-free transit policies
```

**`food-delivery-guide.md`:**
```markdown
---
slug: food-delivery-guide
title: Food Delivery Guide (Meituan & Ele.me)
title_zh: 外卖指南（美团与饿了么）
category: shopping
tags: [food, delivery, meituan, eleme, restaurant]
source: skills.sh
source_url: https://example.com/skills/food-delivery-guide
skill_url: https://example.com/skills/food-delivery-guide/install
featured: false
updated_at: 2026-04-06
---

## Description

Order food like a local in China. This skill guides you through using Meituan (美团) and Ele.me (饿了么), China's two major food delivery apps. Learn to browse menus, place orders, track deliveries, and discover the best local restaurants near you.

## Description (中文)

在中国像本地人一样点外卖。指导你使用美团和饿了么，中国两大外卖平台。学习浏览菜单、下单、追踪配送和发现附近的优质餐厅。

## How to Use

1. Install the skill from the source platform
2. Ask how to use Meituan or Ele.me
3. Get help translating menus and understanding delivery options

## 适用场景

- Ordering food delivery for the first time in China
- Exploring local cuisine recommendations
- Understanding delivery address formats in Chinese
```

- [ ] **Step 2: Verify content files are parseable**

```bash
node -e "const m = require('gray-matter'); const fs = require('fs'); const f = fs.readFileSync('content/skills/china-travel-planner.md', 'utf8'); const {data} = m(f); console.log(data.title, data.category, data.featured);"
```

Expected: `China Travel Planner travel true`

- [ ] **Step 3: Commit**

```bash
git add content/
git commit -m "feat: add 6 sample skill markdown files across all categories"
```

---

### Task 4: Shared Components (Header, Footer, CategoryBadge, JsonLd)

**Files:**
- Create: `components/Header.tsx`
- Create: `components/Footer.tsx`
- Create: `components/CategoryBadge.tsx`
- Create: `components/JsonLd.tsx`

- [ ] **Step 1: Create Header component**

Create `components/Header.tsx`:

```typescript
import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-sand bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-ink">
          GoEast<span className="text-china-red">.ai</span>
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <Link
            href="/skills"
            className="text-warm hover:text-china-red transition-colors"
          >
            Skills
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
            href="/submit"
            className="bg-china-red text-white px-4 py-1.5 rounded-lg text-sm hover:bg-china-red/90 transition-colors"
          >
            Submit
          </Link>
        </div>
      </nav>
    </header>
  );
}
```

- [ ] **Step 2: Create Footer component**

Create `components/Footer.tsx`:

```typescript
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-sand mt-16 py-8">
      <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-sm text-warm">
          <span className="font-semibold text-ink">GoEast<span className="text-china-red">.ai</span></span>
          {" "}— Curated AI Skills for China
        </div>
        <div className="flex gap-6 text-sm text-warm">
          <Link href="/skills" className="hover:text-china-red transition-colors">Skills</Link>
          <Link href="/llms.txt" className="hover:text-china-red transition-colors">For Agents</Link>
          <Link href="/api/skills" className="hover:text-china-red transition-colors">API</Link>
          <Link href="/about" className="hover:text-china-red transition-colors">About</Link>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 3: Create CategoryBadge component**

Create `components/CategoryBadge.tsx`:

```typescript
import { Category, CATEGORIES } from "@/lib/types";

export default function CategoryBadge({
  category,
  size = "sm",
}: {
  category: Category;
  size?: "sm" | "md";
}) {
  const info = CATEGORIES.find((c) => c.id === category);
  if (!info) return null;

  const baseClasses =
    "inline-flex items-center gap-1 rounded-full bg-cream border border-sand";
  const sizeClasses = size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm";

  return (
    <span className={`${baseClasses} ${sizeClasses} text-warm`}>
      <span>{info.icon}</span>
      <span>{info.name}</span>
    </span>
  );
}
```

- [ ] **Step 4: Create JsonLd component**

Create `components/JsonLd.tsx`:

```typescript
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
```

- [ ] **Step 5: Wire Header and Footer into root layout**

Edit `app/layout.tsx` — add imports and wrap `{children}`:

```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GoEast.ai — Curated AI Skills for China",
  description:
    "Discover curated AI skills for traveling, living, and doing business in China. Built for humans and AI agents.",
  metadataBase: new URL("https://goeast.ai"),
  openGraph: {
    title: "GoEast.ai — Curated AI Skills for China",
    description:
      "Discover curated AI skills for traveling, living, and doing business in China.",
    url: "https://goeast.ai",
    siteName: "GoEast.ai",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased min-h-screen flex flex-col`}>
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Verify components render**

```bash
npm run dev
```

Open http://localhost:3000 — should see Header and Footer with China Fusion styling.

- [ ] **Step 7: Commit**

```bash
git add components/ app/layout.tsx
git commit -m "feat: add Header, Footer, CategoryBadge, JsonLd components"
```

---

### Task 5: Homepage (Hero + CategoryGrid + SkillCard + Featured)

**Files:**
- Create: `components/Hero.tsx`
- Create: `components/CategoryGrid.tsx`
- Create: `components/SkillCard.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Create Hero component**

Create `components/Hero.tsx`:

```typescript
import Link from "next/link";

export default function Hero() {
  return (
    <section className="text-center py-16 md:py-24 px-4">
      <h1 className="text-4xl md:text-5xl font-bold text-ink mb-4">
        GoEast<span className="text-china-red">.ai</span>
      </h1>
      <p className="text-lg md:text-xl text-warm max-w-2xl mx-auto mb-2">
        Curated AI Skills for Living & Traveling in China
      </p>
      <p className="text-sm text-warm/70 max-w-xl mx-auto mb-8">
        精选 AI 技能，助力外国人在中国的生活与旅行
      </p>
      <div className="flex gap-4 justify-center">
        <Link
          href="/skills"
          className="bg-china-red text-white px-6 py-2.5 rounded-lg font-medium hover:bg-china-red/90 transition-colors"
        >
          Browse Skills
        </Link>
        <Link
          href="/llms.txt"
          className="border border-sand text-warm px-6 py-2.5 rounded-lg font-medium hover:border-china-red hover:text-china-red transition-colors"
        >
          For Agents →
        </Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Create CategoryGrid component**

Create `components/CategoryGrid.tsx`:

```typescript
import Link from "next/link";
import { CATEGORIES, Category } from "@/lib/types";
import { getSkillsByCategory } from "@/lib/skills";

export default function CategoryGrid() {
  return (
    <section className="max-w-4xl mx-auto px-4 py-12">
      <h2 className="text-2xl font-bold text-ink mb-8 text-center">
        Explore by Category
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {CATEGORIES.map((cat) => (
          <CategoryCard key={cat.id} category={cat} />
        ))}
      </div>
    </section>
  );
}

function CategoryCard({ category }: { category: (typeof CATEGORIES)[number] }) {
  const count = getSkillsByCategory(category.id as Category).length;

  return (
    <Link
      href={`/categories/${category.id}`}
      className="bg-white rounded-xl border border-sand p-6 text-center hover:border-china-red/30 hover:shadow-sm transition-all group"
    >
      <div className="text-3xl mb-2">{category.icon}</div>
      <div className="font-semibold text-ink group-hover:text-china-red transition-colors">
        {category.name}
      </div>
      <div className="text-xs text-warm mt-1">{category.name_zh}</div>
      <div className="text-xs text-warm/60 mt-2">{count} skills</div>
    </Link>
  );
}
```

- [ ] **Step 3: Create SkillCard component**

Create `components/SkillCard.tsx`:

```typescript
import Link from "next/link";
import { SkillMeta } from "@/lib/types";
import CategoryBadge from "./CategoryBadge";

export default function SkillCard({ skill }: { skill: SkillMeta }) {
  return (
    <Link href={`/skills/${skill.slug}`} className="block group">
      <article className="bg-white rounded-xl border border-sand p-5 hover:border-china-red/30 hover:shadow-sm transition-all h-full">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-semibold text-ink group-hover:text-china-red transition-colors">
            {skill.title}
          </h3>
          <span className="text-xs text-warm/60 whitespace-nowrap">
            {skill.source}
          </span>
        </div>
        <p className="text-sm text-warm/80 mb-1">{skill.title_zh}</p>
        <div className="flex items-center gap-2 mt-3">
          <CategoryBadge category={skill.category} />
          {skill.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs text-warm/50 bg-cream px-2 py-0.5 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      </article>
    </Link>
  );
}
```

- [ ] **Step 4: Build homepage**

Replace `app/page.tsx`:

```typescript
import Hero from "@/components/Hero";
import CategoryGrid from "@/components/CategoryGrid";
import SkillCard from "@/components/SkillCard";
import { getFeaturedSkills, getAllSkills } from "@/lib/skills";
import { CATEGORIES } from "@/lib/types";

export default function HomePage() {
  const featured = getFeaturedSkills();
  const totalSkills = getAllSkills().length;

  return (
    <>
      <Hero />

      <CategoryGrid />

      {featured.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-ink mb-2">Featured Skills</h2>
          <p className="text-sm text-warm mb-8">
            {totalSkills} curated skills across {CATEGORIES.length} categories
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featured.map((skill) => (
              <SkillCard key={skill.slug} skill={skill} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
```

- [ ] **Step 5: Verify homepage renders**

```bash
npm run dev
```

Open http://localhost:3000 — should see Hero, Category Grid with counts, and Featured Skills cards.

- [ ] **Step 6: Commit**

```bash
git add components/Hero.tsx components/CategoryGrid.tsx components/SkillCard.tsx app/page.tsx
git commit -m "feat: build homepage with Hero, CategoryGrid, and Featured Skills"
```

---

### Task 6: Skills List Page (Search, Filter, Pagination)

**Files:**
- Create: `components/SkillList.tsx`
- Create: `app/skills/page.tsx`

- [ ] **Step 1: Create SkillList client component**

Create `components/SkillList.tsx`:

```typescript
"use client";

import { useState, useMemo } from "react";
import { SkillMeta, CATEGORIES } from "@/lib/types";
import SkillCard from "./SkillCard";

const PER_PAGE = 12;

export default function SkillList({ skills }: { skills: SkillMeta[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let result = skills;
    if (category !== "all") {
      result = result.filter((s) => s.category === category);
    }
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.title_zh.includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return result;
  }, [skills, query, category]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div>
      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <input
          type="text"
          placeholder="Search skills... 搜索技能..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          className="flex-1 px-4 py-2 border border-sand rounded-lg bg-white text-ink placeholder:text-warm/40 focus:outline-none focus:border-china-red"
        />
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => {
              setCategory("all");
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              category === "all"
                ? "bg-china-red text-white"
                : "bg-white border border-sand text-warm hover:border-china-red/30"
            }`}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setCategory(cat.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                category === cat.id
                  ? "bg-china-red text-white"
                  : "bg-white border border-sand text-warm hover:border-china-red/30"
              }`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-warm mb-4">
        {filtered.length} skill{filtered.length !== 1 ? "s" : ""} found
      </p>

      {/* Skill grid */}
      {paged.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paged.map((skill) => (
            <SkillCard key={skill.slug} skill={skill} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-warm">
          No skills found matching your search.
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg text-sm border border-sand text-warm disabled:opacity-30 hover:border-china-red/30"
          >
            ← Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                p === page
                  ? "bg-china-red text-white"
                  : "border border-sand text-warm hover:border-china-red/30"
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg text-sm border border-sand text-warm disabled:opacity-30 hover:border-china-red/30"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create skills list page**

Create `app/skills/page.tsx`:

```typescript
import { getAllSkills } from "@/lib/skills";
import SkillList from "@/components/SkillList";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "All Skills — GoEast.ai",
  description: "Browse all curated AI skills for foreigners in China. Travel, medical, shopping, accommodation and more.",
};

export default function SkillsPage() {
  const skills = getAllSkills();

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-ink mb-2">All Skills</h1>
      <p className="text-warm mb-8">
        Browse curated AI skills for foreigners in China
        <br />
        <span className="text-sm">浏览精选的面向外国人的 AI 技能</span>
      </p>
      <SkillList skills={skills} />
    </div>
  );
}
```

- [ ] **Step 3: Verify skills list page**

```bash
npm run dev
```

Open http://localhost:3000/skills — should see all 6 skills, search and category filters should work.

- [ ] **Step 4: Commit**

```bash
git add components/SkillList.tsx app/skills/
git commit -m "feat: add skills list page with search, filter, and pagination"
```

---

### Task 7: Skill Detail Page

**Files:**
- Create: `app/skills/[slug]/page.tsx`

- [ ] **Step 1: Create skill detail page**

Create `app/skills/[slug]/page.tsx`:

```typescript
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSkillWithHtml, getSkillSlugs, getAllSkills } from "@/lib/skills";
import { CATEGORIES } from "@/lib/types";
import CategoryBadge from "@/components/CategoryBadge";
import JsonLd from "@/components/JsonLd";
import type { Metadata } from "next";

export async function generateStaticParams() {
  return getSkillSlugs().map((slug) => ({ slug }));
}

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
    openGraph: {
      title: `${meta.title} — GoEast.ai`,
      description: `${meta.title} - ${meta.title_zh}`,
      type: "article",
    },
  };
}

export default async function SkillDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const skill = await getSkillWithHtml(slug);
  if (!skill) notFound();

  const catInfo = CATEGORIES.find((c) => c.id === skill.category);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: skill.title,
    description: `${skill.title} - ${skill.title_zh}`,
    applicationCategory: skill.category,
    url: `https://goeast.ai/skills/${skill.slug}`,
    operatingSystem: "AI Agent",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return (
    <>
      <JsonLd data={jsonLd} />

      <article className="max-w-3xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <nav className="text-sm text-warm mb-6 flex items-center gap-2">
          <Link href="/" className="hover:text-china-red transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href="/skills" className="hover:text-china-red transition-colors">
            Skills
          </Link>
          <span>/</span>
          <span className="text-ink">{skill.title}</span>
        </nav>

        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <CategoryBadge category={skill.category} size="md" />
            {skill.featured && (
              <span className="text-xs bg-china-red/10 text-china-red px-2 py-0.5 rounded-full">
                Featured
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold text-ink mb-1">{skill.title}</h1>
          <p className="text-lg text-warm">{skill.title_zh}</p>
        </header>

        {/* Content */}
        <div
          className="prose prose-warm max-w-none
            prose-headings:text-ink prose-headings:font-semibold
            prose-a:text-china-red prose-a:no-underline hover:prose-a:underline
            prose-code:text-gold prose-code:bg-cream prose-code:px-1 prose-code:rounded"
          dangerouslySetInnerHTML={{ __html: skill.content }}
        />

        {/* Meta footer */}
        <footer className="mt-12 pt-6 border-t border-sand">
          <div className="flex flex-wrap gap-4 text-sm text-warm">
            <div>
              <span className="font-medium text-ink">Source:</span>{" "}
              <a
                href={skill.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-china-red hover:underline"
              >
                {skill.source}
              </a>
            </div>
            <div>
              <span className="font-medium text-ink">Install:</span>{" "}
              <a
                href={skill.skill_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-china-red hover:underline"
              >
                {skill.skill_url}
              </a>
            </div>
            <div>
              <span className="font-medium text-ink">Updated:</span>{" "}
              {skill.updated_at}
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            {skill.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs bg-cream text-warm px-2.5 py-1 rounded-full border border-sand"
              >
                {tag}
              </span>
            ))}
          </div>
        </footer>
      </article>
    </>
  );
}
```

- [ ] **Step 2: Install @tailwindcss/typography for prose styling**

```bash
npm install @tailwindcss/typography
```

Then edit `tailwind.config.ts` — add the plugin:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#faf5ef",
        ink: "#2c1810",
        warm: "#8b7355",
        "china-red": "#c0392b",
        gold: "#8e6d45",
        sand: "#e0d5c5",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
export default config;
```

- [ ] **Step 3: Verify skill detail page**

```bash
npm run dev
```

Open http://localhost:3000/skills/china-travel-planner — should see full skill detail with rendered Markdown, JSON-LD in source.

- [ ] **Step 4: Commit**

```bash
git add app/skills/ tailwind.config.ts package.json package-lock.json
git commit -m "feat: add skill detail page with JSON-LD and prose styling"
```

---

### Task 8: Category Pages

**Files:**
- Create: `app/categories/[category]/page.tsx`

- [ ] **Step 1: Create category page**

Create `app/categories/[category]/page.tsx`:

```typescript
import { notFound } from "next/navigation";
import { CATEGORIES, Category } from "@/lib/types";
import { getSkillsByCategory } from "@/lib/skills";
import SkillCard from "@/components/SkillCard";
import type { Metadata } from "next";

export function generateStaticParams() {
  return CATEGORIES.map((cat) => ({ category: cat.id }));
}

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
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const catInfo = CATEGORIES.find((c) => c.id === category);
  if (!catInfo) notFound();

  const skills = getSkillsByCategory(category as Category);

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-8">
        <div className="text-4xl mb-2">{catInfo.icon}</div>
        <h1 className="text-3xl font-bold text-ink">{catInfo.name}</h1>
        <p className="text-warm">{catInfo.name_zh}</p>
        <p className="text-sm text-warm/60 mt-2">
          {skills.length} skill{skills.length !== 1 ? "s" : ""} in this category
        </p>
      </div>

      {skills.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills.map((skill) => (
            <SkillCard key={skill.slug} skill={skill} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-warm">
          No skills in this category yet.
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify category page**

```bash
npm run dev
```

Open http://localhost:3000/categories/travel — should show travel skills only.

- [ ] **Step 3: Commit**

```bash
git add app/categories/
git commit -m "feat: add category pages with static generation"
```

---

### Task 9: Agent Infrastructure (llms.txt, API, sitemap, robots)

**Files:**
- Create: `app/llms.txt/route.ts`
- Create: `app/api/skills/route.ts`
- Create: `app/robots.txt/route.ts`
- Create: `app/sitemap.ts`

- [ ] **Step 1: Create llms.txt route handler**

Create `app/llms.txt/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getAllSkills, getFeaturedSkills } from "@/lib/skills";
import { CATEGORIES } from "@/lib/types";

export async function GET() {
  const allSkills = getAllSkills();
  const featured = getFeaturedSkills();

  const lines: string[] = [
    "# GoEast.ai",
    "# Curated AI Skills for foreigners coming to China",
    `# Categories: ${CATEGORIES.map((c) => c.name).join(", ")}`,
    "",
    "## Quick Access",
    "- All skills (JSON): /api/skills",
    ...CATEGORIES.map(
      (c) => `- Skills by category: /api/skills?category=${c.id}`
    ),
    "- Individual skill: /skills/{slug}",
    "",
    "## Stats",
    `- Total skills: ${allSkills.length}`,
    ...CATEGORIES.map((c) => `- ${c.name}: ${allSkills.filter((s) => s.category === c.id).length}`),
    "",
    "## Featured Skills",
    ...featured.map(
      (s) =>
        `- [${s.category}] ${s.title}: /skills/${s.slug}`
    ),
    "",
    "## All Skills",
    ...allSkills.map(
      (s) =>
        `- [${s.category}] ${s.title} | ${s.title_zh}: /skills/${s.slug}`
    ),
  ];

  return new NextResponse(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
```

- [ ] **Step 2: Create JSON API route**

Create `app/api/skills/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getAllSkills } from "@/lib/skills";
import { Category } from "@/lib/types";

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

  return NextResponse.json({
    total,
    page,
    per_page: perPage,
    skills: paged,
  });
}
```

- [ ] **Step 3: Create robots.txt route handler**

Create `app/robots.txt/route.ts`:

```typescript
import { NextResponse } from "next/server";

export async function GET() {
  const content = [
    "User-agent: *",
    "Allow: /",
    "",
    "Sitemap: https://goeast.ai/sitemap.xml",
    "",
    "# Agent resources",
    "# llms.txt: https://goeast.ai/llms.txt",
    "# JSON API: https://goeast.ai/api/skills",
  ].join("\n");

  return new NextResponse(content, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
```

- [ ] **Step 4: Create sitemap generator**

Create `app/sitemap.ts`:

```typescript
import { MetadataRoute } from "next";
import { getSkillSlugs } from "@/lib/skills";
import { CATEGORIES } from "@/lib/types";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://goeast.ai";

  const skillPages = getSkillSlugs().map((slug) => ({
    url: `${baseUrl}/skills/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const categoryPages = CATEGORIES.map((cat) => ({
    url: `${baseUrl}/categories/${cat.id}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/skills`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...skillPages,
    ...categoryPages,
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/submit`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];
}
```

- [ ] **Step 5: Verify agent infrastructure**

```bash
npm run dev
```

Test each endpoint:
- http://localhost:3000/llms.txt → plain text skill listing
- http://localhost:3000/api/skills → JSON with all skills
- http://localhost:3000/api/skills?category=travel → filtered JSON
- http://localhost:3000/robots.txt → robots content
- http://localhost:3000/sitemap.xml → XML sitemap

- [ ] **Step 6: Commit**

```bash
git add app/llms.txt/ app/api/ app/robots.txt/ app/sitemap.ts
git commit -m "feat: add agent infrastructure (llms.txt, JSON API, sitemap, robots.txt)"
```

---

### Task 10: About & Submit Pages

**Files:**
- Create: `app/about/page.tsx`
- Create: `app/submit/page.tsx`

- [ ] **Step 1: Create About page**

Create `app/about/page.tsx`:

```typescript
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — GoEast.ai",
  description: "About GoEast.ai — curated AI skills for foreigners in China",
};

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-ink mb-6">About GoEast.ai</h1>

      <div className="prose prose-warm max-w-none prose-headings:text-ink prose-headings:font-semibold prose-a:text-china-red">
        <p>
          <strong>GoEast.ai</strong> is a curated directory of AI skills designed to help
          foreigners navigate life in China. From travel planning to medical appointments,
          mobile payments to finding accommodation — we collect the best AI-powered tools
          so you don&apos;t have to search for them.
        </p>

        <h2>Built for Humans & Agents</h2>
        <p>
          This site is designed to be friendly for both human visitors and AI agents. If
          you&apos;re an AI agent assisting a foreigner in China, check out our{" "}
          <a href="/llms.txt">llms.txt</a> for a machine-readable overview, or query our{" "}
          <a href="/api/skills">JSON API</a> for structured skill data.
        </p>

        <h2>Contributing</h2>
        <p>
          Know a great AI skill that helps foreigners in China?{" "}
          <a href="/submit">Submit it here</a>. We review all submissions and curate the
          best ones for the directory.
        </p>

        <h2>关于 GoEast.ai</h2>
        <p>
          GoEast.ai 是一个精选的 AI 技能目录，旨在帮助外国人更好地在中国生活。
          从旅行规划到医疗预约，从移动支付到寻找住处——我们收集最好的 AI 工具，让你不必自己搜索。
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create Submit page**

Create `app/submit/page.tsx`:

```typescript
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Submit a Skill — GoEast.ai",
  description: "Submit an AI skill to the GoEast.ai directory",
};

export default function SubmitPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-ink mb-6">Submit a Skill</h1>

      <div className="prose prose-warm max-w-none prose-headings:text-ink prose-headings:font-semibold prose-a:text-china-red">
        <p>
          Have an AI skill that helps foreigners in China? We&apos;d love to include it in
          our directory.
        </p>

        <h2>How to Submit</h2>
        <ol>
          <li>
            Open a GitHub Issue on our{" "}
            <a
              href="https://github.com/goeast-ai/skills/issues/new"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub repository
            </a>
          </li>
          <li>Include the skill name, source platform, category, and a brief description</li>
          <li>We&apos;ll review and add it to the directory</li>
        </ol>

        <h2>What We&apos;re Looking For</h2>
        <ul>
          <li>AI skills related to traveling, living, or doing business in China</li>
          <li>Skills from platforms like Claude Hub, skills.sh, or any other source</li>
          <li>Tools that help with practical tasks: visa, payments, transport, health, housing</li>
        </ul>

        <h2>提交技能</h2>
        <p>
          如果你发现了帮助外国人在中国生活的 AI 技能，欢迎通过 GitHub Issue 提交。
          我们会审核后添加到目录中。
        </p>
      </div>

      <a
        href="https://github.com/goeast-ai/skills/issues/new"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block mt-8 bg-china-red text-white px-6 py-3 rounded-lg font-medium hover:bg-china-red/90 transition-colors"
      >
        Open GitHub Issue →
      </a>
    </div>
  );
}
```

- [ ] **Step 3: Verify pages**

```bash
npm run dev
```

Open http://localhost:3000/about and http://localhost:3000/submit — both should render with prose styling.

- [ ] **Step 4: Commit**

```bash
git add app/about/ app/submit/
git commit -m "feat: add About and Submit pages"
```

---

### Task 11: Build Verification & Deploy Prep

**Files:**
- Modify: `next.config.ts` (add output: 'export' if needed, or keep default for Vercel)

- [ ] **Step 1: Run full build**

```bash
npm run build
```

Expected: Build succeeds with all pages statically generated. Check that no errors appear.

- [ ] **Step 2: Verify all routes work in production build**

```bash
npm run start
```

Test these URLs:
- http://localhost:3000/ — Homepage
- http://localhost:3000/skills — Skills list
- http://localhost:3000/skills/china-travel-planner — Skill detail
- http://localhost:3000/categories/travel — Category page
- http://localhost:3000/llms.txt — Agent text
- http://localhost:3000/api/skills — JSON API
- http://localhost:3000/api/skills?category=medical — Filtered API
- http://localhost:3000/robots.txt — Robots
- http://localhost:3000/sitemap.xml — Sitemap
- http://localhost:3000/about — About
- http://localhost:3000/submit — Submit

- [ ] **Step 3: Commit any fixes from build**

```bash
git add -A
git commit -m "chore: build fixes and verification"
```

- [ ] **Step 4: Deploy to Vercel**

```bash
npx vercel --prod
```

Follow prompts to link the project. After first deploy, configure custom domain:
1. Go to Vercel Dashboard → Project Settings → Domains
2. Add `goeast.ai` and `www.goeast.ai`
3. Update DNS records at your domain registrar as Vercel instructs

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: initial deploy configuration"
```

---

## Self-Review

**Spec coverage check:**

| Spec Requirement | Task |
|---|---|
| Homepage with Hero + Category Grid + Featured Skills | Task 5 |
| Skills list with search/filter/pagination | Task 6 |
| Skill detail with JSON-LD | Task 7 |
| Category pages | Task 8 |
| `/llms.txt` agent entry | Task 9 |
| `/api/skills` JSON API | Task 9 |
| `sitemap.xml` | Task 9 |
| `robots.txt` | Task 9 |
| About page | Task 10 |
| Submit page | Task 10 |
| China Fusion visual style | Task 1 (Tailwind config) |
| Bilingual EN/ZH content | Task 3 (Markdown files) |
| Markdown content management | Tasks 2-3 (lib/skills.ts) |
| Vercel deployment | Task 11 |
| Open Graph meta tags | Task 1 (layout) + Tasks 6-8 (per-page) |
| Semantic HTML | Tasks 5-10 (article, header, nav, section) |

All spec requirements are covered. No placeholders found. Type names are consistent across tasks.
