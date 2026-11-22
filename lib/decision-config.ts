import type { DecisionMode } from "./decision-types";

export const DECISION_UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
type ConfigBase = { qaUserId: string } & (
  | { storage: "isolated-supabase"; dbUrl: string; dbKey: string }
  | { storage: "scoped-postgres"; dsn: string }
);
export const DECISION_QA_ROLE = "goeast_p1_qa";

function scopedDsn(raw: string | undefined, auth: string | null): string | null {
  if (!raw || !auth) return null;
  const ref = /^https:\/\/([a-z0-9]{20})\.supabase\.co$/.exec(auth)?.[1];
  try {
    const url = new URL(raw);
    // Require Supabase transaction pooler and the specific QA login for this
    // same project. Connection options are fixed by the server-side adapter.
    if (!ref || url.protocol !== "postgresql:" || !/^aws-[0-9]+-[a-z0-9-]+\.pooler\.supabase\.com$/.test(url.hostname)
        || url.port !== "6543" || url.pathname !== "/postgres" || url.username !== DECISION_QA_ROLE + "." + ref
        || !decodeURIComponent(url.password) || raw.includes("?") || raw.includes("#")) return null;
    return raw;
  } catch { return null; }
}
export type DecisionConfig = ConfigBase & (
  | { mode: "mock" }
  | { mode: "test"; apiKey: string; webhookSecret: string; productId: string; publicOrigin: string }
);

function httpsOrigin(raw: string | undefined): string | null {
  try {
    const url = new URL(raw || "");
    return url.protocol === "https:" && !url.username && !url.password && url.pathname === "/"
      && !url.search && !url.hash && !url.port ? url.origin : null;
  } catch { return null; }
}

export function decisionConfig(env: Record<string, string | undefined> = process.env): DecisionConfig | null {
  if (env.VERCEL_ENV !== "preview" || env.DECISION_REPORT_ENABLED !== "true") return null;
  const mode = env.DECISION_REPORT_MODE;
  const auth = httpsOrigin(env.NEXT_PUBLIC_SUPABASE_URL);
  const qaUserId = env.DECISION_REPORT_PREVIEW_QA_USER_ID;
  if (!qaUserId || !DECISION_UUID.test(qaUserId)) return null;
  let base: ConfigBase;
  const storage = env.DECISION_REPORT_STORAGE;
  if (storage === "scoped-postgres") {
    const dsn = scopedDsn(env.DECISION_REPORT_SCOPED_DATABASE_URL, auth);
    if (!dsn || env.DECISION_REPORT_SUPABASE_URL || env.DECISION_REPORT_SUPABASE_SERVICE_ROLE_KEY) return null;
    base = { storage, dsn, qaUserId: qaUserId.toLowerCase() };
  } else {
    if ((storage !== undefined && storage !== "isolated-supabase") || env.DECISION_REPORT_SCOPED_DATABASE_URL) return null;
    const dbUrl = httpsOrigin(env.DECISION_REPORT_SUPABASE_URL);
    const dbKey = env.DECISION_REPORT_SUPABASE_SERVICE_ROLE_KEY;
    // Legacy separate-project option: never points at the current app DB.
    if (!dbUrl || !/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(dbUrl)
        || !auth || dbUrl === auth || !dbKey || dbKey === env.SUPABASE_SERVICE_ROLE_KEY) return null;
    base = { storage:"isolated-supabase", dbUrl, qaUserId: qaUserId.toLowerCase(), dbKey };
  }
  if (mode === "mock") return { ...base, mode };
  if (mode !== "test") return null;
  const apiKey = env.DECISION_REPORT_CREEM_API_KEY;
  const webhookSecret = env.DECISION_REPORT_CREEM_WEBHOOK_SECRET;
  const productId = env.DECISION_REPORT_CREEM_PRODUCT_ID;
  const publicOrigin = httpsOrigin(env.DECISION_REPORT_PREVIEW_ORIGIN);
  if (!apiKey?.startsWith("creem_test_") || !webhookSecret || webhookSecret === env.CREEM_WEBHOOK_SECRET
      || !productId || !/^prod_[a-zA-Z0-9]+$/.test(productId)
      || productId === env.CREEM_PRODUCT_ID || !publicOrigin
      || !(publicOrigin === "https://preview.goeast.ai" || publicOrigin === httpsOrigin(env.VERCEL_URL ? "https://" + env.VERCEL_URL : undefined))
      || !env.AZURE_OPENAI_API_KEY || !env.AZURE_OPENAI_ENDPOINT) return null;
  return { ...base, mode, apiKey, webhookSecret, productId, publicOrigin };
}

export function decisionOfferMode(userId?: string): DecisionMode | null {
  const config = decisionConfig();
  return config && (userId === undefined || userId.toLowerCase() === config.qaUserId) ? config.mode : null;
}

export function isDecisionOfferEnabled(userId?: string): boolean {
  return decisionOfferMode(userId) !== null;
}
