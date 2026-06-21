import { getAllPhilosophers } from "@/lib/philosophers";
import { SCHOOLS } from "@/lib/types";
import PhilosopherCardDeep from "@/components/PhilosopherCardDeep";
import OracleCta from "@/components/OracleCta";
import JsonLd from "@/components/JsonLd";
import CitationSnippet from "@/components/CitationSnippet";
import FAQ from "@/components/FAQ";
import { generateFAQs, generateFAQJsonLd } from "@/lib/faq-templates";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chinese Philosophers — GoEast.ai",
  description: "Explore 3,000 years of Chinese philosophy. Deep profiles of 11 great thinkers from Laozi to Wang Yangming, with core concepts, quotes, and modern influence.",
  alternates: { canonical: "/philosophers" },
  openGraph: {
    title: "Chinese Philosophers — GoEast.ai",
    description: "Explore 3,000 years of Chinese philosophy through 11 great thinkers.",
    type: "website",
  },
};

export default function PhilosophersPage() {
  const philosophers = getAllPhilosophers();

  return (
    <main>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Chinese Philosophers",
          description: "Deep profiles of 11 great Chinese thinkers from Laozi to Wang Yangming.",
          url: "https://www.goeast.ai/philosophers",
          partOf: {
            "@type": "WebSite",
            name: "GoEast.ai",
            url: "https://www.goeast.ai",
          },
        }}
      />

      {/* Hero */}
      <section className="bg-cream py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-ink mb-3">
            Chinese Philosophers
          </h1>
          <p className="text-xl text-warm">中国哲学家</p>
          <p className="text-base text-warm/70 mt-4 max-w-2xl mx-auto">
            Explore 3,000 years of Chinese thought through 11 great thinkers.
            From the I Ching of Zhou Gong to the unity of knowledge and action of Wang Yangming.
          </p>
        </div>
      </section>

      {/* CitationSnippet */}
      <section className="max-w-3xl mx-auto px-4 pt-8">
        <CitationSnippet text="Explore profiles of 11 major Chinese philosophers from the 11th century BCE to the 16th century CE. Each profile covers core concepts, notable quotes, and modern influence." />
      </section>

      {/* School sections */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        {SCHOOLS.map((school) => {
          const schoolPhilosophers = philosophers.filter((p) => p.school === school.id);
          if (schoolPhilosophers.length === 0) return null;
          return (
            <div key={school.id} className="mb-12">
              <h2 className="text-2xl font-bold text-ink mb-1">
                <span style={{ color: school.color }}>{school.symbol}</span> {school.name}
              </h2>
              <p className="text-sm text-warm mb-6">{school.name_zh}</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {schoolPhilosophers.map((p) => (
                  <PhilosopherCardDeep key={p.slug} philosopher={p} />
                ))}
              </div>
            </div>
          );
        })}
      </section>

      <div className="max-w-3xl mx-auto px-4">
        <OracleCta message="Want to consult a Chinese philosopher directly? Try the Oracle." />
      </div>

      {/* FAQ */}
      {(() => {
        const faqs = generateFAQs({ type: "philosophers_listing" });
        return (
          <section className="max-w-3xl mx-auto px-4 pb-16">
            <FAQ items={faqs} jsonLd={generateFAQJsonLd(faqs)} />
          </section>
        );
      })()}
    </main>
  );
}
