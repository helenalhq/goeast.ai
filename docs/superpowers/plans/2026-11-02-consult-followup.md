# Consult Follow-up Q&A (继续讨论这次解读) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Users can ask follow-up questions about a saved I Ching report — same cast, turns persisted append-only, shared daily quota, refresh/reopen-safe, cross-account blocked server-side.

**Architecture:** New `consult_followups` table (append-only, RLS owner-only) + `/api/consult/followup` (POST streams an answer grounded in the DB-loaded original report, inserts the turn in the same request; GET lists turns) + a `FollowupSection` component inside the existing result page. All grounding (question/cast/reading/turns) is read server-side; the client supplies only `sessionId` + question text.

**Tech Stack:** Next.js 16 App Router route handlers, Supabase (RLS + service-role refund), OpenAI SSE streaming, React 19 + Tailwind, vitest (+jsdom), Playwright acceptance script.

**Spec:** `docs/2026-11-02-consult-followup-design.md` (approved). Work branch: `feat/consult-followup` (cut from `develop`).

**Conventions:**
- Run tests: `npx vitest run <file>` (repo `npm run test` runs all).
- Commit after every green step; messages match repo style (`feat(scope): …`).
- Owner-applied migration checkpoint is Task 8 — DO NOT apply SQL yourself.
- Quota note: local `next dev` does NOT enforce free-tier quota; quota/refund e2e uses `npm run build && npm start` (NODE_ENV=production), as in Task 3B.

---

### Task 1: Migration SQL (owner applies later)

**Files:**
- Create: `supabase/migrations/006_create_consult_followups.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/006_create_consult_followups.sql
-- 追问记录表（append-only）：每轮追问一行，RLS 仅本人可读/插入。
-- 原报告表 consult_results 零改动 —— “不覆盖原报告”由结构保证。
-- 在 Supabase Dashboard SQL 编辑器执行；底部有完整回滚 SQL。

CREATE TABLE consult_followups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES consult_results(session_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  turn_index INTEGER NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consult_followups_session ON consult_followups(session_id, turn_index);

ALTER TABLE consult_followups ENABLE ROW LEVEL SECURITY;

-- 仅本人可读
CREATE POLICY "Users can read own followups"
  ON consult_followups FOR SELECT
  USING (auth.uid() = user_id);

-- 仅本人可插入；且 session 必须属于本人（纵深防御，API 层已校验归属）
-- 无 UPDATE、无 DELETE 策略 → append-only
CREATE POLICY "Users can insert own followups"
  ON consult_followups FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM consult_results cr
      WHERE cr.session_id = session_id AND cr.user_id = auth.uid()
    )
  );

-- ============================================================
-- 回滚 SQL（如需撤销本迁移，整段执行）
-- ============================================================
-- DROP POLICY IF EXISTS "Users can insert own followups" ON consult_followups;
-- DROP POLICY IF EXISTS "Users can read own followups" ON consult_followups;
-- DROP TABLE IF EXISTS consult_followups;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/006_create_consult_followups.sql
git commit -m "feat(followup): 006 migration — append-only consult_followups table (owner applies via dashboard)"
```

---

### Task 2: `lib/consult-followup.ts` — constants, validation, grounding builder (TDD)

**Files:**
- Test: `lib/__tests__/consult-followup.test.ts`
- Create: `lib/consult-followup.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/consult-followup.test.ts
import { describe, expect, it } from "vitest";
import {
  FOLLOWUP_TURN_LIMIT,
  FOLLOWUP_CONTEXT_TURNS,
  FOLLOWUP_QUESTION_MAX_CHARS,
  FOLLOWUP_MAX_WORDS,
  validateFollowupQuestion,
  buildFollowupGrounding,
  buildFollowupCastBlock,
} from "../consult-followup";

const CAST = { mode: "cast" as const, hexagramNumber: 1, changingLines: [1], transformedNumber: 44 };

describe("constants", () => {
  it("matches the approved design", () => {
    expect(FOLLOWUP_TURN_LIMIT).toBe(20);
    expect(FOLLOWUP_CONTEXT_TURNS).toBe(8);
    expect(FOLLOWUP_QUESTION_MAX_CHARS).toBe(500);
    expect(FOLLOWUP_MAX_WORDS).toBe(400);
  });
});

describe("validateFollowupQuestion", () => {
  it("trims and accepts normal questions", () => {
    expect(validateFollowupQuestion("  why? ")).toBe("why?");
  });
  it("rejects non-strings, empty, and >500 chars", () => {
    expect(validateFollowupQuestion(42)).toBeNull();
    expect(validateFollowupQuestion("   ")).toBeNull();
    expect(validateFollowupQuestion("x".repeat(501))).toBeNull();
    expect(validateFollowupQuestion("x".repeat(500))).toBe("x".repeat(500));
  });
});

describe("buildFollowupCastBlock", () => {
  it("renders server-resolved names, changing line, and the anti-recast override", () => {
    const block = buildFollowupCastBlock(CAST);
    expect(block).toContain("Hexagram 1");
    expect(block).toContain("Qian");
    expect(block).toContain("Hexagram 44");
    expect(block).toContain("never cast");
  });
  it("accepts a static cast without a transformed hexagram", () => {
    const block = buildFollowupCastBlock({ mode: "cast", hexagramNumber: 2, changingLines: [] });
    expect(block).toContain("static");
  });
});

describe("buildFollowupGrounding", () => {
  const turns = Array.from({ length: 10 }, (_, i) => ({
    question: `Q${i}`,
    answer: `A${i}`,
  }));

  it("embeds original question, reading, cast block, and the guardrails", () => {
    const g = buildFollowupGrounding({
      originalQuestion: "about my career",
      cast: CAST,
      originalReading: "TRADITIONAL TEACHING … the full original text",
      turns,
    });
    expect(g).toContain("about my career");
    expect(g).toContain("the full original text");
    expect(g).toContain("never cast");
    expect(g).toContain("interpretation");        // no fake classical quotes rule
    expect(g).toContain("no deterministic predictions");
    expect(g).toContain("no medical, legal, or financial advice");
    expect(g).toContain(`${FOLLOWUP_MAX_WORDS} words`);
  });

  it("keeps only the most recent FOLLOWUP_CONTEXT_TURNS turns", () => {
    const g = buildFollowupGrounding({
      originalQuestion: "q",
      cast: CAST,
      originalReading: "r",
      turns,
    });
    expect(g).toContain("Q9");
    expect(g).not.toContain("Q0");
    expect(g).not.toContain("Q1");
  });

  it("omits the turns block entirely when there are no prior turns", () => {
    const g = buildFollowupGrounding({ originalQuestion: "q", cast: CAST, originalReading: "r", turns: [] });
    expect(g).not.toContain("earlier turns");
  });
});
```

