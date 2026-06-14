import { notFound } from "next/navigation";
import Link from "next/link";
import { getInsightWithHtml, getInsightSlugs, getInsightBySlug } from "@/lib/insights";
import { PHILOSOPHER_SLUGS } from "@/lib/types";
import OracleCta from "@/components/OracleCta";
import JsonLd from "@/components/JsonLd";
import type { Metadata } from "next";

export async function generateStaticParams() {
  return getInsightSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const insight = getInsightBySlug(slug);
  if (!insight) return {};
  const philosopher = insight.philosopher_slug ? PHILOSOPHER_SLUGS[insight.philosopher_slug] : null;
  return {
    title: `${insight.title} — GoEast.ai`,
    description: `${philosopher?.name || 'Chinese philosophy'} meets modern life: ${insight.title}. ${insight.title_zh || ''}`,
    alternates: { canonical: `/insights/${slug}`, languages: { en: `/insights/${slug}`, zh: `/insights/${slug}` } },
    openGraph: {
      title: insight.title,
      description: `${philosopher?.name || 'Chinese philosophy'} meets modern life: ${insight.title}`,
      type: "article",
    },
  };
}

export default async function InsightDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const insight = await getInsightWithHtml(slug);
  if (!insight) notFound();

  const philosopher = insight.philosopher_slug ? PHILOSOPHER_SLUGS[insight.philosopher_slug] : null;

  return (
    <article>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: insight.title,
          description: `Explore ${philosopher?.name || 'Chinese philosophy'} in the modern world.`,
          url: `https://www.goeast.ai/insights/${insight.slug}`,
          datePublished: insight.published_at,
          dateModified: insight.published_at,
          author: philosopher ? { "@type": "Person", name: philosopher.name } : undefined,
          publisher: { "@type": "Organization", name: "GoEast.ai", url: "https://www.goeast.ai" },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://www.goeast.ai" },
            { "@type": "ListItem", position: 2, name: "Insights", item: "https://www.goeast.ai/insights" },
            { "@type": "ListItem", position: 3, name: insight.title, item: `https://www.goeast.ai/insights/${insight.slug}` },
          ],
        }}
      />

      {/* Hero */}
      <section className="bg-cream py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          {philosopher && (
            <span className="text-xs text-warm/60 mb-4 block">
              {philosopher.name} · {philosopher.name_zh}
            </span>
          )}
          <h1 className="text-3xl md:text-4xl font-bold text-ink mb-2">{insight.title}</h1>
          {insight.title_zh && (
            <p className="text-lg text-warm">{insight.title_zh}</p>
          )}
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <nav className="text-sm text-warm mb-6 flex items-center gap-2">
          <Link href="/" className="hover:text-china-red transition-colors">Home</Link>
          <span>/</span>
          <Link href="/insights" className="hover:text-china-red transition-colors">Insights</Link>
          <span>/</span>
          <span className="text-ink">{insight.title}</span>
        </nav>

        {/* Content */}
        <div className="prose prose-warm max-w-none mb-10" dangerouslySetInnerHTML={{ __html: insight.content }} />

        {/* Philosopher link */}
        {philosopher && (
          <section className="mb-10 p-4 bg-cream rounded-lg border border-sand">
            <p className="text-sm text-warm/70 mb-3">
              This article draws on the philosophy of {philosopher.name}.
            </p>
            <Link
              href={`/philosophers/${philosopher.slug}`}
              className="inline-block px-4 py-2 rounded-full text-white font-medium text-sm hover:opacity-90 transition-opacity bg-ink"
            >
              Read about {philosopher.name} →
            </Link>
          </section>
        )}

        {/* Related concepts */}
        {insight.concept_slugs && insight.concept_slugs.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-ink mb-3">Key Concepts</h2>
            <div className="flex flex-wrap gap-3">
              {insight.concept_slugs.map((slug) => (
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

        {/* Oracle CTA */}
        <OracleCta
          philosopherSlug={insight.philosopher_slug}
          philosopherName={philosopher?.name}
          philosopherNameZh={philosopher?.name_zh}
          schoolId={philosopher?.school}
        />
      </div>
    </article>
  );
}
