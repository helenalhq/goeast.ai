"use client";

import { useState } from "react";

type Lang = "en" | "zh" | "bilingual";

interface JourneyReaderProps {
  contentHtml: string;
  title: string;
  title_zh: string;
  quote?: string;
  quote_zh?: string;
  quote_source?: string;
  color: string;
}

export default function JourneyReader({
  contentHtml,
  title,
  title_zh,
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

      {/* Title annotation for bilingual/zh modes */}
      {(lang === "bilingual" || lang === "zh") && (
        <div className="mb-6 pb-4 border-b border-sand">
          {lang === "zh" ? (
            <>
              <p className="text-lg font-semibold text-ink">{title_zh}</p>
              <p className="text-sm text-warm/70 mt-1">{title}</p>
            </>
          ) : (
            <>
              <p className="text-base text-ink">{title}</p>
              <p className="text-base text-warm mt-1">{title_zh}</p>
            </>
          )}
        </div>
      )}

      {/* Story Content */}
      {lang === "zh" ? (
        <div>
          <div
            className="prose prose-warm max-w-none prose-headings:text-ink prose-headings:font-semibold prose-p:text-ink/90 prose-p:leading-relaxed"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
          <div className="mt-8 p-4 bg-cream rounded-lg border border-sand">
            <p className="text-sm text-warm">
              📖 完整中文翻译即将推出。上方为英文原文。
            </p>
          </div>
        </div>
      ) : lang === "bilingual" ? (
        <div>
          <div
            className="prose prose-warm max-w-none prose-headings:text-ink prose-headings:font-semibold prose-p:text-ink/90 prose-p:leading-relaxed"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
          {quote_zh && (
            <div className="mt-6 p-4 bg-cream/60 rounded-lg border border-sand">
              <p className="text-xs text-warm/60 uppercase tracking-wider mb-2">本章金句 / Key Quote</p>
              <p className="text-base text-ink italic">{quote}</p>
              <p className="text-base text-warm mt-1">{quote_zh}</p>
            </div>
          )}
        </div>
      ) : (
        <div
          className="prose prose-warm max-w-none prose-headings:text-ink prose-headings:font-semibold prose-a:text-china-red prose-a:no-underline hover:prose-a:underline prose-p:text-ink/90 prose-p:leading-relaxed"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      )}

      {/* Quote callout */}
      {quote && lang === "en" && (
        <blockquote
          className="my-10 border-l-4 pl-6 py-2"
          style={{ borderColor: color }}
        >
          <p className="text-lg italic text-ink">{quote}</p>
          {quote_source && (
            <cite className="text-sm text-warm/70 mt-2 block not-italic">
              — {quote_source}
            </cite>
          )}
        </blockquote>
      )}

      {quote && lang === "zh" && (
        <blockquote
          className="my-10 border-l-4 pl-6 py-2"
          style={{ borderColor: color }}
        >
          <p className="text-lg italic text-ink">{quote}</p>
          {quote_zh && (
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
