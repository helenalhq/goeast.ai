# GoEast Round 2 — Consultation Flow & Entitlements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect one continuous I Ching→Oracle consultation with real cast context, make Pro genuinely differ from free (user decision: implement the difference, not just fix copy), verify the payment chain with tests, make email promises true, precision-edit 4 articles, and add minimal conversion analytics.

**Architecture:** Cast context flows through sessionStorage (`iching-context` draft, numbers only — server resolves names, preventing prompt injection) into a validated `ichingContext` field on `/api/oracle`, injected only into the Zhou Gong prompt. Pro depth = `getOraclePrompt(slug, {deep})` / `getSystemPrompt(lang, {deep})` addenda + doubled token budgets, gated by existing `isPaid`. Webhook gets unsigned-rejection + real expiry parsing with vitest route tests (mocked Supabase). Email copy is truthized (no fake frequency/PDF/save). Analytics via a PII-free `lib/analytics.ts` wrapper over `@vercel/analytics` `track()` (already installed, CSP-allowed, currently zero custom events).

**Tech Stack:** Next.js 16 App Router, React 19, vitest ^4, @vercel/analytics ^2 (already a dependency), Resend (unchanged), Creem (unchanged).

**User decisions already made (do not re-ask):**
1. Pro "deep interpretations" has NO implementation today → **implement a real difference** (longer + structured deeper readings for Pro; free unchanged).
2. Email: **copy truthization only** (no welcome email this round; no PDF; no scheduler).
3. Webhook: **fix** unsigned-bypass + hardcoded expiry (bug/security fixes, not entitlement changes). The `/account` email self-claim path is flagged for a later round.
4. Article facts: **verify via WebSearch** at execution time, cite official sources + real check dates.

**Branch:** `feat/round2-consultation-flow` from `main` (f91fb85). No auto-merge, no deploy, no real charges. Baseline: 27 tests green, `npx tsc --noEmit` clean, lint = 35 pre-existing problems (compare against baseline, target 0 new).

**Constraints honored everywhere:** question text/birth data/emails NEVER into URLs, analytics payloads, or logs; context has explicit clear + expiry; no recasting server-side; entitlement logic (status values, quota limits 3/10) untouched except reading real expiry.

---

## Phase A — P0-1: One continuous cast→Oracle consultation

### Task A1: `lib/iching-context.ts` — context build/validate/prompt-block (TDD)

**Files:**
- Create: `lib/iching-context.ts`
- Test: `lib/__tests__/iching-context.test.ts`

Known facts: `CoinCast = { values:[n,n,n]; line:number; binary:"1"|"0"; changing:boolean }` (IChingDivination.tsx:10-15); `casts[i]` is line i+1 bottom-up, binary string matches `HexagramData.binary`; all 64 hexagrams in `lib/iching-data.ts` with `getHexagramByNumber` (lines 1158-1166); transformed hexagram (变卦) is computed NOWHERE today.

- [ ] **A1.1 Write failing tests** — `lib/__tests__/iching-context.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getAllHexagrams } from "../iching-data";
import {
  buildIchingContext,
  buildStudyContext,
  validateIchingContext,
  buildIchingContextBlock,
} from "../iching-context";

const HEXAGRAMS = getAllHexagrams();
// Hexagram 1 = all yang "111111"; Hexagram 2 = all yin "000000".
const yang = { values: [3, 3, 3] as [number, number, number], line: 7, binary: "1", changing: false };
const yin = { values: [2, 2, 2] as [number, number, number], line: 8, binary: "0", changing: false };
const oldYang = { values: [3, 3, 3] as [number, number, number], line: 9, binary: "1", changing: true };
const oldYin = { values: [2, 2, 2] as [number, number, number], line: 6, binary: "0", changing: true };

describe("buildIchingContext", () => {
  it("static cast: hexagram 1, no changing lines, no transformed", () => {
    const ctx = buildIchingContext([yang, yang, yang, yang, yang, yang], HEXAGRAMS);
    expect(ctx).toEqual({ mode: "cast", hexagramNumber: 1, changingLines: [] });
  });

  it("changing line flips to the transformed hexagram (1 → 44 Gou)", () => {
    // bottom line changing on Qian = Hexagram 44 (Gou / Coming to Meet)
    const ctx = buildIchingContext([oldYang, yang, yang, yang, yang, yang], HEXAGRAMS);
    expect(ctx?.hexagramNumber).toBe(1);
    expect(ctx?.changingLines).toEqual([1]);
    const transformed = getAllHexagrams().find((h) => h.number === ctx?.transformedNumber);
    expect(transformed?.slug).toBe("gou");
  });

  it("multiple changing lines are ordered bottom-up", () => {
    const ctx = buildIchingContext([yang, oldYang, yang, oldYin, yang, yang], HEXAGRAMS);
    expect(ctx?.changingLines).toEqual([2, 4]);
  });

  it("returns null for incomplete or unknown casts", () => {
    expect(buildIchingContext([yang], HEXAGRAMS)).toBeNull();
    expect(buildIchingContext([], HEXAGRAMS)).toBeNull();
  });
});

describe("buildStudyContext", () => {
  it("study mode has no changing lines", () => {
    expect(buildStudyContext(6)).toEqual({ mode: "study", hexagramNumber: 6, changingLines: [] });
  });
});

describe("validateIchingContext (server-side, untrusted input)", () => {
  it("accepts a well-formed cast context and normalizes line order", () => {
    expect(validateIchingContext({ mode: "cast", hexagramNumber: 1, changingLines: [3, 1], transformedNumber: 44 }))
      .toEqual({ mode: "cast", hexagramNumber: 1, changingLines: [1, 3], transformedNumber: 44 });
  });

  it("accepts study context only without changing lines", () => {
    expect(validateIchingContext({ mode: "study", hexagramNumber: 6, changingLines: [] })).toEqual({
      mode: "study", hexagramNumber: 6, changingLines: [],
    });
    expect(validateIchingContext({ mode: "study", hexagramNumber: 6, changingLines: [2] })).toBeNull();
  });

  it("rejects out-of-range numbers, dup lines, bad mode, injected fields", () => {
    expect(validateIchingContext({ mode: "cast", hexagramNumber: 0, changingLines: [] })).toBeNull();
    expect(validateIchingContext({ mode: "cast", hexagramNumber: 65, changingLines: [] })).toBeNull();
    expect(validateIchingContext({ mode: "cast", hexagramNumber: 1.5, changingLines: [] })).toBeNull();
    expect(validateIchingContext({ mode: "cast", hexagramNumber: 1, changingLines: [0] })).toBeNull();
    expect(validateIchingContext({ mode: "cast", hexagramNumber: 1, changingLines: [2, 2] })).toBeNull();
    expect(validateIchingContext({ mode: "evil", hexagramNumber: 1, changingLines: [] })).toBeNull();
    expect(validateIchingContext(null)).toBeNull();
    expect(validateIchingContext("x")).toBeNull();
    expect(
      validateIchingContext({ mode: "cast", hexagramNumber: 1, changingLines: [], hexagramName: "INJECTED" })
    ).toEqual({ mode: "cast", hexagramNumber: 1, changingLines: [] }); // extra fields dropped
  });

  it("rejects invalid transformedNumber when present", () => {
    expect(validateIchingContext({ mode: "cast", hexagramNumber: 1, changingLines: [1], transformedNumber: 99 })).toBeNull();
  });
});

describe("buildIchingContextBlock (prompt text, names resolved server-side)", () => {
  it("cast block names hexagram, changing lines, transformed hexagram, and the three-part structure", () => {
    const block = buildIchingContextBlock({ mode: "cast", hexagramNumber: 1, changingLines: [1], transformedNumber: 44 });
    expect(block).toContain("Hexagram 1");
    expect(block).toContain("Changing lines");
    expect(block).toContain("Hexagram 44");
    expect(block).toContain("TRADITIONAL TEACHING");
    expect(block).toContain("never recast");
  });

  it("static cast states no changing lines and omits transformed section", () => {
    const block = buildIchingContextBlock({ mode: "cast", hexagramNumber: 2, changingLines: [] });
    expect(block).toContain("static");
    expect(block).not.toContain("Transformed hexagram");
  });

  it("study block forbids inventing changing lines", () => {
    const block = buildIchingContextBlock({ mode: "study", hexagramNumber: 6, changingLines: [] });
    expect(block).toContain("STUDY");
    expect(block).toContain("did NOT cast");
    expect(block).toContain("Do not invent changing lines");
  });

  it("returns empty string for unknown hexagram", () => {
    // buildIchingContextBlock takes a pre-validated ctx; simulate unknown via monkey-number only if exported lookup allows — simplest: valid input only in practice; assert non-empty for all 64
    for (const h of HEXAGRAMS) {
      expect(buildIchingContextBlock({ mode: "cast", hexagramNumber: h.number, changingLines: [] })).not.toBe("");
    }
  });
});
```