- [ ] **Step 2: Run it — expect FAIL (module missing)**

Run: `npx vitest run lib/__tests__/consult-followup.test.ts`
Expected: FAIL — cannot resolve `../consult-followup`.

- [ ] **Step 3: Implement `lib/consult-followup.ts`**

```ts
/**
 * Follow-up Q&A on a saved consultation (继续讨论这次解读).
 * Pure helpers — the API route owns all DB access. Grounding is assembled
 * from server-loaded data only; the client never sends cast or history.
 */

import { getHexagramByNumber } from "./iching-data";
import type { IchingConsultationContext } from "./iching-context";

export const FOLLOWUP_TURN_LIMIT = 20; // per report, lifetime, not tiered
export const FOLLOWUP_CONTEXT_TURNS = 8; // recent turns fed to the model
export const FOLLOWUP_QUESTION_MAX_CHARS = 500; // same as initial question
export const FOLLOWUP_MAX_WORDS = 400; // shorter than the initial 800

export type FollowupTurn = {
  id: string;
  question: string;
  answer: string;
  turnIndex: number;
  createdAt: string;
};

/** Trim + bound a follow-up question. Null when unusable. */
export function validateFollowupQuestion(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const q = raw.trim();
  if (q.length === 0 || q.length > FOLLOWUP_QUESTION_MAX_CHARS) return null;
  return q;
}

/**
 * Cast facts for follow-ups. Sibling of buildIchingContextBlock, but without
 * the initial reading's three-part structure mandate — follow-ups are
 * conversational. Names resolve from our data, never from client input.
 */
export function buildFollowupCastBlock(ctx: IchingConsultationContext): string {
  const hexagram = getHexagramByNumber(ctx.hexagramNumber);
  if (!hexagram) return "";
  const transformed = ctx.transformedNumber !== undefined ? getHexagramByNumber(ctx.transformedNumber) : null;
  const lines = ctx.changingLines.length > 0 ? ctx.changingLines.join(", ") : "none — the cast is static";
  const transformedPart = transformed
    ? `\n- Transformed hexagram (之卦): Hexagram ${transformed.number} ${transformed.name} (${transformed.name_zh})`
    : "";
  return `

OVERRIDE: the recorded cast below is authoritative — never cast a new hexagram, never introduce a different one.
RECORDED CAST (from the original consultation; do not recalculate):
- Hexagram (本卦): Hexagram ${hexagram.number} ${hexagram.name} (${hexagram.name_zh})
- Changing lines (变爻): ${lines}${transformedPart}`;
}

/**
 * System-prompt suffix grounding a follow-up turn: original question, the
 * recorded cast, the full original reading, recent turns, and guardrails.
 */
export function buildFollowupGrounding(input: {
  originalQuestion: string;
  cast: IchingConsultationContext;
  originalReading: string;
  turns: Pick<FollowupTurn, "question" | "answer">[];
}): string {
  const recent = input.turns.slice(-FOLLOWUP_CONTEXT_TURNS);
  const history = recent.map((t) => `Seeker: ${t.question}\nZhou Gong: ${t.answer}`).join("\n---\n");
  return (
    buildFollowupCastBlock(input.cast) +

    `

FOLLOW-UP CONSULTATION — CONTINUING AN EXISTING READING (context from our records):
- The seeker already received the reading below and is asking follow-up questions about it.
- Original question: ${input.originalQuestion}
- Original reading (already delivered):
<original reading>
${input.originalReading}
</original reading>` +
    (recent.length > 0
      ? `

- Earlier follow-up turns in this conversation (oldest first):
<earlier turns>
${history}
</earlier turns>`
      : "") +
    `

RULES FOR THIS FOLLOW-UP (in addition to the cast OVERRIDE above):
1. This is the SAME cast and the SAME reading. Never cast, choose, introduce, or accept a new hexagram — answer from the recorded cast only.
2. Quote classical text ONLY when it appears above. Anything else (e.g., line statements) must be presented as YOUR interpretation ("my reading of Line N is…"), never as a quotation.
3. Explanation and reflection only: no deterministic predictions, no promises about outcomes, no invented details about the seeker's life, no pressure of any kind.
4. Keep the answer under ${FOLLOWUP_MAX_WORDS} words. Conversational; section headers are not required.
5. This is for entertainment and reflection; no medical, legal, or financial advice.`
  );
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `npx vitest run lib/__tests__/consult-followup.test.ts`
Expected: PASS (all).

- [ ] **Step 5: Commit**

```bash
git add lib/consult-followup.ts lib/__tests__/consult-followup.test.ts
git commit -m "feat(followup): grounding builder + question validation (same-cast rules, 8-turn context, 20-turn cap constants)"
```

---

### Task 3: Analytics event names

**Files:**
- Modify: `lib/analytics.ts` (union `AnalyticsEvent`)

- [ ] **Step 1: Add the three events**

In `lib/analytics.ts`, extend the union after `"consult_result_restored"`:

```ts
  | "consult_result_saved"
  | "consult_result_restored"
  | "consult_followup_started"
  | "consult_followup_completed"
  | "consult_followup_failed";
```

(Keep the existing members; the three new ones slot in after `consult_result_restored`.)

- [ ] **Step 2: Verify suite still green**

Run: `npx vitest run lib/__tests__/analytics.test.ts`
Expected: PASS (11 tests — no behavior change, type-only).

- [ ] **Step 3: Commit**

```bash
git add lib/analytics.ts
git commit -m "feat(followup): consult_followup_started/completed/failed analytics events"
```

---

### Task 4: `/api/consult/followup` route (TDD)

**Files:**
- Test: `lib/__tests__/followup-route.test.ts`
- Create: `app/api/consult/followup/route.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/followup-route.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const { getUser, fromDb, checkUsage, refund, createCompletion } = vi.hoisted(() => ({
  getUser: vi.fn(),
  fromDb: vi.fn(),
  checkUsage: vi.fn(),
  refund: vi.fn(),
  createCompletion: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser }, from: fromDb }),
}));
vi.mock("@/lib/creem", () => ({
  hasActiveProEntitlement: async () => false,
}));
vi.mock("@/lib/rate-limit", () => ({
  FREE_TIER_LIMIT: 3,
  PRO_TIER_LIMIT: 10,
  checkAndIncrementUsage: checkUsage,
  refundUsage: refund,
}));
vi.mock("openai", () => {
  class FakeOpenAI {
    chat = { completions: { create: createCompletion } };
  }
  return { default: FakeOpenAI };
});

import { POST, GET } from "../../app/api/consult/followup/route";

const GOOD_CAST = { mode: "cast", hexagramNumber: 1, changingLines: [1], transformedNumber: 44 };

