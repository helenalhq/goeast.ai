import { decisionLivePolicy, type DecisionLivePolicy } from "./decision-live-policy";

type Environment = Readonly<Record<string, string | undefined>>;
type ModelConfig = Readonly<{ endpoint: string; model: string; apiKey: string }>;

export type LiveRuntime = Readonly<{
  policy: DecisionLivePolicy;
  ownerDsn: string | null;
  callbackDsn: string | null;
  creemApiKey: string | null;
  signingSecret: string | null;
  model: ModelConfig | null;
}>;

const QA_ROLE = "goeast_p1_qa";
const SAFE_SECRET = /^[!-~]{16,512}$/;

function poolerDsn(raw: string | undefined, ref: string, role: string): string | null {
  if (!raw || !ref || raw.includes("?") || raw.includes("#")) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "postgresql:" && /^aws-[0-9]+-[a-z0-9-]+\.pooler\.supabase\.com$/.test(url.hostname)
      && url.port === "6543" && url.pathname === "/postgres" && url.username === role+"."+ref
      && url.username !== QA_ROLE+"."+ref && !!decodeURIComponent(url.password) ? raw : null;
  } catch { return null; }
}

function modelConfig(env: Environment): ModelConfig | null {
  const source = env.DECISION_REPORT_LIVE_MODEL_CREDENTIAL_SOURCE;
  if (source !== "existing_azure" && source !== "dedicated") return null;
  const raw = source === "existing_azure" ? env.AZURE_OPENAI_ENDPOINT : env.DECISION_REPORT_LIVE_MODEL_ENDPOINT;
  const apiKey = source === "existing_azure" ? env.AZURE_OPENAI_API_KEY : env.DECISION_REPORT_LIVE_MODEL_API_KEY;
  const model = env.DECISION_REPORT_LIVE_MODEL_DEPLOYMENT
    ?? (source === "existing_azure" ? env.AZURE_OPENAI_MODEL : undefined);
  if (env.DECISION_REPORT_LIVE_MODEL_BUDGET_ACK !== "true" || !raw || !apiKey || !SAFE_SECRET.test(apiKey)
      || (source === "dedicated" && apiKey === env.AZURE_OPENAI_API_KEY) || !model || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(model)) return null;
  try {
    const endpoint = new URL(raw);
    return (raw === endpoint.origin+"/openai/v1" || raw === endpoint.origin+"/openai/v1/")
      && endpoint.protocol === "https:" && !endpoint.port
      && /^[a-z0-9-]+\.(openai\.azure\.com|services\.ai\.azure\.com)$/.test(endpoint.hostname)
      ? { endpoint:raw,apiKey,model } : null;
  } catch { return null; }
}

/** Settlement is independent of new sales and model configuration. */
export function decisionLiveRuntime(env: Environment = process.env): LiveRuntime | null {
  if (env.DECISION_REPORT_LIVE_SETTLEMENT_ENABLED !== "true") return null;
  const baseline = decisionLivePolicy({ ...env, DECISION_REPORT_LIVE_PHASE:"settlement_only" });
  if (!baseline) return null;
  const policy = (env.DECISION_REPORT_LIVE_CHECKOUT_ENABLED === "true" ? decisionLivePolicy(env) : null) ?? baseline;
  return parseLiveRuntime(policy,env);
}

/** Same production configuration, without enabling settlement or sales. */
export function decisionLivePresaleRuntime(env: Environment = process.env): LiveRuntime | null {
  if (env.DECISION_REPORT_LIVE_CHECKOUT_ENABLED === "true" || env.DECISION_REPORT_LIVE_PUBLIC_ENABLED === "true") return null;
  const policy=decisionLivePolicy({ ...env, DECISION_REPORT_LIVE_PHASE:"settlement_only" });
  return policy ? parseLiveRuntime(policy,env) : null;
}

function parseLiveRuntime(policy:DecisionLivePolicy,env:Environment):LiveRuntime {
  const ref = env.DECISION_REPORT_LIVE_DB_PROJECT_REF;
  const projectRef = ref && /^[a-z0-9]{20}$/.test(ref) ? ref : "";
  const ownerDsn = poolerDsn(env.DECISION_REPORT_LIVE_APP_DATABASE_URL,projectRef,"p1_live_app");
  const callbackDsn = poolerDsn(env.DECISION_REPORT_LIVE_CALLBACK_DATABASE_URL,projectRef,"p1_live_callback");
  const api = env.DECISION_REPORT_LIVE_CREEM_API_KEY;
  const signature = env.DECISION_REPORT_LIVE_CREEM_WEBHOOK_SECRET;
  const creemApiKey = api && /^creem_[A-Za-z0-9_-]{8,180}$/.test(api) && !/^creem_(test|sandbox|local)_/i.test(api)
    && api !== env.CREEM_API_KEY && api !== env.DECISION_REPORT_CREEM_API_KEY ? api : null;
  const signingSecret = signature && SAFE_SECRET.test(signature) && signature !== api && signature !== env.CREEM_WEBHOOK_SECRET
    && signature !== env.DECISION_REPORT_CREEM_WEBHOOK_SECRET ? signature : null;
  return { policy,ownerDsn,callbackDsn,creemApiKey,signingSecret,model:modelConfig(env) };
}

export function liveCheckoutConfigured(cfg: LiveRuntime | null): cfg is LiveRuntime & {ownerDsn:string;callbackDsn:string} {
  return !!cfg && cfg.policy.phase !== "settlement_only" && !!(cfg.ownerDsn && cfg.callbackDsn && cfg.model
    && cfg.creemApiKey && cfg.signingSecret);
}
