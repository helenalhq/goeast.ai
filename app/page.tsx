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
import { getAllInsights } from "@/lib/insights";
import { generateFAQs, generateFAQJsonLd } from "@/lib/faq-templates";
import { CATEGORIES, type Category } from "@/lib/types";

/* ── SVG icons for skill categories ── */
function CategoryIcon({ id }: { id: string }) {
  const common = {
    viewBox: "0 0 24 24",
    style: { width: 22, height: 22, stroke: "#2c1810", strokeWidth: 1.5, fill: "none" },
  };
  switch (id) {
    case "travel":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3v18M3 12h18" />
          <path d="M12 3l-3 3M12 3l3 3" />
        </svg>
      );
    case "medical":
      return (
        <svg {...common}>
          <path d="M12 2v20M2 12h20" />
        </svg>
      );
    case "shopping":
      return (
        <svg {...common}>
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
          <path d="M3 6h18" />
          <path d="M16 10a4 4 0 01-8 0" />
        </svg>
      );
    case "accommodation":
      return (
        <svg {...common}>
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9,22 9,12 15,12 15,22" />
        </svg>
      );
    default:
      return null;
  }
}

/* ── 64 hexagram data (binary arrays) ── */
const HEXAGRAMS = [
  [1,1,1,1,1,1],[0,0,0,0,0,0],[1,0,0,0,1,0],[0,1,1,1,0,1],
  [1,1,1,0,0,0],[0,0,0,1,1,1],[1,0,1,0,1,0],[0,1,0,1,0,1],
  [1,1,0,0,1,1],[0,0,1,1,0,0],[1,0,0,1,1,0],[0,1,1,0,0,1],
  [1,1,1,1,0,0],[0,0,1,1,1,1],[1,0,1,1,0,0],[0,0,1,0,1,1],
  [1,1,0,1,0,0],[0,0,1,0,1,1],[1,0,0,0,0,1],[1,0,0,0,0,1],
  [0,1,1,1,1,0],[1,1,0,0,0,1],[1,0,0,0,1,1],[1,1,0,1,1,1],
  [1,1,1,1,0,1],[1,0,1,0,0,1],[1,0,0,1,0,1],[0,1,0,1,1,0],
  [0,1,1,0,1,0],[0,0,1,1,0,1],[1,0,1,1,1,0],[0,1,1,1,0,0],
  [1,1,1,0,1,0],[0,1,0,1,1,1],[1,0,0,1,0,0],[0,0,1,0,0,1],
  [1,1,0,1,0,1],[1,0,1,0,1,1],[0,1,1,1,1,0],[1,1,1,0,0,1],
  [1,0,0,1,1,1],[1,1,1,1,1,0],[0,1,1,0,0,0],[0,0,0,1,1,0],
  [1,0,1,0,0,0],[0,0,0,1,0,1],[1,1,0,0,0,0],[0,0,0,0,1,1],
  [1,0,0,1,0,0],[0,0,1,0,0,1],[0,1,0,0,1,0],[0,1,0,0,1,0],
  [1,0,1,1,0,1],[1,0,1,1,0,1],[0,0,1,1,1,0],[0,1,1,1,0,0],
  [1,1,0,0,1,0],[0,1,0,0,1,1],[1,0,0,1,1,0],[0,1,1,0,0,1],
  [1,1,0,1,1,0],[0,1,1,0,1,1],[1,0,1,0,1,0],[0,1,0,1,0,1],
];

