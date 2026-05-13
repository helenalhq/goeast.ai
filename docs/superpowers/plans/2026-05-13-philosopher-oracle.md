# Philosopher Oracle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current "Ask" button (which redirects to ChatGPT) with an in-site Oracle consultation feature that generates AI readings via a backend API, with free tier (1/day) and paid tier ($4.99/month via Creem).

**Architecture:** Stateless oracle model — POST to `/api/oracle` with philosopher + question, server calls OpenAI GPT-5.4-mini with a per-philosopher system prompt, returns a reading. Rate limiting via IP+fingerprint for free users, JWT cookie for paid users. Creem handles payment via hosted checkout + webhooks.

**Tech Stack:** Next.js 16 (App Router), OpenAI API (GPT-5.4-mini), Creem (Merchant of Record), TypeScript, Tailwind CSS 4

---

## File Structure

### New files
- `lib/oracle-prompts.ts` — System prompts for each philosopher
- `lib/oracle-scenarios.ts` — Preset scenario chips (replaces `lib/ask-questions.ts`)
- `lib/rate-limit.ts` — In-memory rate limiting (IP + fingerprint hash)
- `lib/creem.ts` — Creem API helpers (checkout creation, webhook verification, JWT)
- `app/api/oracle/route.ts` — Oracle API endpoint (POST)
- `app/api/webhooks/creem/route.ts` — Creem webhook handler
- `app/api/oracle/activate/route.ts` — Post-payment activation redirect
- `components/OracleOverlay.tsx` — Full consultation overlay (replaces AskPhilosopher)

### Modified files
- `components/PhilosopherIntro.tsx` — Replace "Ask" button with "Consult" button, swap AskPhilosopher overlay for OracleOverlay
- `components/AskPhilosopher.tsx` — Delete (replaced by OracleOverlay)
- `lib/ask-questions.ts` — Delete (replaced by oracle-scenarios.ts)
- `app/sophies-journey/[slug]/page.tsx` — Pass additional props to PhilosopherIntro

### Deleted files
- `components/AskPhilosopher.tsx`
- `lib/ask-questions.ts`

---

## Task 1: Install OpenAI SDK

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install openai package**

```bash
npm install openai
```

- [ ] **Step 2: Verify installation**

```bash
npm ls openai
```

Expected: `openai@<version>` listed

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add openai sdk dependency"
```

---

## Task 2: Create oracle scenarios data

**Files:**
- Create: `lib/oracle-scenarios.ts`

This replaces `lib/ask-questions.ts` with a new structure that includes both scenario chips and specialty labels for the overlay UI.

- [ ] **Step 1: Create the scenarios file**

Create `lib/oracle-scenarios.ts`:

```typescript
export type OracleScenario = {
  label: string;
  question: string;
};

export type PhilosopherScenarioConfig = {
  specialty: string;
  specialtyZh: string;
  scenarios: OracleScenario[];
};

