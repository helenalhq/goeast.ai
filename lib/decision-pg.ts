import { checkServerIdentity } from "node:tls";
import { Pool, type PoolClient } from "pg";
import { type DecisionConfig } from "./decision-config";
import { SUPABASE_PROD_ROOT_2021_CA } from "./decision-supabase-ca";

type ScopedConfig = Extract<DecisionConfig, { storage: "scoped-postgres" }>;
const DIAGNOSTIC_CODES = new Set([
  "08001", "08003", "08006", "0A000", "22023", "22P02", "23502", "23503", "23505",
  "23514", "25001", "25P02", "28000", "28P01", "3D000", "3F000", "42501", "42601",
  "42883", "42P01", "53300", "55P03", "57014", "57P01", "57P03",
]);
const NETWORK_CODES: Readonly<Record<string, "network" | "tls">> = Object.freeze({
  ETIMEDOUT:"network", ECONNRESET:"network", ECONNREFUSED:"network", EHOSTUNREACH:"network",
  ENETUNREACH:"network", ENOTFOUND:"network", EAI_AGAIN:"network",
  DEPTH_ZERO_SELF_SIGNED_CERT:"tls", SELF_SIGNED_CERT_IN_CHAIN:"tls", CERT_HAS_EXPIRED:"tls",
  ERR_TLS_CERT_ALTNAME_INVALID:"tls", UNABLE_TO_VERIFY_LEAF_SIGNATURE:"tls",
  UNABLE_TO_GET_ISSUER_CERT_LOCALLY:"tls",
});

function diagnosticCode(error: unknown) {
  const code = error && typeof error === "object" && "code" in error ? error.code : null;
  if (typeof code !== "string") return "unknown";
  if (DIAGNOSTIC_CODES.has(code)) return code;
  return Object.hasOwn(NETWORK_CODES, code) ? NETWORK_CODES[code] : "unknown";
}

let pooled: { dsn: string; pool: Pool } | undefined;

function getPool(dsn: string): Pool {
  if (pooled?.dsn === dsn) return pooled.pool;
  if (pooled) throw new Error("Decision store configuration changed");
  const url = new URL(dsn);
  const pool = new Pool({
    host: url.hostname, port: 6543, user: url.username,
    password: decodeURIComponent(url.password), database: "postgres",
    // Trust only the official Supabase root for this connection. The default
    // Node hostname algorithm still verifies the exact configured pooler host.
    ssl: { rejectUnauthorized: true, ca: SUPABASE_PROD_ROOT_2021_CA, checkServerIdentity },
    max: 2,
    connectionTimeoutMillis: 5_000, idleTimeoutMillis: 10_000,
    query_timeout: 10_000, allowExitOnIdle: true,
  });
  // Idle connection errors must neither leak connection details nor crash the process.
  pool.on("error", () => console.warn("[decision-report]", "scoped_pool_idle_error"));
  pooled = { dsn, pool };
  return pool;
}

/** Static, fully qualified operation SQL only. Run the audit on the same
 * transaction/pooler backend as each operation; do not use named prepares. */
export function scopedQuery(config: ScopedConfig) {
  return async <T extends object>(statement: string, parameters: readonly unknown[]) => {
    let client: PoolClient | undefined;
    let committed = false;
    let stage: "connect" | "begin" | "configure" | "audit" | "audit_denied" | "operation" | "commit" = "connect";
    try {
      client = await getPool(config.dsn).connect();
      stage = "begin";
      await client.query("begin");
      stage = "configure";
      await client.query("set local search_path = pg_catalog");
      await client.query("set local statement_timeout = '5s'");
      stage = "audit";
      const check = await client.query<{ ok: boolean }>(
        "select goeast_p1_qa.decision_qa_isolation_ok($1::uuid) as ok", [config.qaUserId],
      );
      if (check.rows[0]?.ok !== true) {
        stage = "audit_denied";
        throw new Error("Decision QA isolation check failed");
      }
      stage = "operation";
      const result = await client.query<T>(statement, [...parameters]);
      stage = "commit";
      await client.query("commit");
      committed = true;
      return result.rows;
    } catch (error) {
      if (stage === "audit_denied") {
        console.warn("[decision-report]", "scoped_db_audit_denied");
        throw new Error("Decision QA isolation check failed");
      }
      const code = diagnosticCode(error);
      // Do not propagate the driver error, any cause, query, DSN, or payload.
      // The caller still needs the sanctioned uniqueness signal for recovery.
      if (!(stage === "operation" && code === "23505")) {
        console.warn("[decision-report]", "scoped_db_" + stage, code);
      }
      throw Object.assign(new Error("Decision QA database unavailable"), { code });
    } finally {
      // Discard incomplete/ambiguous sessions; never retry a mutation here.
      client?.release(!committed);
    }
  };
}
