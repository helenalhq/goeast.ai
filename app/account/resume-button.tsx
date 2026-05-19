"use client";

import { useState } from "react";

export default function ResumeButton() {
  const [loading, setLoading] = useState(false);

  const handleResume = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/resume-subscription", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        window.location.href = "/account";
      } else {
        alert(data.error || "Failed to resume");
        setLoading(false);
      }
    } catch {
      alert("Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="border-t border-sand pt-4">
      <p className="text-sm text-warm mb-3">
        Your subscription will be cancelled at the end of the current period.
      </p>
      <button
        onClick={handleResume}
        disabled={loading}
        className="text-sm font-medium px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors cursor-pointer disabled:opacity-50"
        style={{ fontFamily: "Georgia, serif" }}
      >
        {loading ? "Resuming..." : "Resume Subscription"}
      </button>
    </div>
  );
}
