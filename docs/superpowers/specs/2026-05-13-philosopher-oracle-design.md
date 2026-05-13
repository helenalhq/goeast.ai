# Philosopher Oracle — Paid Consultation Feature Design

**Date:** 2026-05-13
**Status:** Approved for implementation
**Scope:** MVP (V1)

## Overview

Add a paid "Oracle Consultation" feature to GoEast.ai's Sophie's Journey story pages. Users consult AI-powered philosopher characters for personalized guidance — I Ching divination with Zhou Gong, strategic analysis with Sunzi, dream interpretation with Zhuangzi, and more. Each consultation is a single-shot, deep reading (200-800 words), not an open-ended chat.

**Target user:** English-speaking foreigners curious about Chinese culture and philosophy.
**Revenue model:** Freemium — 1 free consultation per day, $4.99/month for unlimited.

## User Flow

1. User visits a philosopher's story page (e.g., `/sophies-journey/prologue-zhougong`)
2. Portrait card shows a "Consult" button (replaces current "Ask" button)
3. Clicking opens an overlay with 2-3 preset scenario chips + custom question input
4. User selects a scenario or types a custom question
5. A brief "ritual" loading animation plays (hexagram forming, yarrow stalks falling, etc.)
6. AI-generated reading appears (200-800 words depending on question depth and character)
7. Footer shows: "Free consultation today. Come back tomorrow, or unlock unlimited for $4.99/month"
8. After reading, user can share (future), try another philosopher, or subscribe

## Philosopher Specialties & Preset Scenarios

| Philosopher | Specialty | Preset Scenarios |
|-------------|-----------|-----------------|
| Zhou Gong | I Ching Divination | "What does the oracle say about my path?" / "Cast a hexagram for my situation" / "I face a crossroads — read the signs" |
| Laozi | The Way of Water | "I feel stuck. How do I find flow?" / "Help me see what I'm forcing" / "What would water do?" |
| Confucius | The Right Action | "What is the right thing to do?" / "How should I handle this relationship?" / "What does duty demand of me?" |
| Sunzi | Strategic Mind | "Analyze my competition" / "What is my best move right now?" / "How do I win without fighting?" |
| Zhuangzi | Dream Reading | "Interpret my dream" / "Help me see from a different perspective" / "Am I the butterfly or the dreamer?" |
| Mencius | The Heart's Compass | "I saw someone suffer and couldn't act. Why?" / "Is human nature really good?" / "How do I cultivate compassion?" |
| Mozi | The Builder's Logic | "How do I resolve this conflict fairly?" / "Why should I care about strangers?" / "Build me a practical solution" |
| Zhu Xi | The Principle Seeker | "Help me understand what's really going on" / "Investigate this situation for me" / "What principle am I missing?" |
| Zhang Zai | The Great Purpose | "What should I dedicate my life to?" / "Am I aligned with heaven and earth?" / "What is my responsibility?" |
| Huineng | The Clear Mind | "My mind is too noisy. Help me find stillness" / "What am I clinging to?" / "Point directly to my heart" |
| Wang Yangming | Knowledge in Action | "I know what's right but I can't act. Why?" / "Close the gap between knowing and doing" / "What is my mind hiding from me?" |

## Technical Architecture

### Backend

```
Browser → POST /api/oracle → OpenAI GPT-5.4-mini → Reading response
```

**Single API route**, no database for conversation history (stateless oracle model).

### API Route Design

```
POST /api/oracle
Headers: Authorization: Bearer <token> (if paid user)
Body: {
  philosopher: string,    // slug: "prologue-zhougong", "ch01-laozi", etc.
  question: string,       // user's question or selected scenario
  scenario?: string       // optional preset scenario label
}
Response: {
  reading: string,        // AI-generated oracle reading (200-800 words)
  philosopher: string,    // philosopher name echoed back
  model: string           // "gpt-5.4-mini"
}
```

### AI Model Configuration

**Default model:** GPT-5.4-mini ($0.75/1M input, $4.50/1M output, $0.075/1M cached)

**Per-request cost estimate:**
- Cached system prompt: ~1000 tokens → $0.000075
- User input: ~100 tokens → $0.000075
- AI output: ~800 tokens avg → $0.0036
- **Total per request: ~$0.004**

**Prompt engineering:**
- Each philosopher has a dedicated system prompt (~800-1000 tokens) covering:
  - Identity and era
  - Philosophical views and key teachings
  - Speaking style and personality (matching story voice)
  - Key quotes and source texts to reference
  - Output length guidance (short for Huineng, long for Zhou Gong)
  - Safety boundaries (no medical/legal/financial advice disclaimed as entertainment)
- System prompts are cached (prompt caching enabled) to minimize input costs
- All readings include: ritual opening + core interpretation + closing philosophical quote

### Cost & Margin

