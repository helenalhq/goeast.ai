"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  newSynastrySessionId,
  saveSynastryResult,
  persistSynastryResult,
} from "@/lib/synastry-session";
import type { SynastryChart, SynastryPersonInput } from "@/lib/synastry-session";
import { getHourLabel } from "@/lib/ziwei-prompts";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { loginUrlWithNext } from "@/lib/auth-redirect";
import { saveDraft, loadDraft } from "@/lib/draft";
import { logEvent } from "@/lib/analytics";

type RelationshipType = "romantic" | "business" | "parent-child" | "friendship";

const RELATIONSHIP_OPTIONS: { value: RelationshipType; label_en: string; label_zh: string }[] = [
  { value: "romantic", label_en: "Romantic", label_zh: "感情" },
  { value: "business", label_en: "Business", label_zh: "事业" },
  { value: "parent-child", label_en: "Parent-Child", label_zh: "亲子" },
  { value: "friendship", label_en: "Friendship", label_zh: "友谊" },
];

const BIRTH_HOURS = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label_en: getHourLabel(i, "en"),
  label_zh: getHourLabel(i, "zh"),
}));

/** -1 = explicitly "unknown"; null = no selection yet. Both block analysis. */
const HOUR_UNKNOWN = -1;

type PersonInput = SynastryPersonInput;

function isHourUnknown(hour: number | null): boolean {
  return hour === null || hour === HOUR_UNKNOWN;
}

