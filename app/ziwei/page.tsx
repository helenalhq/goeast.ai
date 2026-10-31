import type { Metadata } from "next";
import Link from "next/link";
import ZiweiChart from "@/components/ZiweiChart";
import JsonLd from "@/components/JsonLd";
import FAQ from "@/components/FAQ";
import EmailCapture from "@/components/EmailCapture";
import { generateFAQJsonLd } from "@/lib/faq-templates";
import { getAllStars, getAllPalaces } from "@/lib/ziwei-data";
import { getAllCombinations } from "@/lib/ziwei-combinations";
import { getAllPatterns } from "@/lib/ziwei-patterns";

export const metadata: Metadata = {
  title: "Zi Wei Dou Shu Chart & Calculator | GoEast",
  description:
    "Create your free Zi Wei Dou Shu (紫微斗数) natal chart online. Enter birth date, time, and gender to generate your 12-palace chart with AI interpretation. No sign-up for casting.",
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
  alternates: {
    canonical: "/ziwei",
    languages: {
      en: "https://www.goeast.ai/ziwei",
      "x-default": "https://www.goeast.ai/ziwei",
    },
  },
  openGraph: {
    title: "Zi Wei Dou Shu (Purple Star Astrology): Free Natal Chart & Reading | GoEast.ai",
    description:
      "Free Zi Wei Dou Shu natal chart calculator with AI-powered bilingual reading. Explore stars, palaces, combinations, and patterns.",
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
  const stars = getAllStars();
  const palaces = getAllPalaces();
  const combinations = getAllCombinations().slice(0, 8);
  const patterns = getAllPatterns().slice(0, 6);

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
            Create Your Zi Wei Dou Shu Chart
          </h1>
          <p className="text-lg text-warm max-w-2xl mx-auto leading-relaxed">
            Enter your birth date, time, and gender below to generate a free 12-palace natal chart.
            Chart casting is instant and requires no account.
          </p>
          <p className="text-sm text-warm/70 max-w-xl mx-auto mt-2">
            AI interpretation requires a free account — 3 readings per day, shared across all GoEast tools
            (I Ching, Zi Wei, synastry). Pro: 10/day + deeper readings.
          </p>
          <p className="text-xs text-warm/60 max-w-xl mx-auto mt-2">
            Your birth data is used only to compute and display your chart. It is saved privately to
            your account (only you can access it) and is never placed in URLs, analytics, or shared
            with other users.
          </p>
          <p className="text-sm text-warm/60 mt-3">
            输入出生日期、时辰和性别，免费生成紫微斗数十二宫命盘。排盘无需注册；AI 解读需免费账号（每日 3 次，Pro 每日 10 次）。
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

        {/* Engine details, time rules, and example chart — SSR for SEO */}
        <section className="mb-16">
          <h2 className="text-xl font-bold text-ink mb-4">Chart Calculation Details · 排盘规则</h2>
          <div className="p-4 bg-white border border-sand rounded-lg space-y-3 text-sm text-warm leading-relaxed">
            <p>
              <strong>Engine:</strong> iztro v2.5.8 (open-source Zi Wei Dou Shu calculator). Chart computation is deterministic — the same birth inputs always produce the same palace and star placements.
            </p>
            <p>
              <strong>Time rules:</strong> Enter the local time at the birth place. The system uses Chinese double-hours (时辰). 子时 (23:00–01:00) spans two calendar days: 23:00–24:00 belongs to the current day (晚子时); 00:00–01:00 belongs to the next day (早子时).
            </p>
            <p>
              <strong>Birth hour is required.</strong> Without it, the Life Palace position and all star placements may shift. If you don&apos;t know the birth hour, we do not guess — the tool requires you to select &quot;Unknown&quot; and explains why precise casting isn&apos;t possible.
            </p>
            <p>
              <strong>Calendar:</strong> Solar (Gregorian) dates are converted to the Chinese lunar calendar automatically. The system does not currently handle historical calendar changes or non-standard time zones.
            </p>
            <p>
              <strong>Deterministic vs AI:</strong> The chart (palaces, stars, brightness, transformations) is computed by the engine — the AI never changes these values. The AI provides an interpretation of the computed chart, clearly labeled as AI-generated.
            </p>
          </div>
        </section>

        {/* Example chart — fictional data, SSR */}
        <section className="mb-16">
          <h2 className="text-xl font-bold text-ink mb-2">Example Natal Chart · 虚构命盘样例</h2>
          <p className="text-xs text-warm/60 mb-4">
            Fictional data (born May 20, 1990, 辰时 Chen 07:00–09:00, male). Example — not a real person.
          </p>
          <div className="p-4 bg-white border border-sand rounded-lg">
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-ink mb-1">Overview</p>
                <p className="text-warm">命主: 禄存 · 身主: 火星 · 五行: 土五局 · 生肖: 马</p>
                <p className="text-warm mt-2">Life Palace (命宫, 戊寅): no resident star — borrows from opposite Travel Palace (迁移): 太阳(得), 巨门(庙)</p>
              </div>
              <div>
                <p className="font-medium text-ink mb-1">Key Palaces</p>
                <table className="w-full text-xs">
                  <tbody>
                    <tr><td className="py-1 text-warm">夫妻 Spouse (戊子)</td><td className="py-1 text-warm">无主星</td></tr>
                    <tr><td className="py-1 text-warm">财帛 Wealth (丙戌)</td><td className="py-1 text-warm">天机(利) · 天梁(庙)</td></tr>
                    <tr><td className="py-1 text-warm">官禄 Career (壬午)</td><td className="py-1 text-warm">天同(陷) · 太阴(不)</td></tr>
                    <tr><td className="py-1 text-warm">迁移 Travel (甲申)</td><td className="py-1 text-warm">太阳(得) · 巨门(庙)</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
            <p className="text-xs text-warm/50 mt-3">
              Generated by iztro v2.5.8 · 2026-10-31 · Brightness terms: 庙(Brightest) 旺(Prosperous) 得(Gaining) 利(Beneficial) 平(Neutral) 不(Dull) 陷(Fallen)
            </p>
          </div>
        </section>

        {/* Email Capture for chart users */}
        <section className="mb-16">
          <EmailCapture
            title="Get Zi Wei Dou Shu Insights"
            subtitle="New Zi Wei guides and tools from GoEast."
            source="ziwei_page"
          />
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
              <div className="flex flex-wrap gap-1.5 mb-3">
                {stars.slice(0, 7).map((star) => (
                  <Link
                    key={star.slug}
                    href={`/ziwei/stars/${star.slug}`}
                    className="text-xs px-2 py-1 bg-cream border border-sand rounded-full text-warm hover:text-china-red hover:border-china-red/30 transition-colors"
                  >
                    {star.name_zh} {star.name_en.split(" (")[0]}
                  </Link>
                ))}
              </div>
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
              <div className="flex flex-wrap gap-1.5 mb-3">
                {palaces.slice(0, 6).map((palace) => (
                  <Link
                    key={palace.slug}
                    href={`/ziwei/palaces/${palace.slug}`}
                    className="text-xs px-2 py-1 bg-cream border border-sand rounded-full text-warm hover:text-china-red hover:border-china-red/30 transition-colors"
                  >
                    {palace.name_zh} {palace.name_en}
                  </Link>
                ))}
              </div>
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
              <div className="flex flex-wrap gap-1.5 mb-3">
                {combinations.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/ziwei/combinations/${c.slug}`}
                    className="text-xs px-2 py-1 bg-cream border border-sand rounded-full text-warm hover:text-china-red hover:border-china-red/30 transition-colors"
                  >
                    {c.star1_zh}+{c.star2_zh}
                  </Link>
                ))}
              </div>
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
              <div className="flex flex-wrap gap-1.5 mb-3">
                {patterns.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/ziwei/patterns/${p.slug}`}
                    className="text-xs px-2 py-1 bg-cream border border-sand rounded-full text-warm hover:text-china-red hover:border-china-red/30 transition-colors"
                  >
                    {p.name_zh}
                  </Link>
                ))}
              </div>
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