const ORACLE_SCENARIOS: Record<string, PhilosopherScenarioConfig> = {
  "prologue-zhougong": {
    specialty: "I Ching Divination",
    specialtyZh: "周易卜卦",
    scenarios: [
      { label: "Oracle Reading", question: "What does the oracle say about my path?" },
      { label: "Cast a Hexagram", question: "Cast a hexagram for my situation" },
      { label: "Crossroads", question: "I face a crossroads — read the signs" },
    ],
  },
  "ch01-laozi": {
    specialty: "The Way of Water",
    specialtyZh: "上善若水",
    scenarios: [
      { label: "Finding Flow", question: "I feel stuck. How do I find flow?" },
      { label: "Letting Go", question: "Help me see what I'm forcing" },
      { label: "Water's Wisdom", question: "What would water do in my situation?" },
    ],
  },
  "ch02-confucius": {
    specialty: "The Right Action",
    specialtyZh: "礼仪仁智",
    scenarios: [
      { label: "Right Action", question: "What is the right thing to do?" },
      { label: "Relationships", question: "How should I handle this relationship?" },
      { label: "Duty", question: "What does duty demand of me?" },
    ],
  },
  "ch03-sunzi": {
    specialty: "Strategic Mind",
    specialtyZh: "知己知彼",
    scenarios: [
      { label: "Competition", question: "Analyze my competition" },
      { label: "Best Move", question: "What is my best move right now?" },
      { label: "Winning Peace", question: "How do I win without fighting?" },
    ],
  },
  "ch04-zhuangzi": {
    specialty: "Dream Reading",
    specialtyZh: "蝴蝶之梦",
    scenarios: [
      { label: "Dream Interpretation", question: "Interpret my dream" },
      { label: "New Perspective", question: "Help me see from a different perspective" },
      { label: "Butterfly's Question", question: "Am I the butterfly or the dreamer?" },
    ],
  },
  "ch05-mencius": {
    specialty: "The Heart's Compass",
    specialtyZh: "恻隐之心",
    scenarios: [
      { label: "Compassion", question: "I saw someone suffer and couldn't act. Why?" },
      { label: "Human Nature", question: "Is human nature really good?" },
      { label: "Moral Growth", question: "How do I cultivate compassion?" },
    ],
  },
  "ch06-mozi": {
    specialty: "The Builder's Logic",
    specialtyZh: "兼爱非攻",
    scenarios: [
      { label: "Conflict Resolution", question: "How do I resolve this conflict fairly?" },
      { label: "Universal Care", question: "Why should I care about strangers?" },
      { label: "Practical Solution", question: "Build me a practical solution" },
    ],
  },
  "ch07-zhuxi": {
    specialty: "The Principle Seeker",
    specialtyZh: "格物致知",
    scenarios: [
      { label: "Understanding", question: "Help me understand what's really going on" },
      { label: "Investigation", question: "Investigate this situation for me" },
      { label: "Missing Principle", question: "What principle am I missing?" },
    ],
  },
  "ch08-zhangzai": {
    specialty: "The Great Purpose",
    specialtyZh: "为天地立心",
    scenarios: [
      { label: "Life's Purpose", question: "What should I dedicate my life to?" },
      { label: "Alignment", question: "Am I aligned with heaven and earth?" },
      { label: "Responsibility", question: "What is my responsibility?" },
    ],
  },
  "ch09-huineng": {
    specialty: "The Clear Mind",
    specialtyZh: "本来无一物",
    scenarios: [
      { label: "Stillness", question: "My mind is too noisy. Help me find stillness" },
      { label: "Letting Go", question: "What am I clinging to?" },
      { label: "Direct Pointing", question: "Point directly to my heart" },
    ],
  },
  "ch10-wangyangming": {
    specialty: "Knowledge in Action",
    specialtyZh: "知行合一",
    scenarios: [
      { label: "Knowing vs Doing", question: "I know what's right but I can't act. Why?" },
      { label: "Close the Gap", question: "Close the gap between knowing and doing" },
      { label: "Hidden Truth", question: "What is my mind hiding from me?" },
    ],
  },
};

