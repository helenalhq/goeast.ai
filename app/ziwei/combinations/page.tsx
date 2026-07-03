import type { Metadata } from "next";
import Link from "next/link";
import { getAllCombinations } from "@/lib/ziwei-combinations";
import JsonLd from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Zi Wei Dual Star Combinations · 双星同宫百科 — GoEast.ai",
  description:
    "Explore all 24 classical Zi Wei Dou Shu dual-star combinations (双星同宫). Learn how two major stars interact when sharing the same palace, including strengths, challenges, and palace effects.",
  keywords: [
    "zi wei dou shu dual stars",
    "双星同宫",
    "purple star astrology combinations",
    "star pairing",
    "紫微斗数组合",
  ],
  alternates: { canonical: "/ziwei/combinations" },
};

const STAR_GROUPS = [
  { label: "Zi Wei 紫微", prefix: "ziwei-" },
  { label: "Tian Ji 天机", prefix: "tianji-" },
  { label: "Tai Yang 太阳", prefix: "taiyang-" },
  { label: "Wu Qu 武曲", prefix: "wuqu-" },
  { label: "Tian Tong 天同", prefix: "tiantong-" },
  { label: "Lian Zhen 廉贞", prefix: "lianzhen-" },
];

export default function CombinationsListPage() {
  const all = getAllCombinations();

  return (
    <article>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Zi Wei Dou Shu Dual Star Combinations",
          description:
            "Complete encyclopedia of 24 classical dual-star combinations in Purple Star Astrology.",
          url: "https://www.goeast.ai/ziwei/combinations",
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
            { "@type": "ListItem", position: 3, name: "Dual Star Combinations", item: "https://www.goeast.ai/ziwei/combinations" },
          ],
        }}
      />

      {/* Hero */}
      <section className="bg-cream py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-warm/60 mb-2">Purple Star Astrology · Encyclopedia</p>
          <h1 className="text-3xl md:text-4xl font-bold text-ink mb-3">
            Dual Star Combinations · 双星同宫
          </h1>
          <p className="text-warm max-w-2xl mx-auto">
            When two major stars share the same palace, their energies interact to create unique personality
            traits and life patterns. Explore all 24 classical combinations below.
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
          <span className="text-ink">Dual Star Combinations</span>
        </nav>

        {/* Grouped List */}
        {STAR_GROUPS.map((group) => {
          const items = all.filter((c) => c.slug.startsWith(group.prefix));
          if (items.length === 0) return null;
          return (
            <section key={group.prefix} className="mb-10">
              <h2 className="text-xl font-bold text-ink mb-4">{group.label}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {items.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/ziwei/combinations/${c.slug}`}
                    className="group p-4 bg-white border border-sand rounded-lg hover:border-china-red/50 transition-colors"
                  >
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-semibold text-ink group-hover:text-china-red transition-colors">
                        {c.star1_zh}{c.star2_zh}
                      </span>
                      <span className="text-xs text-warm">
                        {c.star1_en} + {c.star2_en}
                      </span>
                    </div>
                    <p className="text-xs text-warm line-clamp-2">{c.nature_en} · {c.nature_zh}</p>
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
            <Link href="/ziwei/patterns" className="px-4 py-2 text-sm border border-sand rounded-full hover:border-china-red hover:text-china-red transition-colors">
              Classical Patterns · 格局百科
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
