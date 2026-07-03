import type { Metadata } from "next";
import Link from "next/link";
import ZiweiChart from "@/components/ZiweiChart";
import JsonLd from "@/components/JsonLd";
import FAQ from "@/components/FAQ";
import { generateFAQJsonLd } from "@/lib/faq-templates";

export const metadata: Metadata = {
  title: "Zi Wei Dou Shu — Purple Star Astrology Chart & AI Reading — GoEast.ai",
  description:
    "Generate your Zi Wei Dou Shu (紫微斗数) natal chart instantly and receive AI-powered bilingual interpretation. The most sophisticated system of Chinese astrology, now accessible in English and Chinese.",
  keywords: [
    "Zi Wei Dou Shu",
    "紫微斗数",
    "Purple Star Astrology",
    "Chinese astrology",
    "natal chart",
    "命盘",
    "AI interpretation",
    "destiny reading",
  ],
  alternates: { canonical: "/ziwei" },
  openGraph: {
    title: "Zi Wei Dou Shu — Purple Star Astrology",
    description:
      "Generate your natal chart and receive AI interpretation based on thousand-year-old Chinese astrology.",
    type: "website",
    url: "https://www.goeast.ai/ziwei",
  },
};

const FAQ_ITEMS = [
  {
    question: "What is Zi Wei Dou Shu (Purple Star Astrology)?",
    answer:
      "Zi Wei Dou Shu (紫微斗数) is one of the most sophisticated systems of Chinese astrology, dating back over a thousand years. It maps 14 major stars and dozens of minor stars across 12 life palaces based on your birth date and time, providing insights into personality, career, relationships, and life trajectory.",
  },
  {
    question: "How accurate is the natal chart calculation?",
    answer:
      "Our chart engine uses the iztro open-source library, which implements the traditional Zi Wei Dou Shu algorithm faithfully. The calculation is mathematically precise given your birth data. The interpretation, however, is AI-generated and should be taken as cultural insight and self-reflection, not prediction.",
  },
  {
    question: "Do I need my exact birth time for Zi Wei Dou Shu?",
    answer:
      "Yes, the birth hour (时辰) is crucial in Zi Wei Dou Shu. Chinese traditional time uses 12 two-hour periods. If you don't know your exact birth time, the chart may not be accurate. Each two-hour shift can change the entire chart configuration.",
  },
  {
    question: "What is the difference between Zi Wei Dou Shu and Western astrology?",
    answer:
      "While Western astrology focuses on planetary positions in zodiac signs, Zi Wei Dou Shu maps stars (many of which are symbolic, not astronomical) across 12 palaces representing different life areas. It uses the Chinese lunar calendar and the 12 Earthly Branches as its framework, offering a distinctly Chinese cultural perspective on destiny.",
  },
  {
    question: "Is the AI interpretation available in English?",
    answer:
      "Yes! You can choose between English, Chinese, or bilingual interpretation. Our AI combines traditional Zi Wei Dou Shu knowledge with modern psychological insight, making this ancient wisdom accessible to English speakers while preserving the original Chinese terminology.",
  },
];