export function getOracleScenarios(slug: string): PhilosopherScenarioConfig | null {
  return ORACLE_SCENARIOS[slug] || null;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/oracle-scenarios.ts
git commit -m "feat: add oracle scenario data for all philosophers"
```

---

## Task 3: Create philosopher system prompts

**Files:**
- Create: `lib/oracle-prompts.ts`

- [ ] **Step 1: Create the prompts file**

Create `lib/oracle-prompts.ts`:

```typescript
type PromptConfig = {
  system: string;
  maxWords: number;
};

const ORACLE_PROMPTS: Record<string, PromptConfig> = {
  "prologue-zhougong": {
    maxWords: 800,
    system: `You are Zhou Gong (周公, the Duke of Zhou), the legendary sage of the 11th century BCE. You helped build the rites and music of Chinese civilization. You are the interpreter of dreams and the master of the I Ching (Book of Changes).

You speak with ancient authority and warmth, like a grandfather who has seen empires rise and fall. You use metaphors from nature — rivers, mountains, seasons, seeds. You reference the I Ching's hexagrams, yin and yang, and the flow of change. You sometimes address the user as "traveler" or "seeker."

Your readings follow this structure:
1. A brief ritual opening (e.g., "The yarrow stalks have fallen. Let us see what the oracle reveals...")
2. A deep interpretation of the user's situation through the lens of the I Ching and ancient wisdom
3. A closing line of philosophical guidance, often referencing a hexagram or classical saying

You may "cast" a hexagram that is relevant to the question and explain its meaning. You are mystical but grounded, never vague for vagueness' sake. Your insights should feel like they contain genuine wisdom, not fortune-cookie platitudes.

IMPORTANT: This is for entertainment and reflection. Do not give medical, legal, or financial advice. If someone asks about serious issues, gently redirect them to seek professional help while offering philosophical perspective.`,
  },
  "ch01-laozi": {
    maxWords: 600,
    system: `You are Laozi (老子), the Old Master, founder of Daoism and author of the Tao Te Ching. You once kept the imperial archives and watched every dynasty rise and fall before slipping away into the western mountains.

You speak softly, paradoxically, and with dry humor. Your answers often begin with a question or a reversal of expectations. You use metaphors of water, emptiness, valleys, uncarved blocks. You reference the Tao Te Ching freely.

Your readings follow this structure:
1. A quiet, paradoxical opening that reframes the question
2. A meditation on the situation through the lens of wu wei (non-action) and the Tao
3. A closing paradox or gentle challenge

You are the voice of letting go, of softness overcoming hardness, of finding strength in what seems weak. Never preach — suggest, hint, turn things upside down. The user should leave with their perspective shifted, not with a list of instructions.

IMPORTANT: This is for entertainment and reflection. Do not give medical, legal, or financial advice.`,
  },
  "ch02-confucius": {
    maxWords: 600,
    system: `You are Confucius (孔子, Kong Qiu), the great teacher of Lu. You spent your life wandering from state to state, seeking a ruler who would practice benevolence. You had three thousand students and edited the classic texts.

You speak with warmth but firmness, like a demanding but loving teacher. You emphasize ren (humaneness), li (ritual/propriety), xiao (filial piety), and the importance of self-cultivation. You often illustrate points with examples from history or the Book of Songs. You are practical — you care about how people actually live, not abstract theory.

Your readings follow this structure:
1. A direct acknowledgment of the question's importance
2. Guidance grounded in the principles of ren, li, and the five relationships
3. A closing exhortation to self-cultivation, often quoting from the Analects

You never talk down to the user. You treat every question as worthy of serious consideration. You are patient but will gently correct what you see as moral confusion.

IMPORTANT: This is for entertainment and reflection. Do not give medical, legal, or financial advice.`,
  },
  "ch03-sunzi": {
    maxWords: 700,
    system: `You are Sunzi (孙子, Sun Wu), the author of The Art of War. You served the state of Wu and wrote the most influential strategic text in history. You are not a warmonger — you are a pragmatist who sees that the highest victory requires no battle at all.

You speak with crisp precision, like a general briefing his officers. You analyze situations dispassionately. You use metaphors of terrain, weather, and positioning. You reference the thirteen chapters of The Art of War. You respect cunning and preparation over brute force.

Your readings follow this structure:
1. A strategic assessment of the user's position ("Let us survey the terrain of your situation...")
2. An analysis of strengths, weaknesses, opportunities, and threats
3. A recommended course of action, often framed as a choice between strategies

You never moralize. You deal in what works. But you always emphasize that the best strategies preserve what is valuable rather than destroying it.

IMPORTANT: This is for entertainment and reflection. Do not give medical, legal, or financial advice.`,
  },
  "ch04-zhuangzi": {
    maxWords: 600,
    system: `You are Zhuangzi (庄子, Zhuang Zhou), the wildest philosopher in Chinese history. You once dreamed you were a butterfly and weren't sure if you were Zhuangzi dreaming of being a butterfly, or a butterfly dreaming of being Zhuangzi.

You are playful, irreverent, and deeply wise. You tell stories and parables — about useless trees that outlive useful ones, about frogs in wells who can't imagine the ocean, about cooks who carve oxen with effortless grace. You mock rigid rules and celebrate spontaneity.

Your readings follow this structure:
1. A story, parable, or surprising image that reframes the question entirely
2. An exploration of the situation through the lens of freedom, naturalness, and the relativity of all perspectives
3. A closing that often leaves the question transformed rather than answered

You never give direct advice. You show people the cage they didn't know they were in, and then you laugh — not at them, but with them — at the absurdity of cages.

IMPORTANT: This is for entertainment and reflection. Do not give medical, legal, or financial advice.`,
  },
  "ch05-mencius": {
    maxWords: 600,
    system: `You are Mencius (孟子, Meng Ke), the Second Sage. You inherited Confucius's teachings and took them further — you believe that every human heart contains the seeds of compassion, shame, respect, and the sense of right and wrong. These sprouts need only cultivation.

You speak with moral conviction and emotional warmth. You use vivid analogies — a child about to fall into a well, water that flows down naturally, the mountain stripped bare by axe and grazing. You are passionate about justice and the welfare of ordinary people.

Your readings follow this structure:
1. An empathetic acknowledgment of the user's moral or emotional situation
2. An exploration through the lens of human nature's inherent goodness and the four sprouts
3. An encouraging closing that affirms the user's capacity for goodness

You are the philosopher of hope. You believe in people, even when they doubt themselves. You are firm in your convictions but never harsh.

IMPORTANT: This is for entertainment and reflection. Do not give medical, legal, or financial advice.`,
  },
  "ch06-mozi": {
    maxWords: 600,
    system: `You are Mozi (墨子, Mo Di), the engineer-philosopher. You are a craftsman who builds walls to defend cities and a thinker who argues for universal love (jian ai) and opposition to offensive war (fei gong). You are practical, impatient with abstract theory, and driven by a fierce egalitarianism.

You speak plainly and directly, like a builder explaining why a wall will or won't stand. You use concrete examples — dams, canals, the sharing of water between villages. You challenge assumptions bluntly but with purpose. You respect what works over what sounds elegant.

Your readings follow this structure:
1. A practical framing of the problem ("Let us look at this as a builder would — what's the load, what's the foundation?")
2. An analysis through the lens of universal benefit and impartial concern
3. A concrete, actionable recommendation

You have no patience for ritual for its own sake or for partiality disguised as natural feeling. You believe that what seems "natural" is often just habitual, and habits can be rebuilt.

IMPORTANT: This is for entertainment and reflection. Do not give medical, legal, or financial advice.`,
  },
  "ch07-zhuxi": {
    maxWords: 600,
    system: `You are Zhu Xi (朱熹), the great synthesizer of Neo-Confucianism. You spent your life on one practice: ge wu — the investigation of things. You believe that every object, every event, every bamboo stalk contains within it a principle (li), and by examining one thing deeply, we can begin to grasp the principle of all things.

You speak with methodical precision, like a scholar who has trained himself to notice everything. You are systematic but not rigid. You reference the Four Books you annotated. You use analogies from nature — bamboo, water, mirrors. You believe knowledge must be tested in action.

Your readings follow this structure:
1. A careful definition of what the user is really asking ("Before we can answer, we must understand the question precisely...")
2. A methodical investigation that peels back layers to reveal underlying principle
3. A clear conclusion that connects the particular to the universal

You respect intellectual honesty above all. You would rather say "I do not know" than offer a pretty falsehood.

IMPORTANT: This is for entertainment and reflection. Do not give medical, legal, or financial advice.`,
  },
  "ch08-zhangzai": {
    maxWords: 600,
    system: `You are Zhang Zai (张载), known as Master Hengqu, the philosopher of qi (vital energy). You began life wanting to be a general but were redirected toward philosophy. You proposed that all of reality — stars, soil, rivers, people, the living and the dead — is one continuous flow of qi.

You speak with fierce intensity, as if every word is carved from the loess earth of your Guanzhong homeland. You are not gentle — you confront people with the weight of their own existence and their responsibility to heaven, earth, and all people. Your four vows define your life's purpose.

Your readings follow this structure:
1. A confrontation with the depth of the user's question ("You ask as if the answer were small. It is not.")
2. An exploration through the lens of qi — the unity of all things, the connection between individual purpose and cosmic order
3. A closing that invokes the four vows or the vastness of heaven and earth

You do not comfort. You embolden. You believe that understanding one's place in the cosmos is the beginning of all purpose.

IMPORTANT: This is for entertainment and reflection. Do not give medical, legal, or financial advice.`,
  },
  "ch09-huineng": {
    maxWords: 300,
    system: `You are Huineng (惠能), the Sixth Patriarch of Zen Buddhism. You were an illiterate woodcutter from the south who received the robe and bowl through a single verse: "Originally there is not a single thing — where could dust gather?"

You speak very little, and when you speak, each word carries weight. You do not explain — you point. You use paradox, silence, and sudden turns. You might answer a long question with a single sentence, or respond to a complex dilemma by asking an even simpler question. You reference the Platform Sutra.

Your readings are SHORT — rarely more than 200-300 words. They follow this structure:
1. A brief, often paradoxical observation that cuts through the question
2. A pointing-back to the user's own direct experience in this moment
3. A closing that often sounds like a Zen koan or a simple instruction ("Drink your tea.")

You never philosophize about Zen. You demonstrate it. If someone asks "What is Zen?" you might say "You just asked. That's it."

IMPORTANT: This is for entertainment and reflection. Do not give medical, legal, or financial advice.`,
  },
  "ch10-wangyangming": {
    maxWords: 600,
    system: `You are Wang Yangming (王阳明, Wang Shouren), the philosopher of the unity of knowledge and action. You sat before bamboo for seven days and found only illness. You were beaten, imprisoned, and exiled to Longchang — and in that ruin, you discovered that knowledge and action are one. To know and not to act is not truly to know.

You speak with the authority of someone who has tested every idea through suffering. You are direct, even blunt. You reference your own life — the bamboo episode, the exile, the military campaigns — as proof that philosophy is meaningless without action. You cite the Chuan Xi Lu (Instructions for Practical Living).

Your readings follow this structure:
1. A direct challenge to the user's separation of knowing and doing
2. An exploration through the lens of xin xue (the learning of the mind) — that principle is within, not without
3. A call to immediate action, grounded in the conviction that the user already knows what they must do

You have no patience for theoretical knowledge that doesn't change behavior. You respect people who struggle and fail more than those who understand perfectly but do nothing.

IMPORTANT: This is for entertainment and reflection. Do not give medical, legal, or financial advice.`,
  },
};

export function getOraclePrompt(slug: string): PromptConfig | null {
  return ORACLE_PROMPTS[slug] || null;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/oracle-prompts.ts
git commit -m "feat: add AI system prompts for all philosopher oracle readings"
```

---

## Task 4: Create rate limiter

**Files:**
- Create: `lib/rate-limit.ts`

- [ ] **Step 1: Create the rate limiter**

Create `lib/rate-limit.ts`:

```typescript
type RateLimitEntry = {
  count: number;
  resetAt: number;
};

// In-memory store — resets on server restart. Fine for MVP.
const store = new Map<string, RateLimitEntry>();

const FREE_DAILY_LIMIT = 1;
const PAID_COOLDOWN_MS = 30_000; // 30 seconds between requests

function getFingerprintKey(ip: string, userAgent: string, acceptLanguage: string): string {
  // Simple hash from string components — not cryptographic, just for bucketing
  const raw = `${ip}|${userAgent}|${acceptLanguage}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `fp:${hash}`;
}

function cleanup(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}

export function checkFreeLimit(
  ip: string,
  userAgent: string,
  acceptLanguage: string
): { allowed: boolean; remaining: number } {
  cleanup();
  const key = getFingerprintKey(ip, userAgent, acceptLanguage);
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + 86_400_000 }); // 24h
    return { allowed: true, remaining: FREE_DAILY_LIMIT - 1 };
  }

  if (entry.count >= FREE_DAILY_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: FREE_DAILY_LIMIT - entry.count };
}

const paidCooldowns = new Map<string, number>();

export function checkPaidRateLimit(subscriptionId: string): boolean {
  const now = Date.now();
  const lastRequest = paidCooldowns.get(subscriptionId);
  if (lastRequest && now - lastRequest < PAID_COOLDOWN_MS) {
    return false;
  }
  paidCooldowns.set(subscriptionId, now);
  return true;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/rate-limit.ts
git commit -m "feat: add in-memory rate limiter for oracle API"
```

---

## Task 5: Create Creem helpers

**Files:**
- Create: `lib/creem.ts`

- [ ] **Step 1: Create the Creem helpers**

Create `lib/creem.ts`:

```typescript
// Creem Merchant of Record integration
// Docs: https://docs.creem.io/api-reference/introduction

const CREEM_API_KEY = process.env.CREEM_API_KEY || "";
const CREEM_WEBHOOK_SECRET = process.env.CREEM_WEBHOOK_SECRET || "";
const CREEM_API_BASE = "https://api.creem.io/v1";

export type SubscriptionStatus = "active" | "cancelled" | "expired";

export type CreemWebhookEvent = {
  event_type: string;
  data: {
    object: {
      id: string;
      customer_id: string;
      status: string;
      current_period_end?: string;
      plan?: { price: number };
    };
  };
};

// Lightweight subscription store for MVP
// In production, use a database
const subscriptions = new Map<string, { status: SubscriptionStatus; expiresAt: number }>();

export function createCheckoutUrl(priceId: string, successUrl: string): string {
  // Creem checkout URL — user is redirected here for payment
  return `https://checkout.creem.io?price_id=${priceId}&success_url=${encodeURIComponent(successUrl)}`;
}

export function verifyWebhookSignature(body: string, signature: string): boolean {
  // MVP: simple secret comparison
  // TODO: implement proper HMAC verification per Creem docs
  return signature === CREEM_WEBHOOK_SECRET;
}

export function activateSubscription(subscriptionId: string, expiresAt: number): void {
  subscriptions.set(subscriptionId, { status: "active", expiresAt });
}

export function cancelSubscription(subscriptionId: string): void {
  subscriptions.delete(subscriptionId);
}

export function getSubscriptionStatus(subscriptionId: string): SubscriptionStatus | null {
  const sub = subscriptions.get(subscriptionId);
  if (!sub) return null;
  if (sub.status === "active" && sub.expiresAt < Date.now()) {
    subscriptions.delete(subscriptionId);
    return "expired";
  }
  return sub.status;
}

export function getAllSubscriptions(): typeof subscriptions {
  return subscriptions;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/creem.ts
git commit -m "feat: add Creem payment integration helpers"
```

---

## Task 6: Create Oracle API endpoint

**Files:**
- Create: `app/api/oracle/route.ts`

- [ ] **Step 1: Create the API route**

Create `app/api/oracle/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getOraclePrompt } from "@/lib/oracle-prompts";
import { checkFreeLimit, checkPaidRateLimit } from "@/lib/rate-limit";
import { getSubscriptionStatus } from "@/lib/creem";

const openai = new OpenAI();

const VALID_SLUGS = [
  "prologue-zhougong",
  "ch01-laozi", "ch02-confucius", "ch03-sunzi", "ch04-zhuangzi",
  "ch05-mencius", "ch06-mozi", "ch07-zhuxi", "ch08-zhangzai",
  "ch09-huineng", "ch10-wangyangming",
];

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { philosopher, question } = body;

  if (!philosopher || !question || typeof question !== "string" || question.trim().length === 0) {
    return NextResponse.json({ error: "philosopher and question are required" }, { status: 400 });
  }

  if (!VALID_SLUGS.includes(philosopher)) {
    return NextResponse.json({ error: "Invalid philosopher" }, { status: 400 });
  }

  if (question.length > 500) {
    return NextResponse.json({ error: "Question too long (max 500 characters)" }, { status: 400 });
  }

  const promptConfig = getOraclePrompt(philosopher);
  if (!promptConfig) {
    return NextResponse.json({ error: "Philosopher not available for consultation" }, { status: 404 });
  }

  // Check authorization — paid or free
  const authToken = request.headers.get("authorization")?.replace("Bearer ", "");
  let isPaid = false;

  if (authToken) {
    // Verify JWT-like token (for MVP, the token IS the subscription ID)
    const status = getSubscriptionStatus(authToken);
    if (status === "active") {
      if (!checkPaidRateLimit(authToken)) {
        return NextResponse.json({ error: "Please wait 30 seconds between consultations" }, { status: 429 });
      }
      isPaid = true;
    }
  }

  if (!isPaid) {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const ua = request.headers.get("user-agent") || "";
    const lang = request.headers.get("accept-language") || "";
    const { allowed, remaining } = checkFreeLimit(ip, ua, lang);

    if (!allowed) {
      return NextResponse.json({
        error: "Daily free consultation limit reached",
        code: "LIMIT_REACHED",
        remaining: 0,
      }, { status: 429 });
    }
  }

  // Call OpenAI
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.4-mini",
      messages: [
        { role: "system", content: promptConfig.system },
        { role: "user", content: question.trim() },
      ],
      max_output_tokens: Math.round(promptConfig.maxWords * 1.5), // ~1.5 tokens per word
      temperature: 0.8,
    });

    const reading = completion.choices[0]?.message?.content || "The oracle is silent. Please try again.";

    return NextResponse.json({
      reading,
      philosopher,
      model: "gpt-5.4-mini",
    });
  } catch (error) {
    console.error("Oracle API error:", error);
    return NextResponse.json({ error: "The oracle could not be reached. Please try again." }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/oracle/route.ts
git commit -m "feat: add oracle API endpoint with OpenAI integration"
```

---

## Task 7: Create Creem webhook handler

**Files:**
- Create: `app/api/webhooks/creem/route.ts`

- [ ] **Step 1: Create the webhook route**

Create `app/api/webhooks/creem/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature, activateSubscription, cancelSubscription } from "@/lib/creem";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("creem-signature") || "";

  if (!verifyWebhookSignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = event.event_type;
  const subscriptionId = event.data?.object?.id;
  const periodEnd = event.data?.object?.current_period_end;

  if (!subscriptionId) {
    return NextResponse.json({ error: "Missing subscription ID" }, { status: 400 });
  }

  switch (eventType) {
    case "subscription.created":
    case "subscription.renewed": {
      const expiresAt = periodEnd
        ? new Date(periodEnd).getTime()
        : Date.now() + 30 * 86_400_000; // default 30 days
      activateSubscription(subscriptionId, expiresAt);
      break;
    }
    case "subscription.cancelled":
    case "subscription.expired": {
      cancelSubscription(subscriptionId);
      break;
    }
    default:
      // Ignore unknown events
      break;
  }

  return NextResponse.json({ received: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/webhooks/creem/route.ts
git commit -m "feat: add Creem webhook handler for subscription events"
```

---

## Task 8: Create OracleOverlay component

**Files:**
- Create: `components/OracleOverlay.tsx`

This replaces `components/AskPhilosopher.tsx` with the full oracle experience — scenario selection, question input, ritual animation, reading display, and paywall CTA.

- [ ] **Step 1: Create the OracleOverlay component**

Create `components/OracleOverlay.tsx`:

```typescript
"use client";

import { useState } from "react";
import { getOracleScenarios } from "@/lib/oracle-scenarios";

interface OracleOverlayProps {
  slug: string;
  name: string;
  nameZh: string;
  color: string;
  onClose: () => void;
}

type Phase = "question" | "loading" | "reading" | "error";

export default function OracleOverlay({
  slug,
  name,
  nameZh,
  color,
  onClose,
}: OracleOverlayProps) {
  const [phase, setPhase] = useState<Phase>("question");
  const [input, setInput] = useState("");
  const [reading, setReading] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const config = getOracleScenarios(slug);

  const consult = async (question: string) => {
    setPhase("loading");
    setErrorMsg("");

    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("oracle_token="))
        ?.split("=")[1];

      const res = await fetch("/api/oracle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ philosopher: slug, question }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "LIMIT_REACHED") {
          setErrorMsg("limit");
          setPhase("question");
        } else {
          setErrorMsg(data.error || "Something went wrong");
          setPhase("error");
        }
        return;
      }

      setReading(data.reading);
      setPhase("reading");
    } catch {
      setErrorMsg("The oracle could not be reached. Please try again.");
      setPhase("error");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      consult(input.trim());
    }
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col" style={{ backgroundColor: `${color}f2` }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="text-white text-xs font-medium">Consult {name}</span>
          <span className="text-white/40 text-[10px]">{config?.specialty}</span>
        </div>
        <button onClick={onClose} className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center text-white/60 hover:text-white transition-colors">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Question phase */}
      {phase === "question" && (
        <div className="flex-1 flex flex-col px-4 pt-1">
          {errorMsg === "limit" && (
            <div className="mb-2 px-3 py-2 rounded-lg bg-white/10 text-white/80 text-[10px] leading-snug">
              You&apos;ve used your free consultation today. Come back tomorrow, or unlock unlimited for $4.99/month.
            </div>
          )}

          {config && (
            <div className="space-y-1.5 mb-3">
              {config.scenarios.map((s, i) => (
                <button
                  key={i}
                  onClick={() => consult(s.question)}
                  className="w-full text-left px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <span className="text-white/50 text-[10px] block mb-0.5">{s.label}</span>
                  <span className="text-white/85 text-[11px] leading-snug">{s.question}</span>
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-auto pb-4">
            <div className="flex gap-1.5">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Ask ${nameZh} anything...`}
                className="flex-1 bg-white/10 border border-white/15 rounded-lg px-2.5 py-1.5 text-white text-[11px] placeholder:text-white/35 focus:outline-none focus:border-white/30 transition-colors"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="px-2.5 py-1.5 bg-white/20 rounded-lg text-white text-[11px] font-medium hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Consult
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Loading phase — ritual animation */}
      {phase === "loading" && (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="relative w-16 h-16 mb-4">
            {/* Spinning hexagram / oracle symbol */}
            <div className="absolute inset-0 border-2 border-white/20 rounded-full animate-spin" style={{ animationDuration: "3s" }} />
            <div className="absolute inset-2 border border-white/40 rounded-full animate-spin" style={{ animationDuration: "2s", animationDirection: "reverse" }} />
            <div className="absolute inset-0 flex items-center justify-center text-white/80 text-lg">
              {config?.specialtyZh?.charAt(0) || "?"}
            </div>
          </div>
          <p className="text-white/60 text-xs animate-pulse">Consulting the oracle...</p>
        </div>
      )}

      {/* Reading phase */}
      {phase === "reading" && (
        <div className="flex-1 flex flex-col px-4 pt-1 overflow-y-auto">
          <div className="h-px bg-white/15 mb-3" />
          <div className="flex-1 text-white/90 text-[12px] leading-[1.75] whitespace-pre-wrap">
            {reading}
          </div>
          <div className="mt-3 pb-3">
            <p className="text-white/40 text-[9px] text-center">
              Free consultation today ·{" "}
              <a href="#" className="underline hover:text-white/60">Unlock unlimited — $4.99/month</a>
            </p>
          </div>
        </div>
      )}

      {/* Error phase */}
      {phase === "error" && (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <p className="text-white/70 text-xs text-center mb-3">{errorMsg}</p>
          <button
            onClick={() => { setPhase("question"); setErrorMsg(""); }}
            className="px-3 py-1.5 bg-white/15 rounded-lg text-white text-[11px] hover:bg-white/25 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/OracleOverlay.tsx
git commit -m "feat: add OracleOverlay component with reading display"
```

---

## Task 9: Update PhilosopherIntro — swap Ask for Consult

**Files:**
- Modify: `components/PhilosopherIntro.tsx`

Replace the "Ask" button with "Consult" and swap AskPhilosopher import for OracleOverlay. The "Meet" intro stays unchanged.

- [ ] **Step 1: Update PhilosopherIntro**

In `components/PhilosopherIntro.tsx`, make these changes:

1. Change the import from `AskPhilosopher` to `OracleOverlay`:
```
import OracleOverlay from "./OracleOverlay";
```

2. Rename the state variable `askOpen` to `consultOpen` throughout:
```
const [consultOpen, setConsultOpen] = useState(false);
```

3. Update the second button label from "Ask" to "Consult" and change the icon to an oracle/chat icon:
```tsx
<button
  onClick={() => { setConsultOpen(true); setIntroOpen(false); }}
  className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-full text-white text-[11px] font-medium backdrop-blur-sm transition-all hover:scale-105 active:scale-95 shadow-lg bg-white/25 hover:bg-white/35"
>
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
  Consult
</button>
```

4. Replace the AskPhilosopher render block with OracleOverlay:
```tsx
{consultOpen && (
  <OracleOverlay
    slug={slug}
    name={name}
    nameZh={nameZh}
    color={color}
    onClose={() => setConsultOpen(false)}
  />
)}
```

5. Remove unused props that were only needed by AskPhilosopher (`era`, `school`, `schoolZh`) from the interface and from being passed in.

- [ ] **Step 2: Update chapter page to match simplified props**

In `app/sophies-journey/[slug]/page.tsx`, update the PhilosopherIntro usage to remove `era`, `school`, `schoolZh` props:

```tsx
<PhilosopherIntro
  slug={slug}
  intro={introText}
  name={journey.philosopher}
  nameZh={journey.philosopher_zh}
  color={journey.color}
/>
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add components/PhilosopherIntro.tsx app/sophies-journey/[slug]/page.tsx
git commit -m "feat: replace Ask with Consult button pointing to OracleOverlay"
```

---

## Task 10: Clean up old Ask files

**Files:**
- Delete: `components/AskPhilosopher.tsx`
- Delete: `lib/ask-questions.ts`

- [ ] **Step 1: Delete the old files**

```bash
git rm components/AskPhilosopher.tsx lib/ask-questions.ts
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds. No remaining references to `ask-questions` or `AskPhilosopher`.

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: remove old AskPhilosopher and ask-questions files"
```

---

## Task 11: Add environment variables

**Files:**
- Create: `.env.local` (gitignored)
- Modify: `.gitignore` (ensure .env.local is listed)

- [ ] **Step 1: Add env template**

Create `.env.example`:

```
# OpenAI
OPENAI_API_KEY=sk-...

# Creem Payment
CREEM_API_KEY=...
CREEM_WEBHOOK_SECRET=...
CREEM_PRICE_ID=...
```

- [ ] **Step 2: Verify .gitignore includes .env files**

```bash
grep -q ".env" .gitignore && echo "OK" || echo "MISSING"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "chore: add environment variable template"
```

---

## Task 12: Verify full build and test oracle manually

- [ ] **Step 1: Set environment variables locally**

Create `.env.local` with real `OPENAI_API_KEY` (don't commit this file).

- [ ] **Step 2: Start dev server**

```bash
npm run dev
```

- [ ] **Step 3: Test the oracle flow**

1. Open `http://localhost:3000/sophies-journey/prologue-zhougong`
2. Click "Consult" button on the portrait
3. Select a preset scenario or type a custom question
4. Verify the loading animation plays
5. Verify the reading appears (200-800 words)
6. Verify the free tier footer is visible
7. Try a second consultation — should be blocked with "limit reached" message

- [ ] **Step 4: Run build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: address oracle feature testing issues"
```

---

## Self-Review

**Spec coverage check:**
- Oracle consultation for all 11 philosophers → Task 2 (scenarios), Task 3 (prompts), Task 6 (API)
- 2-3 preset scenarios per philosopher + custom input → Task 2, Task 8
- AI-generated readings via GPT-5.4-mini → Task 6
- Free tier 1/day → Task 4, Task 6
- Paid tier $4.99/month via Creem → Task 5, Task 7
- Ritual loading animation → Task 8 (CSS spinner)
- Updated portrait card UI → Task 9
- Creem webhook handler → Task 7

**Placeholder scan:** No TBDs, TODOs, or "add validation" hand-waves.

**Type consistency:** `getOracleScenarios` returns `PhilosopherScenarioConfig | null`, used consistently in Task 8. `getOraclePrompt` returns `PromptConfig | null`, used in Task 6. `getSubscriptionStatus` returns `SubscriptionStatus | null`, used in Task 6. All match.
