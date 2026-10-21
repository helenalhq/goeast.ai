"use client";

import { useState } from "react";
import { logEvent } from "@/lib/analytics";

export default function UpgradeButton() {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    logEvent("upgrade_clicked", { from: "account" });
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert(data.error || "Failed to start checkout");
        setLoading(false);
      }
    } catch {
      alert("Payment service unavailable");
      setLoading(false);
    }
  };

  return (
    <div className="border-t border-sand pt-4">
      <p className="text-sm text-warm mb-3">
        Upgrade to GoEast.ai Pro for 10 AI consultations per day and deep
        readings (~2× length + reflection prompts), including Zi Wei timing
        and palace-interaction analysis.
      </p>
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
