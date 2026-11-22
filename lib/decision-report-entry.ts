/** Public navigation carries an allowlisted topic token, never draft data. */
const WORK_DECISION_SLUG = "work-decision";
export const WORK_DECISION_TOPIC = "A work decision";
export const WORK_DECISION_ENTRY = "/consult/iching?topic=" + WORK_DECISION_SLUG;
export const WORK_DECISION_LOGIN = "/login?next=" + encodeURIComponent(WORK_DECISION_ENTRY);

export function isWorkDecisionEntry(topic: string | string[] | undefined) {
  return topic === WORK_DECISION_SLUG;
}