| Metric | Value |
|--------|-------|
| Price | $4.99/month unlimited |
| Est. usage | 5 readings/day avg for paid user |
| Monthly cost per paid user | ~$0.60 |
| **Gross margin** | **~88%** |

### Rate Limiting & Abuse Prevention

- **Free users:** 1 consultation per day, enforced via IP + browser fingerprint (no account required)
- **Paid users:** Unlimited, but rate-limited to 1 request per 30 seconds
- **Fingerprint approach:** Store daily count in a server-side cache keyed by hashed (IP + User-Agent + accept-language), TTL 24h
- MVP does not require user accounts — Creem handles subscription identity

## Monetization

### Pricing Tiers

| Tier | Price | Included |
|------|-------|----------|
| Free | $0 | 1 consultation per day, all philosophers |
| Unlimited | $4.99/month | Unlimited consultations + longer/deeper readings + 3-day free trial |

### Payment Integration — Creem

[Creem](https://docs.creem.io/api-reference/introduction) is a Merchant of Record platform that handles payments, subscriptions, tax compliance, and chargebacks globally.

**Integration flow:**
1. "Unlock Unlimited" button in the reading overlay links to a Creem Checkout session
2. User completes payment on Creem's hosted checkout page
3. Creem redirects user back to a `/api/oracle/activate?session_id=xxx` callback route
4. Server calls Creem API to verify the session, then sets a signed JWT in an HTTP-only cookie (containing: subscription ID, plan, expiry timestamp, signed with server secret)
5. Creem also sends a webhook to `/api/webhooks/creem` for server-side subscription tracking
6. Subsequent `/api/oracle` requests include the cookie; server validates the JWT signature and expiry
7. Creem handles renewal, cancellation, and refunds via webhooks — server updates a lightweight subscription store (JSON file or KV, not a full database for MVP)

**Why Creem over Stripe:**
- Merchant of Record — handles global tax compliance automatically
- Simpler integration for出海 (international) products
- No need to register business entities in multiple countries
- Built-in chargeback protection

**Webhook events to handle:**
- `subscription.created` — activate user
- `subscription.renewed` — extend access
- `subscription.cancelled` — revoke access
- `subscription.expired` — revoke access

## Ritual Animation

A brief loading animation (2-3 seconds) between question submission and reading display. Creates a sense of ceremony and perceived value.

- **Zhou Gong:** Yarrow stalks falling into a hexagram pattern
- **Daoist philosophers (Laozi, Zhuangzi):** Water ripple / butterfly wing animation
- **Confucian philosophers:** Bamboo scroll unfurling
- **Sunzi:** Chess piece (weiqi stone) being placed on a board
- **Zen/Buddhist (Huineng):** Ink circle (ensō) being drawn
- **Neo-Confucian (Zhu Xi, Zhang Zai):** Compass/cosmic diagram forming
- **Wang Yangming:** Flame igniting

Implementation: CSS animations or lightweight Lottie, not video.

## MVP Scope (V1)

### Included
- Oracle consultation for all 11 philosophers
- 2-3 preset scenarios per philosopher + custom question input
- AI-generated readings via GPT-5.4-mini
- Free tier: 1/day with IP+fingerprint gating
- Paid tier: $4.99/month via Creem
- Ritual loading animation
- Request logging (count only, no content stored)
- Updated portrait card UI (replace current "Ask" with "Consult" + overlay)

### Not Included (future iterations)
- Conversation history / multi-turn chat
- User account system (anonymous MVP)
- Social sharing (screenshot export)
- Mobile native app
- Multi-language support (English only)
- Premium tier ($14.99 with annual reports, PDF exports)
- Referral program

## File Structure (Expected)

```
app/api/oracle/route.ts          — Oracle API endpoint
app/api/webhooks/creem/route.ts  — Creem webhook handler
lib/oracle-prompts.ts             — System prompts per philosopher
lib/oracle-scenarios.ts           — Preset scenarios per philosopher
lib/creem.ts                      — Creem API helpers
lib/rate-limit.ts                 — Free user rate limiting
components/OracleOverlay.tsx      — Consultation overlay UI
components/OracleReading.tsx      — Reading display with animation
components/ConsultButton.tsx      — Portrait card "Consult" button
```

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Users bypass paywall by clearing cookies | Fingerprint + IP gating is "good enough" for MVP, not fortress security |
| AI outputs inappropriate content (medical/legal advice) | System prompt guardrails + output filtering + "for entertainment" disclaimer |
| Low conversion rate (<1%) | Start with free daily reading to build habit; $4.99 impulse-price point |
| GPT-5.4-mini quality insufficient for philosophical depth | Test with real prompts first; can upgrade individual philosophers to GPT-5.4 standard if needed |
| High API costs from power users | Rate limiting (1 req/30s) + Creem subscription covers cost |
