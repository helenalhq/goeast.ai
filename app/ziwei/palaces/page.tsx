import type { Metadata } from "next";
import Link from "next/link";
import { getAllPalaces } from "@/lib/ziwei-data";
import JsonLd from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "12 Palaces of Zi Wei Dou Shu — Purple Star Astrology — GoEast.ai",
  description:
    "Explore the 12 palaces (十二宫位) of Zi Wei Dou Shu: Life, Siblings, Spouse, Children, Wealth, Health, Travel, Friends, Career, Property, Fortune, and Parents Palace.",
  alternates: { canonical: "/ziwei/palaces" },
  openGraph: {
    title: "12 Palaces — Zi Wei Dou Shu",
    description: "Complete guide to the 12 life palaces of Purple Star Astrology.",
    type: "website",
  },
};

export default function PalacesListPage() {
  const palaces = getAllPalaces();

  return (
    <article>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "12 Palaces of Zi Wei Dou Shu",
          description: "Complete collection of the 12 life palaces in Purple Star Astrology.",
          url: "https://www.goeast.ai/ziwei/palaces",
          numberOfItems: palaces.length,
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
            { "@type": "ListItem", position: 3, name: "Palaces", item: "https://www.goeast.ai/ziwei/palaces" },
          ],
        }}
      />

      {/* Hero */}
      <section className="bg-cream py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-warm/60 mb-2">Zi Wei Dou Shu · 紫微斗数</p>
          <h1 className="text-3xl md:text-4xl font-bold text-ink mb-3">
            The 12 Palaces · 十二宫位
          </h1>
          <p className="text-warm max-w-2xl mx-auto">
            Each palace represents a distinct domain of life. The stars within each palace
            determine how you experience that life area — your strengths, challenges, and opportunities.
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
          <span className="text-ink">Palaces</span>
        </nav>

        {/* Palaces Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {palaces.map((palace) => (
            <Link
              key={palace.slug}
              href={`/ziwei/palaces/${palace.slug}`}
              className="p-4 bg-white rounded-xl border border-sand hover:border-china-red/50 hover:shadow-sm transition-all group"
            >
              <h2 className="font-bold text-ink group-hover:text-china-red transition-colors text-sm mb-0.5">
                {palace.name_en}
              </h2>
              <p className="text-lg font-bold text-ink/80 mb-2">{palace.name_zh}</p>
              <p className="text-xs text-china-red/70 mb-2">{palace.life_area_en}</p>
              <p className="text-xs text-warm line-clamp-2">{palace.description_en.slice(0, 100)}...</p>
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