/** Chainable table mock. state.report is what maybeSingle() returns for
 *  consult_results; state.turns for consult_followups; state.insertError
 *  makes the followup insert resolve to { error: ... }. */
function tableMock(state: { report?: unknown; turns?: unknown[]; turnError?: unknown; insertError?: unknown }) {
  return (name: string) => {
    if (name === "consult_results") {
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.maybeSingle = async () => ({ data: state.report ?? null });
      return chain;
    }
    if (name === "consult_followups") {
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.order = async () => ({ data: state.turns ?? [], error: state.turnError ?? null });
      chain.insert = async () => ({ error: state.insertError ?? null });
      return chain;
    }
    throw new Error("unexpected table " + name);
  };
}

function req(body: unknown) {
  return new Request("http://localhost/api/consult/followup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

function sseChunks(text: string) {
  return {
    async *[Symbol.asyncIterator]() {
      yield { choices: [{ delta: { content: text } }] };
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
  fromDb.mockImplementation(tableMock({ report: { session_id: "s1", user_id: "u1", question: "orig q", cast_data: GOOD_CAST, ai_response: "orig reading" } }));
  checkUsage.mockResolvedValue({ allowed: true, remaining: 2, currentCount: 1 });
  refund.mockResolvedValue({ refunded: true });
  createCompletion.mockResolvedValue(sseChunks("a thoughtful answer"));
});

async function readSse(res: Response): Promise<{ full: string; saveFailed: boolean }> {
  const text = await res.text();
  let full = "";
  let saveFailed = false;
  for (const line of text.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    const payload = line.slice(6).trim();
    if (payload === "[DONE]") continue;
    try {
      const parsed = JSON.parse(payload);
      if (parsed.content) full += parsed.content;
      if (parsed.saveFailed) saveFailed = true;
    } catch { /* skip */ }
  }
  return { full, saveFailed };
}

describe("POST validation matrix (model never called)", () => {
  it("logged-out → 401 LOGIN_REQUIRED", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(req({ sessionId: "s1", question: "why?" }));
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ code: "LOGIN_REQUIRED" });
    expect(createCompletion).not.toHaveBeenCalled();
  });

  it("missing/invalid question → 400", async () => {
    expect((await POST(req({ sessionId: "s1", question: "" }))).status).toBe(400);
    expect((await POST(req({ sessionId: "s1", question: 5 }))).status).toBe(400);
    expect((await POST(req({ question: "why?" }))).status).toBe(400);
    expect(createCompletion).not.toHaveBeenCalled();
  });

  it("report not found OR owned by someone else → 404 (same response, no existence leak)", async () => {
    fromDb.mockImplementation(tableMock({ report: null }));
    const res = await POST(req({ sessionId: "someone-elses", question: "why?" }));
    expect(res.status).toBe(404);
    expect(createCompletion).not.toHaveBeenCalled();
  });

  it("cast_data missing/malformed → 422 REPORT_DATA_MISSING, model not called", async () => {
    fromDb.mockImplementation(tableMock({ report: { session_id: "s1", user_id: "u1", question: "q", cast_data: {}, ai_response: "r" } }));
    const res = await POST(req({ sessionId: "s1", question: "why?" }));
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ code: "REPORT_DATA_MISSING" });
    expect(createCompletion).not.toHaveBeenCalled();
  });

  it("20 existing turns → 429 FOLLOWUP_LIMIT_REACHED before charging", async () => {
    fromDb.mockImplementation(tableMock({
      report: { session_id: "s1", user_id: "u1", question: "q", cast_data: GOOD_CAST, ai_response: "r" },
      turns: Array.from({ length: 20 }, (_, i) => ({ id: String(i), question: "q", answer: "a", turn_index: i + 1, created_at: "2026-01-01" })),
    }));
    const res = await POST(req({ sessionId: "s1", question: "why?" }));
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ code: "FOLLOWUP_LIMIT_REACHED" });
    expect(checkUsage).not.toHaveBeenCalled();
    expect(createCompletion).not.toHaveBeenCalled();
  });

  it("daily quota exhausted → 429 LIMIT_REACHED, no turn inserted", async () => {
    checkUsage.mockResolvedValue({ allowed: false, remaining: 0, currentCount: 3 });
    const res = await POST(req({ sessionId: "s1", question: "why?" }));
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ code: "LIMIT_REACHED" });
    expect(createCompletion).not.toHaveBeenCalled();
  });

  it("turn list DB error → 503 SERVICE_ERROR", async () => {
    fromDb.mockImplementation(tableMock({
      report: { session_id: "s1", user_id: "u1", question: "q", cast_data: GOOD_CAST, ai_response: "r" },
      turnError: { message: "boom" },
    }));
    const res = await POST(req({ sessionId: "s1", question: "why?" }));
    expect(res.status).toBe(503);
    expect(createCompletion).not.toHaveBeenCalled();
  });
});

describe("POST happy path + grounding", () => {
  it("streams the answer, grounds in the DB report, inserts the turn", async () => {
    fromDb.mockImplementation(tableMock({
      report: { session_id: "s1", user_id: "u1", question: "orig q", cast_data: GOOD_CAST, ai_response: "orig reading" },
      turns: [{ id: "t1", question: "q1", answer: "a1", turn_index: 1, created_at: "2026-01-01" }],
    }));
    const res = await POST(req({ sessionId: "s1", question: "what about line 1?" }));
    expect(res.status).toBe(200);
    const { full, saveFailed } = await readSse(res);
    expect(full).toBe("a thoughtful answer");
    expect(saveFailed).toBe(false);

    const call = createCompletion.mock.calls[0][0];
    const system = call.messages[0].content as string;
    expect(system).toContain("orig q");
    expect(system).toContain("orig reading");
    expect(system).toContain("q1"); // prior turn present
    expect(system).toContain("never cast a new hexagram");
    expect(system).toContain("no deterministic predictions");
    expect(call.messages[1].content).toBe("what about line 1?");
    expect(call.max_completion_tokens).toBe(600); // 400 words × 1.5

    // turn inserted via table mock's insert()
    expect(fromDb).toHaveBeenCalledWith("consult_followups");
    expect(refund).not.toHaveBeenCalled();
  });
});