function PersonForm({
  label,
  person,
  onChange,
}: {
  label: string;
  person: PersonInput;
  onChange: (p: PersonInput) => void;
}) {
  return (
    <div className="p-4 bg-white border border-sand rounded-lg">
      <h4 className="text-sm font-bold text-ink mb-3">{label}</h4>
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-warm mb-1">Birth Date · 出生日期</label>
          <input
            type="date"
            value={person.birthDate}
            onChange={(e) => onChange({ ...person, birthDate: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-sand rounded-lg focus:outline-none focus:border-china-red"
            min="1900-01-01"
            max="2026-12-31"
          />
        </div>
        <div>
          <label className="block text-xs text-warm mb-1">Birth Hour · 出生时辰</label>
          <select
            value={person.birthHour === null ? "" : person.birthHour}
            onChange={(e) =>
              onChange({
                ...person,
                birthHour: e.target.value === "" ? null : Number(e.target.value),
              })
            }
            className="w-full px-3 py-2 text-sm border border-sand rounded-lg focus:outline-none focus:border-china-red"
          >
            <option value="">Select hour… / 请选择时辰</option>
            {BIRTH_HOURS.map((h) => (
              <option key={h.value} value={h.value}>
                {h.label_zh} ({h.label_en})
              </option>
            ))}
            <option value={HOUR_UNKNOWN}>Unknown / 未知时辰</option>
          </select>
          <p className="mt-1 text-[11px] leading-snug text-warm/70">
            Use the local time at the birth place. The system uses the Chinese double-hour (时辰) system.
            请使用出生地当地时间，系统按中国传统时辰排盘。
          </p>
          {isHourUnknown(person.birthHour) && (
            <p className="mt-2 p-2 text-xs leading-snug text-red-700 bg-red-50 border border-red-200 rounded-lg">
              Birth hour is required for accurate chart calculation. Zi Wei Dou Shu places stars based on the
              two-hour Chinese time period — without it, the Life Palace position and all star placements may be
              wrong. 出生时辰为排盘必需，缺失时命宫位置与星曜布局可能有误。
            </p>
          )}
        </div>
        <div>
          <label className="block text-xs text-warm mb-1">Gender · 性别</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onChange({ ...person, gender: "male" })}
              className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                person.gender === "male"
                  ? "bg-ink text-white border-ink"
                  : "bg-white text-ink border-sand hover:border-ink"
              }`}
            >
              ♂ Male · 男
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...person, gender: "female" })}
              className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                person.gender === "female"
                  ? "bg-ink text-white border-ink"
                  : "bg-white text-ink border-sand hover:border-ink"
              }`}
            >
              ♀ Female · 女
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const SYNASTRY_DRAFT_KEY = "ziwei-synastry";

export default function ZiweiSynastry() {
  const router = useRouter();
  const [personA, setPersonA] = useState<PersonInput>({ birthDate: "", birthHour: null, gender: "male" });
  const [personB, setPersonB] = useState<PersonInput>({ birthDate: "", birthHour: null, gender: "female" });
  const [relationshipType, setRelationshipType] = useState<RelationshipType>("romantic");
  const [language, setLanguage] = useState<"en" | "zh" | "both">("both");
  const [interpretation, setInterpretation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [loginHref, setLoginHref] = useState("/login");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user);
    });
  }, []);

  // Restore synastry inputs after a login round-trip.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const draft = loadDraft<{ personA: PersonInput; personB: PersonInput; relationshipType: RelationshipType }>(SYNASTRY_DRAFT_KEY);
    if (draft?.personA && draft?.personB) {
      setPersonA(draft.personA);
      setPersonB(draft.personB);
      if (draft.relationshipType) setRelationshipType(draft.relationshipType);
    }
    setDraftLoaded(true);
    setLoginHref(loginUrlWithNext());
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (draftLoaded) {
      saveDraft(SYNASTRY_DRAFT_KEY, { personA, personB, relationshipType });
    }
  }, [draftLoaded, personA, personB, relationshipType]);

  const handleAnalyze = async () => {
    // Wait for the auth check: null (in flight) falls through to the API,
    // which answers 401 LOGIN_REQUIRED if the user is truly signed out.
    if (isLoggedIn === false) {
      window.location.href = loginUrlWithNext();
      return;
    }

    if (!personA.birthDate || !personB.birthDate) {
      setError("Please enter birth dates for both persons.");
      return;
    }

    if (isHourUnknown(personA.birthHour) || isHourUnknown(personB.birthHour)) {
      setError(
        "Birth hour is required for both persons — without it the chart cannot be calculated accurately. 请提供双方的出生时辰。"
      );
      return;
    }

    setLoading(true);
    setError("");
    setInterpretation("");

    logEvent("synastry_analysis_started");

    // Finalize: persist locally, mirror to the account DB (fire-and-forget),
    // then move to the dedicated result page.
    const finalize = (fullText: string, cA: SynastryChart | null, cB: SynastryChart | null) => {
      const sessionId = newSynastrySessionId();
      const result = {
        sessionId,
        personA,
        personB,
        relationshipType,
        language,
        chartA: cA,
        chartB: cB,
        aiResponse: fullText,
        completedAt: new Date().toISOString(),
      };
      saveSynastryResult(result);
      // Fire-and-forget — the result page falls back to sessionStorage if this fails.
      persistSynastryResult(result);
      logEvent("synastry_analysis_completed");
      router.push(`/ziwei/synastry/result?session=${sessionId}`);
    };

    try {
      const response = await fetch("/api/ziwei/synastry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personA, personB, relationshipType, language }),
      });

      if (!response.ok) {
        const errData = await response.json();
        if (errData.code === "LOGIN_REQUIRED") {
          window.location.href = loginUrlWithNext();
          return;
        } else if (errData.code === "LIMIT_REACHED") {
          setError(
            errData.error ||
              "Daily limit reached — the free plan includes 3 AI consultations per day; Pro includes 10."
          );
        } else {
          setError(errData.error || "Failed to get analysis.");
        }
        setLoading(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setError("Stream not available.");
        setLoading(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";
      let localChartA: SynastryChart | null = null;
      let localChartB: SynastryChart | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") {
            finalize(fullText, localChartA, localChartB);
            return;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "charts") {
              localChartA = parsed.dataA ?? null;
              localChartB = parsed.dataB ?? null;
            } else if (parsed.type === "content" && parsed.content) {
              fullText += parsed.content;
              setInterpretation((prev) => prev + parsed.content);
            } else if (parsed.type === "error") {
              setError(parsed.error);
              setLoading(false);
              return;
            }
          } catch {
            // Skip unparseable
          }
        }
      }
      // Stream ended without an explicit [DONE] — still save what we have.
      if (fullText) {
        finalize(fullText, localChartA, localChartB);
        return;
      }
      setLoading(false);
    } catch (err) {
      console.error("Synastry error:", err);
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Delivery Preview — show before input so users know what they'll get */}
      <div className="mb-8 p-5 bg-cream rounded-xl border border-sand">
        <h3 className="font-serif text-lg text-ink mb-2">What Your Report Includes</h3>
        <ul className="text-sm text-warm space-y-1.5 mb-3">
          <li className="flex gap-2"><span className="text-china-red">•</span> How you interact — grounded in both charts&apos; Life Palace stars</li>
          <li className="flex gap-2"><span className="text-china-red">•</span> Communication differences — what each chart suggests about expression</li>
          <li className="flex gap-2"><span className="text-china-red">•</span> Where friction can arise — specific scenarios, not vague warnings</li>
          <li className="flex gap-2"><span className="text-china-red">•</span> One actionable step for each person</li>
          <li className="flex gap-2"><span className="text-china-red">•</span> Three questions to discuss together</li>
        </ul>
        <div className="flex flex-wrap gap-3 items-center">
          <Link
            href="/ziwei/synastry/example"
            className="text-sm text-china-red hover:underline"
          >
            See a completed example →
          </Link>
          <span className="text-xs text-warm/60">
            Free account required · 3 free readings/day · chart casting is free, no login needed
          </span>
        </div>
      </div>

      {/* Input Forms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <PersonForm label="Person A · 甲方" person={personA} onChange={setPersonA} />
        <PersonForm label="Person B · 乙方" person={personB} onChange={setPersonB} />
      </div>

      {/* Relationship Type */}
      <div className="mb-4">
        <label className="block text-xs text-warm mb-2">Relationship Type · 关系类型</label>
        <div className="flex flex-wrap gap-2">
          {RELATIONSHIP_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRelationshipType(opt.value)}
              className={`px-4 py-2 text-sm rounded-full border transition-colors ${
                relationshipType === opt.value
                  ? "bg-ink text-white border-ink"
                  : "bg-white text-ink border-sand hover:border-ink"
              }`}
            >
              {opt.label_en} · {opt.label_zh}
            </button>
          ))}
        </div>
      </div>

      {/* Language */}
      <div className="mb-6">
        <label className="block text-xs text-warm mb-2">Language · 语言</label>
        <div className="flex gap-2">
          {(["en", "zh", "both"] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                language === lang
                  ? "bg-ink text-white border-ink"
                  : "bg-white text-ink border-sand hover:border-ink"
              }`}
            >
              {lang === "en" ? "English" : lang === "zh" ? "中文" : "Bilingual · 双语"}
            </button>
          ))}
        </div>
      </div>

      {/* Free/pro clarity: entering birth details is free; the AI analysis needs a login */}
      {isLoggedIn === false && (
        <div className="mb-6 p-4 bg-cream rounded-lg border border-sand text-center">
          <p className="text-sm text-warm mb-3">
            Entering both birth details is free. The AI synastry analysis needs a free
            login (3 consultations per day) — or 10 per day with Pro.
          </p>
          <Link
            href={loginHref}
            className="inline-block px-6 py-2.5 bg-china-red text-white rounded-full font-medium text-sm hover:bg-china-red/90 transition-colors"
          >
            Log In to Analyze · 登录后开始合盘
          </Link>
        </div>
      )}

      {/* Analyze Button */}
      <div className="text-center mb-8">
        <button
          onClick={handleAnalyze}
          disabled={
            loading ||
            !personA.birthDate ||
            !personB.birthDate ||
            isHourUnknown(personA.birthHour) ||
            isHourUnknown(personB.birthHour)
          }
          className="px-8 py-3 bg-china-red text-white rounded-full font-medium hover:bg-china-red/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Analyzing... · 分析中..." : "Start Synastry · 开始合盘"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Results */}
      {interpretation && (
        <div className="p-6 bg-gradient-to-br from-cream to-white rounded-xl border border-sand">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-bold text-ink">
              Synastry Reading · 合盘解读
            </h4>
            {loading && (
              <span className="text-xs text-warm animate-pulse">Reading in progress...</span>
            )}
          </div>
          <div className="prose prose-warm max-w-none text-sm">
            <ReactMarkdown>{interpretation}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
