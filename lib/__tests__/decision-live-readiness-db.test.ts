import { beforeEach,describe,expect,it,vi } from "vitest";
import { checkLiveDbIsolation } from "../decision-live-store";

const pg=vi.hoisted(()=>({options:vi.fn(),connect:vi.fn(),query:vi.fn(),end:vi.fn(),on:vi.fn()}));
vi.mock("pg",()=>({Client:class {
  constructor(config:unknown){pg.options(config);}
  connect=pg.connect;query=pg.query;end=pg.end;on=pg.on;
},Pool:vi.fn()}));

const dsn=(role:string)=>"postgresql://"+role+".abcdefghijklmnopqrst:fixture-password@aws-0-us-east-1.pooler.supabase.com:6543/postgres";
beforeEach(()=>{
  vi.resetAllMocks();
  pg.connect.mockResolvedValue(undefined);
  pg.query.mockResolvedValue({rows:[{ok:true}]});
  pg.end.mockResolvedValue(undefined);
});
describe("presale DB client",()=>{
  it.each([["owner","p1_live_app"],["callback","p1_live_callback"]] as const)(
    "uses a scoped read-only catalog transaction, never customer tables: %s",async(role,sqlRole)=>{
      expect(await checkLiveDbIsolation(dsn(sqlRole),role)).toBe(true);
      expect(pg.options).toHaveBeenCalledWith(expect.objectContaining({
        host:"aws-0-us-east-1.pooler.supabase.com",port:6543,user:sqlRole+".abcdefghijklmnopqrst",database:"postgres",
        ssl:expect.objectContaining({rejectUnauthorized:true,checkServerIdentity:expect.any(Function)}),
      }));
      expect(pg.query.mock.calls).toEqual([["begin read only"],["set local search_path = pg_catalog"],
        ["set local statement_timeout = '4s'"],["select current_user = $1 and goeast_p1_live.isolation_ok() as ok",[sqlRole]],["commit"]]);
      expect(pg.end).toHaveBeenCalledTimes(1);
    });
  it("fails closed and closes on an isolation failure or driver failure",async()=>{
    pg.query.mockResolvedValue({rows:[{ok:false}]});
    expect(await checkLiveDbIsolation(dsn("p1_live_app"),"owner")).toBe(false);
    expect(pg.end).toHaveBeenCalledTimes(1);
    pg.query.mockClear();
    pg.connect.mockRejectedValue(new Error("never report private driver details"));
    expect(await checkLiveDbIsolation(dsn("p1_live_callback"),"callback")).toBe(false);
    expect(pg.query).not.toHaveBeenCalled();expect(pg.end).toHaveBeenCalledTimes(2);
  });
});