describe("POST failure handling", () => {
  it("model create() throws → refund charged, 500, no insert", async () => {
    createCompletion.mockRejectedValue(new Error("azure down"));
    const res = await POST(req({ sessionId: "s1", question: "why?" }));
    expect(res.status).toBe(500);
    expect(refund).toHaveBeenCalledWith("u1");
  });

  it("empty model stream → refund, no insert, client sees no content", async () => {
    createCompletion.mockResolvedValue(sseChunks(""));
    const res = await POST(req({ sessionId: "s1", question: "why?" }));
    expect(res.status).toBe(200);
    const { full } = await readSse(res);
    expect(full).toBe("");
    expect(refund).toHaveBeenCalledWith("u1");
  });

  it("INSERT fails after a full stream → saveFailed marker, NO refund (content delivered)", async () => {
    fromDb.mockImplementation(tableMock({
      report: { session_id: "s1", user_id: "u1", question: "q", cast_data: GOOD_CAST, ai_response: "r" },
      insertError: { message: "table missing" },
    }));
    const res = await POST(req({ sessionId: "s1", question: "why?" }));
    expect(res.status).toBe(200);
    const { full, saveFailed } = await readSse(res);
    expect(full).toBe("a thoughtful answer");
    expect(saveFailed).toBe(true);
    expect(refund).not.toHaveBeenCalled();
  });
});

describe("GET", () => {
  it("lists turns for the owner and reports the cap", async () => {
    fromDb.mockImplementation(tableMock({
      report: { session_id: "s1", user_id: "u1", question: "q", cast_data: GOOD_CAST, ai_response: "r" },
      turns: [{ id: "t1", question: "q1", answer: "a1", turn_index: 1, created_at: "2026-01-01" }],
    }));
    const res = await GET(new Request("http://localhost/api/consult/followup?session_id=s1") as unknown as NextRequest);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.followups).toHaveLength(1);
    expect(json.followups[0]).toMatchObject({ id: "t1", turnIndex: 1 });
    expect(json.count).toBe(1);
    expect(json.limitReached).toBe(false);
  });

  it("other user's report → 404", async () => {
    fromDb.mockImplementation(tableMock({ report: null }));
    const res = await GET(new Request("http://localhost/api/consult/followup?session_id=s1") as unknown as NextRequest);
    expect(res.status).toBe(404);
  });

  it("logged-out → 401", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await GET(new Request("http://localhost/api/consult/followup?session_id=s1") as unknown as NextRequest);
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run — expect FAIL (route missing)**

Run: `npx vitest run lib/__tests__/followup-route.test.ts`
Expected: FAIL — cannot resolve `../../app/api/consult/followup/route`.

- [ ] **Step 3: Implement the route**

```ts
// app/api/consult/followup/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getOraclePrompt } from "@/lib/oracle-prompts";
import { checkAndIncrementUsage, refundUsage, FREE_TIER_LIMIT, PRO_TIER_LIMIT } from "@/lib/rate-limit";
import { hasActiveProEntitlement } from "@/lib/creem";
import { createClient } from "@/lib/supabase/server";
import { validateIchingContext } from "@/lib/iching-context";
import {
  FOLLOWUP_TURN_LIMIT,
  FOLLOWUP_MAX_WORDS,
  validateFollowupQuestion,
  buildFollowupGrounding,
  type FollowupTurn,
} from "@/lib/consult-followup";

/**
 * Follow-up Q&A on a saved consultation (POST: ask, SSE; GET: list turns).
 * Everything the model sees is loaded here from the DB by session_id +
 * authenticated user — the client sends only sessionId and question text.
 * The original report row is never written.
 */

const openai = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  baseURL: process.env.AZURE_OPENAI_ENDPOINT,
});

function json(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status });
}

/** Load the report only when it belongs to the caller (RLS + explicit check). */
async function loadOwnedReport(supabase: Awaited<ReturnType<typeof createClient>>, sessionId: string, userId: string) {
  const { data } = await supabase
    .from("consult_results")
    .select("session_id, user_id, question, cast_data, ai_response")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();
  return data ?? null;
}

async function listTurns(supabase: Awaited<ReturnType<typeof createClient>>, sessionId: string, userId: string) {
  const { data, error } = await supabase
    .from("consult_followups")
    .select("id, question, answer, turn_index, created_at")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .order("turn_index", { ascending: true });
  if (error) return { error: error.message as string, turns: [] as FollowupTurn[] };
  return {
    error: null,
    turns: ((data || []) as Array<Record<string, unknown>>).map((t) => ({
      id: String(t.id),
      question: String(t.question),
      answer: String(t.answer),
      turnIndex: Number(t.turn_index),
      createdAt: String(t.created_at),
    })),
  };
}

export async function POST(request: NextRequest) {
  // 1. Auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: "Please log in to use AI features.", code: "LOGIN_REQUIRED" }, 401);

  // 2. Input + report ownership
  const body = await request.json().catch(() => ({}));
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
  if (!sessionId) return json({ error: "sessionId is required" }, 400);
  const question = validateFollowupQuestion(body?.question);
  if (!question) return json({ error: `Question is required (max ${500} characters)` }, 400);

  const report = await loadOwnedReport(supabase, sessionId, user.id);
  if (!report) return json({ error: "Reading not found.", code: "NOT_FOUND" }, 404);

  // 3. Recorded cast must be valid — old/broken reports are excluded, not guessed
  const cast = validateIchingContext(report.cast_data);
  if (!cast) {
    return json(
      { error: "This reading has no usable cast data, so follow-ups are unavailable.", code: "REPORT_DATA_MISSING" },
      422,
    );
  }

  // 4. Turn cap (before charging)
  const { error: listError, turns } = await listTurns(supabase, sessionId, user.id);
  if (listError) return json({ error: "Rate limit service unavailable", code: "SERVICE_ERROR" }, 503);
  if (turns.length >= FOLLOWUP_TURN_LIMIT) {
    return json(
      { error: "Follow-up limit reached for this reading (20). Start a new consultation for a fresh cast.", code: "FOLLOWUP_LIMIT_REACHED" },
      429,
    );
  }
  const turnIndex = turns.length + 1;

  // 5. Quota — same shared daily pool as the initial reading
  let chargedUserId: string | null = null;
  const isPaid = await hasActiveProEntitlement(supabase, user.id);
  const isDev = process.env.NODE_ENV === "development";
  if (isPaid || !isDev) {
    const { allowed, error } = await checkAndIncrementUsage(supabase, user.id, isPaid ? PRO_TIER_LIMIT : FREE_TIER_LIMIT);
    if (error) return json({ error: "Rate limit service unavailable", code: "SERVICE_ERROR" }, 503);
    if (!allowed) {
      return json(
        {
          error: "Daily consultation limit reached. Free accounts get 3 readings/day, Pro 10/day.",
          code: "LIMIT_REACHED",
          remaining: 0,
        },
        429,
      );
    }
    chargedUserId = user.id;
  }

  // 6. Generate, grounded in the DB record (conversational — no deep addendum)
  const promptConfig = getOraclePrompt("prologue-zhougong")!;
  const system =
    promptConfig.system +
    buildFollowupGrounding({
      originalQuestion: report.question,
      cast,
      originalReading: report.ai_response,
      turns,
    });

  let stream: AsyncIterable<{ choices?: Array<{ delta?: { content?: string } }> }>;
  try {
    stream = await openai.chat.completions.create({
      model: process.env.AZURE_OPENAI_MODEL || "gpt-5.4-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: question },
      ],
      max_completion_tokens: Math.round(FOLLOWUP_MAX_WORDS * 1.5),
      temperature: 0.8,
      stream: true,
    });
  } catch (err) {
    if (chargedUserId) {
      const r = await refundUsage(chargedUserId);
      if (!r.refunded) console.warn("[followup] create-failure refund not applied:", r.reason);
    }
    console.error("Followup API error:", err);
    return json({ error: "The oracle could not be reached. Please try again." }, 500);
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      let full = "";
      let sawContent = false;
      try {
        for await (const chunk of stream) {
          const content = chunk.choices?.[0]?.delta?.content;
          if (content) {
            sawContent = true;
            full += content;
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            } catch {
              controller.close(); // client gone — model stream is fine, no refund
              return;
            }
          }
        }
        if (!sawContent) {
          if (chargedUserId) {
            void refundUsage(chargedUserId).then((r) => {
              if (!r.refunded) console.warn("[followup] empty-stream refund not applied:", r.reason);
            });
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }
        // Persist the turn in this same request — append-only, server-generated id.
        // Runs even in dev (where the charge is skipped): the answer was delivered.
        const { error: insertError } = await supabase.from("consult_followups").insert({
          session_id: sessionId,
          user_id: user.id,
          turn_index: turnIndex,
          question,
          answer: full,
        });
        if (insertError) {
          console.error("[followup] insert error:", insertError.message);
          // Content already delivered — keep the charge, tell the client
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ saveFailed: true })}\n\n`));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        if (chargedUserId) {
          void refundUsage(chargedUserId).then((r) => {
            if (!r.refunded) console.warn("[followup] mid-stream refund not applied:", r.reason);
          });
        }
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`));
          controller.close();
        } catch {
          // client gone
        }
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: "Login required" }, 401);

  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (!sessionId) return json({ error: "session_id required" }, 400);

  const report = await loadOwnedReport(supabase, sessionId, user.id);
  if (!report) return json({ error: "Reading not found." }, 404);

  const { error, turns } = await listTurns(supabase, sessionId, user.id);
  if (error) return json({ error: "Failed to list follow-ups" }, 500);

  return NextResponse.json({
    followups: turns,
    count: turns.length,
    limitReached: turns.length >= FOLLOWUP_TURN_LIMIT,
  });
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run lib/__tests__/followup-route.test.ts`
Expected: PASS (all).

