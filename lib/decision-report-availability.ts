import { decisionOfferMode, isDecisionOfferEnabled } from "./decision-config";
import { decisionLiveCheckoutAllowed } from "./decision-live-policy";
import { decisionLiveRuntime, liveCheckoutConfigured } from "./decision-live-runtime-config";

export function decisionReportAccessConfigured(userId?: string) {
  return isDecisionOfferEnabled(userId) || !!decisionLiveRuntime()?.ownerDsn;
}

export function decisionReportOfferConfigured() {
  return isDecisionOfferEnabled() || liveCheckoutConfigured(decisionLiveRuntime());
}

export function decisionReportOfferForUser(userId: string) {
  const runtime=decisionLiveRuntime();
  if (runtime && liveCheckoutConfigured(runtime)
      && decisionLiveCheckoutAllowed(runtime.policy,userId,runtime.policy.origin)) {
    return {mode:"live" as const,canary:runtime.policy.phase==="canary"};
  }
  return {mode:decisionOfferMode(userId),canary:false};
}
