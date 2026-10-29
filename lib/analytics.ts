import { track } from "@vercel/analytics";

/** Conversion funnel events (see docs/analytics-funnel.md). Union type keeps
 *  call sites honest — add new events here, never inline strings. */
export type AnalyticsEvent =
  | "iching_cast_completed"
  | "hexagram_study_clicked"
  | "try_iching_clicked"
  | "ziwei_tool_clicked"
  | "oracle_opened_with_hexagram"
  | "oracle_consult_started"
  | "oracle_reading_delivered"
  | "oracle_limit_reached"
  | "ziwei_chart_generated"
  | "ziwei_reading_started"
  | "synastry_analysis_started"
  | "login_page_viewed_with_target"
  | "login_succeeded"
  | "upgrade_clicked"
  | "pricing_example_viewed"
  | "newsletter_subscribed"
  | "consult_entry_viewed"
  | "consult_flow_started"
  | "consult_question_confirmed"
  | "consult_generation_started"
  | "consult_generation_completed"
  | "consult_generation_failed"
  | "consult_next_step_saved";

type AnalyticsData = Record<string, string | number | boolean>;

/** Fire a conversion event. Scalars only — emails, questions, birth data and
 *  chart payloads must NEVER be passed here. Failures are swallowed: analytics
 *  must not break the product. Logs a debug line outside production so local
 *  runs leave evidence. */
export function logEvent(name: AnalyticsEvent, data: AnalyticsData = {}): void {
  const clean: AnalyticsData = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      clean[key] = value;
    }
  }
  try {
    const data: AnalyticsData = { ...clean };
    const env = process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV;
    if (env && !("env" in data)) data.env = env; // production | preview | development
    track(name, data);
    if (process.env.NODE_ENV !== "production") {
      console.debug("[analytics]", name, data);
    }
  } catch {
    // analytics must never break the product
  }
}
