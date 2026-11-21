import { createClient as createSupabase } from "@supabase/supabase-js";
import { createClient as createAuth } from "@/lib/supabase/server";
import { decisionConfig, type DecisionConfig } from "./decision-config";
import type { DecisionInput } from "./decision-core";
import type { DecisionMode, DecisionReport, DecisionStatus } from "./decision-types";

type DecisionRow = {
  id: string;
  owner_id: string;
  mode: DecisionMode;
  status: DecisionStatus;
  capture: DecisionInput;
  product_id: string;
  checkout_id: string | null;
  checkout_url: string | null;
  provider_order_id: string | null;
  transaction_id: string | null;
  generation_expires: string | null;
  report_id: string | null;
  report: DecisionReport | null;
  action_note: string | null;
  created_at: string;
};

export function decisionDb(config: DecisionConfig) {
  return createSupabase(config.dbUrl, config.dbKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
}

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

export function unavailable() { return json({ error: "Decision reports are not available here." }, 404); }
export function retryLater() { return json({ error: "Decision reports are temporarily unavailable. Try again shortly." }, 503); }
export function decisionFault(kind: string) { console.warn("[decision-report]", kind); }

export async function decisionOwner() {
  const config = decisionConfig();
  if (!config) return { response: unavailable() };
  const auth = await createAuth();
  const { data: { user }, error } = await auth.auth.getUser();
  if (!user || error) return { response: json({ error: "Sign in to access decision reports." }, 401) };
  if (user.id.toLowerCase() !== config.qaUserId) return { response: unavailable() };
  return { config, owner: user.id, db: decisionDb(config) };
}

export type DecisionStore = ReturnType<typeof decisionDb>;

export async function ownedOrder(db: DecisionStore, owner: string, mode: DecisionMode, id: string): Promise<DecisionRow | null> {
  // The service role bypasses RLS, so every private read pins the Supabase-supplied
  // owner and P1 mode independently of what came from the request.
  const { data, error } = await db.from("decision_orders").select("*").eq("id", id)
    .eq("owner_id", owner).eq("mode", mode).maybeSingle<DecisionRow>();
  if (error) throw new Error("Decision order lookup failed");
  return data;
}

export function decisionDetail(row: DecisionRow) {
  return { id: row.id, status: row.status, mode: row.mode, createdAt: row.created_at,
    generationRetryable: row.status === "generating" && !!row.generation_expires && Date.parse(row.generation_expires) < Date.now(),
    reportId: row.status === "delivered" ? row.report_id : null,
    report: row.status === "delivered" ? row.report : null,
    actionNote: row.status === "delivered" ? row.action_note : null };
}

export async function requestPayload(request: Request): Promise<unknown> {
  if (!(request.headers.get("content-type") ?? "").startsWith("application/json")) return null;
  if (request.headers.get("sec-fetch-site") === "cross-site") return null;
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return null;
  if (Number(request.headers.get("content-length")) > 10_000) return null;
  try {
    const body = await request.text();
    return body.length <= 10_000 ? JSON.parse(body) : null;
  } catch { return null; }
}
