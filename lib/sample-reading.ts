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
  traditional: `**Hexagram 32, Heng / Duration**
**Judgment:** "Heng. Success. No blame. It is beneficial to be steadfast. It is beneficial to have somewhere to go."
**Image:** "Thunder and wind: the image of Duration. Thus the superior person stands firm and does not change his bearings."

This is the teaching of the long road, traveler. A writing life is not made by storms of inspiration alone, nor by the whip of forced productivity. It is made like a river carving stone: by returning again and again, with the same patient current. …`,
  interpretation: `Your question is answered by a marriage of **steadiness and relief**. The way to build a consistent writing habit is not to demand that every session produce something grand. That would be like asking spring to become summer overnight. Instead, make the practice small enough that it can return freely: a fixed time, a modest quota, or even a ritual of opening the page and writing one true sentence. …`,
  reflection: `- What is the smallest writing promise you could keep every day without resentment?
- Where in your current routine is there too much pressure, and what might be released?
- Would it help to define success as "I returned to the page" rather than "I produced something impressive"?`,
};

export const SAMPLE_PRO = {
  // Free parts are identical in substance — show ONLY what Pro adds:
  goingDeeper: `From another angle, **Heng** warns that consistency without inner agreement becomes brittleness. A habit can look steady while secretly being fueled by fear of falling behind. The tradition says, "**stands firm and does not change his direction**," yet this firmness is not stiffness. It is the rooted firmness of a pine on a cliff, not the rigidity of a stake driven into dry ground. The line change into **Jie** suggests that your writing life may need periodic unbinding: days of lighter output, permission to draft badly, and seasons where you gather rather than produce. In the language of change, endurance is sustained by alternation — contraction and release, effort and rest, sowing and fallow. …`,
  deeperReflection: `- What pressure are you carrying into the page that does not belong there?
- How might you define "successful writing" in a way that includes showing up, not just finishing?
- What rhythm of work and rest would let your practice endure through the seasons?`,
  followUp: `If you wish, ask me one follow-up question about how to shape a writing ritual that fits your life.`,
};
