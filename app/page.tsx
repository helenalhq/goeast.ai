import Link from "next/link";
import Hero from "@/components/Hero";
import SkillCard from "@/components/SkillCard";
import JourneyTimeline from "@/components/JourneyTimeline";
import PhilosopherCard from "@/components/PhilosopherCard";
import OracleCta from "@/components/OracleCta";
import JsonLd from "@/components/JsonLd";
import CitationSnippet from "@/components/CitationSnippet";
import FAQ from "@/components/FAQ";
import { getFeaturedSkills, getAllSkills, getSkillsByCategory } from "@/lib/skills";
import { getAllJourneys } from "@/lib/journeys";
import { generateFAQs, generateFAQJsonLd } from "@/lib/faq-templates";
import { CATEGORIES, type Category } from "@/lib/types";

export default function HomePage() {
  const journeys = getAllJourneys();
  const featured = getFeaturedSkills();
  const totalSkills = getAllSkills().length;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "GoEast.ai",
          url: "https://www.goeast.ai",
          description:
            "Chinese philosophy meets modern life: AI-powered Oracle consultations with ancient thinkers, I Ching divination, philosophy glossary, curated AI skills for life in China.",
          hasPart: [
            { "@type": "WebPage", name: "Chinese Philosophers", url: "https://www.goeast.ai/philosophers" },
            { "@type": "WebPage", name: "I Ching — Book of Changes", url: "https://www.goeast.ai/iching" },
            { "@type": "WebPage", name: "Philosophy Glossary", url: "https://www.goeast.ai/glossary" },
            { "@type": "WebPage", name: "Philosophical Insights", url: "https://www.goeast.ai/insights" },
            { "@type": "WebPage", name: "AI Skills Directory", url: "https://www.goeast.ai/skills" },
          ],
          potentialAction: {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: "https://www.goeast.ai/api/skills?q={search_term_string}",
            },
            "query-input": "required name=search_term_string",
          },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "GoEast.ai",
          url: "https://www.goeast.ai",
          logo: "https://www.goeast.ai/images/logo.png",
          sameAs: ["https://github.com/helenalhq/goeast.ai"],
        }}
      />
      <Hero />

      {/* CitationSnippet */}
      <section className="max-w-3xl mx-auto px-4 pt-8">
        <CitationSnippet text="GoEast.ai combines Chinese philosophy education with AI-powered tools. Explore 3,000 years of thought through Sophie's Journey East, consult AI Oracles modeled after ancient thinkers, or browse curated AI skills for navigating life in China." />
      </section>

      {/* Journey Timeline */}
      <section id="journey" className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-ink mb-2">The Journey</h2>
        <p className="text-warm mb-10">
          Follow Sophie&apos;s path from the Silk Road through China&apos;s heartland
          <br />
          <span className="text-sm">追溯苏菲从丝绸之路到中原大地的旅途</span>
        </p>
        <JourneyTimeline journeys={journeys} />
      </section>

      {/* Philosopher Encounters */}
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
        <div className="text-center mt-8">
          <Link
            href="/philosophers"
            className="text-china-red hover:text-china-red/80 text-sm font-medium transition-colors"
          >
            Explore all philosophers →
          </Link>
        </div>
      </section>

      {/* I Ching Entry */}
      <section className="max-w-4xl mx-auto px-4 py-16 border-t border-sand text-center">
        <h2 className="text-2xl font-bold text-ink mb-2">I Ching · 易经</h2>
        <p className="text-warm mb-4">
          The Book of Changes — 3,000 years of wisdom encoded in 64 hexagrams
        </p>
        <Link
          href="/iching"
          className="inline-block px-6 py-2.5 rounded-full bg-china-red text-white font-medium text-sm hover:bg-china-red/90 transition-colors"
        >
          Explore the I Ching →
        </Link>
      </section>

      {/* Glossary + Insights Entry */}
      <section className="max-w-4xl mx-auto px-4 py-16 border-t border-sand text-center">
        <h2 className="text-2xl font-bold text-ink mb-2">Learn Deeper · 深入探索</h2>
        <p className="text-warm mb-6">
          Key concepts explained in our Glossary, and philosophical essays in our Insights section.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/glossary"
            className="inline-block px-6 py-2.5 rounded-full bg-ink text-white font-medium text-sm hover:bg-ink/90 transition-colors"
          >
            Glossary →
          </Link>
          <Link
            href="/insights"
            className="inline-block px-6 py-2.5 rounded-full bg-warm text-white font-medium text-sm hover:bg-warm/90 transition-colors"
          >
            Insights →
          </Link>
        </div>
      </section>

      {/* Oracle Subscription CTA */}
      <OracleCta />

      {/* Skills — condensed section */}
      <section className="max-w-6xl mx-auto px-4 py-12 border-t border-sand">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-ink mb-2">Skills for the Road</h2>
          <p className="text-sm text-warm">
            Practical AI skills for navigating life in China
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {CATEGORIES.map((cat) => {
            const count = getSkillsByCategory(cat.id as Category).length;
            return (
              <Link
                key={cat.id}
                href={`/categories/${cat.id}`}
                className="bg-white rounded-xl border border-sand p-4 text-center hover:border-china-red/30 hover:shadow-sm transition-all group"
              >
                <div className="text-2xl mb-1">{cat.icon}</div>
                <div className="font-semibold text-ink text-sm group-hover:text-china-red transition-colors">
                  {cat.name}
                </div>
                <div className="text-xs text-warm/60 mt-1">{count} skills</div>
              </Link>
            );
          })}
        </div>
        {featured.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {featured.map((skill) => (
              <SkillCard key={skill.slug} skill={skill} />
            ))}
          </div>
        )}
        <div className="text-center">
          <Link
            href="/skills"
            className="text-china-red hover:text-china-red/80 text-sm font-medium transition-colors"
          >
            Browse all {totalSkills} skills →
          </Link>
        </div>
      </section>

      {/* FAQ */}
      {(() => {
        const faqs = generateFAQs({ type: "homepage", totalSkills, totalJourneys: journeys.length });
        return (
          <section className="max-w-3xl mx-auto px-4 pb-16">
            <FAQ items={faqs} jsonLd={generateFAQJsonLd(faqs)} />
          </section>
        );
      })()}
    </>
  );
}
