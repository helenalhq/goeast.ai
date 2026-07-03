import type { Metadata } from "next";
import ZiweiSynastry from "@/components/ZiweiSynastry";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Zi Wei Synastry · Relationship Chart Comparison | GoEast",
  description:
    "Compare two Zi Wei Dou Shu natal charts for relationship compatibility. AI-powered synastry analysis for romantic, business, parent-child, and friendship connections.",
  keywords: [
    "zi wei dou shu synastry",
    "purple star astrology compatibility",
    "chinese astrology relationship",
    "natal chart comparison",
    "紫微斗数合盘",
    "命盘对比",
  ],
};

const FAQ_ITEMS = [
  {
    q: "What is Zi Wei Synastry (合盘)?",
    a: "Synastry compares two Zi Wei Dou Shu natal charts to analyze relationship dynamics. It examines how each person's stars and palaces interact with the other's, revealing compatibility, strengths, and potential challenges in any relationship type.",
  },
  {
    q: "Which relationship types can be analyzed?",
    a: "Our synastry supports four types: Romantic/Marriage (感情/婚姻), Business/Partnership (事业/合伙), Parent-Child/Family (亲子/家庭), and Friendship/Social (友谊/社交). Each type focuses on different palace interactions.",
  },
  {
    q: "How accurate is AI synastry reading?",
    a: "The AI analyzes traditional Zi Wei Dou Shu principles including palace cross-references, star interactions, Five Elements harmony, and Four Transformations. Results are for cultural and educational reference — relationships depend on many factors beyond astrology.",
  },
  {
    q: "Do I need both persons' exact birth times?",
    a: "Yes. Zi Wei Dou Shu relies heavily on the birth hour (时辰) to determine palace positions and star placements. Even a one-hour difference can shift the entire chart, so accuracy is important for meaningful analysis.",
  },
  {
    q: "What palaces are most important for synastry?",
    a: "For romantic readings, the Spouse Palace (夫妻宫) and Life Palace (命宫) are key. Business partnerships focus on Career Palace (官禄宫) and Wealth Palace (财帛宫). Parent-child looks at Children Palace (子女宫) and Parents Palace (父母宫).",
  },
];

export default function ZiweiSynastryPage() {
  const schemaJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Zi Wei Dou Shu Synastry Analysis",
    alternateName: "紫微斗数合盘分析",
    description:
      "Compare two natal charts for relationship compatibility using traditional Zi Wei Dou Shu astrology with AI-powered interpretation.",
    url: "https://goeast.ai/ziwei/synastry",
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free synastry analysis with optional premium subscription for more daily readings",
    },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <main className="min-h-screen bg-cream">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Hero */}
      <section className="py-12 px-4 text-center">
        <nav className="text-xs text-warm mb-4">
          <Link href="/ziwei" className="hover:text-china-red">Zi Wei</Link>
          <span className="mx-2">/</span>
          <span>Synastry</span>
        </nav>
        <h1 className="text-3xl md:text-4xl font-bold text-ink mb-3">
          Synastry · 合盘分析
        </h1>
        <p className="text-warm max-w-2xl mx-auto">
          Compare two natal charts to explore relationship compatibility through the lens of
          traditional Zi Wei Dou Shu astrology, enhanced by AI interpretation.
        </p>
      </section>

      {/* Synastry Tool */}
      <section className="px-4 pb-12">
        <ZiweiSynastry />
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 pb-16">
        <h2 className="text-xl font-bold text-ink mb-6 text-center">
          Frequently Asked Questions · 常见问题
        </h2>
        <div className="space-y-4">
          {FAQ_ITEMS.map((item, i) => (
            <details key={i} className="group bg-white border border-sand rounded-lg">
              <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-ink hover:text-china-red transition-colors">
                {item.q}
              </summary>
              <p className="px-4 pb-3 text-sm text-warm">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Cross Links */}
      <section className="max-w-3xl mx-auto px-4 pb-16 text-center">
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/ziwei" className="px-4 py-2 text-sm border border-sand rounded-full hover:border-china-red hover:text-china-red transition-colors">
            ← Natal Chart · 本命盘
          </Link>
          <Link href="/ziwei/stars" className="px-4 py-2 text-sm border border-sand rounded-full hover:border-china-red hover:text-china-red transition-colors">
            14 Stars · 主星百科
          </Link>
          <Link href="/ziwei/combinations" className="px-4 py-2 text-sm border border-sand rounded-full hover:border-china-red hover:text-china-red transition-colors">
            Dual Stars · 双星同宫
          </Link>
        </div>
      </section>
    </main>
  );
}
