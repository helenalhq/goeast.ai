import { beforeEach, describe, expect, it, vi } from "vitest";
import { decisionDb } from "../decision-store";
import { decisionConfig } from "../decision-config";

const pg = vi.hoisted(() => ({ query:vi.fn(), release:vi.fn(), setup:vi.fn() }));
vi.mock("pg", () => ({ Pool: class {
  constructor(options: unknown) { pg.setup(options); }
  on() { return this; }
  async connect() { return { query:pg.query, release:pg.release }; }
} }));

const project = "abcdefghijklmnopqrst";
const qa = "33783acb-2e34-47d4-ae37-33330a3c9d4c";
const config = decisionConfig({ VERCEL_ENV:"preview", DECISION_REPORT_ENABLED:"true",
  DECISION_REPORT_MODE:"mock", DECISION_REPORT_STORAGE:"scoped-postgres",
  NEXT_PUBLIC_SUPABASE_URL:`https://${project}.supabase.co`, DECISION_REPORT_PREVIEW_QA_USER_ID:qa,
  DECISION_REPORT_SCOPED_DATABASE_URL:`postgresql://goeast_p1_qa.${project}:dummy@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
});
if (!config) throw new Error("Invalid fixture");

describe("scoped store operations", () => {
  beforeEach(() => { pg.query.mockReset(); pg.release.mockReset(); });
  it("never issues application operations when the DB audit denies access", async () => {
    pg.query.mockResolvedValue({ rows:[{ ok:false }] });
    await expect(decisionDb(config).history(qa,"mock")).rejects.toThrow("Decision QA isolation check failed");
    expect(pg.query.mock.calls.map(([sql]) => sql)).toEqual([
      "begin", "set local search_path = pg_catalog", "set local statement_timeout = '5s'",
      "select goeast_p1_qa.decision_qa_isolation_ok($1::uuid) as ok",
    ]);
    expect(pg.release).toHaveBeenCalledWith(true);
    expect(pg.setup).toHaveBeenCalledWith(expect.objectContaining({ ssl:{ rejectUnauthorized:true } }));
  });
  it("executes the scoped owner/mode read and normalizes timestamps to ISO", async () => {
    const date = new Date("2026-11-22T15:00:00.123Z");
    pg.query.mockImplementation(async (sql: string) => ({ rows:
      sql.includes("isolation_ok") ? [{ ok:true }] :
      sql.startsWith("select id") ? [{ id:"fixture", status:"delivered", created_at:date }] : [],
    }));
    const result = await decisionDb(config).history(qa,"mock");
    expect(result.data).toEqual([{ id:"fixture", status:"delivered", created_at:"2026-11-22T15:00:00.123Z" }]);
    expect(pg.query).toHaveBeenNthCalledWith(5,
      expect.stringMatching(/from goeast_p1_qa\.decision_orders where owner_id=\$1 and mode=\$2/), [qa,"mock"]);
    expect(pg.query).toHaveBeenNthCalledWith(6,"commit");
    expect(pg.release).toHaveBeenCalledWith(false);
  });
});
