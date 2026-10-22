import { track } from "@vercel/analytics";

/** Conversion funnel events (see docs/analytics-funnel.md). Union type keeps
 *  call sites honest — add new events here, never inline strings. */
export type AnalyticsEvent =
  | "iching_cast_completed"
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
  | "newsletter_subscribed";

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
    track(name, clean);
    if (process.env.NODE_ENV !== "production") {
      console.debug("[analytics]", name, clean);
    }
  } catch {
    // analytics must never break the product
  }
}
