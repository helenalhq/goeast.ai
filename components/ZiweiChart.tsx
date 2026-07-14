"use client";

import { useState } from "react";
import { astro } from "iztro";
import { getHourLabel } from "@/lib/ziwei-prompts";
import ZiweiInterpretation from "./ZiweiInterpretation";
import ShareButtons from "./ShareButtons";
import EmailCapture from "./EmailCapture";

interface Palace {
  name: string;
  heavenlyStem: string;
  earthlyBranch: string;
  majorStars: { name: string; mutagen?: string }[];
  minorStars: { name: string }[];
  adjectiveStars: { name: string }[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractPalaces(astrolabe: any): Palace[] {
  if (!astrolabe?.palaces) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return astrolabe.palaces.map((p: any) => ({
    name: p.name || "",
    heavenlyStem: p.heavenlyStem || "",
    earthlyBranch: p.earthlyBranch || "",
    majorStars: (p.majorStars || []).map((s: { name: string; mutagen?: string }) => ({
      name: s.name,
      mutagen: s.mutagen || undefined,
    })),
    minorStars: (p.minorStars || []).map((s: { name: string }) => ({ name: s.name })),
    adjectiveStars: (p.adjectiveStars || []).map((s: { name: string }) => ({ name: s.name })),
  }));
}

const BIRTH_HOURS = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label_en: getHourLabel(i, "en"),
  label_zh: getHourLabel(i, "zh"),
}));

