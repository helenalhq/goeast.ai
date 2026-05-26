import Link from "next/link";
import Hero from "@/components/Hero";
import SkillCard from "@/components/SkillCard";
import JourneyTimeline from "@/components/JourneyTimeline";
import PhilosopherCard from "@/components/PhilosopherCard";
import OracleCta from "@/components/OracleCta";
import JsonLd from "@/components/JsonLd";
import { getFeaturedSkills, getAllSkills, getSkillsByCategory } from "@/lib/skills";
import { getAllJourneys } from "@/lib/journeys";
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
          url: "https://goeast.ai",
          description:
            "Curated AI skills for navigating life in China — travel, medical, shopping, accommodation.",
          potentialAction: {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: "https://goeast.ai/api/skills?q={search_term_string}",
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
          url: "https://goeast.ai",
          logo: "https://goeast.ai/images/logo.png",
          sameAs: ["https://github.com/helenalhq/goeast.ai"],
        }}
      />
      <Hero />

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
    </>
  );
}
