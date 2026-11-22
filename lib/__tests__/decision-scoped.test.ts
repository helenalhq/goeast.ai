import { describe, expect, it } from "vitest";
import { decisionConfig } from "../decision-config";

const ref = "abcdefghijklmnopqrst";
const user = "33783acb-2e34-47d4-ae37-33330a3c9d4c";
const dsn = `postgresql://goeast_p1_qa.${ref}:not-a-secret@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;
const env = { VERCEL_ENV:"preview", DECISION_REPORT_ENABLED:"true", DECISION_REPORT_MODE:"mock",
  DECISION_REPORT_STORAGE:"scoped-postgres", DECISION_REPORT_SCOPED_DATABASE_URL:dsn,
  NEXT_PUBLIC_SUPABASE_URL:`https://${ref}.supabase.co`, DECISION_REPORT_PREVIEW_QA_USER_ID:user };

describe("same-project Preview QA configuration", () => {
  it("accepts only explicit scoped storage and a dedicated matching login", () => {
    expect(decisionConfig(env)).toMatchObject({ storage:"scoped-postgres", dsn, qaUserId:user, mode:"mock" });
    expect(decisionConfig({...env, DECISION_REPORT_STORAGE:undefined})).toBeNull();
    expect(decisionConfig({...env, DECISION_REPORT_SCOPED_DATABASE_URL:undefined})).toBeNull();
    expect(decisionConfig({...env, VERCEL_ENV:"production"})).toBeNull();
    expect(decisionConfig({...env, DECISION_REPORT_ENABLED:"false"})).toBeNull();
    expect(decisionConfig({...env, DECISION_REPORT_PREVIEW_QA_USER_ID:"missing"})).toBeNull();
    expect(decisionConfig({...env, DECISION_REPORT_SUPABASE_SERVICE_ROLE_KEY:"do-not-mix"})).toBeNull();
  });
  it.each([
    dsn.replace("goeast_p1_qa", "postgres"),
    dsn.replace(ref, "zzzzzzzzzzzzzzzzzzzz"),
    dsn.replace(":6543", ":5432"),
    dsn.replace("pooler.supabase.com", "pooler.supabase.com.example.test"),
    dsn.replace("/postgres", "/other"),
    dsn+"?sslmode=disable",
    dsn.replace(":not-a-secret", ""),
  ])("rejects an unverified or ambiguous DSN", (bad) => {
    expect(decisionConfig({...env, DECISION_REPORT_SCOPED_DATABASE_URL:bad})).toBeNull();
  });
});

describe("canonical GoEast TEST checkout return origin", () => {
  const origin = "https://preview.goeast.ai";
  const test = {...env, DECISION_REPORT_MODE:"test", DECISION_REPORT_CREEM_API_KEY:"creem_test_fake",
    DECISION_REPORT_CREEM_WEBHOOK_SECRET:"secret", DECISION_REPORT_CREEM_PRODUCT_ID:"prod_61uy92GSfzQr7WkhGkbt4s",
    AZURE_OPENAI_API_KEY:"fake", AZURE_OPENAI_ENDPOINT:"https://example.invalid",
    DECISION_REPORT_PREVIEW_ORIGIN:origin, VERCEL_GIT_COMMIT_REF:"develop",
    VERCEL_URL:"go-east-generated-preview.vercel.app"};
  it("accepts only develop Preview, the exact canonical origin, and the existing report Test SKU", () => {
    expect(decisionConfig(test)).toMatchObject({ mode:"test", storage:"scoped-postgres", publicOrigin:origin });
    for (const ref of [undefined, "main", "emma/goeast-p1-scoped-qa"]) {
      expect(decisionConfig({...test, VERCEL_GIT_COMMIT_REF:ref})).toBeNull();
    }
    for (const url of [undefined, origin+"/", origin+":443", "https://"+test.VERCEL_URL]) {
      expect(decisionConfig({...test, DECISION_REPORT_PREVIEW_ORIGIN:url})).toBeNull();
    }
    expect(decisionConfig({...test, DECISION_REPORT_CREEM_PRODUCT_ID:"prod_other"})).toBeNull();
    expect(decisionConfig({...test, VERCEL_ENV:"production"})).toBeNull();
    expect(decisionConfig({...test, CREEM_WEBHOOK_SECRET:"secret"})).toBeNull();
  });
});