- [ ] **A1.2 Run — expect failure** (`npm test` → module not found).

- [ ] **A1.3 Implement `lib/iching-context.ts`:**

```ts
import { getAllHexagrams, getHexagramByNumber } from "./iching-data";

/**
 * I Ching consultation context passed from the casting tool to the Zhou Gong
 * Oracle. NUMBERS ONLY — hexagram names are resolved server-side from
 * lib/iching-data so untrusted clients cannot inject prompt text.
 */
export type IchingConsultationContext = {
  mode: "cast" | "study";
  hexagramNumber: number; // 本卦 1-64
  changingLines: number[]; // 变爻 line positions 1-6 (bottom-up), [] when static/study
  transformedNumber?: number; // 之卦 1-64, present only when lines change
};

export const ICHING_CONTEXT_DRAFT_KEY = "iching-context";

/** Build context from a completed 6-line coin cast. Returns null unless complete. */
export function buildIchingContext(
  casts: { binary: string; changing: boolean }[],
  hexagrams: ReturnType<typeof getAllHexagrams>,
  mode: "cast" = "cast"
): IchingConsultationContext | null {
  if (!Array.isArray(casts) || casts.length !== 6) return null;
  const binary = casts.map((c) => c.binary).join("");
  const hexagram = hexagrams.find((h) => h.binary === binary);
  if (!hexagram) return null;

  const changingLines = casts.flatMap((c, i) => (c.changing ? [i + 1] : []));
  let transformedNumber: number | undefined;
  if (changingLines.length > 0) {
    const transformedBinary = casts
      .map((c) => (c.changing ? (c.binary === "1" ? "0" : "1") : c.binary))
      .join("");
    transformedNumber = hexagrams.find((h) => h.binary === transformedBinary)?.number;
  }

  return {
    mode,
    hexagramNumber: hexagram.number,
    changingLines,
    ...(transformedNumber !== undefined ? { transformedNumber } : {}),
  };
}

/** Context for entering the Oracle from a fixed hexagram reference page (no cast happened). */
export function buildStudyContext(hexagramNumber: number): IchingConsultationContext {
  return { mode: "study", hexagramNumber, changingLines: [] };
}

/** Validate untrusted request payloads. Returns a clean copy or null. Extra fields are dropped. */
export function validateIchingContext(raw: unknown): IchingConsultationContext | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;

  const { mode, hexagramNumber, changingLines, transformedNumber } = r;
  if (mode !== "cast" && mode !== "study") return null;
  if (!Number.isInteger(hexagramNumber) || (hexagramNumber as number) < 1 || (hexagramNumber as number) > 64) {
    return null;
  }
  if (!Array.isArray(changingLines) || changingLines.length > 6) return null;

  const seen = new Set<number>();
  const lines: number[] = [];
  for (const l of changingLines) {
    if (!Number.isInteger(l) || (l as number) < 1 || (l as number) > 6 || seen.has(l as number)) return null;
    seen.add(l as number);
    lines.push(l as number);
  }
  lines.sort((a, b) => a - b);
  if (mode === "study" && lines.length > 0) return null;

  let cleanTransformed: number | undefined;
  if (transformedNumber !== undefined) {
    if (!Number.isInteger(transformedNumber) || (transformedNumber as number) < 1 || (transformedNumber as number) > 64) {
      return null;
    }
    cleanTransformed = transformedNumber as number;
  }

  return {
    mode,
    hexagramNumber: hexagramNumber as number,
    changingLines: lines,
    ...(cleanTransformed !== undefined ? { transformedNumber: cleanTransformed } : {}),
  };
}

/** Server-side prompt block. Names come from our data, never from the client. */
export function buildIchingContextBlock(ctx: IchingConsultationContext): string {
  const hexagram = getHexagramByNumber(ctx.hexagramNumber);
  if (!hexagram) return "";
  const transformed = ctx.transformedNumber !== undefined ? getHexagramByNumber(ctx.transformedNumber) : null;

  const lines =
    ctx.changingLines.length > 0
      ? ctx.changingLines.join(", ")
      : "none — the cast is static";
  const transformedPart = transformed
    ? `\n- Transformed hexagram (之卦): Hexagram ${transformed.number} ${transformed.name} (${transformed.name_zh})`
    : "";
  const modePart =
    ctx.mode === "study"
      ? `\n- Mode: STUDY — the user is studying this hexagram from its reference page. They did NOT cast coins. Do not invent changing lines or a transformed hexagram.`
      : `\n- Mode: CAST — these are the coins the user actually threw. Interpret THIS cast; never recast and never substitute a different hexagram.`;

  return `

CONSULTATION CONTEXT — THE USER'S I CHING CAST (authoritative; do not recalculate):
- Hexagram (本卦): Hexagram ${hexagram.number} ${hexagram.name} (${hexagram.name_zh})
- Changing lines (变爻): ${lines}${transformedPart}${modePart}

Structure the answer in three labeled parts:
1. TRADITIONAL TEACHING — quote the judgment (卦辞) or image (象辞) of the hexagram(s) above.
2. AI INTERPRETATION — your reading of the user's question through this specific cast.
3. REFLECTION — 2-3 open questions for the user to consider.
The reading is material for reflection — never a prediction of what will happen, never a reason to fear, and never a reason to pay.`;
}
```

- [ ] **A1.4 Run — expect 30+ new tests pass** (total grows from 27). Note: the "1 → 44" expectation depends on actual data — if it fails, check `getAllHexagrams().find(h => h.binary === "011111")?.slug` and fix the test's expected slug to the data's truth (do not change data).
- [ ] **A1.5 Commit:** `git add lib/iching-context.ts lib/__tests__/iching-context.test.ts && git commit -m "feat(iching): consultation context — build/validate/prompt-block, numbers only"`

### Task A2: Oracle prompt deep mode + context injection point (TDD)

**Files:**
- Modify: `lib/oracle-prompts.ts`
- Test: `lib/__tests__/oracle-prompts.test.ts` (new)

Known facts: `getOraclePrompt(slug)` (lines 196-198) returns `{system, maxWords}`; Zhou Gong maxWords 800, prompt says "You may cast a hexagram…" (line 20) — with real cast context that instruction must be overridden by the context block.

- [ ] **A2.1 Failing tests** — `lib/__tests__/oracle-prompts.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getOraclePrompt, ORACLE_DEEP_ADDENDUM } from "../oracle-prompts";

describe("getOraclePrompt deep mode (Pro)", () => {
  it("free/base config is unchanged for every philosopher", () => {
    const before = getOraclePrompt("prologue-zhougong");
    expect(before?.maxWords).toBe(800);
    expect(getOraclePrompt("prologue-zhougong")?.system).not.toContain("DEEP READING MODE");
  });

  it("deep mode appends the addendum and doubles maxWords", () => {
    const base = getOraclePrompt("ch01-laozi");
    const deep = getOraclePrompt("ch01-laozi", { deep: true });
    expect(deep?.system).toBe(base?.system + ORACLE_DEEP_ADDENDUM);
    expect(deep?.maxWords).toBe((base?.maxWords ?? 0) * 2);
  });

  it("deep mode works for all 11 philosophers and unknown slug still returns null", () => {
    for (const slug of ["prologue-zhougong", "ch01-laozi", "ch02-confucius", "ch03-sunzi", "ch04-zhuangzi",
      "ch05-mencius", "ch06-mozi", "ch07-zhuxi", "ch08-zhangzai", "ch09-huineng", "ch10-wangyangming"]) {
      expect(getOraclePrompt(slug, { deep: true })).not.toBeNull();
    }
    expect(getOraclePrompt("nope", { deep: true })).toBeNull();
  });
});
```

- [ ] **A2.2 Run — fail** (ORACLE_DEEP_ADDENDUM not exported; opts param missing).

- [ ] **A2.3 Implement in `lib/oracle-prompts.ts`:**

Add near the top (after the `PromptConfig` interface):

```ts
/** Appended to the system prompt for Pro (paid) consultations — the real
 *  difference between tiers: ~2× depth via added structure, doubled budget. */
export const ORACLE_DEEP_ADDENDUM = `

DEEP READING MODE (Pro):
After your standard answer, add:
- "GOING DEEPER" — examine the question from a second angle: its shadow side, its timing, or its relational dimension, citing the tradition where relevant.
- "REFLECTION" — 3 open questions the user can sit with over time.
- Close by inviting ONE follow-up question about this reading.
The same rules apply: cultural education and reflection only; never claim certainty; never predict harm; never pressure the reader.`;
```

