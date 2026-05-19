"use client";

import { useState } from "react";

export default function UpgradeButton() {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
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
        Upgrade for unlimited oracle consultations with every philosopher.
      </p>
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="inline-block px-6 py-2.5 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
        style={{ backgroundColor: "#c0392b" }}
      >
        {loading ? "Redirecting..." : "Unlock Unlimited · $4.99/month"}
      </button>
    </div>
  );
}
