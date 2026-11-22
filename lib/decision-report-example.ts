import type { DecisionReport } from "@/lib/decision-types";
import { getAllHexagrams, getHexagramByNumber } from "@/lib/iching-data";
import { buildIchingContext } from "@/lib/iching-context";

export const DECISION_REPORT_EXAMPLE_PATH = "/examples/iching-decision-report";
export const DECISION_REPORT_WALKTHROUGH_PATH = `${DECISION_REPORT_EXAMPLE_PATH}/walkthrough`;

// One fixed synthetic cast, ordered bottom to top. Do not use historical examples or
// randomize this fixture; calculation uses the exact same function as the live free flow.
const casts: DecisionReport["casts"] = Array.from({ length: 6 }, (_, index) => ({
  binary: "1",
  changing: index === 0,
}));
const computed = buildIchingContext(casts, getAllHexagrams());
const primary = computed && getHexagramByNumber(computed.hexagramNumber);
const transformed = computed?.transformedNumber && getHexagramByNumber(computed.transformedNumber);
if (!computed || !primary || !transformed) throw new Error("Invalid synthetic decision report cast");

export const CAREER_DECISION_SAMPLE: DecisionReport = {
  question: "I want to change jobs, but I’m not sure what to test first.",
  casts,
  primary: { number: primary.number, name: primary.name },
  changingLines: computed.changingLines,
  transformed: { number: transformed.number, name: transformed.name },
  source: {
    original: "初九：潛龍勿用。",
    restatement: "At the lowest line, the dragon is still submerged. Its strength is not yet something to put to work.",
    label: "Zhouyi (周易), Qian (乾), first line · Chinese Wikisource, revision 2404991",
    url: "https://zh.wikisource.org/w/index.php?title=%E5%91%A8%E6%98%93%2F%E4%B9%BE&oldid=2404991",
  },
  options: [
    {
      title: "Explore a similar role at another company",
      blindSpot: "A different employer may still give you the same meeting load. A job description rarely tells you who actually controls the work.",
      assumption: false,
    },
    {
      title: "Stay for now and test one change to your current role",
      blindSpot: "A quieter week could reflect a temporary lull, not a lasting change. Check who can make the new scope stick.",
      assumption: true,
    },
  ],
  verifyQuestion: "Is the problem the kind of work I do, or how much control I have over a typical week?",
  sevenDayStep: "Keep your job and set aside 30 minutes this week. Ask one person in a comparable outside role to describe their last normal workweek. Log three concrete tasks, who set their priorities, and whether one of your recurring frustrations showed up. If you cannot get that conversation, record ‘not verified’ rather than treating silence as evidence.",
  interpretation: "The image can prompt a distinction between preparing and committing. Before treating a move as the answer, find out what a different workweek would actually look like. This is an editorial example of context-based reflection, not a prediction or advice to resign.",
};