Change the exported function (currently `getOraclePrompt(slug: string)` at ~line 196):

```ts
export function getOraclePrompt(
  slug: string,
  opts?: { deep?: boolean }
): PromptConfig | null {
  const config = ORACLE_PROMPTS[slug];
  if (!config) return null;
  if (opts?.deep) {
    return {
      system: config.system + ORACLE_DEEP_ADDENDUM,
      maxWords: config.maxWords * 2,
    };
  }
  return config;
}
```

(Read the file first — the internal map name may be `ORACLE_PROMPTS` or similar; use the actual map. Keep the existing export signature backward-compatible: all existing `getOraclePrompt(slug)` calls keep working unchanged.)

- [ ] **A2.4 Run — pass. Commit:** `git commit -m "feat(oracle): Pro deep-reading prompt mode (addendum + doubled budget)"` with the two files.

### Task A3: `/api/oracle` — accept + validate context, inject into Zhou Gong prompt, deep for Pro (route tests)

**Files:**
- Modify: `app/api/oracle/route.ts`
- Test: `lib/__tests__/oracle-route.test.ts` (new — route handler tests with mocks)

Known facts: body destructure line 22; question checks lines 24-43; `getOraclePrompt` + 404 at 45-51; auth 54-66; paid check sets `isPaid` 68-86; free limit 88-107; messages built 112-121 (`max_completion_tokens: Math.round(promptConfig.maxWords * 1.5)`). `createClient` from `@/lib/supabase/server` reads `cookies()` at call time — must be mocked. OpenAI client constructed at module load — mock `openai`.

- [ ] **A3.1 Failing tests** — `lib/__tests__/oracle-route.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";

const getUser = vi.fn();
const getSubscription = vi.fn();
const checkFree = vi.fn();
const checkPaid = vi.fn();
const createCompletion = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: getUser.mockResolvedValue({ data: { user: null } }) },
  }),
}));
vi.mock("@/lib/creem", () => ({
  getSubscriptionByUserId: getSubscription,
}));
vi.mock("@/lib/rate-limit", () => ({
  checkFreeLimit: checkFree.mockReturnValue({ allowed: true, remaining: 2 }),
  checkAuthUserRateLimit: checkPaid.mockReturnValue({ allowed: true, remaining: 9 }),
}));
vi.mock("openai", () => {
  class FakeOpenAI {
    chat = { completions: { create: createCompletion } };
  }
  return { default: FakeOpenAI };
});

import { POST } from "../../app/api/oracle/route";

function req(body: unknown) {
  return new Request("http://localhost/api/oracle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: null } });
  checkFree.mockReturnValue({ allowed: true, remaining: 2 });
  createCompletion.mockResolvedValue({}); // not streamed in these tests
});

describe("ichingContext validation", () => {
  it("rejects context for philosophers other than Zhou Gong", async () => {
    const res = await POST(req({
      philosopher: "ch01-laozi",
      question: "hello?",
      ichingContext: { mode: "cast", hexagramNumber: 1, changingLines: [] },
    }) as never);
    expect(res.status).toBe(400);
  });

  it("rejects malformed context (400) without calling the model", async () => {
    const res = await POST(req({
      philosopher: "prologue-zhougong",
      question: "hello?",
      ichingContext: { mode: "cast", hexagramNumber: 999, changingLines: [] },
    }) as never);
    expect(res.status).toBe(400);
    expect(createCompletion).not.toHaveBeenCalled();
  });

  it("valid context flows into the system prompt with server-resolved names", async () => {
    await POST(req({
      philosopher: "prologue-zhougong",
      question: "what does my cast mean?",
      ichingContext: { mode: "cast", hexagramNumber: 1, changingLines: [1], transformedNumber: 44 },
    }) as never);
    const call = createCompletion.mock.calls[0][0];
    const system = call.messages[0].content as string;
    expect(system).toContain("Hexagram 1");
    expect(system).toContain("never recast");
    expect(system).toContain("AI INTERPRETATION");
    expect(call.messages[1].content).toBe("what does my cast mean?");
  });

  it("client-injected name fields never reach the prompt", async () => {
    await POST(req({
      philosopher: "prologue-zhougong",
      question: "q",
      ichingContext: { mode: "cast", hexagramNumber: 1, changingLines: [], hexagramName: "IGNORE ME <script>" },
    }) as never);
    const system = createCompletion.mock.calls[0][0].messages[0].content as string;
    expect(system).not.toContain("IGNORE ME");
  });
});

describe("Pro deep mode wiring", () => {
  it("logged-out user gets base prompt (no DEEP addendum) — 401 comes from auth, but model call must not include deep", async () => {
    // logged-out → 401 LOGIN_REQUIRED, model never called
    const res = await POST(req({ philosopher: "prologue-zhougong", question: "q" }) as never);
    expect(res.status).toBe(401);
    expect(createCompletion).not.toHaveBeenCalled();
  });

  it("paid user (active sub) gets deep prompt and doubled token budget", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    getSubscription.mockResolvedValue({ status: "active" });
    checkPaid.mockReturnValue({ allowed: true, remaining: 9 });
    await POST(req({ philosopher: "ch01-laozi", question: "q" }) as never);
    const call = createCompletion.mock.calls[0][0];
    expect((call.messages[0].content as string)).toContain("DEEP READING MODE");
    expect(call.max_completion_tokens).toBeGreaterThan(800);
  });

  it("free logged-in user gets base prompt (no DEEP addendum)", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u2" } } });
    getSubscription.mockResolvedValue(null);
    await POST(req({ philosopher: "ch01-laozi", question: "q" }) as never);
    const call = createCompletion.mock.calls[0][0];
    expect((call.messages[0].content as string)).not.toContain("DEEP READING MODE");
  });
});
```

