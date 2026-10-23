import type { Metadata } from "next";
import Link from "next/link";
import fs from "fs";
import path from "path";
import ReactMarkdown from "react-markdown";
import ExampleUpgradeCta from "./upgrade-cta";

export const metadata: Metadata = {
  title: "I Ching Writing Habit — Free vs Pro Example | GoEast.ai",
  description:
    "Real Free and Pro readings for the same I Ching cast (Hexagram 32 → 40) and question about building a writing habit. Demonstrates what GoEast.ai Pro adds.",
  alternates: {
    canonical: "/examples/iching-writing-habit",
    languages: {
      en: "https://www.goeast.ai/examples/iching-writing-habit",
      "x-default": "https://www.goeast.ai/examples/iching-writing-habit",
    },
  },
};

function loadSample(file: string) {
  const fullPath = path.join(process.cwd(), "docs", "samples", file);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath, "utf8");
}

function loadMeta() {
  const fullPath = path.join(process.cwd(), "docs", "samples", "meta.json");
  if (!fs.existsSync(fullPath)) return null;
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

export default function ExamplesPage() {
  const free = loadSample("free-reading.md");
  const pro = loadSample("pro-reading.md");
  const meta = loadMeta();

  return (
    <article className="max-w-4xl mx-auto px-4 py-12">
      <header className="mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-ink mb-3">
          Free vs Pro — Same Cast, Same Question
        </h1>
        <p className="text-lg text-warm">
          Real readings from GoEast.ai&apos;s production pipeline. Not two random
          casts — one fixed demo condition, run through both the Free and Pro
          tiers.
        </p>
      </header>

      <section className="mb-8 p-5 bg-cream rounded-lg border border-sand">
        <h2 className="text-sm font-semibold text-ink mb-2 uppercase tracking-wide">
          Demo Conditions
        </h2>
        <ul className="text-sm text-ink/80 space-y-1">
          <li>
            <strong>Cast:</strong> Hexagram 32 (Heng 恒), changing line 3 →
            transformed Hexagram 40 (Jie 解)
          </li>
          <li>
            <strong>Question:</strong> &ldquo;How can I build a consistent writing
            habit without forcing productivity?&rdquo;
          </li>
          {meta && (
            <>
              <li>
                <strong>Model:</strong> {meta.pipeline?.model || "gpt-5.4-mini"}
              </li>
              <li>
                <strong>Generated:</strong>{" "}
                {new Date(meta.generatedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </li>
              <li>
                <strong>Free tokens:</strong>{" "}
                {meta.usage?.free?.total_tokens || "—"} |{" "}
                <strong>Pro tokens:</strong>{" "}
                {meta.usage?.pro?.total_tokens || "—"}
              </li>
            </>
          )}
        </ul>
        <p className="text-xs text-warm/60 mt-3">
          Excerpts shown on the pricing page are verbatim (with &ldquo;&hellip;&rdquo;
          elisions only). Full unedited outputs below. Not two random casts — a
          single fixed demonstration.
        </p>
      </section>

      <div className="grid md:grid-cols-2 gap-6">
        <section className="p-5 bg-white rounded-lg border border-sand break-words">
          <h2 className="text-lg font-semibold text-ink mb-3">
            Free Reading
          </h2>
          {free && (
            <div className="prose prose-warm prose-sm max-w-none">
              <ReactMarkdown>{free}</ReactMarkdown>
            </div>
          )}
        </section>

        <section className="p-5 bg-white rounded-lg border-2 border-china-red break-words">
          <h2 className="text-lg font-semibold text-china-red mb-3">
            Pro Deep Reading
          </h2>
          {pro && (
            <div className="prose prose-warm prose-sm max-w-none">
              <ReactMarkdown>{pro}</ReactMarkdown>
            </div>
          )}
        </section>
      </div>

      {/* Direct upgrade CTA — after seeing the Pro value, no extra navigation needed */}
      <ExampleUpgradeCta />

      <footer className="mt-8 text-center text-sm text-warm">
        <p>
          <Link href="/pricing" className="text-china-red hover:underline">
            ← Back to pricing
          </Link>{" "}
          ·{" "}
          <Link href="/iching" className="text-china-red hover:underline">
            Cast your own hexagram free →
          </Link>
        </p>
        <p className="text-xs text-warm/60 mt-3">
          These readings are for cultural education and reflection only — not
          predictions, not medical/legal/financial advice.
        </p>
      </footer>
    </article>
  );
}
