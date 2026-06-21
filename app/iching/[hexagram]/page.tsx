import { notFound } from "next/navigation";
import Link from "next/link";
import { getHexagramBySlug, getAllHexagrams } from "@/lib/iching-data";
import { TRIGRAMS } from "@/lib/types";
import OracleCta from "@/components/OracleCta";
import JsonLd from "@/components/JsonLd";
import CitationSnippet from "@/components/CitationSnippet";
import { generateCitationSnippet } from "@/lib/citation-snippets";
import FAQ from "@/components/FAQ";
import { generateFAQs, generateFAQJsonLd } from "@/lib/faq-templates";
import RelatedContent from "@/components/RelatedContent";
import { getRelatedContent } from "@/lib/cross-references";
import type { Metadata } from "next";

export async function generateStaticParams() {
  return getAllHexagrams().map((h) => ({ hexagram: h.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ hexagram: string }>;
}): Promise<Metadata> {
  const { hexagram } = await params;
  const h = getHexagramBySlug(hexagram);
  if (!h) return {};
  return {
    title: `Hexagram ${h.number}: ${h.name} (${h.name_zh}) — I Ching — GoEast.ai`,
    description: `Hexagram ${h.number}: ${h.name} (${h.name_zh}) — ${h.judgment_en.slice(0, 120)}`,
    alternates: { canonical: `/iching/${hexagram}` },
    openGraph: {
      title: `Hexagram ${h.number}: ${h.name} (${h.name_zh})`,
      description: `Hexagram ${h.number}: ${h.name} — ${h.judgment_en.slice(0, 120)}`,
      type: "article",
    },
  };
}

export default async function HexagramDetailPage({
  params,
}: {
  params: Promise<{ hexagram: string }>;
}) {
  const { hexagram } = await params;
  const h = getHexagramBySlug(hexagram);
  if (!h) notFound();

  const upperTrigram = TRIGRAMS.find((t) => t.name === h.upper_trigram);
  const lowerTrigram = TRIGRAMS.find((t) => t.name === h.lower_trigram);

  // Render hexagram lines from binary
  const lines = h.binary.split("").map((bit, i) => ({
    position: i + 1,
    isYang: bit === "1",
  }));

  return (
    <article>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CreativeWork",
          name: `${h.name} (${h.name_zh})`,
          alternateName: `Hexagram ${h.number}`,
          text: h.judgment_en,
          about: [
            { "@type": "Thing", name: h.upper_trigram },
            { "@type": "Thing", name: h.lower_trigram },
          ],
          description: generateCitationSnippet({ type: "hexagram", data: h }),
          url: `https://www.goeast.ai/iching/${h.slug}`,
          publisher: { "@type": "Organization", name: "GoEast.ai", url: "https://www.goeast.ai" },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://www.goeast.ai" },
            { "@type": "ListItem", position: 2, name: "I Ching", item: "https://www.goeast.ai/iching" },
            { "@type": "ListItem", position: 3, name: `${h.name} (${h.name_zh})`, item: `https://www.goeast.ai/iching/${h.slug}` },
          ],
        }}
      />

      {/* Hero */}
      <section className="bg-cream py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm text-warm/50 mb-2">Hexagram #{h.number}</p>
          <h1 className="text-3xl md:text-4xl font-bold text-ink mb-2">
            {h.name} · {h.name_zh}
          </h1>
          <p className="text-sm text-warm">
            {upperTrigram?.name_zh || h.upper_trigram} above · {lowerTrigram?.name_zh || h.lower_trigram} below
          </p>
          {/* Hexagram visual */}
          <div className="font-mono text-2xl my-6 space-y-1">
            {lines.reverse().map((line) => (
              <div key={line.position} className="text-ink">
                {line.isYang ? "━━━━━" : "━ ━ ━"}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <nav className="text-sm text-warm mb-6 flex items-center gap-2">
          <Link href="/" className="hover:text-china-red transition-colors">Home</Link>
          <span>/</span>
          <Link href="/iching" className="hover:text-china-red transition-colors">I Ching</Link>
          <span>/</span>
          <span className="text-ink">{h.name}</span>
        </nav>

        <CitationSnippet text={generateCitationSnippet({ type: "hexagram", data: h })} />

        {/* Judgment */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-ink mb-4">Judgment (卦辞)</h2>
          <blockquote className="pl-4 border-l-3 border-china-red text-ink/80 italic leading-relaxed">
            {h.judgment_en}
          </blockquote>
          <p className="mt-3 text-warm/60 text-sm">{h.judgment_zh}</p>
        </section>

        {/* Image */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-ink mb-4">Image (象辞)</h2>
          <p className="text-ink/80 leading-relaxed">{h.image_en}</p>
          <p className="mt-2 text-warm/60 text-sm">{h.image_zh}</p>
        </section>

        {/* Trigram breakdown */}
        <section className="mb-10 p-4 bg-cream rounded-lg border border-sand">
          <h3 className="text-lg font-semibold text-ink mb-3">Trigram Composition</h3>
          <div className="flex gap-8">
            {upperTrigram && (
              <div>
                <p className="text-sm font-medium text-ink">Upper: {upperTrigram.symbol} {upperTrigram.name} ({upperTrigram.name_zh})</p>
                <p className="text-xs text-warm">{upperTrigram.nature} · {upperTrigram.attribute}</p>
              </div>
            )}
            {lowerTrigram && (
              <div>
                <p className="text-sm font-medium text-ink">Lower: {lowerTrigram.symbol} {lowerTrigram.name} ({lowerTrigram.name_zh})</p>
                <p className="text-xs text-warm">{lowerTrigram.nature} · {lowerTrigram.attribute}</p>
              </div>
            )}
          </div>
        </section>

        {/* Modern Application */}
        {h.modern_application && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">Modern Application</h2>
            <p className="text-ink/80 leading-relaxed">{h.modern_application}</p>
            {h.modern_application_zh && (
              <p className="mt-2 text-warm/60 text-sm">{h.modern_application_zh}</p>
            )}
          </section>
        )}

        {/* Related Philosophical Concepts */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-ink mb-4">Related Concepts · 相关概念</h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/glossary/yin-yang" className="px-3 py-1.5 rounded-full bg-cream border border-sand text-sm text-ink hover:border-china-red hover:text-china-red transition-colors">
              Yin-Yang (阴阳)
            </Link>
            <Link href="/glossary/tian" className="px-3 py-1.5 rounded-full bg-cream border border-sand text-sm text-ink hover:border-china-red hover:text-china-red transition-colors">
              Tian (天)
            </Link>
            <Link href="/glossary/dao" className="px-3 py-1.5 rounded-full bg-cream border border-sand text-sm text-ink hover:border-china-red hover:text-china-red transition-colors">
              Dao (道)
            </Link>
            <Link href="/glossary/de" className="px-3 py-1.5 rounded-full bg-cream border border-sand text-sm text-ink hover:border-china-red hover:text-china-red transition-colors">
              De (德)
            </Link>
          </div>
          <p className="text-sm text-warm mt-3">
            <Link href="/glossary" className="hover:text-china-red transition-colors">Explore all Chinese philosophy concepts →</Link>
          </p>
        </section>

        {/* Related Content */}
        <RelatedContent
          items={getRelatedContent({
            type: "hexagram",
            slug: h.slug,
            upperTrigram: h.upper_trigram,
            lowerTrigram: h.lower_trigram,
          })}
        />
        {(() => {
          const faqs = generateFAQs({ type: "hexagram", data: h });
          return <FAQ items={faqs} jsonLd={generateFAQJsonLd(faqs)} />;
        })()}

        {/* Oracle CTA */}
        <OracleCta
          philosopherSlug="zhou-gong"
          philosopherName="Zhou Gong"
          philosopherNameZh="周公"
          schoolId="ancient"
          message="Want Zhou Gong to interpret this hexagram for your personal situation? Try the Oracle."
        />
      </div>
    </article>
  );
}
