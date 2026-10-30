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
}

/**
 * Minimal "My Relationship Reports" list for logged-in users.
 * Reuses /api/synastry/list — no new storage.
 */
export default function SynastryHistoryList() {
  const [reports, setReports] = useState<SynastrySummary[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/synastry/list");
        if (res.ok) {
          const json = await res.json();
          setReports(json.reports || []);
        }
      } catch {
        // Network error
      }
      setLoading(false);
    });
  }, []);

  if (loading || !reports || reports.length === 0) return null;

  const relLabels: Record<string, string> = {
    romantic: "Romantic",
    business: "Business",
    "parent-child": "Parent-Child",
    friendship: "Friendship",
  };

  return (
    <section className="max-w-2xl mx-auto px-4 py-8">
      <h2 className="font-serif text-xl text-ink mb-4">My Relationship Reports</h2>
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
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