- [ ] **Step 5: Run the whole suite (no regressions)**

Run: `npm run test`
Expected: all previous tests still pass.

- [ ] **Step 6: Commit**

```bash
git add app/api/consult/followup/route.ts lib/__tests__/followup-route.test.ts
git commit -m "feat(followup): /api/consult/followup — SSE ask grounded in owned DB report, same-request turn insert, refund on failure, GET list"
```

---

### Task 5: `FollowupSection` component (TDD)

**Files:**
- Test: `lib/__tests__/followup-section.test.tsx`
- Create: `app/consult/iching/result/FollowupSection.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// lib/__tests__/followup-section.test.tsx
// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import FollowupSection from "../../app/consult/iching/result/FollowupSection";
import { logEvent } from "../analytics";

vi.mock("../analytics", () => ({ logEvent: vi.fn() }));
vi.mock("react-markdown", () => ({ default: ({ children }: { children: string }) => <div data-testid="md">{children}</div> }));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockReset();
  window.sessionStorage.clear();
});
afterEach(() => cleanup());

function sseResponse(chunks: string[], saveFailed = false) {
  const body = [
    ...chunks.map((c) => `data: ${JSON.stringify({ content: c })}\n\n`),
    ...(saveFailed ? [`data: ${JSON.stringify({ saveFailed: true })}\n\n`] : []),
    "data: [DONE]\n\n",
  ].join("");
  return new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } });
}

describe("account-status gating", () => {
  it("saved report → shows the continue button, then loads turns", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ followups: [{ id: "t1", question: "q1", answer: "a1", turnIndex: 1, createdAt: "2026-01-01" }], count: 1, limitReached: false }), { status: 200 }),
    );
    render(<FollowupSection sessionId="s1" accountStatus="saved" />);
    expect(screen.getByText("继续讨论这次解读")).toBeTruthy();
    await waitFor(() => expect(screen.getByText("q1")).toBeTruthy());
  });

  it("local-only report → explanation + login link, no input, no fetch", () => {
    render(<FollowupSection sessionId="s1" accountStatus="local" />);
    expect(screen.getByText(/only saved in this tab/i)).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("ask + failure handling", () => {
  it("happy path: streams, refetches thread, fires completed, clears draft", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ followups: [], count: 0, limitReached: false }), { status: 200 }));
    render(<FollowupSection sessionId="s1" accountStatus="saved" />);

    fireEvent.click(screen.getByText("继续讨论这次解读"));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "PIIMARK what about line 1?" } });
    fetchMock.mockResolvedValueOnce(sseResponse(["part1", " part2"]));
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ followups: [{ id: "t1", question: "PIIMARK what about line 1?", answer: "part1 part2", turnIndex: 1, createdAt: "2026-01-01" }], count: 1, limitReached: false }), { status: 200 }),
    );
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(screen.getByText("part1 part2")).toBeTruthy());
    expect(logEvent).toHaveBeenCalledWith("consult_followup_started");
    expect(logEvent).toHaveBeenCalledWith("consult_followup_completed");
    // PII guard: the question text never appears in any analytics payload
    for (const call of vi.mocked(logEvent).mock.calls) {
      expect(JSON.stringify(call[1] || {})).not.toContain("PIIMARK");
    }
  });

  it("API failure → error banner, input preserved, failed event with reason", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ followups: [], count: 0, limitReached: false }), { status: 200 }));
    render(<FollowupSection sessionId="s1" accountStatus="saved" />);
    fireEvent.click(screen.getByText("继续讨论这次解读"));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "my precious draft" } });
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: "Daily consultation limit reached. Free accounts get 3 readings/day, Pro 10/day.", code: "LIMIT_REACHED" }), { status: 429 }));
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("my precious draft");
    expect(logEvent).toHaveBeenCalledWith("consult_followup_failed", { reason: "limit_reached" });
  });

  it("saveFailed marker → warning shown, completed NOT fired, failed save_failed fired", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ followups: [], count: 0, limitReached: false }), { status: 200 }));
    render(<FollowupSection sessionId="s1" accountStatus="saved" />);
    fireEvent.click(screen.getByText("继续讨论这次解读"));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "q" } });
    fetchMock.mockResolvedValueOnce(sseResponse(["generated answer"], true));
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ followups: [], count: 0, limitReached: false }), { status: 200 }));
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(screen.getByText(/may be lost/i)).toBeTruthy());
    expect(logEvent).toHaveBeenCalledWith("consult_followup_failed", { reason: "save_failed" });
    expect(logEvent).not.toHaveBeenCalledWith("consult_followup_completed");
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run lib/__tests__/followup-section.test.tsx`
Expected: FAIL — cannot resolve component.

