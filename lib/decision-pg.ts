import { Pool } from "pg";
import { type DecisionConfig } from "./decision-config";

type ScopedConfig = Extract<DecisionConfig, { storage: "scoped-postgres" }>;
let pooled: { dsn: string; pool: Pool } | undefined;

function getPool(dsn: string): Pool {
  if (pooled?.dsn === dsn) return pooled.pool;
  if (pooled) throw new Error("Decision store configuration changed");
  const url = new URL(dsn);
  const pool = new Pool({
    host: url.hostname, port: 6543, user: url.username,
    password: decodeURIComponent(url.password), database: "postgres",
    ssl: { rejectUnauthorized: true }, max: 2,
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
    const client = await getPool(config.dsn).connect();
    let committed = false;
    try {
      await client.query("begin");
      await client.query("set local search_path = pg_catalog");
      await client.query("set local statement_timeout = '5s'");
      const check = await client.query<{ ok: boolean }>(
        "select goeast_p1_qa.decision_qa_isolation_ok($1::uuid) as ok", [config.qaUserId],
      );
      if (check.rows[0]?.ok !== true) throw new Error("Decision QA isolation check failed");
      const result = await client.query<T>(statement, [...parameters]);
      await client.query("commit");
      committed = true;
      return result.rows;
    } finally {
      // Discard incomplete/ambiguous sessions; never retry a mutation here.
      client.release(!committed);
    }
  };
}
