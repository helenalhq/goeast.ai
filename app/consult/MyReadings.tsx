"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface ReadingSummary {
  sessionId: string;
  question: string;
  hexagramNumber?: number;
  changingLines: number[];
  createdAt: string;
  hasNextStep: boolean;
  actionStatus?: "not_started" | "in_progress" | "done" | null;
}

/**
 * Minimal "My Readings" list for logged-in users on the /consult page.
 * Shows the 10 most recent saved consultations from the database.
 */
export default function MyReadings({ showDecisionReports = false }: { showDecisionReports?: boolean }) {
  const [readings, setReadings] = useState<ReadingSummary[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/consult/list");
        if (res.ok) {
          const json = await res.json();
          setReadings(json.readings || []);
        }
      } catch {
        // Network error — show empty state
      }
      setLoading(false);
    });
  }, []);

  if (loading) return null;

  if (!showDecisionReports && !readings?.length) return null;

  return (
    <section className="max-w-2xl mx-auto px-4 py-8">
      <h2 className="font-serif text-xl text-ink mb-4">My Readings</h2>
      {showDecisionReports && (
        <Link href="/account/decision-reports" prefetch={false} className="mb-3 inline-block text-sm text-china-red underline underline-offset-2">Open my one-time decision reports</Link>
      )}
      <div className="space-y-2">
        {readings?.map((r) => (
          <Link
            key={r.sessionId}
            href={`/consult/iching/result?session=${encodeURIComponent(r.sessionId)}`}
            className="block p-4 bg-white/70 border border-sand rounded-lg hover:border-warm transition-colors no-underline"
          >
            <p className="text-sm text-ink leading-relaxed line-clamp-2">
              {r.question}
            </p>
            <p className="text-xs text-warm/70 mt-1">
              Hexagram {r.hexagramNumber || "—"}
              {r.changingLines.length > 0 && ` · changing ${r.changingLines.join(", ")}`}
              {" · "}
              {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              {r.hasNextStep && " · ✓ has next step"}
              {r.actionStatus === "in_progress" && " · ⟳ 进行中"}
              {r.actionStatus === "done" && " · ✓ 已完成"}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
