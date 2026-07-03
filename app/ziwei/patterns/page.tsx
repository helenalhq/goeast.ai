import type { Metadata } from "next";
import Link from "next/link";
import { getAllPatterns, getPatternsByCategory } from "@/lib/ziwei-patterns";
import JsonLd from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Zi Wei Classical Patterns · 格局百科 — GoEast.ai",
  description:
    "Explore 37 classical Zi Wei Dou Shu patterns (格局). From superior patterns like Zi Fu Chao Yuan to malefic patterns, understand the cosmic configurations that shape destiny.",
  keywords: [
    "zi wei dou shu patterns",
    "格局",
    "purple star astrology formations",
    "紫微斗数格局",
    "classical patterns",
    "destiny configurations",
  ],
  alternates: { canonical: "/ziwei/patterns" },
};

const CATEGORY_TABS: { key: "superior" | "middle" | "support" | "malefic" | "basic"; label_en: string; label_zh: string }[] = [
  { key: "superior", label_en: "Superior", label_zh: "上格" },
  { key: "middle", label_en: "Middle", label_zh: "中格" },
  { key: "support", label_en: "Support", label_zh: "助力格" },
  { key: "malefic", label_en: "Malefic", label_zh: "恶格" },
  { key: "basic", label_en: "Basic", label_zh: "基础格" },
];

export default function PatternsListPage() {
  const all = getAllPatterns();

  return (
    <article>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Zi Wei Dou Shu Classical Patterns",
          description:
            "Complete encyclopedia of 37 classical patterns in Purple Star Astrology.",
          url: "https://www.goeast.ai/ziwei/patterns",
          isPartOf: {
            "@type": "WebSite",
            name: "GoEast.ai",
            url: "https://www.goeast.ai",
          },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://www.goeast.ai" },
            { "@type": "ListItem", position: 2, name: "Zi Wei Dou Shu", item: "https://www.goeast.ai/ziwei" },
            { "@type": "ListItem", position: 3, name: "Classical Patterns", item: "https://www.goeast.ai/ziwei/patterns" },
          ],
        }}
      />

      {/* Hero */}
      <section className="bg-cream py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-warm/60 mb-2">Purple Star Astrology · Encyclopedia</p>
          <h1 className="text-3xl md:text-4xl font-bold text-ink mb-3">
            Classical Patterns · 格局百科
          </h1>
          <p className="text-warm max-w-2xl mx-auto">
            Patterns (格局) are specific star configurations that carry special meaning in Zi Wei Dou Shu.
            From supremely auspicious to cautionary, these {all.length} classical patterns reveal the cosmic
            architecture of destiny.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <nav className="text-sm text-warm mb-8 flex items-center gap-2">
          <Link href="/" className="hover:text-china-red transition-colors">Home</Link>
          <span>/</span>
          <Link href="/ziwei" className="hover:text-china-red transition-colors">Zi Wei Dou Shu</Link>
          <span>/</span>
          <span className="text-ink">Classical Patterns</span>
        </nav>

        {/* Category Sections */}
        {CATEGORY_TABS.map((cat) => {
          const items = getPatternsByCategory(cat.key);
          return (
            <section key={cat.key} className="mb-12" id={cat.key}>
              <h2 className="text-xl font-bold text-ink mb-1">
                {cat.label_en} Patterns · {cat.label_zh}
              </h2>
              <p className="text-xs text-warm mb-4">{items.length} patterns</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {items.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/ziwei/patterns/${p.slug}`}
                    className="group p-4 bg-white border border-sand rounded-lg hover:border-china-red/50 transition-colors"
                  >
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-semibold text-ink group-hover:text-china-red transition-colors">
                        {p.name_zh}
                      </span>
                    </div>
                    <p className="text-xs text-warm line-clamp-2">{p.name_en}</p>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

        {/* Cross Links */}
        <section className="mt-12 text-center">
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
            <Link href="/ziwei/synastry" className="px-4 py-2 text-sm border border-sand rounded-full hover:border-china-red hover:text-china-red transition-colors">
              Synastry · 合盘分析
            </Link>
          </div>
        </section>
      </div>
    </article>
  );
}
