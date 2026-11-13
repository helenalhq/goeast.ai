# I Ching Hexagram Table Collation & AI Citation Reliability Report

Date: 2026-11-13 · Branch: `feat/iching-collation` · Status: awaiting preview acceptance (NOT deployed to production)

## 1. Collation source

- **Trigram table (all 64)**: Wikipedia, *List of hexagrams of the I Ching*
  (King Wen order; inner/lower + outer/upper per hexagram), CC BY-SA 4.0,
  fetched 2026-11-13 — transcribed into the independent test fixture
  `lib/__tests__/iching-collation.test.ts`. Binaries in the fixture are
  **derived** from the canonical trigrams (bottom-up bits), never copied from
  the data file under test.
- **Chinese classical text**: 卦辞/象辞 are the *Zhouyi* (周易) core text —
  public domain. Stored in `lib/iching-data.ts` (`judgment_zh`/`image_zh`),
  complete for all 64 (tested).
- **English text**: `judgment_en`/`image_en` are **modern English paraphrases
  written in-house by GoEast**. Source/license of the *original wording*:
  house-authored; no external translation is copied, and none is claimed.
  They are therefore never displayed or prompted as a quotation or as a
  published translation (see §3).

Convention preserved: `binary[0]` = initial (bottom) line; lines read
bottom-up. Trigram bits bottom-up: Qian 111, Dui 110, Li 101, Zhen 100,
Xun 011, Kan 010, Gen 001, Kun 000.

## 2. The 12 flagged discrepancies — disposition (plus 3 hidden partners)

The owner's static check flagged internal label↔binary inconsistencies in 12
entries. Full canonical comparison showed **15 entries wrong in total** —
three pairs were *internally consistent but both fields wrong* (invisible to
an internal-only check), which is why the independent table was required.

