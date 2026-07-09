"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function PricingClient({
  paymentEnabled,
}: {
  paymentEnabled: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<{ email?: string | null } | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setChecking(false);
    });
  }, []);

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

  if (!paymentEnabled) {
    return (
      <div className="block w-full text-center px-6 py-2.5 rounded-lg bg-warm/30 text-warm text-sm font-medium cursor-not-allowed">
        Coming soon
      </div>
    );
  }

  if (checking) {
    return (
      <div className="block w-full text-center px-6 py-2.5 rounded-lg bg-china-red/50 text-white text-sm font-medium cursor-wait">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <Link
        href="/login?redirect=/pricing"
        className="block w-full text-center px-6 py-2.5 rounded-lg bg-china-red text-white text-sm font-medium hover:bg-china-red/90 transition-colors"
      >
        Sign in to upgrade
      </Link>
    );
  }

  return (
    <button
      onClick={handleUpgrade}
      disabled={loading}
      className="block w-full px-6 py-2.5 rounded-lg bg-china-red text-white text-sm font-medium hover:bg-china-red/90 transition-colors disabled:opacity-50 cursor-pointer"
    >
      {loading ? "Redirecting..." : "Upgrade to Pro"}
    </button>
  );
}
