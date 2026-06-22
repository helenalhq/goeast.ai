# Feedback Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add user feedback functionality to GoEast.ai allowing visitors to submit suggestions, problems, and feature requests via a modal form with floating button and footer link entry points.

**Architecture:** Client-side modal form submits to a serverless API route, which validates input, stores data in Supabase, and sends email notifications via Resend. Rate limiting prevents abuse.

**Tech Stack:** Next.js 16, React 19, Supabase, Resend, Tailwind CSS 4

## Global Constraints

- Next.js 16 with App Router (Server Components by default, use `'use client'` for interactive components)
- TypeScript strict mode
- Tailwind CSS 4 with custom color palette: `cream` (#faf5ef), `ink` (#2c1810), `warm` (#8b7355), `china-red` (#c0392b), `gold` (#8e6d45), `sand` (#e0d5c5)
- No test framework configured — use manual testing
- Path alias: `@/*` maps to project root
- Supabase already configured in `lib/supabase/`

---

### Task 1: Install Resend Dependency

**Files:**
- Modify: `package.json`

**Interfaces:**
- Consumes: N/A
- Produces: Resend package installed and available for import

- [ ] **Step 1: Install Resend package**

```bash
npm install resend
```

Expected output: Package added to dependencies in package.json

- [ ] **Step 2: Verify installation**

Run: `npm list resend`
Expected: Shows resend package version

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add resend package for email notifications

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Create Supabase Migration SQL

**Files:**
- Create: `supabase/migrations/001_create_feedback_table.sql`

**Interfaces:**
- Consumes: N/A
- Produces: SQL migration file for creating feedback table

- [ ] **Step 1: Create migrations directory**

```bash
mkdir -p supabase/migrations
```

- [ ] **Step 2: Create migration file**

```sql
-- supabase/migrations/001_create_feedback_table.sql
CREATE TABLE feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('suggestion', 'problem', 'feature')),
  content TEXT NOT NULL,
  page_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_feedback_type ON feedback(feedback_type);
CREATE INDEX idx_feedback_created ON feedback(created_at DESC);
```

- [ ] **Step 3: Commit migration file**

```bash
git add supabase/migrations/001_create_feedback_table.sql
git commit -m "feat: add feedback table migration

Creates feedback table with fields for email, feedback_type, content,
and page_path. Includes indexes for efficient querying.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 4: Apply migration to Supabase**

Note: User must manually run this SQL in Supabase Dashboard → SQL Editor, or use Supabase CLI if installed.

Instructions: Copy the SQL from the migration file and execute it in your Supabase project's SQL Editor.

---

### Task 3: Create Email Notification Utility

**Files:**
- Create: `lib/email.ts`

**Interfaces:**
- Consumes: Resend package, RESEND_API_KEY environment variable
- Produces: `sendFeedbackNotification(feedback)` function

- [ ] **Step 1: Create email utility file**

```typescript
// lib/email.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const typeLabels = {
  suggestion: '💡 建议',
  problem: '🐛 问题',
  feature: '✨ 新功能'
} as const;

export type FeedbackType = keyof typeof typeLabels;