export default function ZiweiPage() {
  const faqJsonLd = generateFAQJsonLd(FAQ_ITEMS);

  return (
    <article>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "Zi Wei Dou Shu Chart Generator",
          alternateName: "紫微斗数排盘",
          description:
            "Generate your Purple Star Astrology natal chart and receive AI-powered interpretation in English and Chinese.",
          url: "https://www.goeast.ai/ziwei",
          applicationCategory: "LifestyleApplication",
          operatingSystem: "Web",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
          },
          publisher: {
            "@type": "Organization",
            name: "GoEast.ai",
            url: "https://www.goeast.ai",
          },
        }}
      />

      {/* Hero */}
      <section className="bg-cream py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-warm/60 mb-3 tracking-wide uppercase">
            Purple Star Astrology · 紫微斗数
          </p>
          <h1 className="text-3xl md:text-5xl font-bold text-ink mb-4">
            Zi Wei Dou Shu
          </h1>
          <p className="text-lg text-warm max-w-2xl mx-auto leading-relaxed">
            The most sophisticated system of Chinese astrology — mapping your destiny through 14 major stars
            across 12 life palaces. Enter your birth data to generate your natal chart and receive
            an AI-powered interpretation.
          </p>
          <p className="text-sm text-warm/60 mt-3">
            紫微斗数——中国最精密的命理学体系，通过十四主星在十二宫位的分布揭示人生蓝图。
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <nav className="text-sm text-warm mb-8 flex items-center gap-2">
          <Link href="/" className="hover:text-china-red transition-colors">Home</Link>
          <span>/</span>
          <span className="text-ink">Zi Wei Dou Shu</span>
        </nav>

        {/* Chart Generator */}
        <section className="mb-16">
          <ZiweiChart />
        </section>

        {/* About Section */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-ink mb-6">
            Understanding Zi Wei Dou Shu · 了解紫微斗数
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-ink mb-3">The 14 Major Stars · 十四主星</h3>
              <p className="text-sm text-warm leading-relaxed mb-3">
                Each major star carries distinct energy — from the imperial authority of Zi Wei (紫微)
                to the warrior courage of Qi Sha (七杀). Their placement in your chart reveals your
                core personality, talents, and life trajectory.
              </p>
              <Link
                href="/ziwei/stars"
                className="text-sm text-china-red hover:underline"
              >
                Explore all 14 stars →
              </Link>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-ink mb-3">The 12 Palaces · 十二宫位</h3>
              <p className="text-sm text-warm leading-relaxed mb-3">
                The 12 palaces represent different domains of life — career, wealth, relationships,
                health, and more. The stars within each palace shape your experiences in that life area.
              </p>
              <Link
                href="/ziwei/palaces"
                className="text-sm text-china-red hover:underline"
              >
                Explore all 12 palaces →
              </Link>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-ink mb-3">Dual Star Combinations · 双星同宫</h3>
              <p className="text-sm text-warm leading-relaxed mb-3">
                When two major stars share the same palace, their energies combine to create unique
                personality traits and life patterns. Explore all 24 classical dual-star combinations.
              </p>
              <Link
                href="/ziwei/combinations"
                className="text-sm text-china-red hover:underline"
              >
                Explore 24 combinations →
              </Link>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-ink mb-3">Classical Patterns · 格局百科</h3>
              <p className="text-sm text-warm leading-relaxed mb-3">
                Patterns (格局) are specific star configurations that carry special meaning — from the
                supremely auspicious to the cautionary. 37 classical patterns across 5 categories.
              </p>
              <Link
                href="/ziwei/patterns"
                className="text-sm text-china-red hover:underline"
              >
                Explore 37 patterns →
              </Link>
            </div>
          </div>
        </section>

        {/* Synastry CTA */}
        <section className="mb-16 p-6 bg-gradient-to-br from-cream to-white rounded-xl border border-sand">
          <h2 className="text-xl font-bold text-ink mb-3">
            Synastry · 合盘分析
          </h2>
          <p className="text-sm text-warm leading-relaxed mb-4">
            Compare two natal charts to explore relationship compatibility. Our AI-powered synastry
            analysis examines how stars and palaces interact between two people — for romantic,
            business, family, or friendship connections.
          </p>
          <Link
            href="/ziwei/synastry"
            className="inline-block px-4 py-2 bg-china-red text-white text-sm rounded-full hover:bg-china-red/90 transition-colors"
          >
            Try Synastry Analysis · 开始合盘 →
          </Link>
        </section>

        {/* Connection to I Ching */}
        <section className="mb-16 p-6 bg-cream rounded-xl border border-sand">
          <h2 className="text-xl font-bold text-ink mb-3">
            Related: I Ching Divination · 易经占卜
          </h2>
          <p className="text-sm text-warm leading-relaxed mb-4">
            While Zi Wei Dou Shu maps your natal destiny, the I Ching speaks to the present moment
            and its hidden dynamics. Together, they offer complementary perspectives — one reveals
            your life blueprint, the other illuminates the path forward right now.
          </p>
          <Link
            href="/iching"
            className="inline-block px-4 py-2 bg-ink text-white text-sm rounded-full hover:bg-ink/90 transition-colors"
          >
            Try I Ching Divination →
          </Link>
        </section>

        {/* FAQ */}
        <FAQ items={FAQ_ITEMS} jsonLd={faqJsonLd} />
      </div>
    </article>
  );
}
