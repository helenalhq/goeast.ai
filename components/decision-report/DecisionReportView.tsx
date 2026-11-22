import React from "react";
import type { DecisionReport } from "@/lib/decision-types";

function safeSourceLink(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password &&
      ["zh.wikisource.org", "ctext.org", "www.goeast.ai"].includes(url.hostname)
      ? url.href : null;
  } catch {
    return null;
  }
}

export default function DecisionReportView({
  report,
  synthetic = false,
}: {
  report: DecisionReport;
  synthetic?: boolean;
}) {
  const sourceLink = safeSourceLink(report.source.url);
  return (
    <div className="space-y-7 text-ink">
      <section className="rounded-2xl border border-sand bg-white p-5 sm:p-7">
        <h2 className="font-serif text-xl font-semibold">The question and original cast</h2>
        <p className="mt-2 break-words text-lg leading-relaxed">{report.question}</p>
        <dl className="mt-5 grid gap-3 sm:grid-cols-3">
          <div><dt className="text-sm text-warm">Original hexagram</dt><dd className="font-semibold">{report.primary.number} · {report.primary.name}</dd></div>
          <div><dt className="text-sm text-warm">Changing lines</dt><dd className="font-semibold">{report.changingLines.join(", ") || "None"}</dd></div>
          <div><dt className="text-sm text-warm">Transformed hexagram</dt><dd className="font-semibold">{report.transformed ? `${report.transformed.number} · ${report.transformed.name}` : "None"}</dd></div>
        </dl>
        <ol aria-label="Cast lines from bottom to top" className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
          {report.casts.map((line, i) => (
            <li key={i} className="flex items-center gap-2">
              <span aria-hidden="true" className="font-mono">{line.binary === "1" ? "━━━" : "━ ━"}</span>
              <span>Line {i + 1}: {line.binary === "1" ? "yang" : "yin"}{line.changing ? " (changing)" : ""}</span>
            </li>
          ))}
        </ol>
      </section>
      <section className="space-y-4 rounded-2xl border border-sand bg-white p-5 sm:p-7">
        <div>
          <h2 className="font-serif text-xl font-semibold">Classical text</h2>
          <blockquote className="my-2 break-words text-lg" lang="zh-Hant">{report.source.original}</blockquote>
          <p className="break-words text-sm text-warm">
            {sourceLink ? <a href={sourceLink} rel="noreferrer" className="underline underline-offset-2">{report.source.label}</a> : report.source.label}
          </p>
        </div>
        <div className="border-t border-sand pt-4">
          <h3 className="font-semibold">Modern English restatement</h3>
          <p className="mt-1 break-words leading-relaxed">{report.source.restatement}</p>
        </div>
        <div className="border-t border-sand pt-4">
          <h3 className="font-semibold">{synthetic ? "Illustrative interpretation" : "AI-generated interpretation"}</h3>
          <p className="mt-1 break-words leading-relaxed">{report.interpretation}</p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl font-semibold">Two options to compare</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {report.options.map((option, i) => (
            <div key={i} className="min-w-0 rounded-2xl border border-sand bg-white p-5">
              <p className="text-xs font-semibold tracking-wide text-warm uppercase">
                {option.assumption ? "Hypothesis to verify" : `Option ${i + 1}`}
              </p>
              <h3 className="my-1 break-words font-semibold">{option.title}</h3>
              <p className="break-words text-sm leading-relaxed"><strong>Blind spot:</strong> {option.blindSpot}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-sand bg-white p-5 sm:p-7">
        <h2 className="font-serif text-xl font-semibold">One question to verify</h2>
        <p className="mt-2 break-words leading-relaxed">{report.verifyQuestion}</p>
        <h2 className="mt-6 font-serif text-xl font-semibold">A seven-day test</h2>
        <p className="mt-2 break-words leading-relaxed">{report.sevenDayStep}</p>
      </section>
      <p className="text-sm text-warm">Use this as a reflection prompt, not as a prediction or the basis for a major decision.</p>
    </div>
  );
}
