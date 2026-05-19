"use client";

import { useState } from "react";

export default function CancelButton() {
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const handleCancel = async () => {
    if (!confirm) {
      setConfirm(true);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/cancel-subscription", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        window.location.href = "/account";
      } else {
        alert(data.error || "Failed to cancel");
        setLoading(false);
        setConfirm(false);
      }
    } catch {
      alert("Something went wrong");
      setLoading(false);
      setConfirm(false);
    }
  };

  return (
    <button
      onClick={handleCancel}
      disabled={loading}
      className="text-sm text-warm hover:text-china-red transition-colors cursor-pointer disabled:opacity-50"
    >
      {loading
        ? "Cancelling..."
        : confirm
          ? "Click again to confirm cancellation"
          : "Cancel Subscription"}
    </button>
  );
}
