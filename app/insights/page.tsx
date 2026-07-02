import { getAllInsights } from "@/lib/insights";
import { PHILOSOPHER_SLUGS } from "@/lib/types";
import Link from "next/link";
import OracleCta from "@/components/OracleCta";
import JsonLd from "@/components/JsonLd";
import CitationSnippet from "@/components/CitationSnippet";
import FAQ from "@/components/FAQ";
import { generateFAQs, generateFAQJsonLd } from "@/lib/faq-templates";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chinese Philosophy Explained: Yin Yang, Wu Wei, Confucius | GoEast.ai",
  description: "Explore Chinese philosophy in the modern world. Learn about yin yang, wu wei, Confucius leadership, and ancient wisdom for today. 探索现代世界中的中国哲学",
  alternates: { canonical: "/insights" },
  openGraph: {
    title: "Chinese Philosophy Explained: Yin Yang, Wu Wei, Confucius | GoEast.ai",
    description: "Chinese philosophy meets modern life: essays connecting ancient wisdom to contemporary challenges.",
    type: "website",
  },
};

export default function InsightsPage() {
  const insights = getAllInsights();
  const ctaClusters = [
    {
      title: "Payments in China",
      description: "Set up and compare the payment stack foreigners use daily.",
      links: [
        { href: "/insights/alipay-vs-wechat-pay-foreigner", label: "Alipay vs WeChat Pay for foreigners" },
        { href: "/insights/wechat-pay-foreigner", label: "WeChat Pay setup guide (2026)" },
        { href: "/skills/china-payment-setup", label: "China payment setup skill" },
      ],
    },
    {
      title: "Transport and Mobility",
      description: "Move between cities and inside cities with fewer failures.",
      links: [
        { href: "/insights/china-high-speed-rail-12306-guide", label: "China high-speed rail booking workflow" },
        { href: "/insights/didi-english-guide-china", label: "How to use DiDi without Chinese" },
        { href: "/skills/china-local-travel-expert", label: "China local travel expert skill" },
      ],
    },
    {
      title: "Health and Safety",
      description: "Prepare for hospital visits, translation, and connectivity fallback.",
      links: [
        { href: "/insights/china-hospital-foreigner-guide", label: "Hospital navigation guide for foreigners" },
        { href: "/insights/best-translation-apps-china-travel", label: "Best translation apps for China travel" },
        { href: "/insights/china-esim-foreigner-guide", label: "China eSIM setup and backup strategy" },
      ],
    },
  ];

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

      {/* CitationSnippet */}
      <section className="max-w-3xl mx-auto px-4 pt-8">
        <CitationSnippet text="Essays connecting Chinese philosophical concepts to modern life. Explore how Sunzi's strategy informs AI, how Wuwei challenges hustle culture, and how the I Ching guides decision-making." />
      </section>

      {/* Structured CTA internal links for high-intent search clusters */}
      <section className="max-w-5xl mx-auto px-4 pt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ctaClusters.map((cluster) => (
            <div key={cluster.title} className="bg-white rounded-xl border border-sand p-5">
              <h2 className="text-base font-semibold text-ink mb-2">{cluster.title}</h2>
              <p className="text-xs text-warm/80 mb-4">{cluster.description}</p>
              <div className="space-y-2">
                {cluster.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block text-sm text-ink hover:text-china-red transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
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

      {/* FAQ */}
      {(() => {
        const faqs = generateFAQs({ type: "insights_listing" });
        return (
          <section className="max-w-3xl mx-auto px-4 pb-16">
            <FAQ items={faqs} jsonLd={generateFAQJsonLd(faqs)} />
          </section>
        );
      })()}
    </main>
  );
}
