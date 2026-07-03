"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface ZiweiInterpretationProps {
  birthDate: string;
  birthHour: number;
  gender: "male" | "female";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  astrolabeData: any;
}

export default function ZiweiInterpretation({
  birthDate,
  birthHour,
  gender,
}: ZiweiInterpretationProps) {
  const [interpretation, setInterpretation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [language, setLanguage] = useState<"en" | "zh" | "both">("both");
  const [started, setStarted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user);
    });
  }, []);

  const handleInterpret = async () => {
    // Require login before using AI features
    if (!isLoggedIn) {
      window.location.href = "/login";
      return;
    }

    setLoading(true);
    setError("");
    setInterpretation("");
    setStarted(true);

    try {
      const response = await fetch("/api/ziwei/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birthDate, birthHour, gender, language }),
      });

      if (!response.ok) {
        const errData = await response.json();
        if (errData.code === "LOGIN_REQUIRED") {
          window.location.href = "/login";
          return;
        } else if (errData.code === "LIMIT_REACHED") {
          setError("Daily consultation limit reached. Subscribe for more readings.");
        } else {
          setError(errData.error || "Failed to get interpretation.");
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
            // Skip unparseable chunks
          }
        }
      }
      setLoading(false);
    } catch (err) {
      console.error("Interpretation error:", err);
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  if (!started) {
    // Show login prompt for unauthenticated users
    if (isLoggedIn === false) {
      return (
        <div className="max-w-3xl mx-auto p-6 bg-gradient-to-br from-cream to-white rounded-xl border border-sand text-center">
          <h4 className="text-lg font-bold text-ink mb-2">
            AI Interpretation · AI 命盘解读
          </h4>
          <p className="text-sm text-warm mb-4">
            Log in to unlock AI-powered chart readings based on traditional Zi Wei Dou Shu wisdom.
          </p>
          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-china-red text-white rounded-full font-medium hover:bg-china-red/90 transition-colors"
          >
            Log In to Get Reading · 登录获取解读
          </Link>
        </div>
      );
    }

    return (
      <div className="max-w-3xl mx-auto p-6 bg-gradient-to-br from-cream to-white rounded-xl border border-sand text-center">
        <h4 className="text-lg font-bold text-ink mb-2">
          AI Interpretation · AI 命盘解读
        </h4>
        <p className="text-sm text-warm mb-4">
          Get a comprehensive AI-powered reading of your natal chart based on traditional Zi Wei Dou Shu wisdom.
        </p>

        <div className="flex justify-center gap-2 mb-4">
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

        <button
          onClick={handleInterpret}
          className="px-6 py-3 bg-china-red text-white rounded-full font-medium hover:bg-china-red/90 transition-colors"
        >
          Get AI Reading · 获取 AI 解读
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="p-6 bg-gradient-to-br from-cream to-white rounded-xl border border-sand">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-bold text-ink">
            AI Interpretation · AI 命盘解读
          </h4>
          {loading && (
            <span className="text-xs text-warm animate-pulse">Reading in progress...</span>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {interpretation && (
          <div className="prose prose-warm max-w-none text-sm">
            <ReactMarkdown>{interpretation}</ReactMarkdown>
          </div>
        )}

        {!loading && interpretation && (
          <div className="mt-6 pt-4 border-t border-sand flex justify-center">
            <button
              onClick={handleInterpret}
              className="px-4 py-2 text-sm text-warm hover:text-china-red transition-colors"
            >
              Regenerate Reading · 重新解读
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