function Hexagram({ lines }: { lines: number[] }) {
  return (
    <div
      style={{
        aspectRatio: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 3,
        padding: 4,
      }}
    >
      {lines.map((line, i) => (
        <div
          key={i}
          style={{
            height: 2,
            borderRadius: 1,
            background: line === 1 ? "#2c1810" : "transparent",
            position: "relative",
          }}
        >
          {line === 0 && (
            <>
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: "40%",
                  height: 2,
                  background: "#2c1810",
                  borderRadius: 1,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: 0,
                  width: "40%",
                  height: 2,
                  background: "#2c1810",
                  borderRadius: 1,
                }}
              />
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  const journeys = getAllJourneys();
  const featured = getFeaturedSkills();
  const totalSkills = getAllSkills().length;
  const insights = getAllInsights();
  const growthGuideSlugs = [
    "alipay-vs-wechat-pay-foreigner",
    "wechat-pay-foreigner",
    "didi-english-guide-china",
    "china-hospital-foreigner-guide",
    "best-translation-apps-china-travel",
    "china-esim-foreigner-guide",
  ];
  const growthGuides = growthGuideSlugs
    .map((slug) => insights.find((item) => item.slug === slug))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

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

      {/* Practical Guides cluster for traffic distribution */}
      {growthGuides.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 pt-8 pb-8">
          <div className="rounded-lg border border-sand bg-white p-6">
            <h2 className="font-serif text-xl font-bold text-ink mb-2">Practical China Guides</h2>
            <p className="text-sm text-warm mb-5">
              High-intent guides for payments, transport, hospital visits, and essential setup in China.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {growthGuides.map((guide) => (
                <Link
                  key={guide.slug}
                  href={`/insights/${guide.slug}`}
                  className="rounded-md border border-sand px-4 py-3 hover:border-warm/40 transition-colors"
                >
                  <p className="text-sm font-medium text-ink hover:text-china-red transition-colors">
                    {guide.title}
                  </p>
                  {guide.title_zh && <p className="text-xs text-warm mt-1">{guide.title_zh}</p>}
                </Link>
              ))}
            </div>
            <div className="mt-4">
              <Link
                href="/insights"
                className="text-sm font-medium text-china-red hover:text-china-red/80 transition-colors"
              >
                View all practical guides →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Journey Timeline */}
      <section id="journey" className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="font-serif text-2xl font-bold text-ink mb-2">The Journey</h2>
        <p className="text-warm mb-10">
          Follow Sophie&apos;s path from the Silk Road through China&apos;s heartland
          <br />
          <span className="text-sm text-warm/70">追溯苏菲从丝绸之路到中原大地的旅途</span>
        </p>
        <JourneyTimeline journeys={journeys} />
      </section>

      {/* Philosopher Encounters */}
      <section className="max-w-6xl mx-auto px-4 py-16 border-t border-sand">
        <h2 className="font-serif text-2xl font-bold text-ink mb-2">The Philosophers</h2>
        <p className="text-warm mb-8">
          Eleven thinkers across three thousand years of Chinese thought
          <br />
          <span className="text-sm text-warm/70">横跨三千年的十一位思想家</span>
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
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

      {/* I Ching Entry — split layout with hexagram decoration */}
      <section className="max-w-5xl mx-auto px-4 py-16 border-t border-sand">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Left: 64 hexagrams grid decoration */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(8, 1fr)",
              gap: 6,
              opacity: 0.18,
            }}
          >
            {HEXAGRAMS.map((hex, i) => (
              <Hexagram key={i} lines={hex} />
            ))}
          </div>

          {/* Right: content */}
          <div>
            <h2 className="font-serif text-2xl font-bold text-ink mb-3">I Ching · 易经</h2>
            <p className="text-warm mb-7 text-base leading-relaxed">
              The Book of Changes — 3,000 years of wisdom encoded in 64 hexagrams.
              <br />
              Consult AI Oracles modeled after ancient thinkers.
            </p>
            <Link
              href="/iching"
              className="inline-block px-7 py-3 bg-china-red text-white font-medium text-sm rounded-sm hover:bg-china-red/90 transition-colors no-underline"
            >
              Explore the I Ching →
            </Link>
          </div>
        </div>
      </section>

      {/* Glossary + Insights Entry — with background characters */}
      <section className="max-w-4xl mx-auto px-4 py-16 border-t border-sand text-center relative overflow-hidden">
        {/* Background decoration: large Chinese characters */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            display: "flex",
            gap: "clamp(40px, 10vw, 120px)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        >
          <span
            className="font-serif"
            style={{
              fontSize: "clamp(80px, 15vw, 180px)",
              fontWeight: 900,
              color: "#2c1810",
              opacity: 0.06,
              lineHeight: 1,
            }}
          >
            仁
          </span>
          <span
            className="font-serif"
            style={{
              fontSize: "clamp(80px, 15vw, 180px)",
              fontWeight: 900,
              color: "#2c1810",
              opacity: 0.06,
              lineHeight: 1,
            }}
          >
            道
          </span>
          <span
            className="font-serif"
            style={{
              fontSize: "clamp(80px, 15vw, 180px)",
              fontWeight: 900,
              color: "#2c1810",
              opacity: 0.06,
              lineHeight: 1,
            }}
          >
            阴阳
          </span>
        </div>

        {/* Foreground content */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <h2 className="font-serif text-2xl font-bold text-ink mb-2">Learn Deeper · 深入探索</h2>
          <p className="text-warm mb-6 max-w-md mx-auto">
            Key concepts explained in our Glossary, and philosophical essays in our Insights section.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              href="/glossary"
              className="inline-block px-7 py-3 bg-ink text-white font-medium text-sm rounded-sm hover:bg-ink/90 transition-colors no-underline"
            >
              Glossary →
            </Link>
            <Link
              href="/insights"
              className="inline-block px-7 py-3 bg-gold text-white font-medium text-sm rounded-sm hover:bg-gold/90 transition-colors no-underline"
            >
              Insights →
            </Link>
          </div>
        </div>
      </section>

      {/* Oracle Subscription CTA */}
      <OracleCta />

      {/* Skills — condensed section */}
      <section className="max-w-6xl mx-auto px-4 py-12 border-t border-sand">
        <div className="text-center mb-8">
          <h2 className="font-serif text-2xl font-bold text-ink mb-2">Skills for the Road</h2>
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
                className="bg-cream/60 rounded-sm p-6 text-center hover:shadow-md transition-shadow group no-underline"
              >
                {/* SVG icon container */}
                <div
                  style={{
                    width: 44,
                    height: 44,
                    margin: "0 auto 12px",
                    borderRadius: 4,
                    background: "#fff",
                    border: "1px solid rgba(224,213,197,0.5)",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <CategoryIcon id={cat.id} />
                </div>
                <div className="font-serif font-semibold text-ink text-sm group-hover:text-china-red transition-colors">
                  {cat.name}
                </div>
                <div className="font-mono text-xs text-warm/50 mt-1">{count} skills</div>
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
