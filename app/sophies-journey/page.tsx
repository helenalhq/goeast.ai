import { getAllJourneys } from "@/lib/journeys";
import JourneyTimeline from "@/components/JourneyTimeline";
import PhilosopherCard from "@/components/PhilosopherCard";
import JsonLd from "@/components/JsonLd";
import CitationSnippet from "@/components/CitationSnippet";
import FAQ from "@/components/FAQ";
import { generateFAQs, generateFAQJsonLd } from "@/lib/faq-templates";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chinese Philosophy Through Stories: Laozi, Confucius, Zhuangzi | GoEast.ai",
  description:
    "Explore 3,000 years of Chinese philosophy through Sophie's journey. Discover wisdom from Laozi, Confucius, Zhuangzi, and more. 通过故事探索中国哲学",
  alternates: { canonical: "/sophies-journey" },
  openGraph: {
    title: "Chinese Philosophy Through Stories: Laozi, Confucius, Zhuangzi | GoEast.ai",
    description:
      "Explore 3,000 years of Chinese philosophy through Sophie's journey. Discover wisdom from Laozi, Confucius, Zhuangzi, and more.",
    type: "article",
  },
};

export default function JourneyLandingPage() {
  const journeys = getAllJourneys();

  return (
    <>
      <section className="relative overflow-hidden">
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Sophie's Journey East — GoEast.ai",
            description:
              "A narrative exploration of Chinese philosophy through Sophie's encounters with China's greatest thinkers",
            url: "https://www.goeast.ai/sophies-journey",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-ink via-ink/90 to-gold/20" />
        <div className="relative max-w-4xl mx-auto px-4 py-20 text-center text-white">
          <p className="text-sm tracking-[0.3em] opacity-70 mb-4">苏菲的东方之旅</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Sophie&apos;s Journey East
          </h1>
          <p className="text-lg opacity-80 max-w-2xl mx-auto mb-8">
            Having escaped the pages of a book, a young girl travels East — and meets
            the philosophers who shaped a civilization.
          </p>
          <a
            href="#journey"
            className="inline-block bg-china-red text-white px-6 py-2.5 rounded-lg hover:bg-china-red/90 transition-colors"
          >
            Begin the Journey ↓
          </a>
        </div>
      </section>

      {/* CitationSnippet */}
      <section className="max-w-3xl mx-auto px-4 pt-8">
        <CitationSnippet text="Follow Sophie's Journey East through 12 chapters exploring 3,000 years of Chinese philosophy. A bilingual narrative encountering Confucius, Laozi, Sunzi, Zhuangzi, and 7 more great thinkers." />
      </section>

      <section id="journey" className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-ink mb-2">The Journey</h2>
        <p className="text-warm mb-10">
          Follow Sophie&apos;s path from the Silk Road through China&apos;s heartland
          <br />
          <span className="text-sm">追溯苏菲从丝绸之路到中原大地的旅途</span>
        </p>
        <JourneyTimeline journeys={journeys} />
      </section>

      <section className="max-w-6xl mx-auto px-4 py-16 border-t border-sand">
        <h2 className="text-2xl font-bold text-ink mb-2">The Philosophers</h2>
        <p className="text-warm mb-8">
          Eleven thinkers across three thousand years of Chinese thought
          <br />
          <span className="text-sm">横跨三千年的十一位思想家</span>
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {journeys
            .filter((j) => j.philosopher)
            .map((journey) => (
              <PhilosopherCard key={journey.slug} journey={journey} />
            ))}
        </div>
      </section>

      {/* FAQ */}
      {(() => {
        const faqs = generateFAQs({ type: "journeys_listing" });
        return (
          <section className="max-w-3xl mx-auto px-4 pb-16">
            <FAQ items={faqs} jsonLd={generateFAQJsonLd(faqs)} />
          </section>
        );
      })()}
    </>
  );
}
