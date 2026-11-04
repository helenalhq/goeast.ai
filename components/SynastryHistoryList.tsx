"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface SynastrySummary {
  sessionId: string;
  relationshipType: string;
  personA: { birthDate: string };
  personB: { birthDate: string };
  createdAt: string;
  actionStatus?: "not_started" | "in_progress" | "done" | null;
}

/**
 * "My Relationship Reports" list for logged-in users.
 * Reuses /api/synastry/list — no new storage. Empty and failed states are
 * shown (not silently hidden) so the entry point stays discoverable.
 */
export default function SynastryHistoryList() {
  const [reports, setReports] = useState<SynastrySummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        setLoading(false);
        return;
      }
      setLoggedIn(true);
      try {
        const res = await fetch("/api/synastry/list");
        if (res.ok) {
          const json = await res.json();
          setReports(json.reports || []);
        } else {
          setLoadError(true);
        }
      } catch {
        setLoadError(true);
      }
      setLoading(false);
    });
  }, []);

  if (loading || !loggedIn) return null;

  const relLabels: Record<string, string> = {
    romantic: "Romantic",
    business: "Business",
    "parent-child": "Parent-Child",
    friendship: "Friendship",
  };

  return (
    <section className="max-w-2xl mx-auto px-4 py-8">
      <h2 className="font-serif text-xl text-ink mb-4">My Relationship Reports · 我的关系报告</h2>
      {loadError ? (
        <p className="text-sm text-china-red" role="alert">
          Couldn&apos;t load your reports — check your connection and refresh to retry.
        </p>
      ) : !reports || reports.length === 0 ? (
        <p className="text-sm text-warm">
          No relationship reports yet.{" "}
          <Link href="/ziwei/synastry" className="underline underline-offset-2">
            Start your first synastry reading →
          </Link>
        </p>
      ) : (
      <div className="space-y-2">
        {reports.map((r) => (
          <Link
            key={r.sessionId}
            href={`/ziwei/synastry/result?session=${encodeURIComponent(r.sessionId)}`}
            className="block p-4 bg-white/70 border border-sand rounded-lg hover:border-warm transition-colors no-underline"
          >
            <p className="text-sm text-ink">
              {relLabels[r.relationshipType] || r.relationshipType}
              {" · "}
              {r.personA?.birthDate} & {r.personB?.birthDate}
            </p>
            <p className="text-xs text-warm/70 mt-1">
              {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              {r.actionStatus === "in_progress" && " · ⟳ 进行中"}
              {r.actionStatus === "done" && " · ✓ 已完成"}
            </p>
          </Link>
        ))}
      </div>
      )}
    </section>
  );
}
