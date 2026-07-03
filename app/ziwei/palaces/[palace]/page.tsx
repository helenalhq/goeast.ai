import { notFound } from "next/navigation";
import Link from "next/link";
import { getPalaceBySlug, getAllPalaces } from "@/lib/ziwei-data";
import JsonLd from "@/components/JsonLd";
import type { Metadata } from "next";

export async function generateStaticParams() {
  return getAllPalaces().map((p) => ({ palace: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ palace: string }>;
}): Promise<Metadata> {
  const { palace } = await params;
  const p = getPalaceBySlug(palace);
  if (!p) return {};
  return {
    title: `${p.name_en} (${p.name_zh}) — Zi Wei Dou Shu Palace — GoEast.ai`,
    description: `${p.name_en} (${p.name_zh}): ${p.description_en.slice(0, 150)}`,
    alternates: { canonical: `/ziwei/palaces/${palace}` },
    openGraph: {
      title: `${p.name_en} (${p.name_zh})`,
      description: p.description_en.slice(0, 150),
      type: "article",
    },
  };
}

export default async function PalaceDetailPage({
  params,
}: {
  params: Promise<{ palace: string }>;
}) {
  const { palace } = await params;
  const p = getPalaceBySlug(palace);
  if (!p) notFound();

  const allPalaces = getAllPalaces();
  const currentIdx = allPalaces.findIndex((ap) => ap.slug === p.slug);
  const prevPalace = currentIdx > 0 ? allPalaces[currentIdx - 1] : null;
  const nextPalace = currentIdx < allPalaces.length - 1 ? allPalaces[currentIdx + 1] : null;

  return (
    <article>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "DefinedTerm",
          name: `${p.name_en} (${p.name_zh})`,
          description: p.description_en,
          inDefinedTermSet: {
            "@type": "DefinedTermSet",
            name: "Zi Wei Dou Shu Palaces",
            url: "https://www.goeast.ai/ziwei/palaces",
          },
          url: `https://www.goeast.ai/ziwei/palaces/${p.slug}`,
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
            { "@type": "ListItem", position: 4, name: p.name_en, item: `https://www.goeast.ai/ziwei/palaces/${p.slug}` },
          ],
        }}
      />

      {/* Hero */}
      <section className="bg-cream py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm text-warm/60 mb-2">Zi Wei Dou Shu · Palace</p>
          <h1 className="text-3xl md:text-4xl font-bold text-ink mb-2">
            {p.name_en}
          </h1>
          <p className="text-2xl text-ink/70">{p.name_zh}</p>
          <p className="text-sm text-china-red mt-3">{p.life_area_en}</p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <nav className="text-sm text-warm mb-8 flex items-center gap-2">
          <Link href="/" className="hover:text-china-red transition-colors">Home</Link>
          <span>/</span>
          <Link href="/ziwei" className="hover:text-china-red transition-colors">Zi Wei Dou Shu</Link>
          <span>/</span>
          <Link href="/ziwei/palaces" className="hover:text-china-red transition-colors">Palaces</Link>
          <span>/</span>
          <span className="text-ink">{p.name_zh}</span>
        </nav>

        {/* Description */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-ink mb-4">Overview · 概述</h2>
          <p className="text-ink/80 leading-relaxed mb-4">{p.description_en}</p>
          <p className="text-warm/70 text-sm leading-relaxed">{p.description_zh}</p>
        </section>

        {/* Life Area */}
        <section className="mb-10 p-4 bg-cream rounded-lg border border-sand">
          <h3 className="text-lg font-semibold text-ink mb-3">Life Domain · 人生领域</h3>
          <p className="text-ink/80">{p.life_area_en}</p>
          <p className="text-warm/70 text-sm mt-1">{p.life_area_zh}</p>
        </section>

        {/* Key Questions */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-ink mb-4">Key Questions · 关键问题</h2>
          <div className="space-y-3">
            {p.questions_en.map((q, i) => (
              <div key={i} className="p-3 bg-white rounded-lg border border-sand">
                <p className="text-ink/80 text-sm">{q}</p>
                <p className="text-warm/60 text-xs mt-1">{p.questions_zh[i]}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Navigation */}
        <section className="flex justify-between items-center pt-8 border-t border-sand">
          {prevPalace ? (
            <Link
              href={`/ziwei/palaces/${prevPalace.slug}`}
              className="text-sm text-warm hover:text-china-red transition-colors"
            >
              ← {prevPalace.name_zh}
            </Link>
          ) : <div />}
          {nextPalace ? (
            <Link
              href={`/ziwei/palaces/${nextPalace.slug}`}
              className="text-sm text-warm hover:text-china-red transition-colors"
            >
              {nextPalace.name_zh} →
            </Link>
          ) : <div />}
        </section>

        {/* CTA */}
        <section className="mt-12 p-6 bg-gradient-to-br from-cream to-white rounded-xl border border-sand text-center">
          <p className="text-warm mb-3">Discover what stars occupy this palace in your chart</p>
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