| # | Hexagram | Field | Before | After | Reason (canonical) |
|---|---|---|---|---|---|
| 4 | 蒙 | upper | Zhen | **Gen** | 山水蒙 Gen上Kan下; binary 010001 was already correct |
| 5 | 需 | binary | 010111 | **111010** | 水天需 Qian下Kan上; stored value was 讼's pattern — **pair swap with #6** |
| 6 | 讼 | binary | 111010 | **010111** | 天水讼 Kan下Qian上 — pair swap with #5 |
| 6 | 讼 | labels | Kan/Qian | **Qian/Kan** | label had agreed with the wrong binary (hidden error) |
| 7 | 师 | lower | Zhen | **Kan** | 地水师 Kun上Kan下; binary 010000 already correct |
| 8 | 比 | upper | Zhen | **Kan** | 水地比 Kan上Kun下; binary 000010 already correct |
| 10 | 履 | lower | Xun | **Dui** | 天泽履 Qian上Dui下; binary 110111 already correct |
| 11 | 泰 | binary | 000111 | **111000** | 地天泰 Qian下Kun上 — **pair swap with #12** |
| 12 | 否 | binary | 111000 | **000111** | 天地否 Kun下Qian上 — pair swap with #11 |
| 11/12 | 泰/否 | labels | (each other's) | swapped | labels had agreed with the swapped binaries (hidden) |
| 18 | 蛊 | upper | Zhen | **Gen** | 山风蛊 Gen上Xun下; binary 011001 already correct |
| 21 | 噬嗑 | binary | 101001 | **100101** | 火雷噬嗑 Zhen下Li上 — **pair swap with #22** |
| 22 | 贲 | binary | 100101 | **101001** | 山火贲 Li下Gen上 — pair swap with #21 |
| 22 | 贲 | upper | Zhen | **Gen** | label had agreed with the wrong binary (hidden) |
| 27 | 颐 | labels | Zhen/Gen | **Gen/Zhen** | 山雷颐 Gen上Zhen下; binary 100001 already correct (label reversed) |
| 32 | 恒 | labels | Xun/Zhen | **Zhen/Xun** | 雷风恒 Zhen上Xun下; binary 011100 already correct (owner-reported) |
| 35 | 晋 | binary | 101000 | **000101** | 火地晋 Kun下Li上 — **pair swap with #36** |
| 36 | 明夷 | binary | 000101 | **101000** | 地火明夷 Li下Kun上 — pair swap with #35 |

No bulk reversal was performed; every change is field-level with the
canonical reason recorded. After fixes: **all 64 binaries, labels, and zh
names match the canonical table; all 64 binaries are unique** (tested).
The public example cast 恒(32) line 3 → 解(40) is unchanged and re-tested.

Consistency of shared data: 本卦/变卦 lookup, hexagram detail pages
(`/iching/[slug]`), daily-iching, and the prompt context all read the same
`lib/iching-data.ts` rows — one fix applies everywhere (verified by SSR
spot checks on heng/pi/xu/tai/ming-yi).

## 3. AI citation reliability

Problem: prompts instructed the model to quote the 卦辞/象辞 "provided
above", but the context block never contained the text — inviting
memory-fabricated "classical" quotes.

Fixes:

- `classicalTextBlock()` (`lib/iching-context.ts`): deterministically loads
  the hexagram's classical Chinese text (labeled 《周易》, quote-verbatim)
  plus the English fields **explicitly labeled** "MODERN ENGLISH PARAPHRASE
  (by GoEast — NOT the classical original, NOT a published translation;
  never present as a quotation, never attribute to any translator)".
  Empty text → explicit "no classical text available … never reconstruct
  from memory" instruction.
- Wired into both model paths: `buildIchingContextBlock` (initial readings)
  and `buildFollowupGrounding` (same-cast follow-ups). Rule text now demands
  quoting ONLY the provided Chinese classical text; any English rendering the
  model produces must be presented as its own interpretation; line statements
  (爻辞) remain interpretation-only (not in our database).
- Display: classical Chinese is now the primary **blockquote** with a
  《周易》 source label on the hexagram detail pages, daily-iching, and the
  reading result page; English appears as a clearly-labeled GoEast paraphrase
  (the previous "traditional translation style (e.g., Wilhelm/Baynes)"
  gesture is removed). Previously the detail pages blockquoted the English
  paraphrase as if it were the judgment — reversed now.

### Source/license list

| Text | Source | License/use basis |
|---|---|---|
| 卦辞 / 象辞 (Chinese) | *Zhouyi* core text, in-house database | Public domain (ancient); quoted verbatim with source label |
| judgment_en / image_en | House-authored modern paraphrases by GoEast | Our own wording; labeled as paraphrase — never as a quotation or published translation |
| Wilhelm/Baynes, Legge, etc. | — | **Not used** for I Ching content; no authorization claimed; named only as reading references in editorial guides |

## 4. Tests

New: `lib/__tests__/iching-collation.test.ts` — 78 checks:

- All 64: number order, zh name, upper/lower labels, and binary vs the
  independent fixture (derived from the Wikipedia table — not our data);
  binary uniqueness; internal label↔binary consistency.
- Regression: 恒 line-3 → 解(40); static 乾 (no transformed); 剥 lines 1–5
  changing → 乾; 泰 all-six changing → 否 (exercises a corrected pair).
- Citation policy: context/follow-up prompts contain the actual 卦辞 verbatim
  + paraphrase labeling + no-translator rule; empty-text → unavailable
  instruction; all 64 have non-empty classical text in the DB.

Commands & results:
- `npm run test` → **340 passed | 1 skipped** (pre-existing skip), 0 failures.
- `npm run build` → success.
- Runtime evidence (local prod-mode + mock Azure): e2e group A 20/20; the
  mock's privacy-safe request log records `classicalTextInPrompt: true` for
  the model call — the classical text demonstrably reaches the model now.
- SSR spot checks (headers with HTML-comment-tolerant matching): heng 震上巽下,
  pi 乾上坤下, xu 坎上乾下, tai 坤上乾下, ming-yi 坤上离下 — all ✅.
- Screenshots: `/tmp/goeast-3b/shots/collation-{heng-detail,pi-detail,daily}.png`.

## 5. Open issues / not done

- The philosopher-chat path (OracleOverlay without a cast: Laozi/Confucius
  personas quoting their own classics from memory) is unchanged — out of
  scope for this collation; flagged for a future pass.
- The `I Ching changing lines` guide's phrasing was aligned ("paraphrase"),
  but no other editorial pages were audited for translation attribution.
- True-device (mobile) checks not performed (SSR + 375px simulated only).
- Production deploy intentionally withheld pending acceptance.
