"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import {
  loadSynastryResult,
  saveSynastryResult,
  validateSynastryResult,
} from "@/lib/synastry-session";
import type { SynastryChart, SynastryResult } from "@/lib/synastry-session";
import { RELATIONSHIP_LABELS, mapBrightness } from "@/lib/ziwei-synastry";
import type { RelationshipType } from "@/lib/ziwei-synastry";

/**
 * Account-save status lifecycle (same pattern as consult results):
 *   "checking" → loaded locally, confirming with server
 *   "saved"    → server confirmed this result exists in the account
 *   "local"    → not in account (not logged in, or save failed)
 *   "error"    → server unreachable, status unknown (local copy intact)
 */
type AccountSaveStatus = "checking" | "saved" | "local" | "error";

const HOUR_UNKNOWN = -1;

function hourLabel(hour: number | null | undefined): string {
  if (hour === null || hour === undefined || hour === HOUR_UNKNOWN) return "Unknown 未知";
  const zh = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"][hour] || "?";
  return `${zh}时`;
}

function personSummary(person: { birthDate: string; birthHour: number | null; gender: string }) {
  return `${person.birthDate} · ${hourLabel(person.birthHour)} · ${person.gender === "male" ? "♂ 男" : "♀ 女"}`;
}

/** Compact 12-palace table for one chart. */
function PalaceTable({ chart }: { chart: SynastryChart | null }) {
  const palaces = chart?.palaces || [];
  if (palaces.length === 0) {
    return <p className="text-sm text-warm/70">No chart data available for this person. 缺少盘面数据。</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left text-xs text-warm border-b border-sand">
            <th className="py-1.5 pr-3 font-medium">Palace 宫位</th>
            <th className="py-1.5 pr-3 font-medium">Branch 干支</th>
            <th className="py-1.5 font-medium">Major Stars 主星</th>
          </tr>
        </thead>
        <tbody>
          {palaces.map((p, i) => (
            <tr key={i} className="border-b border-sand/50 last:border-b-0">
              <td className="py-1.5 pr-3 text-ink whitespace-nowrap">{p.name}</td>
              <td className="py-1.5 pr-3 text-warm whitespace-nowrap">
                {p.heavenlyStem || ""}{p.earthlyBranch || ""}
              </td>
              <td className="py-1.5 text-ink/85">
                {(p.majorStars || []).length > 0
                  ? (p.majorStars || [])
                      .map(
                        (s) =>
                          `${s.name}${mapBrightness(s.brightness) ? ` ${mapBrightness(s.brightness)}` : ""}${
                            s.mutagen ? ` [${s.mutagen}]` : ""
                          }`
                      )
                      .join(" · ")
                  : <span className="text-warm/60">无主星 No major star</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SynastryResultView() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");
  const [result, setResult] = useState<SynastryResult | null | undefined>(undefined); // undefined = loading
  const [accountStatus, setAccountStatus] = useState<AccountSaveStatus>("checking");
  const [restoredFromCloud, setRestoredFromCloud] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // 1. sessionStorage first (instant, same-tab)
      const local = loadSynastryResult(sessionId);
      if (local && !cancelled) {
        setResult(local);
        setAccountStatus("checking");
        try {
          const res = await fetch(`/api/synastry/result?session_id=${encodeURIComponent(sessionId || "")}`);
          if (cancelled) return;
          if (res.ok) {
            const data = await res.json();
            setAccountStatus(data.result ? "saved" : "local");
          } else if (res.status === 401) {
            setAccountStatus("local");
          } else {
            setAccountStatus("error");
          }
        } catch {
          if (!cancelled) setAccountStatus("error");
        }
        return;
      }

      // 2. No local copy — try DB restore (cross-tab, cross-session)
      try {
        const res = await fetch(`/api/synastry/result?session_id=${encodeURIComponent(sessionId || "")}`);
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          if (data.result && validateSynastryResult({ ...data.result, sessionId: sessionId || "" })) {
            const restored: SynastryResult = { ...data.result, sessionId: sessionId || data.result.sessionId };
            setResult(restored);
            setRestoredFromCloud(true);
            setAccountStatus("saved");
            saveSynastryResult(restored);
            return;
          }
          setResult(null); // logged in, not found
          return;
        }
        if (res.status === 401) {
          setResult(null); // not logged in, no local copy
          return;
        }
      } catch {
        // Network error — fall through
      }

      if (!cancelled) setResult(null);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (result === undefined) {
    return <div className="p-6 bg-cream rounded-xl border border-sand text-center text-warm">Loading…</div>;
  }

  if (result === null) {
    return (
      <div className="p-6 sm:p-8 bg-cream rounded-xl border border-sand text-center">
        <h1 className="font-serif text-2xl text-ink mb-3">This reading is no longer available</h1>
        <p className="text-sm text-ink/70 mb-6">
          {sessionId
            ? "This reading was not found in your saved results. If you were logged in when it was created, try logging in again."
            : "No reading session was specified."}
        </p>
        <Link
          href="/ziwei/synastry"
          className="inline-block px-6 py-3 bg-china-red text-white rounded-full font-medium hover:bg-china-red/90 transition-colors"
        >
          Start a new synastry · 开始新的合盘
        </Link>
      </div>
    );
  }

  const relLabel = RELATIONSHIP_LABELS[result.relationshipType as RelationshipType];

  return (
    <div className="bg-paper-panel rounded-xl border border-sand overflow-hidden shadow-sm">
      {restoredFromCloud && (
        <div className="px-5 sm:px-6 py-2 bg-cream/60 text-xs text-warm text-center">
          Restored from your saved readings · 已从账户恢复
        </div>
      )}

      {/* 1. Inputs */}
      <section className="px-5 sm:px-6 py-5">
        <h2 className="font-serif text-lg text-warm mb-2">Synastry Inputs · 合盘信息</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="p-3 bg-white/70 border border-sand rounded-lg">
            <p className="text-xs text-warm mb-1">Person A · 甲方</p>
            <p className="text-ink">{personSummary(result.personA)}</p>
          </div>
          <div className="p-3 bg-white/70 border border-sand rounded-lg">
            <p className="text-xs text-warm mb-1">Person B · 乙方</p>
            <p className="text-ink">{personSummary(result.personB)}</p>
          </div>
        </div>
        <p className="text-sm text-ink/80 mt-3">
          Relationship · 关系类型: {relLabel ? `${relLabel.en} (${relLabel.zh})` : result.relationshipType}
        </p>
      </section>

      {/* 2. Chart Data — before AI interpretation, collapsible without JS */}
      <section className="px-5 sm:px-6 py-5 border-t border-sand">
        <details className="group">
          <summary className="cursor-pointer font-serif text-lg text-warm select-none">
            Chart Data 盘面数据
            <span className="block text-xs font-sans text-warm/60 mt-1 group-open:mb-2">
              Calculated by the iztro engine — this is the input the AI used. 由 iztro 引擎排盘，即 AI 解读所依据的原始盘面。
            </span>
          </summary>
          <div className="mt-4 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-ink mb-2">Person A · 甲方</h3>
              <PalaceTable chart={result.chartA} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink mb-2">Person B · 乙方</h3>
              <PalaceTable chart={result.chartB} />
            </div>
          </div>
        </details>
      </section>

      {/* 3. AI Interpretation */}
      <section className="px-5 sm:px-6 py-5 border-t border-sand">
        <h2 className="font-serif text-lg text-warm mb-1">AI Interpretation · AI 解读</h2>
        <p className="text-xs text-warm/70 mb-3">
          Generated by AI based on both charts. It is material for reflection — not a prediction, not professional advice.
        </p>
        <div className="prose prose-sm prose-warm max-w-none">
          <ReactMarkdown>{result.aiResponse}</ReactMarkdown>
        </div>
      </section>

      {/* Actions */}
      <div className="px-5 sm:px-6 py-5 border-t border-sand flex flex-col sm:flex-row gap-3 bg-sand/20">
        <Link
          href="/ziwei/synastry"
          className="px-6 py-3 bg-china-red text-white rounded-full font-medium hover:bg-china-red/90 transition-colors text-center"
        >
          Back to synastry · 返回合盘
        </Link>
        <span className="px-2 py-3 text-xs text-warm self-center">
          {accountStatus === "checking" && "Confirming save status…"}
          {accountStatus === "saved" && "Saved to your account · 已保存到账户"}
          {accountStatus === "local" && "Saved in this tab · 已保存在本标签页"}
          {accountStatus === "error" && "Save status unknown — your reading is available in this tab."}
        </span>
      </div>
    </div>
  );
}
