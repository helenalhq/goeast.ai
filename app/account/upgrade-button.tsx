"use client";

import { useUpgradeButton } from "@/lib/use-upgrade-button";

export default function UpgradeButton() {
  const { loading, error, handleUpgrade } = useUpgradeButton("account");

  return (
    <div className="border-t border-sand pt-4">
      <p className="text-sm text-warm mb-3">
        Upgrade to GoEast.ai Pro for 10 AI consultations per day and deep
        readings (~2× length + reflection prompts), including Zi Wei timing
        and palace-interaction analysis.
      </p>
      {error && (
        <p className="text-xs text-china-red mb-2" role="alert">{error}</p>
      )}
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="inline-block px-6 py-2.5 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
        style={{ backgroundColor: "#c0392b" }}
      >
        {loading ? "Redirecting..." : "Upgrade to Pro · $4.99/month"}
      </button>
    </div>
  );
}
