// @vitest-environment jsdom
import React from "react";
import {cleanup,render,screen,within} from "@testing-library/react";
import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import PricingPage from "./page";
import {isWorkDecisionEntry} from "@/lib/decision-report-entry";

vi.mock("./pricing-client",()=>({default:({children}:{children:React.ReactNode})=><div>{children}</div>}));
vi.mock("./example-viewed",()=>({default:()=>null}));
vi.mock("@/components/TryIChingLink",()=>({default:()=>null}));

const ref="abcdefghijklmnopqrst";
const db=(role:string)=>"postgresql://"+role+"."+ref+":fixture@aws-0-us-east-1.pooler.supabase.com:6543/postgres";
const env={
  VERCEL_ENV:"production",VERCEL_GIT_COMMIT_REF:"main",
  DECISION_REPORT_LIVE_SETTLEMENT_ENABLED:"true",DECISION_REPORT_LIVE_CHECKOUT_ENABLED:"true",
  DECISION_REPORT_LIVE_PUBLIC_ENABLED:"true",DECISION_REPORT_LIVE_PHASE:"public",
  DECISION_REPORT_LIVE_CANARY_OWNER_ID:"43783acb-2e34-47d4-ae37-33330a3c9d4c",
  DECISION_REPORT_LIVE_ORIGIN:"https://www.goeast.ai",DECISION_REPORT_LIVE_DB_PROJECT_REF:ref,
  DECISION_REPORT_LIVE_APP_DATABASE_URL:db("p1_live_app"),DECISION_REPORT_LIVE_CALLBACK_DATABASE_URL:db("p1_live_callback"),
  DECISION_REPORT_LIVE_CREEM_PRODUCT_ID:"prod_pricingFixture",DECISION_REPORT_LIVE_CREEM_API_KEY:"creem_fixturePricingKey",
  DECISION_REPORT_LIVE_CREEM_WEBHOOK_SECRET:"fixture-vendor-signature",CREEM_PRODUCT_ID:"prod_fixturePro",
  DECISION_REPORT_LIVE_MODEL_CREDENTIAL_SOURCE:"existing_azure",DECISION_REPORT_LIVE_MODEL_BUDGET_ACK:"true",
  AZURE_OPENAI_MODEL:"existing-deployment",AZURE_OPENAI_API_KEY:"fixture-azure-config-key",
  AZURE_OPENAI_ENDPOINT:"https://resource.openai.azure.com/openai/v1",
};

beforeEach(()=>{
  vi.stubGlobal("React",React);
  for (const [name,value] of Object.entries(env)) vi.stubEnv(name,value);
});
afterEach(()=>{cleanup();vi.unstubAllEnvs();vi.unstubAllGlobals();});

describe("pricing: distinct public P1 report",()=>{
  it("shows the one-time report price and exact CTA separately from unchanged Free and Pro",()=>{
    render(<PricingPage />);
    const card=screen.getByRole("region",{name:"Career Decision Report"});
    expect(within(card).getByText("$1.99 USD")).toBeTruthy();
    expect(within(card).getByText(/one-time payment/i)).toBeTruthy();
    expect(within(card).getByRole("link",{name:"Start a work decision"}).getAttribute("href")).toBe("/consult/iching?topic=work-decision");
    expect(screen.getByRole("heading",{name:"GoEast.ai Pro"})).toBeTruthy();
    expect(screen.getByText("$4.99")).toBeTruthy();
    expect(screen.getByRole("link",{name:"Try a free reading →"}).getAttribute("href")).toBe("/consult");
  });
  it.each([["DECISION_REPORT_LIVE_PHASE","canary"],["VERCEL_ENV","preview"],["DECISION_REPORT_LIVE_CHECKOUT_ENABLED",undefined],
    ["DECISION_REPORT_LIVE_PUBLIC_ENABLED",undefined],["DECISION_REPORT_LIVE_CALLBACK_DATABASE_URL",undefined],
    ["DECISION_REPORT_LIVE_MODEL_BUDGET_ACK",undefined],["VERCEL_GIT_COMMIT_REF","develop"]])(
      "hides the report while %s is not production public checkout", (key,value)=>{
        vi.stubEnv(key,value);
        render(<PricingPage />);
        expect(screen.queryByRole("region",{name:"Career Decision Report"})).toBeNull();
        expect(screen.getByRole("heading",{name:"GoEast.ai Pro"})).toBeTruthy();
      });
  it("allowlists only one exact topic query token",()=>{
    expect(isWorkDecisionEntry("work-decision")).toBe(true);
    for (const value of [undefined,["work-decision"],"work-decision/","A work decision","WORK-DECISION","https://example.invalid"]){
      expect(isWorkDecisionEntry(value)).toBe(false);
    }
  });
});
