import { getAllHexagrams } from "@/lib/iching-data";
import TrigramChart from "@/components/TrigramChart";
import IChingDivination from "@/components/IChingDivination";
import OracleCta from "@/components/OracleCta";
import JsonLd from "@/components/JsonLd";
import CitationSnippet from "@/components/CitationSnippet";
import FAQ from "@/components/FAQ";
import { generateFAQs, generateFAQJsonLd } from "@/lib/faq-templates";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "I Ching — Book of Changes — GoEast.ai",
  description: "Explore the I Ching (易经), the ancient Book of Changes. Interactive trigram chart, free coin-cast divination, and all 64 hexagram meanings.",
  alternates: { canonical: "/iching" },
  openGraph: {
    title: "I Ching — Book of Changes — GoEast.ai",
    description: "Explore the I Ching: interactive divination, 64 hexagram meanings, and AI-powered interpretations.",
    type: "website",
  },
};

export default function IChingPage() {
  const hexagrams = getAllHexagrams();

  return (
    <main>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "I Ching — Book of Changes",
          description: "Interactive guide to the I Ching with trigram chart, divination, and 64 hexagram meanings.",
          url: "https://www.goeast.ai/iching",
          partOf: { "@type": "WebSite", name: "GoEast.ai", url: "https://www.goeast.ai" },
        }}
      />

      {/* Hero */}
      <section className="bg-cream py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-ink mb-3">
            I Ching · 易经
          </h1>
          <p className="text-xl text-warm mb-2">The Book of Changes</p>
          <p className="text-base text-warm/70 max-w-2xl mx-auto">
            Three thousand years of wisdom encoded in 64 hexagrams. Each pattern of broken and unbroken lines
            maps a moment of change — and a path through it.
          </p>
        </div>
      </section>

      {/* CitationSnippet */}
      <section className="max-w-3xl mx-auto px-4 pt-8">
        <CitationSnippet text="Consult all 64 hexagrams of the I Ching (Book of Changes). Each hexagram includes the original judgment text, image commentary, and modern applications." />
      </section>

      {/* Intro section */}
      <section className="max-w-3xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-ink mb-4">What is the I Ching?</h2>
        <div className="prose prose-warm max-w-none">
          <p>
            The I Ching (易经), or Book of Changes, is one of the oldest texts in the world, originating
            in China over 3,000 years ago. It consists of 64 hexagrams — patterns of six broken (yin ━ ━)
            and unbroken (yang ━━━) lines — each representing a fundamental situation or process of change.
          </p>
          <p>
            Tradition holds that the hexagrams were first organized by Zhou Gong (周公) and later annotated
            by Confucius. The text has influenced every aspect of Chinese culture: philosophy, medicine,
            politics, art, and strategy. It remains one of the most consulted books for guidance on
            decisions, relationships, and understanding the flow of events.
          </p>
        </div>
      </section>

      {/* Trigram Chart */}
      <section className="max-w-3xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-ink mb-4">The Eight Trigrams (八卦)</h2>
        <p className="text-sm text-warm mb-6">
          Each hexagram combines two of these eight fundamental trigrams. Click any trigram to learn more.
        </p>
        <TrigramChart />
      </section>

      {/* Divination */}
      <section className="max-w-3xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-ink mb-4">Virtual Divination</h2>
        <p className="text-sm text-warm mb-6">
          Cast the coins six times to build your hexagram. Free — no account required.
        </p>
        <IChingDivination hexagrams={hexagrams} />
      </section>

      {/* 64 Hexagram Index */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-ink mb-4">All 64 Hexagrams</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {hexagrams.map((h) => (
            <a
              key={h.number}
              href={`/iching/${h.slug}`}
              className="p-3 bg-white rounded-lg border border-sand hover:border-warm/40 transition-colors text-center group"
            >
              <p className="text-xs text-warm/50">#{h.number}</p>
              <p className="text-sm font-semibold text-ink group-hover:text-china-red transition-colors">{h.name}</p>
              <p className="text-xs text-warm">{h.name_zh}</p>
            </a>
          ))}
        </div>
      </section>

      {/* Oracle CTA */}
      <div className="max-w-3xl mx-auto px-4">
        <OracleCta
          philosopherSlug="zhou-gong"
          philosopherName="Zhou Gong"
          philosopherNameZh="周公"
          schoolId="ancient"
          message="Want Zhou Gong to interpret your hexagram personally? Try the Oracle."
        />
      </div>

      {/* FAQ */}
      {(() => {
        const faqs = generateFAQs({ type: "iching_listing" });
        return (
          <section className="max-w-3xl mx-auto px-4 pb-16">
            <FAQ items={faqs} jsonLd={generateFAQJsonLd(faqs)} />
          </section>
        );
      })()}
    </main>
  );
}