- [ ] **Step 3: Implement `FollowupSection.tsx`**

```tsx
// app/consult/iching/result/FollowupSection.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { logEvent } from "@/lib/analytics";
import { loadDraft, saveDraft, clearDraft } from "@/lib/draft";

type Turn = { id: string; question: string; answer: string; turnIndex: number; createdAt: string };
type Phase = "idle" | "streaming";

/**
 * 继续讨论这次解读 — follow-up Q&A on one saved reading. Server grounds
 * every answer in the DB record (original cast + reading + prior turns);
 * this component only sends sessionId + question text. Turns load read-only
 * on mount — refresh/history reopen never trigger generation.
 */
export default function FollowupSection({ sessionId, accountStatus }: { sessionId: string; accountStatus: "checking" | "saved" | "local" | "error" }) {
  const [expanded, setExpanded] = useState(false);
  const [turns, setTurns] = useState<Turn[] | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [saveWarning, setSaveWarning] = useState(false);
  const startedRef = useRef(false);
  const draftKey = `consult:followup:${sessionId}`;

  // Read-only thread load (never generates, never charges)
  /* eslint-disable react-hooks/set-state-in-effect -- one-time external-store hydration */
  useEffect(() => {
    if (accountStatus !== "saved") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/consult/followup?session_id=${encodeURIComponent(sessionId)}`);
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (cancelled) return;
        setTurns(json.followups || []);
        setLimitReached(!!json.limitReached);
        if ((json.followups || []).length > 0) setExpanded(true);
      } catch {
        if (!cancelled) setTurns([]); // read failure shows empty thread; asking still works
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId, accountStatus]);

  useEffect(() => {
    const draft = loadDraft<string>(draftKey);
    if (draft) setInput(draft);
  }, [draftKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (accountStatus !== "saved") {
    return (
      <section className="px-5 sm:px-6 py-5 border-t border-sand">
        <h2 className="font-serif text-lg text-warm mb-2">继续讨论这次解读</h2>
        <p className="text-sm text-warm leading-relaxed">
          {accountStatus === "local"
            ? "This reading is only saved in this tab, so follow-up discussion needs it saved to your account. "
            : "Follow-up discussion needs this reading saved to your account. "}
          <Link href="/login" className="underline underline-offset-2">Log in</Link> to keep readings and continue the conversation.
        </p>
      </section>
    );
  }

  const ask = async () => {
    if (startedRef.current || phase === "streaming") return;
    const question = input.trim();
    if (!question) return;
    startedRef.current = true;
    setPhase("streaming");
    setError("");
    setSaveWarning(false);
    logEvent("consult_followup_started");

    try {
      const res = await fetch("/api/consult/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, question }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const reason =
          res.status === 401 ? "login_required"
          : res.status === 404 ? "not_found"
          : res.status === 422 ? "report_data_missing"
          : data?.code === "FOLLOWUP_LIMIT_REACHED" ? "followup_limit"
          : data?.code === "LIMIT_REACHED" ? "limit_reached"
          : "api_error";
        setError(
          data?.error ||
            (reason === "report_data_missing"
              ? "This reading has no usable cast data, so follow-ups are unavailable."
              : "The oracle could not be reached. Please try again."),
        );
        logEvent("consult_followup_failed", { reason });
        setPhase("idle");
        startedRef.current = false;
        return; // input stays — quota was not consumed for pre-flight failures
      }

      // SSE — accumulate; a saveFailed marker means the turn wasn't persisted
      const reader = res.body?.getReader();
      if (!reader) {
        setError("The oracle could not be reached. Please try again.");
        logEvent("consult_followup_failed", { reason: "no_stream" });
        setPhase("idle");
        startedRef.current = false;
        return;
      }
      const decoder = new TextDecoder();
      let streamed = "";
      let streamError = false;
      let saveFailed = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.content) streamed += parsed.content;
            if (parsed.saveFailed) saveFailed = true;
            if (parsed.error) streamError = true;
          } catch { /* skip */ }
        }
      }

      if (!streamed || streamError) {
        setError("The oracle could not be reached. Please try again.");
        logEvent("consult_followup_failed", { reason: "empty_response" });
        setPhase("idle");
        startedRef.current = false;
        return; // charge was refunded server-side
      }

      // Refresh the thread (canonical copy with ids/order), clear the draft
      try {
        const listRes = await fetch(`/api/consult/followup?session_id=${encodeURIComponent(sessionId)}`);
        if (listRes.ok) {
          const json = await listRes.json();
          setTurns(json.followups || []);
          setLimitReached(!!json.limitReached);
        }
      } catch { /* thread refresh is best-effort */ }

      clearDraft(draftKey);
      setInput("");

      if (saveFailed) {
        setSaveWarning(true);
        logEvent("consult_followup_failed", { reason: "save_failed" });
      } else {
        logEvent("consult_followup_completed");
      }
      setPhase("idle");
      startedRef.current = false;
    } catch {
      setError("The oracle could not be reached. Please try again.");
      logEvent("consult_followup_failed", { reason: "network" });
      setPhase("idle");
      startedRef.current = false;
    }
  };

  return (
    <section className="px-5 sm:px-6 py-5 border-t border-sand">
      <h2 className="font-serif text-lg text-warm mb-1">继续讨论这次解读</h2>
      <p className="text-xs text-warm/80 mb-3">
        Same cast, same reading — ask anything about them. Follow-ups use your daily
        consultation quota (3/day free, Pro 10/day).
      </p>

      {turns === null ? (
        <p className="text-sm text-warm">Loading conversation…</p>
      ) : (
        <div className="space-y-4 mb-4">
          {turns.map((t) => (
            <div key={t.id} className="space-y-2">
              <p className="text-sm font-medium text-ink whitespace-pre-wrap">🧑 {t.question}</p>
              <div className="pl-3 border-l-2 border-sand prose prose-sm prose-warm max-w-none">
                <ReactMarkdown>{t.answer}</ReactMarkdown>
              </div>
            </div>
          ))}
        </div>
      )}

      {saveWarning && (
        <p className="mb-3 text-xs text-china-red" role="status">
          This turn&apos;s answer is shown above but may be lost on refresh — it could not be saved to your account.
        </p>
      )}
      {error && (
        <p className="mb-3 p-3 bg-china-red/10 border border-china-red/30 rounded-lg text-sm text-china-red" role="alert">
          {error}
        </p>
      )}

      {limitReached ? (
        <p className="text-sm text-warm">
          You&apos;ve reached the 20-follow-up limit for this reading.{" "}
          <Link href="/consult/iching" className="underline underline-offset-2">Start a new consultation</Link> for a fresh cast.
        </p>
      ) : expanded ? (
        phase === "streaming" ? (
          <p className="text-sm text-warm animate-pulse">Consulting Zhou Gong…</p>
        ) : (
          <div className="flex flex-col gap-2">
            <textarea
              value={input}
              onChange={(e) => { setInput(e.target.value); saveDraft(draftKey, e.target.value); }}
              rows={3}
              maxLength={500}
              placeholder="Ask a follow-up about this reading…"
              className="w-full p-3 text-base bg-white/70 border border-sand rounded-lg text-ink leading-relaxed focus:outline-none focus:border-warm"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-warm/70">{input.trim().length}/500</span>
              <button
                type="button"
                onClick={ask}
                className="px-5 py-3 bg-ink text-white rounded-full text-sm font-medium hover:bg-ink/90 transition-colors disabled:opacity-50"
              >
                Send →
              </button>
            </div>
          </div>
        )
      ) : (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="px-5 py-3 bg-ink text-white rounded-full text-sm font-medium hover:bg-ink/90 transition-colors"
        >
          继续讨论这次解读
        </button>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run lib/__tests__/followup-section.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add app/consult/iching/result/FollowupSection.tsx lib/__tests__/followup-section.test.tsx
git commit -m "feat(followup): FollowupSection — thread view, draft-safe input, stream+retry states, PII-free events"
```

---

### Task 6: Mount into ResultView

**Files:**
- Modify: `app/consult/iching/result/ResultView.tsx`

- [ ] **Step 1: Add import + section**

After the existing imports (line ~10, next to the other local imports):

```tsx
import FollowupSection from "../FollowupSection";
```

Between the `{/* 6. Reflection questions */}` block and `{/* 7. My Next Step */}` block, insert:

```tsx
      {/* 6.5 Follow-up Q&A — same cast, turns saved with the reading */}
      <FollowupSection sessionId={result.sessionId} accountStatus={accountStatus} />
```

(Place it directly after the closing `)}` of the reflection-questions conditional and before the `{/* 7. My Next Step */}` comment. `accountStatus` is already in scope.)

- [ ] **Step 2: Run full suite + typecheck-by-build later (Task 9). Quick suite now:**

Run: `npm run test`
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add app/consult/iching/result/ResultView.tsx
git commit -m "feat(followup): mount FollowupSection in the result page between reflection and next-step"
```

---

### Task 7: E2E group D (permission, persistence, no-regression)

**Files:**
- Modify: `scripts/acceptance/mobile-consult-e2e.mjs`

- [ ] **Step 1: Add helpers** (near `reportRows`):

```js
async function followupRows(sessionId) {
  const { body } = await sb(`/rest/v1/consult_followups?session_id=eq.${sessionId}&select=id,turn_index,question,answer,created_at&order=turn_index.asc`);
  return body || [];
}

async function reportSnapshot(sessionId) {
  const { body } = await sb(`/rest/v1/consult_results?session_id=eq.${sessionId}&select=question,ai_response,updated_at,next_step`);
  return body && body[0] ? body[0] : null;
}

async function createQaUser(label) {
  const email = `qa-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@qa.goeast.test`;
  const password = `Qa-${label}-${Math.random().toString(36).slice(2, 10)}!x`;
  const { status, body } = await sb("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if ((status !== 200 && status !== 201) || !body?.id) throw new Error(`qa user create failed ${status}`);
  return { email, password, id: body.id };
}
```

- [ ] **Step 2: Add group D** (after `groupC`, registered in the run block):

```js
// ============================================================================
// GROUP D — follow-up Q&A: same-cast grounding, persistence, permissions
// Quota budget for a fresh free user: report(1) + followup#1(1) + followup#2(1) = 3
// ============================================================================
async function groupD() {
  const g = "D";
  const { context, page } = await mobilePage();
  try {
    await loginViaUi(page, g);

    // 1. Create a report (charge 1) and snapshot the original row
    await wizardToConfirm(page, g, `Followup base ${PII.question} — one reading to discuss.`);
    await page.locator("button", { hasText: "Start Reading" }).first().tap();
    await page.waitForURL(/\/consult\/iching\/result\?session=/, { timeout: 180000 });
    await page.waitForSelector("text=Your Hexagram", { timeout: 60000 });
    const sessionId = decodeURIComponent(page.url().match(/session=([^&]+)/)[1]);
    const before = await reportSnapshot(sessionId);
    const hexBefore = await page.locator("text=/Hexagram \\d+/").first().textContent();
    check(g, "base report created", !!before, sessionId.slice(0, 8));

    // 2. Follow-up #1 (charge 2)
    await page.waitForSelector("text=继续讨论这次解读", { timeout: 30000 });
    await page.locator("button", { hasText: "继续讨论这次解读" }).first().tap();
    const ta = page.locator("textarea").last();
    await typeWithKeyboardChecks(page, ta, `First follow-up ${PII.question} — what does the changing line mean?`, "followup input", g);
    let posts = 0;
    const countReq = (r) => { if (r.url().includes("/api/consult/followup") && r.method() === "POST") posts++; };
    page.on("request", countReq);
    await page.locator("button", { hasText: "Send" }).first().tap();
    await page.waitForSelector(`text=First follow-up`, { timeout: 180000 }); // thread echoes the question
    check(g, "follow-up #1 turns appear in thread", true);

    // 3. Follow-up #2 (charge 3) — with rapid double-click on Send (1 POST only)
    await ta.fill(`Second follow-up — how should I act on this?`);
    await page.locator("button", { hasText: "Send" }).first().tap();
    await page.locator("button", { hasText: "Send" }).first().tap().catch(() => {});
    await page.waitForSelector("text=Second follow-up", { timeout: 180000 });
    await page.waitForTimeout(1500);
    page.off("request", countReq);
    check(g, "two follow-ups, exactly 2 POSTs (double-click safe)", posts === 2, `${posts} POSTs`);

    // 4. Original report unchanged + follow-up rows saved
    const after = await reportSnapshot(sessionId);
    check(g, "original report row unchanged", JSON.stringify(after) === JSON.stringify(before), "");
    const rows = await followupRows(sessionId);
    check(g, "exactly 2 follow-up rows", rows.length === 2, `${rows.length} rows`);
    const hexAfter = await page.locator("text=/Hexagram \\d+/").first().textContent();
    check(g, "hexagram unchanged on page", hexBefore === hexAfter, `${hexBefore} → ${hexAfter}`);
    const usage = await usageCount();
    check(g, "usage = 3 (report + 2 follow-ups)", usage === 3, `usage=${usage}`);

    // 5. Refresh — thread restored read-only, no new POSTs/charges
    let refreshPosts = 0;
    const countReq2 = (r) => { if (r.url().includes("/api/consult/followup") && r.method() === "POST") refreshPosts++; };
    page.on("request", countReq2);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=Second follow-up", { timeout: 60000 });
    await page.waitForTimeout(1500);
    page.off("request", countReq2);
    check(g, "refresh restores full thread, 0 POSTs", refreshPosts === 0, `${refreshPosts} POSTs`);
    check(g, "refresh does not re-charge", (await usageCount()) === 3, "");
    const after2 = await reportSnapshot(sessionId);
    check(g, "report row still unchanged", JSON.stringify(after2) === JSON.stringify(before), "");
    await shot(page, "d1-followup-thread");

    // 6. Cross-account permission: fresh user cannot read or follow up
    const user2 = await createQaUser("3d2");
    const page2 = await context.newPage(); // NOT logged in — use a fresh context
    await page2.close();
    const ctx2 = await (await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true }));
    const p3 = await ctx2.newPage();
    await p3.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
    await p3.fill("#email", user2.email);
    await p3.fill("#password", user2.password);
    await p3.locator("button", { hasText: "Sign In" }).first().tap();
    await p3.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 30000 });
    const apiBase = BASE;
    const readRes = await p3.evaluate(async (sid) =>
      (await fetch(`/api/consult/followup?session_id=${encodeURIComponent(sid)}`, { method: "GET" })).status
    , sessionId);
    check(g, "other account GET → 404", readRes === 404, `status ${readRes}`);
    const askRes = await p3.evaluate(async (sid) =>
      (await fetch("/api/consult/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid, question: "let me in?" }),
      })).status
    , sessionId);
    check(g, "other account POST → 404", askRes === 404, `status ${askRes}`);
    check(g, "other account created no rows", (await followupRows(sessionId)).length === 2, "");
    await ctx2.close();
  } catch (e) {
    check(g, "group D flow error", false, String(e).slice(0, 300));
  } finally {
    await context.close();
  }
}
```

And in the run block:

```js
if (GROUPS.includes("d")) { RUN.groups.push("D"); console.log("\n=== GROUP D: follow-up Q&A ==="); await groupD(); }
```

- [ ] **Step 3: Syntax check**

Run: `node --check scripts/acceptance/mobile-consult-e2e.mjs`
Expected: no output (valid syntax).

- [ ] **Step 4: Commit**

```bash
git add scripts/acceptance/mobile-consult-e2e.mjs
git commit -m "test(followup): e2e group D — same-cast persistence, refresh no-regen, double-click, cross-account 404"
```

---

### Task 8: OWNER CHECKPOINT — apply migration

- [ ] **Notify the owner:** paste `supabase/migrations/006_create_consult_followups.sql` (or its path) — they execute it in the Supabase Dashboard SQL editor for project `ghxdyyqvnsyxpojtcllw` (same DB local dev and preview/production use).
- [ ] **Verify applied** (from repo root, service key in `.env.local`):

```bash
node -e '
const fs=require("fs");const env={};
for(const l of fs.readFileSync(".env.local","utf8").split("\n")){const m=l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);if(m)env[m[1]]=m[2];}
fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/consult_followups?select=id&limit=1`,{headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`}}).then(r=>console.log("table check:",r.status,r.status===200?"OK — table exists":"MISSING"));
'
```

Expected: `200 OK — table exists`. If 404/501 → table missing, wait for the owner.

---

### Task 9: Full local verification (prod-mode, real backend)

- [ ] **Step 1: Build + start prod server**

```bash
npm run build
(PORT=3101 npm start > /tmp/goeast-3b/prod-d.log 2>&1 &)
```

- [ ] **Step 2: Fresh QA user, run D then A/B/C regression**

```bash
rm -f /tmp/goeast-3b/results.json /tmp/goeast-3b/qa-user.json
BASE_URL=http://localhost:3101 GROUPS=d node scripts/acceptance/mobile-consult-e2e.mjs   # uses 3 charges exactly
mv /tmp/goeast-3b/qa-user.json /tmp/goeast-3b/qa-user-d.json
BASE_URL=http://localhost:3101 GROUPS=b node scripts/acceptance/mobile-consult-e2e.mjs  # broken-key server needed — see Task 3B notes
BASE_URL=http://localhost:3101 GROUPS=a,c node scripts/acceptance/mobile-consult-e2e.mjs
```

(Group B needs the broken-Azure server as documented in the script header: restart with `AZURE_OPENAI_API_KEY=broken npm start` for B, real key for D/A/C.)

Expected: D all pass (report row byte-identical before/after follow-ups; 2 rows; usage=3; refresh 0 POSTs; cross-account 404s), A/B/C unchanged from Task 3B.

- [ ] **Step 3: PII audit note** — group D's question carries `PIIMARK-…`; confirm `results.json` events contain no marker (same audit the script already runs for A; assert manually for D):

```bash
grep -c "PIIMARK" /tmp/goeast-3b/results.json || echo "0 — clean"
```

Expected: `0 — clean` (the marker appears only in DB fields, never in captured events).

- [ ] **Step 4: Commit any fixes surfaced by the run**

---

### Task 10: Preview deploy + acceptance handoff

- [ ] **Step 1: Merge to develop → auto preview**

```bash
git checkout develop && git merge --ff-only feat/consult-followup && git push origin develop && git checkout feat/consult-followup
```

- [ ] **Step 2: Wait for the preview deployment** (`vercel ls` until Ready), record URL.

- [ ] **Step 3: Preview run of D** (needs the SSO bypass token or owner-deployed preview access):

```bash
BASE_URL=<preview-url> GROUPS=d node scripts/acceptance/mobile-consult-e2e.mjs
```

- [ ] **Step 4: Report to owner** — commit hash, preview URL, evidence paths (`/tmp/goeast-3b/results.json`, `shots/d1-*.png`), remaining issues (production deploy = separate confirmation; QA users in Supabase; overlay copy issue deferred).

---

## Self-Review (completed during planning)

- **Spec coverage:** storage→T1/T4, server grounding+ownership→T4, old-report 422→T4 tests, retry/refresh/no-regen→T5/T7/T9, guardrails→T2, quota+refund→T4, no-benefit-change→T4 (same pool, no tiering), analytics PII→T3/T5/T7, migration owner-apply→T8, mobile input (text-base ≥16px)→T5 code, out-of-scope untouched.
- **Type consistency:** `FollowupTurn` camelCase in lib, route maps DB snake→camel, UI consumes `{id,question,answer,turnIndex,createdAt}`; `saveFailed` marker produced (route) and consumed (UI) with the same name.
- **No placeholders:** every step carries complete code/commands.