export default function ZiweiChart() {
  const [birthDate, setBirthDate] = useState("");
  const [birthHour, setBirthHour] = useState(0);
  const [gender, setGender] = useState<"male" | "female">("male");
  const [palaces, setPalaces] = useState<Palace[]>([]);
  const [showChart, setShowChart] = useState(false);
  const [selectedPalace, setSelectedPalace] = useState<Palace | null>(null);
  const [error, setError] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [astrolabeData, setAstrolabeData] = useState<any>(null);

  const handleGenerate = () => {
    setError("");
    setSelectedPalace(null);

    if (!birthDate) {
      setError("Please select your birth date.");
      return;
    }

    try {
      const genderZh = gender === "male" ? "男" : "女";
      const result = astro.bySolar(birthDate, birthHour, genderZh, true, "zh-CN");
      const extracted = extractPalaces(result);
      setPalaces(extracted);
      setAstrolabeData(result);
      setShowChart(true);
    } catch (err) {
      console.error("Chart generation error:", err);
      setError("Could not generate chart. Please check your birth date.");
    }
  };

  const handleReset = () => {
    setShowChart(false);
    setPalaces([]);
    setSelectedPalace(null);
    setAstrolabeData(null);
    setError("");
  };

  // Traditional 4x4 grid layout for 12 palaces (center is empty)
  // Layout indices: top row (3,4,5,6), left col (2,_,_,7), right col (11,_,_,8), bottom row (1,0,9,10) reversed
  const gridPositions = [
    // Row 0: top
    [3, 4, 5, 6],
    // Row 1: middle-top
    [2, -1, -1, 7],
    // Row 2: middle-bottom
    [1, -1, -1, 8],
    // Row 3: bottom
    [0, 11, 10, 9],
  ];

  return (
    <div className="space-y-8">
      {/* Input Form */}
      {!showChart && (
        <div className="bg-cream rounded-xl border border-sand p-6 max-w-lg mx-auto">
          <h3 className="text-lg font-bold text-ink mb-4 text-center">
            Generate Your Natal Chart · 排盘
          </h3>

          <div className="space-y-4">
            {/* Birth Date */}
            <div>
              <label className="block text-sm font-medium text-ink mb-1">
                Birth Date (Solar Calendar) · 出生日期（阳历）
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-3 py-2 border border-sand rounded-lg bg-white text-ink focus:outline-none focus:ring-2 focus:ring-china-red/30"
                min="1900-01-01"
                max="2100-12-31"
              />
            </div>

            {/* Birth Hour */}
            <div>
              <label className="block text-sm font-medium text-ink mb-1">
                Birth Hour (时辰)
              </label>
              <select
                value={birthHour}
                onChange={(e) => setBirthHour(Number(e.target.value))}
                className="w-full px-3 py-2 border border-sand rounded-lg bg-white text-ink focus:outline-none focus:ring-2 focus:ring-china-red/30"
              >
                {BIRTH_HOURS.map((h) => (
                  <option key={h.value} value={h.value}>
                    {h.label_zh} — {h.label_en}
                  </option>
                ))}
              </select>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-medium text-ink mb-1">
                Gender · 性别
              </label>
              <div className="flex gap-4">
                <button
                  onClick={() => setGender("male")}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    gender === "male"
                      ? "bg-ink text-white border-ink"
                      : "bg-white text-ink border-sand hover:border-ink"
                  }`}
                >
                  Male · 男
                </button>
                <button
                  onClick={() => setGender("female")}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    gender === "female"
                      ? "bg-ink text-white border-ink"
                      : "bg-white text-ink border-sand hover:border-ink"
                  }`}
                >
                  Female · 女
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-600 text-sm">{error}</p>
            )}

            <button
              onClick={handleGenerate}
              className="w-full py-3 bg-china-red text-white rounded-full font-medium hover:bg-china-red/90 transition-colors"
            >
              Generate Chart · 排盘
            </button>
          </div>
        </div>
      )}

      {/* Chart Display */}
      {showChart && palaces.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-ink">
              Your Natal Chart · 紫微命盘
            </h3>
            <button
              onClick={handleReset}
              className="text-sm text-warm hover:text-china-red transition-colors"
            >
              New Chart · 重新排盘
            </button>
          </div>

          <p className="text-sm text-warm">
            {birthDate} · {getHourLabel(birthHour, "zh")} · {gender === "male" ? "男命" : "女命"}
          </p>

          {/* 12-Palace Grid */}
          <div className="grid grid-cols-4 gap-1 max-w-3xl mx-auto">
            {gridPositions.flat().map((palaceIdx, cellIdx) => {
              if (palaceIdx === -1) {
                // Center cells (empty — info area)
                if (cellIdx === 5) {
                  return (
                    <div
                      key={cellIdx}
                      className="col-span-2 row-span-2 flex items-center justify-center p-4 bg-cream/50 rounded border border-sand/50"
                    >
                      <div className="text-center">
                        <p className="text-2xl font-bold text-ink mb-1">紫微命盘</p>
                        <p className="text-xs text-warm">Zi Wei Dou Shu Chart</p>
                        <p className="text-xs text-warm mt-2">{birthDate}</p>
                        <p className="text-xs text-warm">{getHourLabel(birthHour, "zh")}</p>
                        <p className="text-xs text-warm">{gender === "male" ? "男命 Male" : "女命 Female"}</p>
                      </div>
                    </div>
                  );
                }
                // Skip other center cells (covered by colspan/rowspan)
                return null;
              }

              const palace = palaces[palaceIdx];
              if (!palace) return <div key={cellIdx} className="aspect-square" />;

              const isSelected = selectedPalace === palace;

              return (
                <button
                  key={cellIdx}
                  onClick={() => setSelectedPalace(isSelected ? null : palace)}
                  className={`aspect-square p-1.5 rounded border text-left flex flex-col justify-between transition-all ${
                    isSelected
                      ? "bg-china-red/10 border-china-red ring-1 ring-china-red"
                      : "bg-white border-sand hover:border-china-red/50 hover:bg-cream/30"
                  }`}
                >
                  <div>
                    <p className="text-[10px] font-bold text-ink leading-tight truncate">
                      {palace.name}
                    </p>
                    <p className="text-[9px] text-warm">
                      {palace.heavenlyStem}{palace.earthlyBranch}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    {palace.majorStars.slice(0, 3).map((star, i) => (
                      <p key={i} className="text-[9px] text-china-red font-medium leading-tight truncate">
                        {star.name}
                        {star.mutagen && (
                          <span className="text-[8px] ml-0.5 text-amber-600">{star.mutagen}</span>
                        )}
                      </p>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Palace Detail */}
          {selectedPalace && (
            <div className="max-w-3xl mx-auto p-4 bg-cream rounded-lg border border-sand">
              <h4 className="font-bold text-ink mb-2">
                {selectedPalace.name} · {selectedPalace.heavenlyStem}{selectedPalace.earthlyBranch}
              </h4>

              {selectedPalace.majorStars.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-warm mb-1">Major Stars · 主星</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedPalace.majorStars.map((star, i) => (
                      <span key={i} className="px-2 py-0.5 bg-china-red/10 text-china-red text-xs rounded-full">
                        {star.name}
                        {star.mutagen && <span className="ml-1 text-amber-600">({star.mutagen})</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedPalace.minorStars.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-warm mb-1">Minor Stars · 辅星</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPalace.minorStars.map((star, i) => (
                      <span key={i} className="px-2 py-0.5 bg-ink/5 text-ink/70 text-xs rounded-full">
                        {star.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedPalace.adjectiveStars.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-warm mb-1">Adjective Stars · 杂曜</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPalace.adjectiveStars.map((star, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-warm/5 text-warm/70 text-[10px] rounded-full">
                        {star.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI Interpretation */}
          <ZiweiInterpretation
            birthDate={birthDate}
            birthHour={birthHour}
            gender={gender}
            astrolabeData={astrolabeData}
          />

          {/* Share + Email Capture */}
          <div className="mt-6 pt-6 border-t border-sand">
            <ShareButtons
              title="My Zi Wei Dou Shu Natal Chart — GoEast.ai"
              label="Share your chart"
            />
          </div>
          <div className="mt-6">
            <EmailCapture
              title="Save Your Chart & Get Weekly Astrology Insights"
              subtitle="Subscribe for weekly Zi Wei Dou Shu insights, Chinese astrology guides, and I Ching readings."
              source="ziwei_chart"
              variant="inline"
              leadMagnet="Free bonus: China Travel Checklist PDF"
            />
          </div>
        </div>
      )}
    </div>
  );
}
