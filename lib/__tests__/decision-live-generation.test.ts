import { describe, expect, it, vi } from "vitest";
import { generateDecisionReport, generateLiveDecisionReport } from "../decision-generation";
import type { DecisionInput } from "../decision-core";

const input: DecisionInput = { question:"Which fictional museum shift should I try?", alternative:"Try a weekend shift",
  casts:[{binary:"1",changing:false},{binary:"1",changing:false},{binary:"0",changing:false},
    {binary:"0",changing:false},{binary:"0",changing:true},{binary:"0",changing:true}] };
const modelBody = JSON.stringify({ restatement:"A useful real report.",
  options:[{title:"Try evenings",blindSpot:"Transport may vary",assumption:true},{title:"No substitution",blindSpot:"Weekends may be busy",assumption:true}],
  verifyQuestion:"Can I shadow an evening?", sevenDayStep:"Ask for a trial shift.", interpretation:"Real model response, not a forecast." });

describe("explicit real-model Live delivery seam (offline)", () => {
  it("always uses the configured model transport, not the fixture; retains cast and alternative from input", async () => {
    const complete = vi.fn(async () => modelBody);
    const report = await generateLiveDecisionReport(input,{model:"deployment-fixture",complete});
    expect(complete).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({model:"deployment-fixture",max_completion_tokens:1600,
      response_format:{type:"json_object"}}),expect.any(AbortSignal));
    expect(report).toMatchObject({question:input.question,casts:input.casts,primary:{number:19},transformed:{number:61},
      interpretation:"Real model response, not a forecast."});
    expect(report.options[1]).toMatchObject({title:input.alternative,assumption:false});
    expect((await generateDecisionReport(input,"mock")).interpretation).toContain("Fixture");
  });
  it("never silently delivers a fixture on missing model, invalid response or failure", async () => {
    const complete = vi.fn(async () => null);
    await expect(generateLiveDecisionReport(input,{model:"  ",complete})).rejects.toThrow();
    expect(complete).not.toHaveBeenCalled();
    await expect(generateLiveDecisionReport(input,{model:"deployment-fixture",complete})).rejects.toThrow();
    complete.mockRejectedValueOnce(new Error("provider unavailable"));
    await expect(generateLiveDecisionReport(input,{model:"deployment-fixture",complete})).rejects.toThrow();
  });
});
