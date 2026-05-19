"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const FEATURES = [
  { label: "Oracle consultations", free: "1 / day", pro: "10 / day" },
  { label: "Philosophers", free: "All 11", pro: "All 11" },
  { label: "AI-powered readings", free: true, pro: true },
  { label: "Streaming responses", free: true, pro: true },
  { label: "Bilingual support", free: true, pro: true },
  { label: "I Ching divination", free: false, pro: true },
  { label: "Priority access", free: false, pro: true },
] as const;

function Check({ active }: { active: boolean }) {
  return active ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#27ae60" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c0b8a8" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default function OracleCta() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase
          .from("subscriptions")
          .select("status")
          .eq("user_id", data.user.id)
          .in("status", ["active", "scheduled_cancel"])
          .limit(1)
          .maybeSingle()
          .then(({ data: sub }) => {
            setIsSubscribed(!!sub);
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });
  }, []);

  return (
    <section className="max-w-4xl mx-auto px-4 py-16 border-t border-sand">
      <div className="text-center mb-10">
        <h2 className="text-2xl font-bold text-ink mb-2">Pricing</h2>
        <p className="text-warm">
          Choose your path to ancient wisdom
          <br />
          <span className="text-sm">选择你的问道之路</span>
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 items-start">
        {/* Free Tier */}
        <div className="bg-white rounded-2xl border border-sand p-8">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-ink">Free</h3>
            <p className="text-sm text-warm mt-1">Explore the oracle at no cost</p>
          </div>
          <div className="mb-6">
            <span className="text-3xl font-bold text-ink">$0</span>
            <span className="text-warm text-sm"> / month</span>
          </div>

          <ul className="space-y-3 mb-8">
            {FEATURES.map((f, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex-shrink-0">
                  {typeof f.free === "boolean" ? <Check active={f.free} /> : <Check active />}
                </span>
                <span className="text-sm text-ink">
                  {f.label}
                  {typeof f.free === "string" && (
                    <span className="text-warm ml-1">· {f.free}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>

          <Link
            href="/sophies-journey"
            className="block w-full text-center py-2.5 rounded-lg text-sm font-medium border border-sand text-ink hover:bg-cream transition-colors cursor-pointer"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Get Started
          </Link>
        </div>

        {/* Pro Tier */}
        <div className="relative bg-white rounded-2xl border-2 border-china-red p-8 shadow-sm">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-china-red text-white text-xs font-medium">
            Recommended
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-bold text-ink">Pro</h3>
            <p className="text-sm text-warm mt-1">Deepen your consultations</p>
          </div>
          <div className="mb-6">
            <span className="text-3xl font-bold text-ink">$4.99</span>
            <span className="text-warm text-sm"> / month</span>
          </div>

          <ul className="space-y-3 mb-8">
            {FEATURES.map((f, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex-shrink-0">
                  {typeof f.pro === "boolean" ? <Check active={f.pro} /> : <Check active />}
                </span>
                <span className="text-sm text-ink">
                  {f.label}
                  {typeof f.pro === "string" && (
                    <span className="text-warm ml-1">· {f.pro}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>

          {loading ? (
            <div className="h-10 rounded-lg bg-cream animate-pulse" />
          ) : isSubscribed ? (
            <div className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-green-50 border border-green-200">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm font-medium text-green-700" style={{ fontFamily: "Georgia, serif" }}>
                Your Current Plan
              </span>
            </div>
          ) : (
            <Link
              href="/account"
              className="block w-full text-center py-2.5 rounded-lg text-sm font-medium bg-china-red text-white hover:bg-china-red/90 transition-colors cursor-pointer"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Subscribe Now
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
