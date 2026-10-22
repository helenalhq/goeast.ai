/**
 * Free vs Pro SAME-CONDITION sample generator (round 3, section 四).
 *
 * Generates the two readings for the /pricing comparison block through the
 * EXACT server-side generation pipeline (same prompt functions, model,
 * temperature, token budgets as /api/oracle). Not a UI end-to-end (that
 * requires a test account) — the generation logic itself is identical:
 *   system = getOraclePrompt(slug, {deep}) .system + buildIchingContextBlock(ctx)
 *   user   = question
 *   model/temperature/max_completion_tokens = the route's constants.
 * The route streams (transport-only difference); we request a plain response
 * so usage tokens can be captured. Documented in docs/samples/meta.json.
 *
 * Gated: skipped unless RUN_SAMPLE_GENERATION=1, so `npm test` never costs money.
 *   RUN_SAMPLE_GENERATION=1 npx vitest run scripts/acceptance/generate-sample.test.ts
 */
import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { getOraclePrompt, ORACLE_DEEP_ADDENDUM } from "../../lib/oracle-prompts";
import { buildIchingContextBlock, type IchingConsultationContext } from "../../lib/iching-context";
import { getHexagramByNumber } from "../../lib/iching-data";

const RUN = process.env.RUN_SAMPLE_GENERATION === "1";

// Fixed DEMO conditions — clearly labeled, never claimed as two random casts.
const QUESTION =
  "How can I build a consistent writing habit without forcing productivity?";
const CAST: IchingConsultationContext = {
  mode: "cast",
  hexagramNumber: 32, // Heng 恒 — Duration/persistence, fits the question
  changingLines: [3], // nine at the third place
  transformedNumber: 40, // verified against lib/iching-data (010100) below
};

function loadEnvFile(file: string) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

describe.skipIf(!RUN)("sample generation (real API, gated)", () => {
  it("verifies the fixed cast against the data, then generates Free + Pro", async () => {
    // --- condition verification (no API yet) ---
    const heng = getHexagramByNumber(32)!;
    const transformed = getHexagramByNumber(40)!;
    expect(heng.binary).toBe("011100");
    // flip line 3 (index 2): 011100 → 010100
    const computed = heng.binary
      .split("")
      .map((b, i) => (CAST.changingLines.includes(i + 1) ? (b === "1" ? "0" : "1") : b))
      .join("");
    expect(computed).toBe(transformed.binary);

    loadEnvFile(path.join(process.cwd(), ".env.local"));
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const baseURL = process.env.AZURE_OPENAI_ENDPOINT;
    const model = process.env.AZURE_OPENAI_MODEL || "gpt-5.4-mini";
    expect(apiKey, "AZURE_OPENAI_API_KEY missing").toBeTruthy();

    const openai = new OpenAI({ apiKey, baseURL });
    const contextBlock = buildIchingContextBlock(CAST);

    const configs = [
      { tier: "free" as const, deep: false },
      { tier: "pro" as const, deep: true },
    ];
    const results: Record<string, { content: string; usage: unknown }> = {};

    for (const cfg of configs) {
      const prompt = getOraclePrompt("prologue-zhougong", { deep: cfg.deep })!;
      // Assembly order mirrors the route: base → cast context → deep addendum,
      // so Pro's GOING DEEPER section follows the standard three parts.
      const system =
        prompt.system.replace(ORACLE_DEEP_ADDENDUM, "") +
        contextBlock +
        (cfg.deep ? ORACLE_DEEP_ADDENDUM : "");
      const res = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: QUESTION },
        ],
        max_completion_tokens: Math.round(prompt.maxWords * 1.5), // route formula
        temperature: 0.8, // route constant
        stream: false, // transport-only difference; enables usage capture
      });
      results[cfg.tier] = {
        content: res.choices[0]?.message?.content || "",
        usage: res.usage,
      };
      expect(results[cfg.tier].content.length).toBeGreaterThan(200);
    }

    // Both readings must reference the actual cast (guard against wrong hexagram).
    for (const tier of ["free", "pro"] as const) {
      const text = results[tier].content;
      expect(text).toMatch(/Hexagram 32|Heng|恒/);
      expect(text.toLowerCase()).toContain("traditional");
    }

    // --- persist raw outputs + meta for review ---
    const outDir = path.join(process.cwd(), "docs", "samples");
    fs.mkdirSync(outDir, { recursive: true });
    const generatedAt = new Date().toISOString();
    fs.writeFileSync(
      path.join(outDir, "free-reading.md"),
      `# Free reading — raw model output\n\n` +
        `> Demo conditions: Hexagram 32 (Heng 恒), changing line 3 → transformed Hexagram 40 (Jie 解); question: "${QUESTION}". Generated ${generatedAt} via the production generation pipeline (see meta.json). Excerpted on /pricing with labels.\n\n---\n\n${results.free.content}\n`
    );
    fs.writeFileSync(
      path.join(outDir, "pro-reading.md"),
      `# Pro reading — raw model output\n\n` +
        `> Same demo conditions as the free sample (same cast, same question, same model). DEEP READING MODE per the Pro tier. Generated ${generatedAt}. Excerpted on /pricing with labels.\n\n---\n\n${results.pro.content}\n`
    );
    fs.writeFileSync(
      path.join(outDir, "meta.json"),
      JSON.stringify(
        {
          generatedAt,
          question: QUESTION,
          cast: CAST,
          castNames: {
            hexagram: `${heng.number} ${heng.name} (${heng.name_zh})`,
            transformed: `${transformed.number} ${transformed.name} (${transformed.name_zh})`,
          },
          pipeline: {
            prompts: "lib/oracle-prompts.ts getOraclePrompt(slug,{deep}) + lib/iching-context.ts buildIchingContextBlock",
            model,
            temperature: 0.8,
            maxCompletionTokens: { free: 1200, pro: 2400 },
            transport: "non-streaming (route streams; transport-only difference, enables usage capture)",
          },
          usage: { free: results.free.usage, pro: results.pro.usage },
          costNote:
            "Cost figures in docs/round3-report.md are ESTIMATES from public pricing for this model class; exact billing is in the Azure account.",
        },
        null,
        2
      )
    );
  }, 240_000);
});
