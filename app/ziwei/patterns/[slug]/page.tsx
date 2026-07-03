import { notFound } from "next/navigation";
import Link from "next/link";
import { getPatternBySlug, getAllPatterns, getPatternsByCategory } from "@/lib/ziwei-patterns";
import JsonLd from "@/components/JsonLd";
import type { Metadata } from "next";

export async function generateStaticParams() {
  return getAllPatterns().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = getPatternBySlug(slug);
  if (!p) return {};
  return {
    title: `${p.name_en} (${p.name_zh}) — Zi Wei Pattern — GoEast.ai`,
    description: `${p.name_zh}: ${p.description_en.slice(0, 150)}`,
    alternates: { canonical: `/ziwei/patterns/${slug}` },
    openGraph: {
      title: `${p.name_zh} · ${p.name_en}`,
      description: p.description_en.slice(0, 150),
      type: "article",
    },
  };
}

const CATEGORY_LABELS: Record<string, { en: string; zh: string }> = {
  superior: { en: "Superior", zh: "上格" },
  middle: { en: "Middle", zh: "中格" },
  support: { en: "Support", zh: "助力格" },
  malefic: { en: "Malefic", zh: "恶格" },
  basic: { en: "Basic", zh: "基础格" },
};

export default async function PatternDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = getPatternBySlug(slug);
  if (!p) notFound();

  const catLabel = CATEGORY_LABELS[p.category] || { en: p.category, zh: p.category };
  const related = getPatternsByCategory(p.category)
    .filter((r) => r.slug !== p.slug)
    .slice(0, 4);

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
            name: "Zi Wei Dou Shu Classical Patterns",
            url: "https://www.goeast.ai/ziwei/patterns",
          },
          url: `https://www.goeast.ai/ziwei/patterns/${p.slug}`,
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://www.goeast.ai" },
            { "@type": "ListItem", position: 2, name: "Zi Wei Dou Shu", item: "https://www.goeast.ai/ziwei" },
            { "@type": "ListItem", position: 3, name: "Patterns", item: "https://www.goeast.ai/ziwei/patterns" },
            { "@type": "ListItem", position: 4, name: p.name_zh, item: `https://www.goeast.ai/ziwei/patterns/${p.slug}` },
          ],
        }}
      />

      {/* Hero */}
      <section className="bg-cream py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm text-warm/60 mb-2">Classical Pattern · 格局</p>
          <h1 className="text-3xl md:text-4xl font-bold text-ink mb-2">
            {p.name_zh}
          </h1>
          <p className="text-lg text-ink/70 mb-3">{p.name_en}</p>
          <span className="inline-block px-4 py-1.5 bg-white rounded-full border border-sand text-sm text-warm capitalize">
            {catLabel.en} · {catLabel.zh}
          </span>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <nav className="text-sm text-warm mb-8 flex items-center gap-2 flex-wrap">
          <Link href="/" className="hover:text-china-red transition-colors">Home</Link>
          <span>/</span>
          <Link href="/ziwei" className="hover:text-china-red transition-colors">Zi Wei Dou Shu</Link>
          <span>/</span>
          <Link href="/ziwei/patterns" className="hover:text-china-red transition-colors">Patterns</Link>
          <span>/</span>
          <span className="text-ink">{p.name_zh}</span>
        </nav>

        {/* Description */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-ink mb-4">Overview · 概述</h2>
          <p className="text-ink/80 leading-relaxed mb-4">{p.description_en}</p>
          <p className="text-warm/70 text-sm leading-relaxed">{p.description_zh}</p>
        </section>

        {/* Conditions */}
        <section className="mb-10 p-5 bg-cream rounded-lg border border-sand">
          <h2 className="text-xl font-bold text-ink mb-3">Formation Conditions · 成格条件</h2>
          <p className="text-sm text-ink/80 leading-relaxed mb-3">{p.conditions_en}</p>
          <p className="text-sm text-warm/70 leading-relaxed">{p.conditions_zh}</p>
        </section>

        {/* Effects */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-ink mb-4">Effects · 效应</h2>
          <p className="text-ink/80 leading-relaxed mb-4">{p.effects_en}</p>
          <p className="text-warm/70 text-sm leading-relaxed">{p.effects_zh}</p>
        </section>

        {/* Famous Examples */}
        <section className="mb-10 p-5 bg-white rounded-lg border border-sand">
          <h2 className="text-xl font-bold text-ink mb-3">Historical Context · 历史人物</h2>
          <p className="text-sm text-ink/80 leading-relaxed mb-3">{p.famous_examples_en}</p>
          <p className="text-sm text-warm/70 leading-relaxed">{p.famous_examples_zh}</p>
        </section>

        {/* Related Patterns */}
        {related.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">
              Related {catLabel.en} Patterns · 相关{catLabel.zh}
            </h2>
            <div className="flex flex-wrap gap-3">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/ziwei/patterns/${r.slug}`}
                  className="px-4 py-2 bg-white rounded-lg border border-sand hover:border-china-red/50 transition-colors text-sm"
                >
                  <span className="font-medium text-ink">{r.name_zh}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="mt-12 p-6 bg-gradient-to-br from-cream to-white rounded-xl border border-sand text-center">
          <p className="text-warm mb-3">Discover the patterns in your own chart</p>
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
