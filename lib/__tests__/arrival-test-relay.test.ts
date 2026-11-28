import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "../../app/api/webhooks/creem-arrival-test/route";

const secret="arrival-qa-unit-only";
const payload={eventType:"checkout.completed",object:{mode:"test",product:{id:"prod_6mUIh9LkfcmjyuSLmfByO"},metadata:{offer_id:"shanghai_arrival_qa"}}};
const origin="https://preview.goeast.ai/api/webhooks/creem-arrival-test";
const target="https://go-east-ready-pclius-projects-c305da2a.vercel.app";
function setup(){
  vi.stubEnv("VERCEL_ENV","preview");vi.stubEnv("ARRIVAL_TEST_RELAY_TARGET",target);
  vi.stubEnv("ARRIVAL_CREEM_TEST_WEBHOOK_SECRET",secret);
}
function req({url=origin,body=JSON.stringify(payload),sig=createHmac("sha256",secret).update(body).digest("hex")}={}){
  return new Request(url,{method:"POST",headers:{"creem-signature":sig,"x-vercel-oidc-token":"platform-identity","content-type":"application/json"},body});
}
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe("isolated Creem Arrival Test relay",()=>{
  it("rejects off-host, non-preview, and unsigned POSTs without network access",async()=>{
    setup();const upstream=vi.fn();vi.stubGlobal("fetch",upstream);
    expect((await POST(req({url:origin.replace("preview.","www.")}))).status).toBe(404);
    expect((await POST(req({sig:"bad"}))).status).toBe(401);
    vi.stubEnv("VERCEL_ENV","production");
    expect((await POST(req())).status).toBe(404);
    expect(upstream).not.toHaveBeenCalled();
  });
  it("ignores other products and forwards the signed original body to one fixed path",async()=>{
    setup();const upstream=vi.fn().mockResolvedValue(new Response('{"result":"paid"}',{status:200}));vi.stubGlobal("fetch",upstream);
    const body=JSON.stringify(payload);
    expect((await POST(req({body:body.replace("shanghai_arrival_qa","decision_once")}))).status).toBe(200);
    expect(upstream).not.toHaveBeenCalled();
    const res=await POST(req({body}));
    expect(res.status).toBe(200);
    expect(upstream).toHaveBeenCalledWith(target+"/api/arrival-test/webhook",expect.objectContaining({body,method:"POST",redirect:"error",headers:expect.objectContaining({"x-vercel-trusted-oidc-idp-token":"platform-identity"})}));
  });
  it("is retryable when its fixed upstream is unavailable",async()=>{
    setup();vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response("restricted",{status:403})));
    expect((await POST(req())).status).toBe(503);
  });
});
