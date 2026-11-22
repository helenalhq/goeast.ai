import { createClient as createSupabase } from "@supabase/supabase-js";
import { createClient as createAuth } from "@/lib/supabase/server";
import { decisionConfig, type DecisionConfig } from "./decision-config";
import { scopedQuery } from "./decision-pg";
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

type Claim = {
  id: string; owner_id: string; cast_hash: string; capture: DecisionInput; mode: DecisionMode;
  product_id: string; checkout_id: string | null;
};
type Payment = { p_id: string; p_mode: DecisionMode; p_product: string; p_checkout: string; p_order: string; p_tx: string | null };
type Refund = { p_mode: DecisionMode; p_order: string; p_tx: string };
type Lease = { p_id: string; p_owner: string; p_token: string };
type Finish = Lease & { p_report: DecisionReport | null };
type History = Pick<DecisionRow, "id" | "status" | "created_at">;
type Previous = Pick<DecisionRow, "id" | "status" | "checkout_id" | "checkout_url" | "product_id">;
type FoundId = { id: string };

export function decisionDb(config: DecisionConfig) {
  if (config.storage === "scoped-postgres") {
    const query = scopedQuery(config);
    type PgDateFields = { created_at: Date; generation_expires: Date | null };
    type PgHistory = Omit<History, "created_at"> & Pick<PgDateFields, "created_at">;
    type PgOrder = Omit<DecisionRow, keyof PgDateFields> & PgDateFields;
    async function rows<T extends object>(statement: string, params: unknown[]) {
      return { data: await query<T>(statement, params), error: null };
    }
    async function one<T extends object>(statement: string, params: unknown[]) {
      return { data: (await query<T>(statement, params))[0] ?? null, error: null };
    }
    async function rpc<T extends string | boolean>(statement: string, params: unknown[]) {
      return { data: (await query<{ result: T }>(statement, params))[0]?.result ?? null, error: null };
    }
    return {
      async history(owner: string, mode: DecisionMode) {
        const result = await rows<PgHistory>(
          "select id,status,created_at from goeast_p1_qa.decision_orders where owner_id=$1 and mode=$2 order by created_at desc limit 100", [owner, mode]);
        return { ...result, data: result.data.map(row => ({ ...row, created_at:row.created_at.toISOString() })) };
      },
      previous: (owner: string, hash: string, mode: DecisionMode) => one<Previous>(
        "select id,status,checkout_id,checkout_url,product_id from goeast_p1_qa.decision_orders where owner_id=$1 and cast_hash=$2 and mode=$3", [owner, hash, mode]),
      async claim(c: Claim) {
        try {
          await query("insert into goeast_p1_qa.decision_orders(id,owner_id,cast_hash,capture,mode,product_id,checkout_id) values ($1,$2,$3,$4::jsonb,$5,$6,$7)",
            [c.id,c.owner_id,c.cast_hash,JSON.stringify(c.capture),c.mode,c.product_id,c.checkout_id]);
          return { error: null };
        } catch (error) {
          if (error && typeof error === "object" && "code" in error && error.code === "23505") return { error: { code: "23505" } };
          throw error;
        }
      },
      saveCheckout: (id: string, owner: string, checkoutId: string, url: string) => one<FoundId>(
        "update goeast_p1_qa.decision_orders set checkout_id=$3,checkout_url=$4 where id=$1 and owner_id=$2 and mode='test' and status='pending' and checkout_id is null returning id",
        [id, owner, checkoutId, url]),
      async owned(id: string, owner: string, mode: DecisionMode) {
        const result = await one<PgOrder>(
          "select id,owner_id,mode,status,capture,product_id,checkout_id,checkout_url,provider_order_id,transaction_id,generation_expires,report_id,report,action_note,created_at from goeast_p1_qa.decision_orders where id=$1 and owner_id=$2 and mode=$3",
          [id, owner, mode]);
        const row = result.data;
        return { ...result, data: row ? { ...row, created_at:row.created_at.toISOString(),
          generation_expires:row.generation_expires?.toISOString() ?? null } : null };
      },
      saveNote: (id: string, owner: string, mode: DecisionMode, note: string | null) => one<FoundId>(
        "update goeast_p1_qa.decision_orders set action_note=$4 where id=$1 and owner_id=$2 and mode=$3 and status='delivered' returning id", [id, owner, mode, note]),
      payment: (p: Payment) => rpc<string>("select goeast_p1_qa.decision_record_payment($1,$2,$3,$4,$5,$6) as result",
        [p.p_id,p.p_mode,p.p_product,p.p_checkout,p.p_order,p.p_tx]),
      refund: (p: Refund) => rpc<string>("select goeast_p1_qa.decision_record_refund($1,$2,$3) as result", [p.p_mode,p.p_order,p.p_tx]),
      acquire: (p: Lease) => rpc<boolean>("select goeast_p1_qa.decision_acquire_generation($1,$2,$3) as result", [p.p_id,p.p_owner,p.p_token]),
      finish: (p: Finish) => rpc<boolean>("select goeast_p1_qa.decision_finish_generation($1,$2,$3,$4::jsonb) as result",
        [p.p_id,p.p_owner,p.p_token,p.p_report === null ? null : JSON.stringify(p.p_report)]),
    };
  }
  const db = createSupabase(config.dbUrl, config.dbKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
  return {
    history: (owner: string, mode: DecisionMode) => db.from("decision_orders").select("id,status,created_at")
      .eq("owner_id", owner).eq("mode", mode).order("created_at", { ascending:false }).limit(100).overrideTypes<History[]>(),
    previous: (owner: string, hash: string, mode: DecisionMode) => db.from("decision_orders").select("id,status,checkout_id,checkout_url,product_id")
      .eq("owner_id", owner).eq("cast_hash", hash).eq("mode", mode).maybeSingle<Previous>(),
    claim: (c: Claim) => db.from("decision_orders").insert(c),
    saveCheckout: (id: string, owner: string, checkoutId: string, url: string) => db.from("decision_orders")
      .update({ checkout_id:checkoutId, checkout_url:url }).eq("id", id).eq("owner_id", owner).eq("mode", "test")
      .eq("status", "pending").is("checkout_id",null).select("id").maybeSingle<FoundId>(),
    owned: (id: string, owner: string, mode: DecisionMode) => db.from("decision_orders").select("*")
      .eq("id", id).eq("owner_id", owner).eq("mode", mode).maybeSingle<DecisionRow>(),
    saveNote: (id: string, owner: string, mode: DecisionMode, note: string | null) => db.from("decision_orders")
      .update({ action_note:note }).eq("id", id).eq("owner_id", owner).eq("mode", mode).eq("status", "delivered").select("id").maybeSingle<FoundId>(),
    payment: (p: Payment) => db.rpc("decision_record_payment", p).overrideTypes<string>(),
    refund: (p: Refund) => db.rpc("decision_record_refund", p).overrideTypes<string>(),
    acquire: (p: Lease) => db.rpc("decision_acquire_generation", p).overrideTypes<boolean>(),
    finish: (p: Finish) => db.rpc("decision_finish_generation", p).overrideTypes<boolean>(),
  };
}

type ScopedRecoveryConfig = Extract<DecisionConfig, { mode: "test" }> & { storage: "scoped-postgres" };
type RecoveryPin = { orderId: string; castHash: string; revision: string };

export async function claimCheckoutRecovery(config: ScopedRecoveryConfig, pin: RecoveryPin) {
  const [row] = await scopedQuery(config)<{ revision: string }>(
    `update goeast_p1_qa.decision_orders set checkout_id=checkout_id
     where id=$1::uuid and owner_id=$2::uuid and mode='test' and product_id=$3 and cast_hash=$4
       and xmin::text=$5 and status='pending' and checkout_id is null and checkout_url is null
       and provider_order_id is null and transaction_id is null
     returning xmin::text as revision`,
    [pin.orderId, config.qaUserId, config.productId, pin.castHash, pin.revision],
  );
  // scopedQuery commits before it resolves. The no-op SQL update changes the
  // tuple version, requiring a fresh xmin before any later attempt.
  return row?.revision && row.revision !== pin.revision ? row.revision : null;
}

export async function saveRecoveredCheckout(
  config: ScopedRecoveryConfig, pin: RecoveryPin, checkout: { id: string; url: string },
) {
  const [row] = await scopedQuery(config)<{ id: string }>(
    `update goeast_p1_qa.decision_orders set checkout_id=$6,checkout_url=$7
     where id=$1::uuid and owner_id=$2::uuid and mode='test' and product_id=$3 and cast_hash=$4
       and xmin::text=$5 and status='pending' and checkout_id is null and checkout_url is null
       and provider_order_id is null and transaction_id is null returning id`,
    [pin.orderId, config.qaUserId, config.productId, pin.castHash, pin.revision, checkout.id, checkout.url],
  );
  return row?.id === pin.orderId;
}

// Run the exact linkage check and conditional mutation in the same audited
// transaction. Never call the refund RPC for unrelated Test Store activity.
export async function linkedDecisionTestRefund(
  config: Extract<DecisionConfig, { mode: "test" }> & { storage: "scoped-postgres" },
  orderId: string,
  transactionId: string,
) {
  const query = scopedQuery(config);
  const [row] = await query<{ result: string }>(
    `select case when exists (
      select 1 from goeast_p1_qa.decision_orders
      where owner_id=$1::uuid and mode='test' and product_id=$2
        and provider_order_id=$3 and transaction_id=$4
    ) then goeast_p1_qa.decision_record_refund('test',$3,$4) else 'unlinked' end as result`,
    [config.qaUserId, config.productId, orderId, transactionId],
  );
  return row?.result ?? null;
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
  // Pin the Supabase-supplied owner and P1 mode independently of the request.
  const { data, error } = await db.owned(id, owner, mode);
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
