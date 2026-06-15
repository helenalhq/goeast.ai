import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getPhilosopherWithHtml, getPhilosopherSlugs } from "@/lib/philosophers";
import { SCHOOLS, getPhilosopherImage, PHILOSOPHER_SLUGS } from "@/lib/types";
import { getAllGlossary } from "@/lib/glossary";
import OracleCta from "@/components/OracleCta";
import JsonLd from "@/components/JsonLd";
import type { Metadata } from "next";

export async function generateStaticParams() {
  return getPhilosopherSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const meta = PHILOSOPHER_SLUGS[slug];
  if (!meta) return {};
  return {
    title: `${meta.name} (${meta.name_zh}) — Chinese Philosopher — GoEast.ai`,
    description: `Explore ${meta.name}'s philosophy: core concepts, quotes, and modern influence. ${meta.era}.`,
    alternates: { canonical: `/philosophers/${slug}` },
    openGraph: {
      title: `${meta.name} (${meta.name_zh}) — GoEast.ai`,
      description: `Explore ${meta.name}'s philosophy: core concepts, quotes, and modern influence.`,
      type: "article",
    },
  };
}

export default async function PhilosopherDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const philosopher = await getPhilosopherWithHtml(slug);
  if (!philosopher) notFound();

  const school = SCHOOLS.find((s) => s.id === philosopher.school);
  const portrait = philosopher.portrait_slug ? getPhilosopherImage(philosopher.portrait_slug) : null;
  const relatedConcepts = getAllGlossary().filter((c) => c.school === philosopher.school).slice(0, 8);

  return (
    <article>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: `${philosopher.name} (${philosopher.name_zh})`,
          description: `Explore ${philosopher.name}'s philosophy: core concepts, quotes, and modern influence.`,
          url: `https://www.goeast.ai/philosophers/${philosopher.slug}`,
          datePublished: "2026-06-13",
          dateModified: "2026-06-13",
          about: { "@type": "Person", name: philosopher.name, alternateName: philosopher.name_zh },
          publisher: { "@type": "Organization", name: "GoEast.ai", url: "https://www.goeast.ai" },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://www.goeast.ai" },
            { "@type": "ListItem", position: 2, name: "Philosophers", item: "https://www.goeast.ai/philosophers" },
            { "@type": "ListItem", position: 3, name: philosopher.name, item: `https://www.goeast.ai/philosophers/${philosopher.slug}` },
          ],
        }}
      />

      {/* Hero */}
      <section className="relative w-full bg-cream">
        <div className="max-w-5xl mx-auto px-4 py-12 md:py-16 flex flex-col md:flex-row items-center gap-8 md:gap-12">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-4">
              <span
                className="text-xs font-medium px-2.5 py-1 rounded-full text-white"
                style={{ backgroundColor: school?.color || "#8b7355" }}
              >
                {school?.symbol} {school?.name}
              </span>
              <span className="text-xs text-warm">{philosopher.era}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-ink mb-2">{philosopher.name}</h1>
            <p className="text-lg text-warm mb-1">{philosopher.name_zh}</p>
            {philosopher.location && (
              <p className="text-sm text-warm/70">{philosopher.location} {philosopher.location_zh && `· ${philosopher.location_zh}`}</p>
            )}
          </div>
          {portrait && (
            <div className="flex-shrink-0 w-56 md:w-64">
              <div className="relative aspect-[2/3] rounded-2xl overflow-hidden shadow-xl ring-1 ring-sand">
                <Image
                  src={portrait}
                  alt={`${philosopher.name} — ${philosopher.name_zh}`}
                  fill
                  className="object-cover object-top"
                  priority
                />
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <nav className="text-sm text-warm mb-6 flex items-center gap-2">
          <Link href="/" className="hover:text-china-red transition-colors">Home</Link>
          <span>/</span>
          <Link href="/philosophers" className="hover:text-china-red transition-colors">Philosophers</Link>
          <span>/</span>
          <span className="text-ink">{philosopher.name}</span>
        </nav>

        {/* Biography */}
        {philosopher.biography && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">Biography</h2>
            <div className="prose prose-warm max-w-none" dangerouslySetInnerHTML={{ __html: philosopher.biography }} />
          </section>
        )}

        {/* Core Concepts */}
        {philosopher.core_concepts.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">Core Concepts</h2>
            <div className="space-y-6">
              {philosopher.core_concepts.map((concept, i) => (
                <div key={i} className="p-4 bg-cream rounded-lg border border-sand">
                  <h3 className="text-lg font-semibold text-ink mb-1">
                    {concept.name} <span className="text-warm text-base">({concept.name_zh})</span>
                  </h3>
                  <p className="text-sm text-ink/80 leading-relaxed">{concept.description}</p>
                  {concept.description_zh && (
                    <p className="text-sm text-warm/60 leading-relaxed mt-2 border-t border-sand/50 pt-2">
                      {concept.description_zh}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Quotes */}
        {philosopher.quotes.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">Notable Quotes</h2>
            <div className="space-y-4">
              {philosopher.quotes.map((q, i) => (
                <blockquote
                  key={i}
                  className="pl-4 border-l-3 text-ink/80 italic"
                  style={{ borderColor: school?.color || "#8b7355" }}
                >
                  <p className="leading-relaxed">&ldquo;{q.text}&rdquo;</p>
                  {q.text_zh && (
                    <p className="text-warm/60 mt-1 not-italic text-sm">{q.text_zh}</p>
                  )}
                  <footer className="mt-1 text-xs text-warm/50 not-italic">
                    — {q.source} {q.source_zh && `(${q.source_zh})`}
                  </footer>
                  {q.interpretation && (
                    <p className="mt-2 not-italic text-sm text-ink/70 border-t border-sand/30 pt-2">
                      {q.interpretation}
                    </p>
                  )}
                </blockquote>
              ))}
            </div>
          </section>
        )}

        {/* Modern Influence */}
        {philosopher.modern_influence && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">Modern Influence</h2>
            <div className="prose prose-warm max-w-none" dangerouslySetInnerHTML={{ __html: philosopher.modern_influence }} />
          </section>
        )}

        {/* Journey Link */}
        {philosopher.journey_slug && (
          <section className="mb-10 p-4 bg-cream rounded-lg border border-sand">
            <h3 className="text-lg font-semibold text-ink mb-2">Read the Story</h3>
            <p className="text-sm text-warm/70 mb-3">
              Experience {philosopher.name}'s philosophy through Sophie's narrative journey.
            </p>
            <Link
              href={`/sophies-journey/${philosopher.journey_slug}`}
              className="inline-block px-4 py-2 rounded-full text-white font-medium text-sm hover:opacity-90 transition-opacity"
              style={{ backgroundColor: school?.color || "#8b7355" }}
            >
              Read Chapter →
            </Link>
          </section>
        )}

        {/* Related Glossary Concepts */}
        {relatedConcepts.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">Key Concepts · 核心概念</h2>
            <div className="flex flex-wrap gap-3">
              {relatedConcepts.map((c) => (
                <Link
                  key={c.slug}
                  href={`/glossary/${c.slug}`}
                  className="px-3 py-1.5 rounded-full bg-cream border border-sand text-sm text-ink hover:border-china-red hover:text-china-red transition-colors"
                >
                  {c.name} ({c.name_zh})
                </Link>
              ))}
            </div>
            <p className="text-sm text-warm mt-3">
              Explore these {school?.name || "philosophical"} concepts in our glossary →
            </p>
          </section>
        )}

        {/* Oracle CTA */}
        <OracleCta
          philosopherSlug={philosopher.slug}
          philosopherName={philosopher.name}
          philosopherNameZh={philosopher.name_zh}
          schoolId={philosopher.school}
        />
      </div>
    </article>
  );
}
