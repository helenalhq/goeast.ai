import { notFound } from "next/navigation";
import Link from "next/link";
import { getCombinationBySlug, getAllCombinations } from "@/lib/ziwei-combinations";
import JsonLd from "@/components/JsonLd";
import type { Metadata } from "next";

export async function generateStaticParams() {
  return getAllCombinations().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = getCombinationBySlug(slug);
  if (!c) return {};
  return {
    title: `${c.star1_en} + ${c.star2_en} (${c.star1_zh}${c.star2_zh}) — Dual Star Combination — GoEast.ai`,
    description: `${c.star1_zh}${c.star2_zh} dual star combination: ${c.description_en.slice(0, 150)}`,
    alternates: { canonical: `/ziwei/combinations/${slug}` },
    openGraph: {
      title: `${c.star1_zh}${c.star2_zh} · ${c.star1_en} + ${c.star2_en}`,
      description: c.description_en.slice(0, 150),
      type: "article",
    },
  };
}

export default async function CombinationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = getCombinationBySlug(slug);
  if (!c) notFound();

  const all = getAllCombinations();
  const related = all
    .filter((r) => r.slug !== c.slug && (r.star1_zh === c.star1_zh || r.star2_zh === c.star2_zh))
    .slice(0, 4);

  return (
    <article>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "DefinedTerm",
          name: `${c.star1_en} + ${c.star2_en} (${c.star1_zh}${c.star2_zh})`,
          description: c.description_en,
          inDefinedTermSet: {
            "@type": "DefinedTermSet",
            name: "Zi Wei Dou Shu Dual Star Combinations",
            url: "https://www.goeast.ai/ziwei/combinations",
          },
          url: `https://www.goeast.ai/ziwei/combinations/${c.slug}`,
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://www.goeast.ai" },
            { "@type": "ListItem", position: 2, name: "Zi Wei Dou Shu", item: "https://www.goeast.ai/ziwei" },
            { "@type": "ListItem", position: 3, name: "Dual Stars", item: "https://www.goeast.ai/ziwei/combinations" },
            { "@type": "ListItem", position: 4, name: `${c.star1_zh}${c.star2_zh}`, item: `https://www.goeast.ai/ziwei/combinations/${c.slug}` },
          ],
        }}
      />

      {/* Hero */}
      <section className="bg-cream py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm text-warm/60 mb-2">Dual Star Combination · 双星同宫</p>
          <h1 className="text-3xl md:text-4xl font-bold text-ink mb-2">
            {c.star1_zh}{c.star2_zh}
          </h1>
          <p className="text-lg text-ink/70 mb-3">
            {c.star1_en} + {c.star2_en}
          </p>
          <span className="inline-block px-4 py-1.5 bg-white rounded-full border border-sand text-sm text-warm">
            {c.nature_en} · {c.nature_zh}
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
          <Link href="/ziwei/combinations" className="hover:text-china-red transition-colors">Dual Stars</Link>
          <span>/</span>
          <span className="text-ink">{c.star1_zh}{c.star2_zh}</span>
        </nav>

        {/* Description */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-ink mb-4">Overview · 概述</h2>
          <p className="text-ink/80 leading-relaxed mb-4">{c.description_en}</p>
          <p className="text-warm/70 text-sm leading-relaxed">{c.description_zh}</p>
        </section>

        {/* Strengths */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-ink mb-4">Strengths · 优势</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <ul className="space-y-2">
              {c.strengths_en.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-ink/80">
                  <span className="text-china-red mt-0.5">✦</span>
                  {s}
                </li>
              ))}
            </ul>
            <ul className="space-y-2">
              {c.strengths_zh.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-warm/70">
                  <span className="text-china-red/50 mt-0.5">✦</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Challenges */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-ink mb-4">Challenges · 挑战</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <ul className="space-y-2">
              {c.challenges_en.map((ch, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-ink/80">
                  <span className="text-warm mt-0.5">◆</span>
                  {ch}
                </li>
              ))}
            </ul>
            <ul className="space-y-2">
              {c.challenges_zh.map((ch, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-warm/70">
                  <span className="text-warm/50 mt-0.5">◆</span>
                  {ch}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Palace Effects */}
        <section className="mb-10 p-5 bg-cream rounded-lg border border-sand">
          <h2 className="text-xl font-bold text-ink mb-3">Palace Effects · 宫位影响</h2>
          <p className="text-sm text-ink/80 leading-relaxed mb-3">{c.palace_effects_en}</p>
          <p className="text-sm text-warm/70 leading-relaxed">{c.palace_effects_zh}</p>
        </section>

        {/* Related Combinations */}
        {related.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">Related Combinations · 相关组合</h2>
            <div className="flex flex-wrap gap-3">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/ziwei/combinations/${r.slug}`}
                  className="px-4 py-2 bg-white rounded-lg border border-sand hover:border-china-red/50 transition-colors text-sm"
                >
                  <span className="font-medium text-ink">{r.star1_zh}{r.star2_zh}</span>
                  <span className="text-warm ml-2">{r.star1_en} + {r.star2_en}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="mt-12 p-6 bg-gradient-to-br from-cream to-white rounded-xl border border-sand text-center">
          <p className="text-warm mb-3">See where these stars appear in your chart</p>
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
