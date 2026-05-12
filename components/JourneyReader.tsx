"use client";

import { useState } from "react";

type Lang = "en" | "zh" | "bilingual";

interface JourneyReaderProps {
  contentHtml: string;
  contentZhHtml?: string;
  title: string;
  title_zh: string;
  philosopher?: string;
  philosopher_zh?: string;
  quote?: string;
  quote_zh?: string;
  quote_source?: string;
  color: string;
}

export default function JourneyReader({
  contentHtml,
  contentZhHtml,
  title,
  title_zh,
  philosopher,
  philosopher_zh,
  quote,
  quote_zh,
  quote_source,
  color,
}: JourneyReaderProps) {
  const [lang, setLang] = useState<Lang>("en");

  const langs: { key: Lang; label: string }[] = [
    { key: "en", label: "EN" },
    { key: "bilingual", label: "双语" },
    { key: "zh", label: "中文" },
  ];

  const hasZhContent = !!contentZhHtml;

  const renderContent = () => {
    if (lang === "zh") {
      if (!hasZhContent) {
        return (
          <div>
            <div
              className="prose prose-warm max-w-none prose-headings:text-ink prose-headings:font-semibold prose-p:text-ink/90 prose-p:leading-relaxed"
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />
            <div className="mt-8 p-4 bg-cream rounded-lg border border-sand text-center">
              <p className="text-sm text-warm">
                📖 完整中文翻译即将推出，当前显示英文原文
              </p>
            </div>
          </div>
        );
      }
      return (
        <div
          className="prose prose-warm max-w-none prose-headings:text-ink prose-headings:font-semibold prose-p:text-ink/90 prose-p:leading-relaxed"
          dangerouslySetInnerHTML={{ __html: contentZhHtml }}
        />
      );
    }

    if (lang === "bilingual") {
      return (
        <div className="space-y-0">
          {/* English content */}
          <div
            className="prose prose-warm max-w-none prose-headings:text-ink prose-headings:font-semibold prose-p:text-ink/90 prose-p:leading-relaxed"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
          {/* Chinese translation below */}
          {hasZhContent ? (
            <div className="mt-10 pt-8 border-t-2 border-sand">
              <div className="flex items-center gap-2 mb-6">
                <span className="text-sm font-medium text-warm">中文翻译</span>
                <span className="flex-1 h-px bg-sand" />
                <span className="text-xs text-warm/50">{title_zh}</span>
              </div>
              <div
                className="prose prose-warm max-w-none prose-headings:text-ink prose-headings:font-semibold prose-p:text-ink/90 prose-p:leading-relaxed"
                dangerouslySetInnerHTML={{ __html: contentZhHtml }}
              />
            </div>
          ) : (
            <div className="mt-8 p-4 bg-cream rounded-lg border border-sand text-center">
              <p className="text-sm text-warm">
                📖 中文翻译即将推出
              </p>
            </div>
          )}
        </div>
      );
    }

    // EN mode
    return (
      <div
        className="prose prose-warm max-w-none prose-headings:text-ink prose-headings:font-semibold prose-a:text-china-red prose-a:no-underline hover:prose-a:underline prose-p:text-ink/90 prose-p:leading-relaxed"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />
    );
  };

  return (
    <div>
      {/* Language Toggle */}
      <div className="flex items-center gap-1 mb-8 bg-cream rounded-full p-1 w-fit">
        {langs.map((l) => (
          <button
            key={l.key}
            onClick={() => setLang(l.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              lang === l.key
                ? "bg-white text-ink shadow-sm"
                : "text-warm hover:text-ink"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* Story Content */}
      {renderContent()}

      {/* Quote callout */}
      {quote && (
        <blockquote
          className="my-10 border-l-4 pl-6 py-2"
          style={{ borderColor: color }}
        >
          <p className="text-lg italic text-ink">{quote}</p>
          {(lang === "bilingual" || lang === "zh") && quote_zh && (
            <p className="text-base text-warm mt-2">{quote_zh}</p>
          )}
          {quote_source && (
            <cite className="text-sm text-warm/70 mt-2 block not-italic">
              — {quote_source}
            </cite>
          )}
        </blockquote>
      )}
    </div>
  );
}
