/**
 * REAL same-condition Free/Pro readings for the /pricing example block.
 * Generated 2026-10-22 through the production pipeline (same model, prompts,
 * temperature, token budgets) under fixed demo conditions:
 * Hexagram 32 (Heng 恒), changing line 3 → transformed Hexagram 40 (Jie 解),
 * question: "How can I build a consistent writing habit without forcing productivity?"
 * Full untruncated outputs: docs/samples/{free,pro}-reading.md (+ meta.json).
 * Excerpts below are verbatim with "…" elisions only.
 */
export const SAMPLE_DEMO_CONDITIONS =
  "Demo conditions: one fixed cast — Hexagram 32 (Heng 恒) with changing line 3, transforming to Hexagram 40 (Jie 解) — and one question, run through the real Free and Pro pipelines (same model). Not two random casts.";

export const SAMPLE_QUESTION =
  "How can I build a consistent writing habit without forcing productivity?";

export const SAMPLE_FREE = {
  traditional: `**Hexagram 32, Heng / Duration** — Judgment: "**Heng. Success. No blame. It is beneficial to be correct and have somewhere to go.**"

**Changing Line 3** — The old text warns, in essence, that if one lets the force of habit become mere routine, the path loses its vitality. Duration is not stiffness; it is a living rhythm, like a river that keeps its course yet is never the same water twice. …`,
  interpretation: `Seeker, your question is answered by a pair of motions: **first, endurance; then release**. Hexagram **32 Heng** says a writing habit is not built by forcing the hand like a plow through frozen earth. It is built by a steady seasonal rhythm — same hour, same place, same small beginning — until the mind learns to arrive as naturally as dawn. But your changing line 3 shows the danger: if you bind yourself too tightly to "productivity," the living current of writing can turn rigid and dry. A tree does not "produce" leaves by command; it follows the season. …`,
  reflection: `- What would your writing look like if it were governed by **rhythm** rather than output?
- Where have you been tightening your grip so hard that the work itself loses breath?
- What is the smallest honest act of writing you can return to each day, like a path worn by many footsteps?`,
};

export const SAMPLE_PRO = {
  // Free parts are identical in substance — show ONLY what Pro adds:
  goingDeeper: `There is a subtle relational teaching here. **Heng** is not the stillness of stone; it is the enduring movement of thunder and wind together. That suggests a rhythm: structure and freedom, form and breath. If the structure is too rigid, it breaks. If the freedom is too loose, it disperses. The Ten Wings often emphasize that true constancy is not stubbornness but alignment with what remains appropriate through changing conditions. In this light, your habit may need a "southwest" quality, as **Jie** says: the receptive, ordinary, supportive ground of daily life. Not heroic writing sessions, but a dependable corner of the day.

The shadow side is over-identifying with productivity language. That language can make the writer into a laborer under the whip, rather than a cultivator tending a field. The field yields by season, not by command.`,
  deeperReflection: `- Which part of your writing practice needs more structure, and which part needs more ease?
- What pressure do you carry into the page that makes returning harder?
- If your habit were truly sustainable, what would it stop demanding from you?`,
  followUp: `If you wish, ask me one follow-up question about how to shape this writing practice in your daily life.`,
};