export async function sendFeedbackNotification(feedback: {
  email?: string;
  feedbackType: FeedbackType;
  content: string;
  pagePath?: string;
}) {
  const typeLabel = typeLabels[feedback.feedbackType] || feedback.feedbackType;

  try {
    await resend.emails.send({
      from: 'GoEast.ai <noreply@goeast.ai>',
      to: 'helena.liuhanqing@gmail.com',
      subject: `[GoEast 反馈] ${typeLabel}`,
      html: `
        <h2>新反馈</h2>
        <p><strong>类型：</strong>${typeLabel}</p>
        <p><strong>内容：</strong></p>
        <blockquote>${feedback.content.replace(/\n/g, '<br>')}</blockquote>
        ${feedback.email ? `<p><strong>用户邮箱：</strong>${feedback.email}</p>` : ''}
        ${feedback.pagePath ? `<p><strong>来源页面：</strong>${feedback.pagePath}</p>` : ''}
        <p><strong>提交时间：</strong>${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</p>
      `
    });
  } catch (error) {
    // Log error but don't throw - email failure shouldn't block feedback submission
    console.error('Failed to send feedback notification email:', error);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/email.ts
git commit -m "feat: add email notification utility for feedback

Uses Resend to send email notifications when feedback is submitted.
Email failures are logged but don't block feedback submission.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Create Feedback API Route

**Files:**
- Create: `app/api/feedback/route.ts`

**Interfaces:**
- Consumes: Supabase server client, email utility
- Produces: POST /api/feedback endpoint

- [ ] **Step 1: Create API route**

```typescript
// app/api/feedback/route.ts
import { createClient } from '@/lib/supabase/server';
import { sendFeedbackNotification, type FeedbackType } from '@/lib/email';
import { NextRequest } from 'next/server';

// Simple in-memory rate limiting
const feedbackRateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 5; // 5 submissions per hour per IP

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = feedbackRateLimit.get(ip);

  if (!entry || entry.resetAt < now) {
    feedbackRateLimit.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count };
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';

    // Check rate limit
    const rateLimitResult = checkRateLimit(ip);
    if (!rateLimitResult.allowed) {
      return Response.json(
        { error: '提交太频繁，请稍后再试' },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { email, feedbackType, content, pagePath } = body;

    // Validate required fields
    if (!feedbackType || !content) {
      return Response.json(
        { error: '缺少必填字段' },
        { status: 400 }
      );
    }

    // Validate feedback type
    const validTypes: FeedbackType[] = ['suggestion', 'problem', 'feature'];
    if (!validTypes.includes(feedbackType)) {
      return Response.json(
        { error: '无效的反馈类型' },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (email && !isValidEmail(email)) {
      return Response.json(
        { error: '邮箱格式不正确' },
        { status: 400 }
      );
    }

    // Validate content length
    if (content.trim().length < 10) {
      return Response.json(
        { error: '反馈内容至少需要 10 个字符' },
        { status: 400 }
      );
    }

    // Insert into Supabase
    const supabase = await createClient();
    const { error: dbError } = await supabase
      .from('feedback')
      .insert({
        email: email || null,
        feedback_type: feedbackType,
        content: content.trim(),
        page_path: pagePath || null,
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return Response.json(
        { error: '服务器错误，请稍后重试' },
        { status: 500 }
      );
    }

    // Send email notification (don't wait for it)
    sendFeedbackNotification({
      email,
      feedbackType,
      content: content.trim(),
      pagePath,
    }).catch(err => console.error('Email notification failed:', err));

    return Response.json(
      { success: true, message: '感谢你的反馈！' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Feedback submission error:', error);
    return Response.json(
      { error: '服务器错误，请稍后重试' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/feedback/route.ts
git commit -m "feat: add feedback API endpoint with rate limiting

POST /api/feedback accepts feedback submissions with validation,
rate limiting (5 per hour per IP), database storage, and email
notifications.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Create Feedback Modal Component

**Files:**
- Create: `components/FeedbackModal.tsx`

**Interfaces:**
- Consumes: React, Tailwind CSS
- Produces: FeedbackModal component with isOpen and onClose props

- [ ] **Step 1: Create modal component**

```tsx
// components/FeedbackModal.tsx
'use client';

import { useState, useEffect } from 'react';

type FeedbackType = 'suggestion' | 'problem' | 'feature';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('suggestion');
  const [content, setContent] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, isSubmitting]);

  const handleClose = () => {
    if (isSubmitting) return;
    setFeedbackType('suggestion');
    setContent('');
    setEmail('');
    setError('');
    setIsSubmitted(false);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      handleClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (content.trim().length < 10) {
      setError('反馈内容至少需要 10 个字符');
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('邮箱格式不正确');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedbackType,
          content: content.trim(),
          email: email.trim() || undefined,
          pagePath: window.location.pathname,
        }),
      });

      if (response.status === 429) {
        setError('提交太频繁，请稍后再试');
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || '服务器错误，请稍后重试');
        return;
      }

      setIsSubmitted(true);
      setTimeout(() => {
        handleClose();
      }, 3000);
    } catch (err) {
      setError('网络连接失败，请检查网络后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isFormValid = content.trim().length >= 10 && 
                      (!email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        {!isSubmitted ? (
          <form onSubmit={handleSubmit} className="p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-ink mb-2">
                💬 有什么想法？聊聊吧！
              </h2>
              <p className="text-warm text-sm">
                你的反馈对我们很重要，无论是建议、问题还是新功能想法，我们都想听。
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-2">
                  反馈类型 <span className="text-china-red">*</span>
                </label>
                <div className="flex gap-2">
                  {([
                    { value: 'suggestion', label: '💡 建议' },
                    { value: 'problem', label: '🐛 问题' },
                    { value: 'feature', label: '✨ 新功能' },
                  ] as const).map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFeedbackType(type.value)}
                      className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${
                        feedbackType === type.value
                          ? 'border-china-red bg-china-red/10 text-ink font-medium'
                          : 'border-sand hover:border-warm text-warm'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="content" className="block text-sm font-medium text-ink mb-2">
                  你的想法 <span className="text-china-red">*</span>
                </label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="请描述你的想法..."
                  rows={4}
                  className="w-full px-4 py-2 border border-sand rounded-lg focus:outline-none focus:ring-2 focus:ring-china-red/50 focus:border-china-red resize-none"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-ink mb-2">
                  邮箱（可选，方便我们回复你）
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-2 border border-sand rounded-lg focus:outline-none focus:ring-2 focus:ring-china-red/50 focus:border-china-red"
                  disabled={isSubmitting}
                />
              </div>

              {error && (
                <p className="text-china-red text-sm">{error}</p>
              )}

              <p className="text-xs text-warm">
                我们尊重你的隐私，反馈内容仅用于改进网站
              </p>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-warm hover:text-ink transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className="px-6 py-2 bg-china-red text-white rounded-lg hover:bg-china-red/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '发送中...' : '发送反馈 →'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 text-center">
            <div className="text-4xl mb-4">✓</div>
            <h2 className="text-xl font-bold text-ink mb-3">感谢你的反馈！</h2>
            <p className="text-warm mb-4">
              我们已收到你的想法，会认真查看。
            </p>
            <p className="text-sm text-warm mb-6">
              如果想继续交流，欢迎邮件联系：<br />
              <a
                href="mailto:helena.liuhanqing@gmail.com"
                className="text-china-red hover:underline"
              >
                📧 helena.liuhanqing@gmail.com
              </a>
            </p>
            <button
              onClick={handleClose}
              className="px-6 py-2 bg-china-red text-white rounded-lg hover:bg-china-red/90 transition-colors"
            >
              关闭
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/FeedbackModal.tsx
git commit -m "feat: add feedback modal component

Modal form with feedback type selection, content textarea, optional
email field, validation, and success state. Supports ESC key and
backdrop click to close.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Create Floating Feedback Button

**Files:**
- Create: `components/FeedbackButton.tsx`

**Interfaces:**
- Consumes: React, Tailwind CSS
- Produces: FeedbackButton component with onClick prop

- [ ] **Step 1: Create floating button component**

```tsx
// components/FeedbackButton.tsx
'use client';

interface FeedbackButtonProps {
  onClick: () => void;
}

export default function FeedbackButton({ onClick }: FeedbackButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 w-14 h-14 md:w-16 md:h-16 bg-china-red text-white rounded-full shadow-lg hover:scale-110 transition-transform duration-200 flex items-center justify-center text-2xl group z-40"
      aria-label="反馈建议"
      title="反馈建议"
    >
      <span className="group-hover:hidden">💬</span>
      <span className="hidden group-hover:block text-sm font-medium">反馈</span>
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/FeedbackButton.tsx
git commit -m "feat: add floating feedback button

Fixed position button in bottom-right corner. Shows icon by default,
changes to text on hover. Responsive sizing for mobile and desktop.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Integrate Feedback Components into Layout

**Files:**
- Modify: `app/layout.tsx:1-57`
- Modify: `components/Footer.tsx:1-27`

**Interfaces:**
- Consumes: FeedbackModal, FeedbackButton components
- Produces: Integrated feedback functionality across all pages

- [ ] **Step 1: Update layout.tsx to include feedback components**

```tsx
// app/layout.tsx
import type { Metadata } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FeedbackButton from "@/components/FeedbackButton";
import FeedbackModal from "@/components/FeedbackModal";
import "./globals.css";

const inter = localFont({
  src: [
    { path: "../public/fonts/Inter-latin-400.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/Inter-latin-700.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
});

export const metadata: Metadata = {
  title: "GoEast.ai — Sophie's Journey East | AI Skills for China",
  description:
    "Follow Sophie's Journey East through 3,000 years of Chinese philosophy. Plus curated AI skills for traveling and living in China.",
  metadataBase: new URL("https://www.goeast.ai"),
  verification: {
    google: "3z9kuvrOqe9ZRP7GWl7mi2AO4FERHhlnFe59ryDsAHY",
  },
  alternates: { canonical: "/" },
  openGraph: {
    title: "GoEast.ai — Sophie's Journey East | AI Skills for China",
    description:
      "Follow Sophie's Journey East through 3,000 years of Chinese philosophy. Plus curated AI skills for traveling and living in China.",
    url: "https://www.goeast.ai",
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
        <FeedbackWrapper />
        <Analytics />
      </body>
    </html>
  );
}

// Client component wrapper for feedback functionality
import { useState } from 'react';

function FeedbackWrapper() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <FeedbackButton onClick={() => setIsModalOpen(true)} />
      <FeedbackModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
```

Note: The FeedbackWrapper needs to be a client component. Let me fix this by creating a separate client component.

Actually, let me refactor this properly:

```tsx
// app/layout.tsx
import type { Metadata } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FeedbackClient from "@/components/FeedbackClient";
import "./globals.css";

const inter = localFont({
  src: [
    { path: "../public/fonts/Inter-latin-400.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/Inter-latin-700.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
});

export const metadata: Metadata = {
  title: "GoEast.ai — Sophie's Journey East | AI Skills for China",
  description:
    "Follow Sophie's Journey East through 3,000 years of Chinese philosophy. Plus curated AI skills for traveling and living in China.",
  metadataBase: new URL("https://www.goeast.ai"),
  verification: {
    google: "3z9kuvrOqe9ZRP7GWl7mi2AO4FERHhlnFe59ryDsAHY",
  },
  alternates: { canonical: "/" },
  openGraph: {
    title: "GoEast.ai — Sophie's Journey East | AI Skills for China",
    description:
      "Follow Sophie's Journey East through 3,000 years of Chinese philosophy. Plus curated AI skills for traveling and living in China.",
    url: "https://www.goeast.ai",
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
        <FeedbackClient />
        <Analytics />
      </body>
    </html>
  );
}
```

Then create a new client component:

```tsx
// components/FeedbackClient.tsx
'use client';

import { useState } from 'react';
import FeedbackButton from './FeedbackButton';
import FeedbackModal from './FeedbackModal';

export default function FeedbackClient() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <FeedbackButton onClick={() => setIsModalOpen(true)} />
      <FeedbackModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
```

- [ ] **Step 2: Create FeedbackClient wrapper component**

Create the file `components/FeedbackClient.tsx` with the code above.

- [ ] **Step 3: Update Footer.tsx to add feedback link**

```tsx
// components/Footer.tsx
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-sand mt-16 py-8">
      <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-sm text-warm">
          <span className="font-semibold text-ink">GoEast<span className="text-china-red">.ai</span></span>
          {" "}— Sophie's Journey East | AI Skills for China
        </div>
        <div className="flex gap-6 text-sm text-warm flex-wrap justify-center">
          <Link href="/philosophers" className="hover:text-china-red transition-colors">Philosophers</Link>
          <Link href="/iching" className="hover:text-china-red transition-colors">I Ching</Link>
          <Link href="/glossary" className="hover:text-china-red transition-colors">Glossary</Link>
          <Link href="/insights" className="hover:text-china-red transition-colors">Insights</Link>
          <Link href="/skills" className="hover:text-china-red transition-colors">Skills</Link>
          <Link href="/#journey" className="hover:text-china-red transition-colors">Journey</Link>
          <Link href="/llms.txt" className="hover:text-china-red transition-colors">For Agents</Link>
          <Link href="/api/skills" className="hover:text-china-red transition-colors">API</Link>
          <Link href="/about" className="hover:text-china-red transition-colors">About</Link>
          <Link href="/contact" className="hover:text-china-red transition-colors">Contact</Link>
          <button
            onClick={() => {
              const event = new CustomEvent('openFeedback');
              window.dispatchEvent(event);
            }}
            className="hover:text-china-red transition-colors cursor-pointer"
          >
            💬 反馈建议
          </button>
        </div>
      </div>
    </footer>
  );
}
```

Wait, this approach won't work well because the footer can't directly open the modal. Let me use a different approach - update FeedbackClient to listen for the event:

```tsx
// components/FeedbackClient.tsx
'use client';

import { useState, useEffect } from 'react';
import FeedbackButton from './FeedbackButton';
import FeedbackModal from './FeedbackModal';

export default function FeedbackClient() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const handleOpenFeedback = () => setIsModalOpen(true);
    window.addEventListener('openFeedback', handleOpenFeedback);
    return () => window.removeEventListener('openFeedback', handleOpenFeedback);
  }, []);

  return (
    <>
      <FeedbackButton onClick={() => setIsModalOpen(true)} />
      <FeedbackModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
```

- [ ] **Step 4: Commit integration**

```bash
git add app/layout.tsx components/FeedbackClient.tsx components/Footer.tsx
git commit -m "feat: integrate feedback components into layout

Add floating feedback button and modal to all pages via layout.
Add feedback link to footer. Use custom event for footer link
to open modal.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: Update Environment Variables Documentation

**Files:**
- Modify: `.env.example`

**Interfaces:**
- Consumes: N/A
- Produces: Updated environment variable documentation

- [ ] **Step 1: Add RESEND_API_KEY to .env.example**

```bash
# .env.example
# ... existing content ...

# Resend (for email notifications)
RESEND_API_KEY=re_xxx...
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: add RESEND_API_KEY to environment example

Documents the new environment variable required for email
notifications.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9: Manual Testing

**Files:**
- N/A (testing task)

**Interfaces:**
- Consumes: All previously created components and APIs
- Produces: Verified functionality

- [ ] **Step 1: Set up environment**

Add your Resend API key to `.env.local`:
```bash
RESEND_API_KEY=re_your_actual_key_here
```

Apply the database migration in Supabase Dashboard.

- [ ] **Step 2: Test normal flow**

1. Start dev server: `npm run dev`
2. Navigate to any page
3. Click the floating feedback button (bottom-right)
4. Fill in the form:
   - Select "💡 建议"
   - Enter content: "这是一个测试反馈，验证功能是否正常。"
   - Enter email: your-email@example.com
5. Click "发送反馈 →"
6. Expected: Success message appears, then modal closes after 3 seconds
7. Check your email (helena.liuhanqing@gmail.com) for notification
8. Check Supabase Dashboard → Table Editor → feedback table for new entry

- [ ] **Step 3: Test required field validation**

1. Open feedback modal
2. Leave content field empty
3. Expected: "发送反馈 →" button is disabled

4. Enter less than 10 characters in content
5. Expected: Button remains disabled

- [ ] **Step 4: Test email validation**

1. Open feedback modal
2. Enter invalid email: "not-an-email"
3. Fill in content (at least 10 characters)
4. Click submit
5. Expected: Error message "邮箱格式不正确" appears

- [ ] **Step 5: Test rate limiting**

1. Submit 5 feedbacks quickly (within 1 hour)
2. Try to submit a 6th feedback
3. Expected: Error message "提交太频繁，请稍后再试" appears

- [ ] **Step 6: Test responsive design**

1. Open browser DevTools
2. Toggle device toolbar (mobile view)
3. Click feedback button
4. Expected: Modal appears with 90% width, properly styled

5. Test on actual mobile device if possible
6. Expected: Modal slides up from bottom, touch-friendly

- [ ] **Step 7: Test close behavior**

1. Open feedback modal
2. Click backdrop (outside modal)
3. Expected: Modal closes

4. Open modal again
5. Press ESC key
6. Expected: Modal closes

7. Open modal again
8. Click "取消" button
9. Expected: Modal closes

- [ ] **Step 8: Test footer link**

1. Scroll to page footer
2. Click "💬 反馈建议" link
3. Expected: Modal opens

- [ ] **Step 9: Verify all tests pass**

If any test fails, debug and fix the issue before proceeding.

---

## Summary

This implementation plan creates a complete feedback system with:
- Supabase database storage
- Resend email notifications
- Floating button and footer link entry points
- Modal form with validation and user-friendly UX
- Rate limiting to prevent abuse
- Responsive design for mobile and desktop

Total estimated time: 2-3 hours for an experienced developer.
