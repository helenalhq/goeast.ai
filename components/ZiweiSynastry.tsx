"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getHourLabel } from "@/lib/ziwei-prompts";
import ReactMarkdown from "react-markdown";
import Link from "next/link";

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

interface PersonInput {
  birthDate: string;
  birthHour: number;
  gender: "male" | "female";
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
            value={person.birthHour}
            onChange={(e) => onChange({ ...person, birthHour: Number(e.target.value) })}
            className="w-full px-3 py-2 text-sm border border-sand rounded-lg focus:outline-none focus:border-china-red"
          >
            {BIRTH_HOURS.map((h) => (
              <option key={h.value} value={h.value}>
                {h.label_zh} ({h.label_en})
              </option>
            ))}
          </select>
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

export default function ZiweiSynastry() {
  const [personA, setPersonA] = useState<PersonInput>({ birthDate: "", birthHour: 0, gender: "male" });
  const [personB, setPersonB] = useState<PersonInput>({ birthDate: "", birthHour: 0, gender: "female" });
  const [relationshipType, setRelationshipType] = useState<RelationshipType>("romantic");
  const [language, setLanguage] = useState<"en" | "zh" | "both">("both");
  const [interpretation, setInterpretation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user);
    });
  }, []);

  const handleAnalyze = async () => {
    if (!isLoggedIn) {
      window.location.href = "/login";
      return;
    }

    if (!personA.birthDate || !personB.birthDate) {
      setError("Please enter birth dates for both persons.");
      return;
    }

    setLoading(true);
    setError("");
    setInterpretation("");

    try {
      const response = await fetch("/api/ziwei/synastry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personA, personB, relationshipType, language }),
      });

      if (!response.ok) {
        const errData = await response.json();
        if (errData.code === "LOGIN_REQUIRED") {
          window.location.href = "/login";
          return;
        } else if (errData.code === "LIMIT_REACHED") {
          setError("Daily consultation limit reached. Subscribe for more readings.");
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
            setLoading(false);
            return;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "content" && parsed.content) {
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
      setLoading(false);
    } catch (err) {
      console.error("Synastry error:", err);
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  // Not logged in
  if (isLoggedIn === false) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-gradient-to-br from-cream to-white rounded-xl border border-sand text-center">
        <h3 className="text-xl font-bold text-ink mb-2">
          Synastry Analysis · 合盘分析
        </h3>
        <p className="text-sm text-warm mb-4">
          Log in to unlock AI-powered relationship compatibility analysis.
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-3 bg-china-red text-white rounded-full font-medium hover:bg-china-red/90 transition-colors"
        >
          Log In · 登录
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
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

      {/* Analyze Button */}
      <div className="text-center mb-8">
        <button
          onClick={handleAnalyze}
          disabled={loading || !personA.birthDate || !personB.birthDate}
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
