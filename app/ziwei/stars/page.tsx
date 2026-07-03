import type { Metadata } from "next";
import Link from "next/link";
import { getAllStars } from "@/lib/ziwei-data";
import JsonLd from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "14 Major Stars of Zi Wei Dou Shu — Purple Star Astrology — GoEast.ai",
  description:
    "Explore the 14 major stars (十四主星) of Zi Wei Dou Shu: Zi Wei, Tian Ji, Tai Yang, Wu Qu, Tian Tong, Lian Zhen, Tian Fu, Tai Yin, Tan Lang, Ju Men, Tian Xiang, Tian Liang, Qi Sha, and Po Jun.",
  alternates: { canonical: "/ziwei/stars" },
  openGraph: {
    title: "14 Major Stars — Zi Wei Dou Shu",
    description: "Complete guide to the 14 major stars of Purple Star Astrology with bilingual explanations.",
    type: "website",
  },
};

export default function StarsListPage() {
  const stars = getAllStars();

  return (
    <article>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "14 Major Stars of Zi Wei Dou Shu",
          description: "Complete collection of the 14 major stars in Purple Star Astrology.",
          url: "https://www.goeast.ai/ziwei/stars",
          numberOfItems: stars.length,
          publisher: { "@type": "Organization", name: "GoEast.ai", url: "https://www.goeast.ai" },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://www.goeast.ai" },
            { "@type": "ListItem", position: 2, name: "Zi Wei Dou Shu", item: "https://www.goeast.ai/ziwei" },
            { "@type": "ListItem", position: 3, name: "Stars", item: "https://www.goeast.ai/ziwei/stars" },
          ],
        }}
      />

      {/* Hero */}
      <section className="bg-cream py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-warm/60 mb-2">Zi Wei Dou Shu · 紫微斗数</p>
          <h1 className="text-3xl md:text-4xl font-bold text-ink mb-3">
            The 14 Major Stars · 十四主星
          </h1>
          <p className="text-warm max-w-2xl mx-auto">
            Each star carries unique energy that shapes personality, destiny, and life path.
            Discover their meanings and how they influence your chart.
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
          <span className="text-ink">Stars</span>
        </nav>

        {/* Stars Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stars.map((star) => (
            <Link
              key={star.slug}
              href={`/ziwei/stars/${star.slug}`}
              className="p-4 bg-white rounded-xl border border-sand hover:border-china-red/50 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h2 className="font-bold text-ink group-hover:text-china-red transition-colors text-sm">
                    {star.name_en}
                  </h2>
                  <p className="text-lg font-bold text-ink/80">{star.name_zh}</p>
                </div>
                <span className="text-xs px-2 py-0.5 bg-cream rounded-full text-warm">
                  {star.element} · {star.element_zh}
                </span>
              </div>
              <p className="text-xs text-warm line-clamp-2">{star.description_en.slice(0, 120)}...</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {star.keywords_en.slice(0, 3).map((kw) => (
                  <span key={kw} className="text-[10px] px-1.5 py-0.5 bg-china-red/5 text-china-red/70 rounded">
                    {kw}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>

        {/* Back link */}
        <div className="mt-12 text-center">
          <Link href="/ziwei" className="text-sm text-china-red hover:underline">
            ← Back to Zi Wei Dou Shu
          </Link>
        </div>
      </div>
    </article>
  );
}
