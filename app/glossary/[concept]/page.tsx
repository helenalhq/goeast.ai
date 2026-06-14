import { notFound } from "next/navigation";
import Link from "next/link";
import { getGlossaryWithHtml, getGlossarySlugs, getGlossaryBySlug } from "@/lib/glossary";
import { SCHOOLS, PHILOSOPHER_SLUGS } from "@/lib/types";
import OracleCta from "@/components/OracleCta";
import JsonLd from "@/components/JsonLd";
import type { Metadata } from "next";

export async function generateStaticParams() {
  return getGlossarySlugs().map((slug) => ({ concept: slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ concept: string }>;
}): Promise<Metadata> {
  const { concept } = await params;
  const entry = getGlossaryBySlug(concept);
  if (!entry) return {};
  const defSnippet = entry.definition.slice(0, 150).replace(/\n/g, ' ').trim();
  return {
    title: `${entry.name} (${entry.name_zh}) — Chinese Philosophy Glossary — GoEast.ai`,
    description: `${entry.name} (${entry.name_zh}): ${defSnippet}...`,
    alternates: { canonical: `/glossary/${concept}`, languages: { en: `/glossary/${concept}`, zh: `/glossary/${concept}` } },
    openGraph: {
      title: `${entry.name} (${entry.name_zh}) — GoEast.ai`,
      description: `${entry.name}: ${defSnippet}...`,
      type: "article",
    },
  };
}

export default async function GlossaryDetailPage({
  params,
}: {
  params: Promise<{ concept: string }>;
}) {
  const { concept } = await params;
  const entry = await getGlossaryWithHtml(concept);
  if (!entry) notFound();

  const school = SCHOOLS.find((s) => s.id === entry.school);
  const relatedPhilosophers = Object.entries(PHILOSOPHER_SLUGS)
    .filter(([_, meta]) => meta.school === entry.school)
    .slice(0, 4);

  return (
    <article>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "DefinedTerm",
          name: entry.name,
          alternateName: entry.name_zh,
          description: `Explore the concept of ${entry.name} (${entry.name_zh}) in Chinese philosophy.`,
          url: `https://www.goeast.ai/glossary/${entry.slug}`,
          inDefinedTermSet: {
            "@type": "DefinedTermSet",
            name: "Chinese Philosophy Glossary",
            url: "https://www.goeast.ai/glossary",
          },
          publisher: { "@type": "Organization", name: "GoEast.ai", url: "https://www.goeast.ai" },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://www.goeast.ai" },
            { "@type": "ListItem", position: 2, name: "Glossary", item: "https://www.goeast.ai/glossary" },
            { "@type": "ListItem", position: 3, name: entry.name, item: `https://www.goeast.ai/glossary/${entry.slug}` },
          ],
        }}
      />

      {/* Hero */}
      <section className="bg-cream py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          {school && (
            <span
              className="text-xs font-medium px-2.5 py-1 rounded-full text-white mb-4 inline-block"
              style={{ backgroundColor: school.color }}
            >
              {school.symbol} {school.name}
            </span>
          )}
          <h1 className="text-3xl md:text-4xl font-bold text-ink mb-2">{entry.name}</h1>
          <p className="text-lg text-warm">{entry.name_zh}</p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <nav className="text-sm text-warm mb-6 flex items-center gap-2">
          <Link href="/" className="hover:text-china-red transition-colors">Home</Link>
          <span>/</span>
          <Link href="/glossary" className="hover:text-china-red transition-colors">Glossary</Link>
          <span>/</span>
          <span className="text-ink">{entry.name}</span>
        </nav>

        {/* Definition */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-ink mb-4">Definition</h2>
          <div className="prose prose-warm max-w-none" dangerouslySetInnerHTML={{ __html: entry.definition }} />
          {entry.definition_zh && (
            <div className="mt-4 border-t border-sand pt-4">
              <p className="text-sm text-warm/60 font-medium mb-2">中文释义</p>
              <div className="prose prose-warm max-w-none" dangerouslySetInnerHTML={{ __html: entry.definition_zh }} />
            </div>
          )}
        </section>

        {/* Modern Application */}
        {entry.modern_application && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">Modern Application</h2>
            <div className="prose prose-warm max-w-none" dangerouslySetInnerHTML={{ __html: entry.modern_application }} />
            {entry.modern_application_zh && (
              <p className="mt-3 text-warm/60 text-sm">{entry.modern_application_zh}</p>
            )}
          </section>
        )}

        {/* Related Concepts */}
        {entry.related_concepts.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">Related Concepts</h2>
            <div className="flex flex-wrap gap-3">
              {entry.related_concepts.map((slug) => (
                <Link
                  key={slug}
                  href={`/glossary/${slug}`}
                  className="px-3 py-1.5 rounded-full bg-cream border border-sand text-sm text-ink hover:border-warm/40 hover:text-china-red transition-colors"
                >
                  {slug.charAt(0).toUpperCase() + slug.slice(1)}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Related Philosophers */}
        {relatedPhilosophers.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink mb-4">Philosophers · 哲学家</h2>
            <div className="flex flex-wrap gap-3">
              {relatedPhilosophers.map(([slug, meta]) => (
                <Link
                  key={slug}
                  href={`/philosophers/${slug}`}
                  className="px-3 py-1.5 rounded-full bg-cream border border-sand text-sm text-ink hover:border-china-red hover:text-china-red transition-colors"
                >
                  {meta.name} ({meta.name_zh})
                </Link>
              ))}
            </div>
            <p className="text-sm text-warm mt-3">
              Explore thinkers from the {school?.name || "same"} tradition →
            </p>
          </section>
        )}

        {/* Oracle CTA */}
        <OracleCta message={`Want to explore ${entry.name} deeper with a philosopher? Try the Oracle.`} />
      </div>
    </article>
  );
}
