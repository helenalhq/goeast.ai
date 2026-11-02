import type { Metadata } from "next";
import Link from "next/link";
import fs from "fs";
import path from "path";
import ReactMarkdown from "react-markdown";
import ExampleUpgradeCta from "./upgrade-cta";

export const metadata: Metadata = {
  title: "I Ching Reading Example & Interpretation: Free vs Pro | GoEast.ai",
  description:
    "A complete I Ching reading example — Free and Pro interpretations of the same cast (Hexagram 32, changing line 3, transforming to 40) about building a writing habit, plus a demonstration of follow-up questions and the private action record.",
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

      {/* Follow-up / action / reflection demonstration — same cast, labeled as demonstration */}
      <section className="mt-10 p-5 bg-white rounded-lg border border-sand">
        <h2 className="text-lg font-semibold text-ink mb-1">
          After the reading: follow-up, action, and reflection
        </h2>
        <p className="text-xs text-warm/70 mb-4">
          Demonstration content — written for this page to show how the features work.
          Not user feedback, not a real customer record. Same cast as above (Hexagram 32,
          changing line 3 → 40): follow-ups never re-cast.
        </p>

        <div className="border-l-2 border-sand pl-4 space-y-4">
          <div>
            <p className="text-sm font-medium text-ink">🧑 Follow-up question on the same cast</p>
            <p className="text-sm text-warm italic mb-1">
              “Line 3 is the changing line here — what does it suggest about my habit specifically?”
            </p>
            <div className="prose prose-warm prose-sm max-w-none">
              <ReactMarkdown>{`The changing line sits at the third position — in Duration (恆), the place where effort either settles into rhythm or starts to strain. Read as interpretation, not quotation: your pattern of starting every Monday and stopping by Thursday is the line under tension. The move from Hexagram 32 to 40 (Deliverance 解) suggests the habit is released not by pushing harder at the same hour, but by loosening the constraint — a smaller, irregular commitment you can keep on your worst day beats a strict one you abandon.`}</ReactMarkdown>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-ink">My Next Step (saved with the reading)</p>
            <p className="text-sm text-warm">
              “Write for 15 minutes with morning tea — any count of words counts.”
            </p>
            <p className="text-sm text-warm">
              Status: <strong>进行中 (in progress)</strong> — set manually by the reader; GoEast never
              marks it automatically.
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-ink">复盘心得 Reflection (private to the account)</p>
            <p className="text-sm text-warm italic">
              “Three mornings in. The tea cue works better than the clock. Skipping Saturday
              felt fine instead of like failure — that seems to be the point of 40.”
            </p>
          </div>
        </div>

        <div className="mt-5 text-center">
          <Link
            href="/consult/iching"
            className="inline-block px-6 py-3 rounded-full bg-china-red text-white font-medium text-sm hover:bg-china-red/90 transition-colors no-underline"
          >
            Start your own reading →
          </Link>
          <p className="text-xs text-warm/60 mt-2">
            Casting is free and needs no account; AI readings need a free account (3/day, Pro 10/day).
            For how to phrase your question, see <Link href="/insights/how-to-ask-iching" className="underline">How to Ask the I Ching</Link>.
          </p>
        </div>
      </section>

      <footer className="mt-8 text-center text-sm text-warm">
        <p>
          <Link href="/pricing" className="text-china-red hover:underline">
            ← Back to pricing
          </Link>{" "}
          ·{" "}
          <Link href="/iching" className="text-china-red hover:underline">
            Browse hexagrams →
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
