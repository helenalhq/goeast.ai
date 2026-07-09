import { notFound } from "next/navigation";
import Link from "next/link";
import { getStarBySlug, getAllStars } from "@/lib/ziwei-data";
import JsonLd from "@/components/JsonLd";
import type { Metadata } from "next";

export async function generateStaticParams() {
  return getAllStars().map((s) => ({ star: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ star: string }>;
}): Promise<Metadata> {
  const { star } = await params;
  const s = getStarBySlug(star);
  if (!s) return {};
  return {
    title: `${s.name_en} (${s.name_zh}) Meaning in Zi Wei Dou Shu | GoEast.ai`,
    description: `${s.name_en} (${s.name_zh}) meaning in Zi Wei Dou Shu (Purple Star Astrology): ${s.description_en.slice(0, 150)}`,
    alternates: {
      canonical: `/ziwei/stars/${star}`,
      languages: {
        en: `https://www.goeast.ai/ziwei/stars/${star}`,
        "x-default": `https://www.goeast.ai/ziwei/stars/${star}`,
      },
    },
    openGraph: {
      title: `${s.name_en} (${s.name_zh}) Meaning in Zi Wei Dou Shu`,
      description: `${s.name_en} (${s.name_zh}) meaning in Zi Wei Dou Shu (Purple Star Astrology).`,
      type: "article",
    },
  };
}

export default async function StarDetailPage({
  params,
}: {
  params: Promise<{ star: string }>;
}) {
  const { star } = await params;
  const s = getStarBySlug(star);
  if (!s) notFound();

  const allStars = getAllStars();
  const relatedStars = allStars.filter((rs) => rs.slug !== s.slug && rs.element === s.element).slice(0, 3);

  return (
    <article>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "DefinedTerm",
          name: `${s.name_en} (${s.name_zh})`,
          description: s.description_en,
          inDefinedTermSet: {
            "@type": "DefinedTermSet",
            name: "Zi Wei Dou Shu Major Stars",
            url: "https://www.goeast.ai/ziwei/stars",
          },
          url: `https://www.goeast.ai/ziwei/stars/${s.slug}`,
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
            { "@type": "ListItem", position: 4, name: s.name_en, item: `https://www.goeast.ai/ziwei/stars/${s.slug}` },
          ],
        }}
      />

      {/* Hero */}
      <section className="bg-cream py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm text-warm/60 mb-2">Zi Wei Dou Shu · Major Star</p>
          <h1 className="text-3xl md:text-4xl font-bold text-ink mb-2">
            {s.name_en}
          </h1>
          <p className="text-2xl text-ink/70">{s.name_zh}</p>
          <div className="flex justify-center gap-3 mt-4">
            <span className="px-3 py-1 bg-white rounded-full border border-sand text-sm text-warm">
              {s.element} · {s.element_zh}
            </span>
            <span className="px-3 py-1 bg-white rounded-full border border-sand text-sm text-warm">
              {s.yin_yang}
            </span>
            <span className="px-3 py-1 bg-white rounded-full border border-sand text-sm text-warm capitalize">
              {s.category}
            </span>
          </div>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <nav className="text-sm text-warm mb-8 flex items-center gap-2">
          <Link href="/" className="hover:text-china-red transition-colors">Home</Link>
          <span>/</span>
          <Link href="/ziwei" className="hover:text-china-red transition-colors">Zi Wei Dou Shu</Link>
          <span>/</span>
          <Link href="/ziwei/stars" className="hover:text-china-red transition-colors">Stars</Link>
          <span>/</span>
          <span className="text-ink">{s.name_zh}</span>
        </nav>

        {/* Description */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-ink mb-4">Overview · 概述</h2>
          <p className="text-ink/80 leading-relaxed mb-4">{s.description_en}</p>
          <p className="text-warm/70 text-sm leading-relaxed">{s.description_zh}</p>
        </section>

        {/* Keywords */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-ink mb-4">Key Attributes · 关键特质</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {s.keywords_en.map((kw) => (
              <span key={kw} className="px-3 py-1.5 bg-china-red/5 text-china-red text-sm rounded-full">
                {kw}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {s.keywords_zh.map((kw) => (
              <span key={kw} className="px-3 py-1.5 bg-ink/5 text-ink/70 text-sm rounded-full">
                {kw}
              </span>
            ))}
          </div>
        </section>

        {/* Modern Interpretation */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-ink mb-4">Modern Interpretation · 现代解读</h2>
          <p className="text-ink/80 leading-relaxed mb-3">{s.modern_interpretation_en}</p>
          <p className="text-warm/70 text-sm leading-relaxed">{s.modern_interpretation_zh}</p>
        </section>

        {/* Properties Table */}
        <section className="mb-10 p-4 bg-cream rounded-lg border border-sand">
          <h3 className="text-lg font-semibold text-ink mb-3">Properties · 属性</h3>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-sand/50">
                <td className="py-2 font-medium text-warm">Element (五行)</td>
                <td className="py-2 text-ink">{s.element} · {s.element_zh}</td>
              </tr>
              <tr className="border-b border-sand/50">
                <td className="py-2 font-medium text-warm">Yin/Yang (阴阳)</td>
                <td className="py-2 text-ink">{s.yin_yang}</td>
              </tr>
              <tr>
                <td className="py-2 font-medium text-warm">Category (类别)</td>
                <td className="py-2 text-ink capitalize">{s.category}</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Related Stars */}
        {relatedStars.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">Related Stars · 相关星曜</h2>
            <div className="flex flex-wrap gap-3">
              {relatedStars.map((rs) => (
                <Link
                  key={rs.slug}
                  href={`/ziwei/stars/${rs.slug}`}
                  className="px-4 py-2 bg-white rounded-lg border border-sand hover:border-china-red/50 transition-colors text-sm"
                >
                  <span className="font-medium text-ink">{rs.name_zh}</span>
                  <span className="text-warm ml-2">{rs.name_en}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="mt-12 p-6 bg-gradient-to-br from-cream to-white rounded-xl border border-sand text-center">
          <p className="text-warm mb-3">See where this star appears in your own chart</p>
          <Link
            href="/ziwei"
            className="inline-block px-6 py-3 bg-china-red text-white rounded-full font-medium hover:bg-china-red/90 transition-colors"
          >
            Generate Your Chart · 排盘
          </Link>
        </section>
      </div>
    </article>
  );
}
