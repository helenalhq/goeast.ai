// @vitest-environment jsdom
import React from "react";
import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import GuidedFlow from "./GuidedFlow";
import {sanitizeNextPath} from "@/lib/auth-redirect";
import {getAllHexagrams} from "@/lib/iching-data";
import {loadConsultFlowDraft,saveConsultFlowDraft} from "@/lib/consult-cast";

vi.mock("next/navigation",()=>({useRouter:()=>({push:vi.fn()})}));
vi.mock("@/lib/analytics",()=>({logEvent:vi.fn()}));

const href="/consult/iching?topic=work-decision";
const login="/login?next="+encodeURIComponent(href);
const work="A work decision";
const other={topic:"A relationship pattern",customTopic:"",stuck:"Existing private text",constraint:"",
  finalQuestion:"How do I set a boundary?",step:5,
  casts:[{binary:"0",changing:true},{binary:"1",changing:false},{binary:"1",changing:false},
    {binary:"1",changing:false},{binary:"0",changing:false},{binary:"0",changing:false}] as Parameters<typeof saveConsultFlowDraft>[0]["casts"],
  castAt:0,
};
const hexagrams=getAllHexagrams();
const run=(props:Partial<React.ComponentProps<typeof GuidedFlow>>={})=>render(<GuidedFlow hexagrams={hexagrams} workDecisionIntent {...props} />);
const fetcher=vi.fn();
beforeEach(()=>{sessionStorage.clear();fetcher.mockReset();vi.stubGlobal("React",React);vi.stubGlobal("fetch",fetcher);});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});

describe("pricing work decision entry",()=>{
  it("preselects only its topic on a new draft, without requesting login, AI or payment",()=>{
    run({promptWorkDecisionSignIn:true});
    expect(screen.getByRole("button",{name:work}).getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByRole("link",{name:/sign in to continue/i})).toBeNull();
    expect(screen.queryByRole("button",{name:/checkout/i})).toBeNull();
    expect(loadConsultFlowDraft()).toMatchObject({kind:"ok",draft:{topic:work,step:1}});
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("does not preselect on the ordinary route",()=>{
    run({workDecisionIntent:false});
    expect(screen.getByRole("button",{name:work}).getAttribute("aria-pressed")).toBe("false");
    expect(loadConsultFlowDraft()).toEqual({kind:"none"});
  });
  it("preserves every field of a conflicting cast and offers an independent tab without an opener",()=>{
    const draft={...other,castAt:Date.now()};
    saveConsultFlowDraft(draft);
    run({promptWorkDecisionSignIn:true});
    expect(screen.getByText(/your current draft is unchanged/i)).toBeTruthy();
    const fresh=screen.getByRole("link",{name:/start a work decision in a new tab/i});
    expect(fresh.getAttribute("href")).toBe(href);
    expect(fresh.getAttribute("target")).toBe("_blank");
    expect(fresh.getAttribute("rel")).toContain("noopener");
    expect(screen.getByRole("heading",{name:/Hexagram 32/})).toBeTruthy();
    expect(loadConsultFlowDraft()).toEqual({kind:"ok",draft});
    expect(screen.queryByRole("link",{name:/sign in to continue/i})).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("keeps an unfinished conflicting custom draft rather than resetting or relabeling it",()=>{
    const draft={...other,topic:"__custom__",customTopic:"my own topic",step:2,casts:undefined,castAt:undefined};
    const expected=JSON.parse(JSON.stringify(draft));
    saveConsultFlowDraft(draft);
    run();
    expect(screen.getByRole("textbox").getAttribute("placeholder")).toMatch(/I start strong/);
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe(draft.stuck);
    expect(screen.getByRole("link",{name:/start a work decision in a new tab/i})).toBeTruthy();
    expect(loadConsultFlowDraft()).toEqual({kind:"ok",draft:expected});
  });
  it("lets a fresh guest cast for free before showing the report sign-in, with no network call",()=>{
    run({promptWorkDecisionSignIn:true});
    fireEvent.click(screen.getByRole("button",{name:/Continue/}));
    fireEvent.change(screen.getByRole("textbox"),{target:{value:"I am comparing two fictional team roles."}});
    fireEvent.click(screen.getByRole("button",{name:/Continue/}));
    fireEvent.click(screen.getByRole("button",{name:/Skip this step/}));
    fireEvent.click(screen.getByRole("button",{name:/Cast the Coins/}));
    expect(screen.getByRole("heading",{name:/Hexagram/})).toBeTruthy();
    const next=screen.getByRole("link",{name:/sign in to continue/i}).getAttribute("href");
    expect(next).toBe(login);
    expect(sanitizeNextPath(new URL(next!,"https://www.goeast.ai").searchParams.get("next"))).toBe(href);
    expect(loadConsultFlowDraft()).toMatchObject({kind:"ok",draft:{topic:work,step:5,casts:expect.any(Array)}});
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("guest restores the same work cast and sees a sign-in link with an exact allowlisted return route",()=>{
    const draft={...other,topic:work,castAt:Date.now()};
    saveConsultFlowDraft(draft);
    run({promptWorkDecisionSignIn:true});
    expect(screen.getByRole("heading",{name:/Hexagram 32/})).toBeTruthy();
    expect(screen.getByRole("link",{name:/sign in to continue/i}).getAttribute("href")).toBe(login);
    expect(screen.queryByRole("button",{name:/checkout/i})).toBeNull();
    expect(loadConsultFlowDraft()).toEqual({kind:"ok",draft});
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("signed-in report restores cast without starting checkout and still requires existing privacy acknowledgement",()=>{
    const draft={...other,topic:work,castAt:Date.now()};
    saveConsultFlowDraft(draft);
    run({decisionMode:"live"});
    const next=screen.getByRole("button",{name:/continue to one-time checkout/i}) as HTMLButtonElement;
    expect(next.disabled).toBe(true);
    fireEvent.click(next);
    expect(fetcher).not.toHaveBeenCalled();
    expect(loadConsultFlowDraft()).toEqual({kind:"ok",draft});
  });
});
