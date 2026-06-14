import { getAllInsights } from "@/lib/insights";
import { PHILOSOPHER_SLUGS } from "@/lib/types";
import Link from "next/link";
import OracleCta from "@/components/OracleCta";
import JsonLd from "@/components/JsonLd";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Philosophical Insights — GoEast.ai",
  description: "Explore Chinese philosophy in the modern world: Sunzi's strategy meets AI, Wuwei challenges hustle culture, and the I Ching guides entrepreneurs.",
  alternates: { canonical: "/insights", languages: { en: "/insights", zh: "/insights" } },
  openGraph: {
    title: "Philosophical Insights — GoEast.ai",
    description: "Chinese philosophy meets modern life: essays connecting ancient wisdom to contemporary challenges.",
    type: "website",
  },
};

export default function InsightsPage() {
  const insights = getAllInsights();

  return (
    <main>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Philosophical Insights",
          description: "Essays connecting Chinese philosophical concepts to modern life.",
          url: "https://www.goeast.ai/insights",
          partOf: { "@type": "WebSite", name: "GoEast.ai", url: "https://www.goeast.ai" },
        }}
      />

      {/* Hero */}
      <section className="bg-cream py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-ink mb-3">
            Philosophical Insights
          </h1>
          <p className="text-xl text-warm">哲学洞见</p>
          <p className="text-base text-warm/70 mt-4 max-w-2xl mx-auto">
            Ancient wisdom meets modern challenges. Essays connecting Chinese philosophy to the world we live in today.
          </p>
        </div>
      </section>

      {/* Articles grid */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {insights.map((insight) => {
            const philosopher = insight.philosopher_slug ? PHILOSOPHER_SLUGS[insight.philosopher_slug] : null;
            return (
              <Link
                key={insight.slug}
                href={`/insights/${insight.slug}`}
                className="p-6 bg-white rounded-xl border border-sand hover:border-warm/40 transition-all group"
              >
                <div className="flex items-center gap-2 mb-3">
                  {philosopher && (
                    <span className="text-xs text-warm/60">{philosopher.name} · {philosopher.name_zh}</span>
                  )}
                </div>
                <h2 className="text-lg font-semibold text-ink group-hover:text-china-red transition-colors mb-2">
                  {insight.title}
                </h2>
                {insight.title_zh && (
                  <p className="text-sm text-warm mb-3">{insight.title_zh}</p>
                )}
                {insight.concept_slugs && insight.concept_slugs.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {insight.concept_slugs.map((slug) => (
                      <span
                        key={slug}
                        className="px-2 py-0.5 rounded-full bg-cream border border-sand text-xs text-warm"
                      >
                        {slug}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4">
        <OracleCta message="Want to explore these ideas further with a philosopher? Try the Oracle." />
      </div>
    </main>
  );
}
