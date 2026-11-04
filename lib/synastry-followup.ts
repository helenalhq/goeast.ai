/**
 * Follow-up Q&A on a saved synastry report (继续讨论这份关系解读).
 * Mirrors lib/consult-followup.ts; the API route owns all DB access and
 * grounds every answer in the stored dual charts — the client sends only
 * sessionId + question text. Romantic relationships only (V1).
 */

import { formatSynastryForPrompt } from "./ziwei-synastry";
import { FOLLOWUP_TURN_LIMIT, FOLLOWUP_CONTEXT_TURNS, FOLLOWUP_MAX_WORDS, FOLLOWUP_QUESTION_MAX_CHARS, validateFollowupQuestion } from "./consult-followup";

export {
  FOLLOWUP_TURN_LIMIT,
  FOLLOWUP_CONTEXT_TURNS,
  FOLLOWUP_MAX_WORDS,
  FOLLOWUP_QUESTION_MAX_CHARS,
  validateFollowupQuestion,
};

export type SynastryFollowupTurn = {
  id: string;
  question: string;
  answer: string;
  turnIndex: number;
  createdAt: string;
};

/** V1 scope: follow-up conversation is enabled for romantic reports only. */
export function followupSupported(relationshipType: string): boolean {
  return relationshipType === "romantic";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function compactChart(chart: unknown): any {
  // Stored chart_a/chart_b are the server-calculated astrolabes streamed back
  // at generation time. Keep only the fields formatSynastryForPrompt reads.
  if (typeof chart !== "object" || chart === null) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = chart as any;
  if (!c.palaces) return null;
  return chart;
}

/**
 * System-prompt suffix grounding a synastry follow-up turn: the original
 * dual-chart serialization (identical to the original reading's prompt),
 * the original report, recent turns, and relationship-specific guardrails.
 */
export function buildSynastryFollowupGrounding(input: {
  relationshipType: string;
  personA: { birthDate: string; birthHour: number; gender: string };
  personB: { birthDate: string; birthHour: number; gender: string };
  language: string;
  chartA: unknown;
  chartB: unknown;
  originalReport: string;
  turns: Pick<SynastryFollowupTurn, "question" | "answer">[];
}): string | null {
  const chartA = compactChart(input.chartA);
  const chartB = compactChart(input.chartB);
  if (!chartA || !chartB) return null; // old/incomplete report — caller must 422, never guess

  const chartBlock = formatSynastryForPrompt(chartA, chartB, {
    personA: input.personA,
    personB: input.personB,
    relationshipType: input.relationshipType as Parameters<typeof formatSynastryForPrompt>[2]["relationshipType"],
    language: input.language,
  });

  const recent = input.turns.slice(-FOLLOWUP_CONTEXT_TURNS);
  const history = recent.map((t) => `Seeker: ${t.question}\nAdvisor: ${t.answer}`).join("\n---\n");

  return `

FOLLOW-UP CONSULTATION — CONTINUING AN EXISTING SYNASTRY READING (context from our records):
- The seeker already received the synastry report below and is asking follow-up questions about it.
- The two charts below are the RECORDED charts for this reading (authoritative; never recalculate, never substitute different charts).
${chartBlock}

- Original report (already delivered):
<original report>
${input.originalReport}
</original report>${recent.length > 0 ? `

- Earlier follow-up turns in this conversation (oldest first):
<earlier turns>
${history}
</earlier turns>` : ``}

RULES FOR THIS FOLLOW-UP:
1. Answer from the recorded charts and the original report only. Never recalculate, invent, or substitute chart data; never re-derive palaces or stars that are not in the records above.
2. Clearly separate two kinds of evidence in your answer: (a) what comes from the charts above, and (b) what the seeker has told you about their real-life situation. Never present the seeker's circumstances as chart findings, and never present chart patterns as established facts about the couple's life.
3. NEVER output compatibility percentages, scores, or any fabricated quantification. NEVER make definitive predictions that the couple will stay together or break up, and never advise breaking up.
4. This is for reflection and communication. Focus on what the SEEKER can observe, say, or try — concrete communication moves they themselves can attempt. Do not make commitments or prescriptions on behalf of the other person; the other person is not here.
5. Quote classical or technical text ONLY when it appears above; anything else is your interpretation and must be phrased as such.
6. Keep the answer under ${FOLLOWUP_MAX_WORDS} words. Conversational; section headers are not required.
7. This is for entertainment and reflection; no medical, legal, or financial advice.`;
}