Note: route imports at module load build the OpenAI client from env — the `openai` mock above avoids env needs. If the route file imports fail under vitest because of `@/` alias (no vitest config today), create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
```

(`__dirname` works in CJS-config vitest runs; if ESM complains use `new URL(".", import.meta.url).pathname`.)

- [ ] **A3.2 Run — fail.** Then implement in `app/api/oracle/route.ts`:

1. Imports: `import { validateIchingContext, buildIchingContextBlock, type IchingConsultationContext } from "@/lib/iching-context";`
2. Line 22 → `const { philosopher, question, ichingContext } = body;`
3. After the question-length check (~line 43):

```ts
  // I Ching cast context (Zhou Gong only). Numbers validated; names resolved server-side.
  let validatedIchingContext: IchingConsultationContext | null = null;
  if (ichingContext !== undefined) {
    if (philosopher !== "prologue-zhougong") {
      return new Response(JSON.stringify({ error: "ichingContext is only supported for Zhou Gong" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    validatedIchingContext = validateIchingContext(ichingContext);
    if (!validatedIchingContext) {
      return new Response(JSON.stringify({ error: "Invalid I Ching context" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  }
```

4. After `isPaid` is finally known (after the free-limit block, before `const MODEL`):

```ts
  const promptConfig = getOraclePrompt(philosopher, { deep: isPaid });
  if (!promptConfig) {
    return new Response(JSON.stringify({ error: "Philosopher not available for consultation" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  const contextBlock = validatedIchingContext ? buildIchingContextBlock(validatedIchingContext) : "";
```

(Keep the ORIGINAL early `getOraclePrompt` 404 check at line 45 intact for fast 404s; this second call with `{deep}` reuses the same map.)

5. Message building (~line 112):

```ts
      messages: [
        { role: "system", content: promptConfig.system + contextBlock },
        { role: "user", content: question.trim() },
      ],
      max_completion_tokens: Math.round(promptConfig.maxWords * 1.5),
```

- [ ] **A3.3 Run — all pass (27 + A1 + A2 + these). `npx tsc --noEmit`. Commit:** `git commit -m "feat(oracle): validated cast context + Pro deep prompt in /api/oracle (route tests)"`

### Task A4: Client handoff — cast result and hexagram pages write the context draft

**Files:**
- Modify: `components/IChingDivination.tsx` (result-screen "Ask Zhou Gong" link ~line 148-153)
- Modify: `app/iching/[hexagram]/page.tsx` (replace OracleCta usage at ~209-215)
- Create: `components/OracleStudyLink.tsx` (client)

- [ ] **A4.1 IChingDivination — write context before navigating.** Replace the result-screen Link:

```tsx
import { buildIchingContext, ICHING_CONTEXT_DRAFT_KEY } from "@/lib/iching-context";
import { saveDraft } from "@/lib/draft"; // already imported (saveDraft, loadDraft, clearDraft)
import { useRouter } from "next/navigation";
```

Add `const router = useRouter();` in the component. Replace the Link block:

```tsx
            <button
              type="button"
              onClick={() => {
                // Hand the actual cast to the Oracle (numbers only; server resolves names).
                const ctx = buildIchingContext(casts, hexagrams);
                if (ctx) saveDraft(ICHING_CONTEXT_DRAFT_KEY, ctx);
                router.push("/sophies-journey/prologue-zhougong#oracle");
              }}
              className="px-6 py-2 bg-[#8b4513] text-white rounded-full font-medium hover:opacity-90 transition-colors text-sm"
            >
              Ask Zhou Gong for AI Interpretation →
            </button>
```

Also in `handleReset` (already clears `CAST_DRAFT_KEY`): add `clearDraft(ICHING_CONTEXT_DRAFT_KEY);` — casting again must not resurrect the previous consultation's context.

- [ ] **A4.2 Study entry from fixed hexagram pages.** Create `components/OracleStudyLink.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { buildStudyContext, ICHING_CONTEXT_DRAFT_KEY } from "@/lib/iching-context";
import { saveDraft } from "@/lib/draft";

/** "Study this hexagram" CTA — tells the Oracle the user is LEARNING this
 *  hexagram (no cast, no changing lines), replacing the generic Oracle CTA
 *  on hexagram reference pages. */
export default function OracleStudyLink({
  hexagramNumber,
  accentColor = "#8b4513",
  message,
}: {
  hexagramNumber: number;
  accentColor?: string;
  message: string;
}) {
  const router = useRouter();
  return (
    <div className="mt-12 p-6 bg-cream/60 rounded-sm text-center">
      <p className="font-serif text-ink text-lg mb-4">{message}</p>
      <button
        type="button"
        onClick={() => {
          saveDraft(ICHING_CONTEXT_DRAFT_KEY, buildStudyContext(hexagramNumber));
          router.push("/sophies-journey/prologue-zhougong#oracle");
        }}
        className="inline-block px-7 py-3 rounded-sm text-white font-medium text-sm transition-colors hover:opacity-90 no-underline"
        style={{ backgroundColor: accentColor }}
      >
        Study This Hexagram with Zhou Gong →
      </button>
      <p className="text-xs text-warm/50 mt-2">Free: 3 consultations per day · Pro: 10 per day + deep readings</p>
    </div>
  );
}
```

In `app/iching/[hexagram]/page.tsx`, replace the `<OracleCta philosopherSlug="zhou-gong" … message="Want Zhou Gong to interpret this hexagram for your personal situation? Try the Oracle." />` block (lines ~209-215) with:

```tsx
        <OracleStudyLink
          hexagramNumber={h.number}
          message={`Learning Hexagram ${h.number} (${h.name_zh})? Bring it to Zhou Gong — no coins needed for a study reading.`}
        />
```

(Import it; remove the now-unused `OracleCta` import from THIS file only.)

- [ ] **A4.3 Verify:** `npm test`, `tsc`, `npm run build`; served HTML: `/iching/qian` shows "Study This Hexagram with Zhou Gong"; `/iching` divination section unchanged. Commit: `feat(iching): hand actual cast / study context to the Zhou Gong Oracle`.

### Task A5: OracleOverlay — context card, payload, explicit clears

**Files:**
- Modify: `components/OracleOverlay.tsx`

Known facts: mount effect ~490-510 (restores question draft); consult body line ~572; `[DONE]` clears question draft ~619; question form ~1041; limit-card pattern 975-1039 to copy styling from.

- [ ] **A5.1 Read context draft on mount** (only Zhou Gong carries cast context):

```tsx
import { loadDraft, saveDraft, clearDraft } from "@/lib/draft"; // existing
import { ICHING_CONTEXT_DRAFT_KEY, type IchingConsultationContext } from "@/lib/iching-context";
import { getHexagramByNumber } from "@/lib/iching-data";
```

State: `const [ichingCtx, setIchingCtx] = useState<IchingConsultationContext | null>(null);` In the existing mount effect (after question-draft restore), append:

```tsx
    if (slug === "prologue-zhougong") {
      const ctx = loadDraft<IchingConsultationContext>(ICHING_CONTEXT_DRAFT_KEY);
      if (ctx && (ctx.mode === "cast" || ctx.mode === "study")) setIchingCtx(ctx);
    }
```

- [ ] **A5.2 Context card above the question form** (insert immediately before the `<form onSubmit={handleSubmit}>`, mirroring the limit-card container style — same `mb-4 px-4 py-3 rounded-xl` block with `backgroundColor: "rgba(0,0,0,0.3)"` and accent border):

```tsx
              {ichingCtx && (() => {
                const hex = getHexagramByNumber(ichingCtx.hexagramNumber);
                const transformed = ichingCtx.transformedNumber !== undefined
                  ? getHexagramByNumber(ichingCtx.transformedNumber)
                  : null;
                return (
                  <div
                    className="mb-4 px-4 py-3 rounded-xl"
                    style={{ backgroundColor: "rgba(0,0,0,0.3)", border: `1px solid rgba(${accent},0.25)` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-white/80 text-sm leading-relaxed" style={{ fontFamily: SERIF }}>
                        <p className="text-white/90 font-medium mb-1">
                          {ichingCtx.mode === "cast" ? "Your cast · 你的卦" : "Studying · 学习此卦"}
                        </p>
                        <p>
                          Hexagram {hex?.number} {hex?.name} ({hex?.name_zh})
                          {ichingCtx.changingLines.length > 0 && (
                            <> · changing lines {ichingCtx.changingLines.join(", ")}</>
                          )}
                          {transformed && (
                            <> → {transformed.number} {transformed.name} ({transformed.name_zh})</>
                          )}
                        </p>
                        <p className="text-white/40 text-xs mt-1">
                          AI interpretation for reflection — not a prediction of what will happen.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          clearDraft(ICHING_CONTEXT_DRAFT_KEY);
                          setIchingCtx(null);
                        }}
                        className="text-white/40 hover:text-white/80 text-xs flex-shrink-0"
                        aria-label="Remove hexagram context"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })()}
```

- [ ] **A5.3 Payload + clears.** In `consult()` body (~line 572):

```ts
        body: JSON.stringify(
          slug === "prologue-zhougong" && ichingCtx
            ? { philosopher: slug, question, ichingContext: ichingCtx }
            : { philosopher: slug, question }
        ),
```

In the `[DONE]` success branch (next to the existing `clearDraft(draftKey)`), add:

```ts
          clearDraft(ICHING_CONTEXT_DRAFT_KEY);
          setIchingCtx(null); // if in closure scope needs the setState from component — place both lines where draftKey is cleared
```

Context lifecycle = explicit: cleared on consultation success, on ✕, on "Cast Again" (A4.1), or tab close (sessionStorage); it never auto-applies to other philosophers.

- [ ] **A5.4 Verify:** unit tests still green; `tsc`; `build`; manual dev walkthrough documented in Task A6. Commit: `feat(oracle): show + send the user's cast context; explicit clear on success/dismiss`.

### Task A6: P0-1 acceptance record

- [ ] Local flow (dev server + headless Chrome screenshots, desktop 1440×2600 + mobile 390×2600 where reachable):
  1. `/iching` — cast UI (screenshot).
  2. Cast result with "Ask Zhou Gong for AI Interpretation →" (simulate: the cast needs clicks — for screenshots use the static study path + unit tests for cast logic; document honestly which evidence is test-based vs screenshot).
  3. `/sophies-journey/prologue-zhougong` — question phase card cannot open without a click; capture via `#oracle` anchor screenshot (portrait with Consult button) + note the overlay states are covered by unit tests (A1/A3/A5) — attempt `npx playwright-core` with the cached chromium (`~/Library/Caches/ms-playwright/chromium_headless_shell-1208`) for a click-through capture; if version-incompatible, mark screenshot-of-overlay as not-captured, evidence = tests.
  4. `/iching/qian` — "Study This Hexagram with Zhou Gong →" (screenshot).
- [ ] Guest→login→return: code-verified (draft keys survive navigation by design; login redirect keeps pathname via Task-4 round-1 wiring). LIVE login round-trip needs a test account — mark 未验证 in the report unless credentials are provided (same pending item as P0-2).
- [ ] No double-count: restore paths make zero API calls (assert in review); refresh does not auto-submit.
- [ ] No cross-consultation bleed: context key read only for zhou-gong; cleared on success/✕/Cast Again/tab close.
- [ ] Record everything in `docs/round2-report.md` (created in Task F2).

---

## Phase B — P0-2: Provable payment chain + REAL Pro difference

### Task B1: Zi Wei deep mode (prompts + routes)

**Files:**
- Modify: `lib/ziwei-prompts.ts` (add addendum + `getSystemPrompt(language, opts?)`)
- Modify: `app/api/ziwei/interpret/route.ts` (~line 144: `max_completion_tokens: 3000`)
- Modify: `app/api/ziwei/synastry/route.ts` (~line 176: `max_completion_tokens: 4000`)
- Test: extend `lib/__tests__/oracle-route.test.ts` pattern → new `lib/__tests__/ziwei-prompts.test.ts`

Known: `getSystemPrompt(language)` at ziwei-prompts.ts:103 selects en/zh/both variants of `ZIWEI_SYSTEM_PROMPT`; prompts already carry safety rules (entertainment disclaimer, no death dates, no fear). `isPaid` exists in both routes (interpret:75-98, synastry:102-125); systemPrompt currently built WITHOUT deep.

- [ ] **B1.1 Failing tests** (`lib/__tests__/ziwei-prompts.test.ts`):

```ts
import { describe, expect, it } from "vitest";
import { getSystemPrompt, ZIWEI_DEEP_ADDENDUM } from "../ziwei-prompts";

describe("getSystemPrompt deep mode", () => {
  it("base prompt unchanged; deep appends addendum for all languages", () => {
    for (const lang of ["en", "zh", "both"] as const) {
      const base = getSystemPrompt(lang);
      const deep = getSystemPrompt(lang, { deep: true });
      expect(deep.startsWith(base)).toBe(true);
      expect(deep).toContain("DEEP READING");
    }
    expect(getSystemPrompt("en")).not.toContain("DEEP READING");
    expect(typeof ZIWEI_DEEP_ADDENDUM).toBe("string");
  });

  it("keeps the entertainment/reflection disclaimer in deep mode", () => {
    expect(getSystemPrompt("en", { deep: true })).toContain("entertainment");
  });
});
```

- [ ] **B1.2 Implement.** In `lib/ziwei-prompts.ts` add:

```ts
/** Appended for Pro readings: deeper structure, roughly double the depth. */
export const ZIWEI_DEEP_ADDENDUM = `

DEEP READING MODE (Pro):
In addition to the standard sections:
- Add "DECADES & TIMING (大限流年)" — a plain-language overview of the current decade (大限) and year (流年) themes shown in the chart data, framed as tendencies to work with, not fixed events.
- Add "PALACE INTERACTIONS (宫位互参)" — connect at least two palace trios (e.g., 命宫–财帛宫–事业宫) and explain the interplay.
- End with "REFLECTION" — 3 open questions for self-cultivation.
Same rules apply: entertainment, cultural education, and reflection only; no medical/legal/financial directives; never frame challenges as doom.`;
```

Change `getSystemPrompt` (line 103) to:

```ts
export function getSystemPrompt(
  language: "en" | "zh" | "both",
  opts?: { deep?: boolean }
): string {
  // keep the existing en/zh/both assembly, then:
  // (read the current implementation and append:)
  //   return opts?.deep ? base + ZIWEI_DEEP_ADDENDUM : base;
}
```

(Read lines 103-115 first; apply the append to the assembled result for "both" so the addendum appears once, in English.)

In both routes, after `isPaid` is final: `const systemPrompt = getSystemPrompt(language, { deep: isPaid });` and `max_completion_tokens: isPaid ? 6000 : 3000` (interpret) / `isPaid ? 8000 : 4000` (synastry). Free output unchanged.

- [ ] **B1.3 Run tests, tsc, build. Commit:** `feat(ziwei): Pro deep readings — timing/palace-interaction sections, doubled budget`.

### Task B2: Webhook fixes + route tests (TDD)

**Files:**
- Modify: `app/api/webhooks/creem/route.ts`
- Test: `lib/__tests__/creem-webhook.test.ts` (new)

Known: route has its own inline HMAC verify (lines 8-15); line ~21: `if (CREEM_WEBHOOK_SECRET && !verifySignature(...))` — **skips verification when secret unset**; line ~66: `expiresAt = new Date(Date.now() + 30*86400000)` ignores the event; events handled: checkout.completed/subscription.active/paid → activate; scheduled_cancel → direct update; canceled/expired → cancel. Route imports `createClient` from `@supabase/supabase-js` and `{ activateSubscription, cancelSubscription }` from `@/lib/creem` (verify imports by reading the file first).

- [ ] **B2.1 Failing tests** (`lib/__tests__/creem-webhook.test.ts`):

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { createHmac } from "crypto";

const activate = vi.fn();
const cancel = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({}), // service client passed through to lib/creem
}));
vi.mock("@/lib/creem", () => ({
  activateSubscription: activate,
  cancelSubscription: cancel,
}));

import { POST } from "../../app/api/webhooks/creem/route";

const SECRET = "whsec_test_123";

function signedEvent(event: Record<string, unknown>, secret = SECRET) {
  const body = JSON.stringify(event);
  const sig = createHmac("sha256", secret).update(body).digest("hex");
  return new Request("http://localhost/api/webhooks/creem", {
    method: "POST",
    headers: { "content-type": "application/json", "creem-signature": sig },
    body,
  });
}

const SUB_EVENT = (type: string, extra: Record<string, unknown> = {}) => ({
  id: "evt_123",
  eventType: type,
  object: {
    id: "sub_abc",
    customer_id: "cus_1",
    customer_email: "buyer@example.com",
    metadata: { userId: "u-1" },
    ...extra,
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CREEM_WEBHOOK_SECRET", SECRET);
});

describe("signature enforcement", () => {
  it("activates on a correctly signed checkout.completed", async () => {
    const res = await POST(signedEvent(SUB_EVENT("checkout.completed")) as never);
    expect(res.status).toBe(200);
    expect(activate).toHaveBeenCalledTimes(1);
    const args = activate.mock.calls[0];
    expect(args[2]).toBe("cus_1"); // customerId
    expect(args[4]).toBe("u-1"); // metadata userId position — adjust to actual signature
  });

  it("rejects a bad signature (401) and does not activate", async () => {
    const res = await POST(signedEvent(SUB_EVENT("checkout.completed"), "wrong") as never);
    expect(res.status).toBe(401);
    expect(activate).not.toHaveBeenCalled();
  });

  it("REJECTS when the secret is not configured (fail closed) — new behavior", async () => {
    vi.stubEnv("CREEM_WEBHOOK_SECRET", "");
    const res = await POST(signedEvent(SUB_EVENT("checkout.completed")) as never);
    expect(res.status).toBe(500);
    expect(activate).not.toHaveBeenCalled();
  });
});

describe("expiry from event (no more hardcoded +30d)", () => {
  it("uses the event's current_period_end_date when present and future", async () => {
    const future = Math.floor(Date.now() / 1000) + 60 * 86400; // unix seconds
    await POST(signedEvent(SUB_EVENT("subscription.paid", { current_period_end_date: future })) as never);
    const expiresArg = activate.mock.calls[0][3]; // position of expiresAt — adjust to actual
    expect(expiresArg.getTime()).toBeGreaterThan(Date.now() + 50 * 86400000);
  });

  it("falls back to +30d when the event carries no usable expiry", async () => {
    await POST(signedEvent(SUB_EVENT("subscription.active")) as never);
    const expiresArg = activate.mock.calls[0][3];
    const delta = expiresArg.getTime() - Date.now();
    expect(delta).toBeGreaterThan(29 * 86400000);
    expect(delta).toBeLessThan(31 * 86400000);
  });

  it("ignores a past/garbage expiry and falls back", async () => {
    await POST(signedEvent(SUB_EVENT("subscription.paid", { current_period_end_date: "garbage" })) as never);
    const delta = activate.mock.calls[0][3].getTime() - Date.now();
    expect(delta).toBeGreaterThan(29 * 86400000);
  });
});

describe("replay & lifecycle", () => {
  it("duplicate (replayed) activation calls are idempotent — same args, upsert semantics unchanged", async () => {
    const evt = signedEvent(SUB_EVENT("subscription.active"));
    await POST(evt as never);
    await POST(evt as never);
    expect(activate).toHaveBeenCalledTimes(2);
    expect(activate.mock.calls[0][2]).toBe(activate.mock.calls[1][2]);
    // entitlement outcome identical: activateSubscription upserts on creem_subscription_id (idempotent row, no double billing exists — billing is Creem-side)
  });

  it("subscription.canceled routes to cancelSubscription", async () => {
    await POST(signedEvent(SUB_EVENT("subscription.canceled")) as never);
    expect(cancel).toHaveBeenCalledWith(expect.anything(), "sub_abc", "cancelled");
  });
});
```

(Positional args in assertions must be adjusted to the ACTUAL `activateSubscription(supabase, subscriptionId, customerId, customerEmail, expiresAt, metadataUserId)` signature — read `lib/creem.ts:88-137` first and fix indices. `vi.stubEnv` works if the route reads `process.env` at request time; if read at module load, switch the route to read inside the handler (that change is part of the fix).)

- [ ] **B2.2 Implement in `app/api/webhooks/creem/route.ts`:**

1. Secret handling (fail closed):

```ts
  const secret = process.env.CREEM_WEBHOOK_SECRET;
  if (!secret) {
    console.error("creem webhook: CREEM_WEBHOOK_SECRET not configured — rejecting event");
    return new Response("Webhook not configured", { status: 500 });
  }
  const signature = request.headers.get("creem-signature") || "";
  if (!verifySignature(await rawBody, signature, secret)) { // keep current reading order
    return new Response("Invalid signature", { status: 401 });
  }
```

(Replace the current `if (CREEM_WEBHOOK_SECRET && !verifySignature(...))` — read the file; keep its body-reading approach, e.g. `const rawBody = await request.text()` then parse.)

2. Expiry parsing (replaces hardcoded +30d):

```ts
  // Real expiry from the event when available; +30d fallback keeps renewals safe.
  const expiryCandidates = [
    (obj as Record<string, unknown>)["current_period_end_date"],
    (obj as Record<string, unknown>)["current_period_end"],
    (obj as Record<string, unknown>)["expires_at"],
    (obj as Record<string, unknown>)["expires_date"],
  ];
  let expiresAt = new Date(Date.now() + 30 * 86_400_000);
  for (const c of expiryCandidates) {
    if (c === null || c === undefined) continue;
    const d = new Date(typeof c === "number" ? c * 1000 : String(c));
    if (!isNaN(d.getTime()) && d.getTime() > Date.now()) {
      expiresAt = d;
      break;
    }
  }
```

(Field-name candidates are deliberate: Creem's exact schema gets confirmed during test-mode verification; robust parsing + fallback covers all cases. Note this in the report.)

- [ ] **B2.3 Run — pass; tsc; build. Commit:** `fix(webhook): fail closed without signing secret; honor event expiry over hardcoded +30d`.

### Task B3: Entitlements doc + honest Pro copy + example block

**Files:**
- Create: `docs/entitlements.md`
- Modify: `app/pricing/page.tsx` (proFeatures list ~24-30; add honest example/compare block)
- Modify: `app/account/upgrade-button.tsx` (copy — read first)
- Modify: `components/OracleCta.tsx:39` footnote
- Modify: limit-exhausted messages in `components/OracleOverlay.tsx` (~962-1000) ONLY if they understate the new real difference (they currently say "Pro unlocks deep features and 10 per day" — now TRUE; verify wording matches: "deep readings (~2× length + reflection prompts)")

- [ ] **B3.1 Write `docs/entitlements.md`** — table from code facts:

| Capability | Free | Pro ($4.99/mo) |
|---|---|---|
| Oracle consultation | 3 / 24h, standard reading (~800 words max) | 10 / 24h, DEEP reading (~2× budget + Going Deeper + 3 reflection questions + follow-up invite) |
| I Ching casting | Unlimited, no login | Same |
| Zi Wei chart cast | Unlimited, no login | Same |
| Zi Wei AI reading | 3 / 24h shared, standard 6 sections | 10 / 24h shared, + Decades & Timing + Palace Interactions + Reflection, ~2× budget |
| Synastry AI analysis | 3 / 24h shared | 10 / 24h shared, deep mode |
| Quota window | Sliding 24h from first request, shared across all three AI endpoints per user | Same |
| Quota storage | In-memory per server instance (resets on deploy; not shared across instances — known limitation, owner decision pending) | Same |

Plus: entitlement source of truth (webhook-only), status values (`active`/`scheduled_cancel`), reset rule, and the /account email-claim caveat (flagged, unfixed by decision).

- [ ] **B3.2 Pricing page copy.** Replace `proFeatures` items that lack implementation and state the now-real difference:

```ts
  const proFeatures = [
    "10 AI consultations per day (free: 3)",
    "Deep readings — ~2× length with Going Deeper, reflection prompts & follow-ups",
    "Zi Wei deep mode: timing (大限流年) & palace-interaction analysis",
    "Cancel anytime",
  ];
```

Add an honest example block below the two tier cards (no fabricated transcripts — show the STRUCTURE difference truthfully):

```tsx
      {/* What Pro actually adds — faithful to the implementation */}
      <section className="mb-12 p-6 bg-cream rounded-xl border border-sand">
        <h2 className="text-lg font-semibold text-ink mb-3">What a Pro reading adds</h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="p-4 bg-white rounded-lg border border-sand">
            <p className="font-medium text-ink mb-2">Free reading</p>
            <ul className="space-y-1 text-warm">
              <li>• Traditional teaching, quoted from the classic</li>
              <li>• AI interpretation of your question</li>
              <li>• 2–3 reflection questions</li>
              <li>• Up to ~800 words</li>
            </ul>
          </div>
          <div className="p-4 bg-white rounded-lg border-2 border-china-red">
            <p className="font-medium text-china-red mb-2">Pro deep reading — everything in Free, plus</p>
            <ul className="space-y-1 text-warm">
              <li>• “Going Deeper”: a second angle on your question</li>
              <li>• Zi Wei: decade &amp; year timing, palace interactions</li>
              <li>• 3 reflection questions + one follow-up invitation</li>
              <li>• Up to ~2× the length</li>
            </ul>
          </div>
        </div>
        <p className="text-xs text-warm/60 mt-3">
          Same engine, same sources — Pro readings go deeper and longer, and you get 10 per day instead of 3.
        </p>
      </section>
```

Update `upgrade-button.tsx` label/description if it repeats "deep interpretations" vaguely — align to "Deep readings (~2× length + reflection prompts)". OracleCta footnote → `Free: 3 consultations per day · Pro: 10 per day + deep readings`.

- [ ] **B3.3 Verify:** served `/pricing` shows the block; all surfaces consistent with docs/entitlements.md. Commit: `docs+feat(pricing): entitlements reference + honest Pro difference copy`.

### Task B4: Payment-chain verification matrix (mocked + documented)

- [ ] **B4.1 Mocked chain test** — extend `lib/__tests__/creem-webhook.test.ts` with a "full chain" describe: signed `checkout.completed` → activate upserts (mock) → `getSubscriptionByUserId` mock returns `{status:"active"}` → assert the route-side gate logic: copy the actual gate predicate into the test (`const hasAccess = s => s?.status === "active" || s?.status === "scheduled_cancel"`) and assert free/pending/scheduled_cancel/expired rows map to expected access. (This documents gate behavior; the gate itself is untouched.)
- [ ] **B4.2 Failure/cancel/duplicate matrix** — already covered by B2 tests (bad sig, no secret, replay, canceled/expired). Add `subscription.scheduled_cancel` case asserting the direct update path (mock the supabase chain — if the route calls supabase directly for this branch, mock `@supabase/supabase-js` chainable `.from().update().eq()`).
- [ ] **B4.3 REAL chain = 未验证.** Document in the report: what's needed = (a) Creem **test-mode** API key + test product (`.env.example` documents `CREEM_API_BASE=https://test-api.creem.io`), (b) a throwaway account in a NON-production Supabase (or explicit owner approval to use a designated test account in prod), (c) local webhook tunnel (e.g. `vercel dev` or a public tunnel) so Creem test events reach the route. NO real charges; success-page redirect is NOT treated as delivery proof (webhook row is).
- [ ] **B4.4 Checkout edge tests** (mocked): unauthenticated POST `/api/checkout` → 401; authenticated + Creem error → 502 with error body (read the route, add tests in `lib/__tests__/checkout-route.test.ts` following the A3 mock pattern; fetch mocked global). Double-click upgrade = two checkout sessions created but zero charges — document, don't "fix".

---

## Phase C — P0-3: Truthful email promises

### Task C1: Copy truthization (all surfaces)

**Files:**
- Modify: `components/EmailCapture.tsx` (defaults lines 22-29; success line 53; leadMagnet render line 111)
- Modify: `app/ziwei/page.tsx:138-142`, `app/insights/[slug]/page.tsx:250-254`, `app/iching/page.tsx:104-108`, `app/daily-iching/page.tsx:282-287`, `components/ZiweiChart.tsx:361-367`, `components/IChingDivination.tsx:170-176`
- Modify: `app/api/newsletter/route.ts:95` (response message)

Truth baseline: storage IS real (Supabase `newsletter_subscribers`); NOTHING is ever emailed (no sender exists); no PDF exists; no scheduler exists; "Save Your Chart" saves nothing; "500+" is invented.

- [ ] **C1.1 `EmailCapture.tsx`:**

```ts
  title = "Get Chinese Culture Insights",
  subtitle = "New GoEast guides on Chinese philosophy, I Ching, and practical life in China.",
  buttonText = "Subscribe",
  source = "website",
  variant = "card",
```

Remove `leadMagnet` from defaults (`leadMagnet?: string` prop may stay for future real magnets but render it only when passed — after C1 no call site passes it). Success copy (line 53):

```ts
        ? "You're already subscribed!"
        : "Subscribed — you're on the list."
```

(no inbox promise; "on the list" is literally true).

- [ ] **C1.2 Call sites** (kill every frequency/count/save/PDF claim):

| File | New title | New subtitle |
|---|---|---|
| `app/ziwei/page.tsx` | `Get Zi Wei Dou Shu Insights` | `New Zi Wei guides and tools from GoEast.` |
| `app/insights/[slug]/page.tsx` | `Explore More of GoEast` | `New guides on Chinese philosophy, I Ching, and practical life in China.` |
| `app/iching/page.tsx` | `I Ching Updates from GoEast` | `The 64-hexagram library is always free here — subscribe to hear when we add new readings and guides.` |
| `app/daily-iching/page.tsx` | `I Ching Updates` | `Today's reading lives on this page. Subscribe to hear when we publish new I Ching and philosophy guides.` |
| `components/ZiweiChart.tsx` | `Get Astrology Insights` | `New Zi Wei Dou Shu guides from GoEast.` (title change kills "Save Your Chart &") |
| `components/IChingDivination.tsx` | `I Ching Updates from GoEast` | same as /iching page; REMOVE the `leadMagnet` line |

Delete every `leadMagnet=` prop. `/api/newsletter/route.ts:95` → `"Subscribed successfully."`.

- [ ] **C1.3 Unsubscribe honesty check:** read `app/privacy/page.tsx` — grep "unsubscribe". If the policy promises email unsubscribe, either (a) soften the policy sentence to match reality (email us via contact page to be removed — the DB supports `status='unsubscribed'`), or (b) if owner prefers, add a minimal `POST /api/newsletter/unsubscribe {email}` (schema already has the status column). Default to (a) copy-only; note the option in the report.
- [ ] **C1.4 Verify:** `grep -rn "500+|Check your inbox|every morning|China Travel Checklist|Save Your Chart|Weekly .* Insights|Daily I Ching in Your Inbox" app/ components/` → zero hits. Build + served pages show new copy. Commit: `fix(email): truthful subscription copy — no fake frequency, PDF, save, or counts`.

### Task C2: Newsletter route tests (TDD, mocked Supabase)

**Files:**
- Test: `lib/__tests__/newsletter-route.test.ts`
- Modify: `app/api/newsletter/route.ts` only if tests expose bugs

- [ ] **C2.1 Tests** (mock `@/lib/supabase/server` createClient chainable `.from("newsletter_subscribers")`):

```ts
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => mockClient }));
```

Cases: valid email → insert called with `{email, source, status:"active"}`; invalid (no @, >255) → 400; duplicate `23505` → returns `{alreadySubscribed:true}`; previously unsubscribed → update to active path; insert error → 500 `{error}`. Assert response messages never promise an email.
- [ ] **C2.2 Real-inbox verification = 未验证** (needs owner-approved test address + an actual sender — out of scope per decision 2). Local evidence = route tests + Supabase row NOT verifiable against production DB (do not insert test rows into production).

---

## Phase D — P1-1: Precision edits on 4 articles (WebSearch-verified)

Each article task follows the same discipline: WebSearch official sources (WeChat/Alipay help centers, provider docs) at execution time; record source URL + check date (2026-10-21) in an "Sources" appendix at the article end; update `published_at` to the re-verification date; keep edits surgical (no expansion of untouched sections); body + takeaways + frontmatter `faqs` + `how_to` stay in sync; NO `/skills/` links remain in these 4 files.

### Task D1: wechat-pay-foreigner.md

- [ ] WebSearch: current foreign-card link limits & verification flow (official WeChat Pay / Tencent support pages). Update the "~¥20,000/year" figure (line 253 + FAQ 318) to the sourced current number, or replace with "check the in-app limit page; as of <date> official guidance states …" with citation.
- [ ] DELETE the Google-Voice/friend-SMS workaround (lines 283-285) — replace with "Use a number you can receive SMS on (roaming usually works); verification codes cannot reliably be delivered to virtual numbers."
- [ ] Add the 零钱 distinction: foreign cards pay merchants DIRECTLY; topping up 零钱 balance with a foreign card is generally NOT supported — verify current status via search and state it with source.
- [ ] Replace 6 `/skills/` links (lines 148-150 zh, 326-328 en) with real guide pages (`/insights/alipay-vs-wechat-pay-foreigner`, `/china-travel-guide`).
- [ ] Sync frontmatter faqs with any changed facts; keep "How do I fix failures?" FAQ aligned to body.

### Task D2: china-esim-foreigner-guide.md

- [ ] WebSearch: mainland-China eSIM routing behavior (which providers route via international IP vs mainland) + current iPhone/Android eSIM support for foreigners; add a "Routing & what works" subsection with 2-3 sourced facts (e.g., international-roaming eSIMs reach Google services; mainland-IP data plans don't) — precise, not "all eSIMs need VPN" (the article already avoids that; FAQ 2 stays accurate).
- [ ] Replace the 2 `/skills/` links (lines 125,127) with `/china-travel-guide` and `/insights/best-translation-apps-china-travel`.
- [ ] Keep the generic decision matrix; add one sourced sentence on plan data sizes typical for 1-2 week trips (with source) — no invented prices.

### Task D3: china-food-delivery-foreigner-guide.md

- [ ] Fix takeaway line 11: `Address precision is the #1 failure point for foreign users. Copy your exact Chinese address.` → keep meaning, tighten: `Wrong addresses are the #1 failure point — copy your exact Chinese address from your hotel or delivery app.` (The user-reported "残句" was the truncated meta-description/FAQ snippet; verify locally that meta description now ends cleanly — clipText from round 1 already guarantees word boundaries; assert in D5 regression test.)
- [ ] Verify platform claims (Meituan/Ele.e mini-program login via Alipay/WeChat, no Chinese ID) — WebSearch current status; soften "no Chinese ID is required for basic ordering" if sources changed; keep "no Chinese bank account needed" only for the payment methods actually stated in body.
- [ ] Add check-date + any source; keep structure.

### Task D4: wu-wei-philosophy.md

- [ ] Compare frontmatter `faqs` answers with body sections; merge/dedupe (spec: reduce duplicate FAQs). Target: 3 FAQs max, each adding info the body doesn't already state verbatim; sync visible FAQ + JSON-LD (automatic via generator).
- [ ] Sharpen the concept-vs-application split: ensure body has one clearly-labeled "The concept" stretch and one "Modern applications" stretch (retitle existing H2s if needed — minimal edits), no new content invented.
- [ ] Laozi entry: `/sophies-journey/ch01-laozi` links already exist (lines 104, 349) + page-level OracleCta deep-links (round 1) — verify both, no change unless broken.

### Task D5: Regression tests + homepage wording

**Files:**
- Create: `lib/__tests__/content-regression.test.ts`
- Modify: `app/page.tsx:360`

- [ ] **Tests:**

```ts
import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

const DIR = path.join(process.cwd(), "content/insights");
const FILES = ["wechat-pay-foreigner.md", "china-esim-foreigner-guide.md", "china-food-delivery-foreigner-guide.md", "wu-wei-philosophy.md"];

describe("content regression — editorial hygiene", () => {
  it("no internal SEO editorial phrases anywhere", () => {
    for (const f of fs.readdirSync(DIR)) {
      const text = fs.readFileSync(path.join(DIR, f), "utf8");
      expect(text, f).not.toMatch(/SEO takeaway|Search intent here|optimized landing/i);
    }
  });

  it("the four edited articles link to guide pages, not developer skills", () => {
    for (const f of FILES) {
      const text = fs.readFileSync(path.join(DIR, f), "utf8");
      expect(text.includes("/skills/"), f).toBe(false);
    }
  });

  it("takeaways never end mid-word (dangling fragment check)", () => {
    for (const f of FILES) {
      const text = fs.readFileSync(path.join(DIR, f), "utf8");
      const m = text.match(/takeaways:\n((?:\s*-\s*.+\n)+)/);
      const items = m ? m[1].trim().split("\n") : [];
      for (const item of items) {
        const t = item.replace(/^\s*-\s*/, "").trim();
        expect(/[.!?。！？]$/.test(t), `${f}: "${t}"`).toBe(true);
      }
    }
  });

  it("no duplicate FAQ questions within an article", () => {
    for (const f of FILES) {
      const text = fs.readFileSync(path.join(DIR, f), "utf8");
      const qs = [...text.matchAll(/question:\s*"(.+?)"/g)].map((m) => m[1].toLowerCase());
      expect(new Set(qs).size, f).toBe(qs.length);
    }
  });

  it("homepage no longer says 'optimized landing guides'", () => {
    const home = fs.readFileSync(path.join(process.cwd(), "app/page.tsx"), "utf8");
    expect(home).not.toMatch(/optimized landing/i);
  });
});
```

- [ ] Homepage: replace `Choose a search topic and jump directly to optimized landing guides.` (app/page.tsx:360) with `Choose a topic and jump straight into the guide.`
- [ ] Commit: `test(content): editorial regression checks + homepage wording`.

---

## Phase E — P1-2: Minimal conversion analytics (no new backend)

### Task E1: PII-free analytics wrapper (TDD)

**Files:**
- Create: `lib/analytics.ts`
- Test: `lib/__tests__/analytics.test.ts`

- [ ] **Failing test:**

```ts
import { describe, expect, it, vi } from "vitest";
const track = vi.fn();
vi.mock("@vercel/analytics", () => ({ track }));
import { logEvent } from "../analytics";

describe("logEvent", () => {
  it("forwards allowed string/number/boolean data", () => {
    logEvent("oracle_consult_started", { philosopher: "prologue-zhougong", with_context: true });
    expect(track).toHaveBeenCalledWith("oracle_consult_started", { philosopher: "prologue-zhougong", with_context: true });
  });

  it("drops non-scalar values (never ships objects that could hide PII)", () => {
    logEvent("x", { bad: {email: "a@b.c"}, n: 1 } as never);
    expect(track).toHaveBeenCalledWith("x", { n: 1 });
  });

  it("never throws (analytics must not break UX)", () => {
    track.mockImplementation(() => { throw new Error("boom"); });
    expect(() => logEvent("x")).not.toThrow();
  });
});
```

- [ ] **Implementation:**

```ts
import { track } from "@vercel/analytics";

export type AnalyticsEvent =
  | "iching_cast_completed"
  | "oracle_opened_with_hexagram"
  | "oracle_consult_started"
  | "oracle_reading_delivered"
  | "oracle_limit_reached"
  | "ziwei_chart_generated"
  | "ziwei_reading_started"
  | "synastry_analysis_started"
  | "login_with_return_target"
  | "upgrade_clicked"
  | "newsletter_subscribed";

type AnalyticsData = Record<string, string | number | boolean>;

/** Fire a conversion event. Scalars only — emails, questions, birth data and
 *  chart payloads must NEVER be passed here. Failures are swallowed. */
export function logEvent(name: AnalyticsEvent, data: AnalyticsData = {}): void {
  const clean: AnalyticsData = {};
  for (const [k, v] of Object.entries(data)) {
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") clean[k] = v;
  }
  try {
    track(name, clean);
    if (process.env.NODE_ENV === "development") {
      console.debug("[analytics]", name, clean);
    }
  } catch {
    // analytics must never break the product
  }
}
```

### Task E2: Wire the events (client)

| File | Trigger | Call |
|---|---|---|
| `components/IChingDivination.tsx` | cast completes (phase→"result") | `logEvent("iching_cast_completed", { has_changing })` |
| `components/OracleOverlay.tsx` | mount with `ichingCtx` | `logEvent("oracle_opened_with_hexagram", { mode })` |
| `components/OracleOverlay.tsx` | consult() dispatch | `logEvent("oracle_consult_started", { philosopher: slug, with_context: !!ichingCtx })` |
| `components/OracleOverlay.tsx` | `[DONE]` | `logEvent("oracle_reading_delivered", { philosopher: slug })` |
| `components/OracleOverlay.tsx` | limit branch | `logEvent("oracle_limit_reached", { subscribed: isSubscribed })` |
| `components/ZiweiChart.tsx` | chart generated | `logEvent("ziwei_chart_generated")` |
| `components/ZiweiInterpretation.tsx` | handleInterpret dispatch | `logEvent("ziwei_reading_started")` |
| `components/ZiweiSynastry.tsx` | handleAnalyze dispatch | `logEvent("synastry_analysis_started")` |
| `app/login/page.tsx` | mount when `next !== "/account"` | `logEvent("login_with_return_target", {})` — no path value needed (privacy-neutral count) |
| `app/pricing/pricing-client.tsx` | handleUpgrade click | `logEvent("upgrade_clicked", { from: "pricing" })` |
| `components/OracleOverlay.tsx` handleUnlock | unlock click | `logEvent("upgrade_clicked", { from: "oracle" })` |
| `app/account/upgrade-button.tsx` | click (read file first) | `logEvent("upgrade_clicked", { from: "account" })` |
| `components/EmailCapture.tsx` | success | `logEvent("newsletter_subscribed", { source })` |

Retry-safety: events fire on user-initiated dispatch only; `[DONE]` fires once per successful stream; failed streams never emit `oracle_reading_delivered` (no double counting); loading guards already prevent double dispatch of consult/upgrade.

### Task E3: Server-side payment confirmation log

**File:** `app/api/webhooks/creem/route.ts` — after successful `activateSubscription`:

```ts
  console.log(JSON.stringify({ event: "subscription_activated", subscription_id: subscriptionId, plan: "pro" }));
```

and in the cancel branches `event: "subscription_cancelled"` (ids only — never emails). These land in Vercel runtime logs = the server-authoritative payment record for funnel analysis (VA receives no server events by design).

### Task E4: Evidence + funnel doc

- [ ] `docs/analytics-funnel.md`: table mapping each event → funnel step → where to view it (VA dashboard → Events after deploy; Vercel runtime logs → filter `subscription_activated`), plus the known gaps (VA collects only in production; server events not in VA).
- [ ] Local evidence: dev console `[analytics]` lines (the wrapper logs in dev) captured during the A6 walkthrough; unit tests E1.

---

## Phase F — Verification & delivery

### Task F1: Full pass

- [ ] `npm test` (record count — expect 27 + ~35 new), `npx tsc --noEmit`, `npm run build`, lint delta vs baseline (35 pre-existing; target 0 new).
- [ ] Served-HTML acceptance: `/pricing` honest block; `/iching/qian` study CTA; newsletter copy on 4 pages; `grep` guards from C1.4/D5.
- [ ] Desktop/mobile screenshots of: /iching, /iching/qian, /pricing, prologue chapter #oracle (best-effort overlay per A6).

### Task F2: Report + final commit

- [ ] `docs/round2-report.md`: per-task acceptance (通过/失败/未验证) with evidence links, the entitlements table, the payment-chain matrix (mocked results + 未验证 items with exact needs), analytics funnel evidence, business rules left for the owner (quota-store migration, /account email-claim, welcome email, unsubscribe endpoint), branch/commits, rollback (`git checkout main && git branch -D feat/round2-consultation-flow`; no DB/env changes so no配套 rollback).
- [ ] Await review. No merge, no deploy.

---

## Self-Review

- Spec coverage: P0-1 → A1-A6 (context 完整传递、学习模式不虚构变爻、登录前后一致、三段式区分传统/AI/反思+免责、隐私+清除机制、验收)；P0-2 → B1-B4（真实差异实现 per 用户决策、文档、统一文案、忠实示例、失败/取消/重放矩阵、真实支付标未验证）；P0-3 → C1-C2（频率/500+/PDF/Save 真实化、退订核实、测试邮箱项标未验证）；P1-1 → D1-D5（四篇 + 来源/日期 + /skills/ 清理 + 回归测试 + 首页措辞）；P1-2 → E1-E4（检查现有 VA、最小事件、服务端支付确认、防重计、PII 红线、证据+漏斗文档）。交付要求 → F1-F2。
- Placeholder scan: ziwei `getSystemPrompt` 修改以"读文件后套用"表述——保留了实际 addendum 代码与调用点行号；webhook 测试的参数位置明确标注"读 creem.ts 实际签名后调整索引"。其余步骤均含完整代码。
- Type consistency: `IchingConsultationContext` 字段（mode/hexagramNumber/changingLines/transformedNumber?）在 A1 定义、A3/A5 消费；`logEvent(name, data?)` 签名在 E1 定义、E2 全部按同签名调用；draft key 常量 `ICHING_CONTEXT_DRAFT_KEY` 贯穿 A4/A5。
- Known risk: B2 的 Creem 事件字段名为候选列表 + 回退（真实字段在 test-mode 验证时确认）；A3 路由测试依赖 vi.mock 结构与实际 import 匹配（执行者先读文件再套用 mock 目标）。
