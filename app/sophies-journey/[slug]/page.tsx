import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getJourneyWithHtml, getJourneySlugs, getAllJourneys } from "@/lib/journeys";
import { getPhilosopherImage, getPhilosopherIntro } from "@/lib/types";
import JourneyReader from "@/components/JourneyReader";
import PhilosopherIntro from "@/components/PhilosopherIntro";
import JsonLd from "@/components/JsonLd";
import CitationSnippet from "@/components/CitationSnippet";
import { generateCitationSnippet } from "@/lib/citation-snippets";
import FAQ from "@/components/FAQ";
import { generateFAQs, generateFAQJsonLd } from "@/lib/faq-templates";
import RelatedContent from "@/components/RelatedContent";
import { getRelatedContent } from "@/lib/cross-references";
import type { Metadata } from "next";

export async function generateStaticParams() {
  return getJourneySlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const journeys = getAllJourneys();
  const meta = journeys.find((j) => j.slug === slug);
  if (!meta) return {};
  return {
    title: `${meta.title} — ${meta.philosopher} Philosophy | GoEast.ai`,
    description: meta.quote
      ? `"${meta.quote}" — Discover ${meta.philosopher}'s philosophy through Sophie's journey.`
      : `Explore ${meta.philosopher || "Chinese"} philosophy through Sophie's journey. ${meta.title}`,
    alternates: { canonical: `/sophies-journey/${slug}` },
    openGraph: {
      title: `${meta.title} — ${meta.philosopher} Philosophy | GoEast.ai`,
      description: meta.quote || `${meta.title} - Discover ${meta.philosopher || "Chinese"} philosophy`,
      type: "article",
    },
  };
}

export default async function JourneyStoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const journey = await getJourneyWithHtml(slug);
  if (!journey) notFound();

  const allJourneys = getAllJourneys();
  const currentIndex = allJourneys.findIndex((j) => j.slug === slug);
  const prev = currentIndex > 0 ? allJourneys[currentIndex - 1] : null;
  const next = currentIndex < allJourneys.length - 1 ? allJourneys[currentIndex + 1] : null;

  const heroImage = getPhilosopherImage(slug);
  const introText = getPhilosopherIntro(slug);

  return (
    <article>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: journey.title,
          description: journey.quote
            ? `${journey.quote} — ${journey.quote_source}`
            : `${journey.title} - ${journey.title_zh}`,
          url: `https://www.goeast.ai/sophies-journey/${journey.slug}`,
          ...(journey.philosopher && {
            author: {
              "@type": "Person",
              name: journey.philosopher,
            },
          }),
          publisher: {
            "@type": "Organization",
            name: "GoEast.ai",
            url: "https://www.goeast.ai",
            logo: {
              "@type": "ImageObject",
              url: "https://www.goeast.ai/images/logo.png",
            },
          },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Home",
              item: "https://www.goeast.ai",
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Sophie's Journey",
              item: "https://www.goeast.ai/sophies-journey",
            },
            {
              "@type": "ListItem",
              position: 3,
              name: journey.title,
              item: `https://www.goeast.ai/sophies-journey/${journey.slug}`,
            },
          ],
        }}
      />
      {/* Hero: side-by-side layout with portrait */}
      {heroImage && (
        <section className="relative w-full bg-[#faf5ef]">
          <div className="max-w-5xl mx-auto px-4 py-12 md:py-16 flex flex-col md:flex-row items-center gap-8 md:gap-12">
            {/* Text side */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-4">
                <span
                  className="text-xs font-medium px-2.5 py-1 rounded-full text-white"
                  style={{ backgroundColor: journey.color }}
                >
                  {journey.chapter === 0
                    ? "PROLOGUE"
                    : journey.chapter === 11
                    ? "EPILOGUE"
                    : `CHAPTER ${journey.chapter}`}
                </span>
                {journey.school && (
                  <span className="text-xs text-warm tracking-wide uppercase">
                    {journey.school} · {journey.school_zh}
                  </span>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-ink mb-2">
                {journey.title}
              </h1>
              <p className="text-lg text-warm mb-3">{journey.title_zh}</p>
              {(journey.philosopher || journey.era || journey.location) && (
                <p className="text-sm text-warm/70">
                  {journey.philosopher} {journey.philosopher_zh}
                  {journey.era && ` · ${journey.era}`}
                  {" · "}
                  {journey.location}
                </p>
              )}
              {journey.quote && (
                <blockquote
                  className="mt-5 pl-4 border-l-3 text-ink/80 italic text-sm leading-relaxed"
                  style={{ borderColor: journey.color }}
                >
                  &ldquo;{journey.quote}&rdquo;
                  {journey.quote_source && (
                    <span className="block mt-1 text-warm/60 not-italic text-xs">
                      — {journey.quote_source}
                    </span>
                  )}
                </blockquote>
              )}
            </div>

            {/* Portrait side */}
            <div className="flex-shrink-0 w-56 md:w-64 lg:w-72">
              <div className="relative aspect-[2/3] rounded-2xl overflow-hidden shadow-xl ring-1 ring-sand">
                <Image
                  src={heroImage}
                  alt={`${journey.philosopher || "Philosopher"} — ${journey.title}`}
                  fill
                  className="object-cover object-top"
                  priority
                />
                {introText && journey.philosopher && journey.philosopher_zh && (
                  <PhilosopherIntro
                    slug={slug}
                    intro={introText}
                    name={journey.philosopher}
                    nameZh={journey.philosopher_zh}
                    color={journey.color}
                  />
                )}
              </div>
              {journey.philosopher_zh && (
                <p
                  className="text-center mt-3 text-sm font-medium"
                  style={{ color: journey.color }}
                >
                  {journey.philosopher_zh}
                </p>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="max-w-3xl mx-auto px-4">
            <div
              className="h-px"
              style={{ backgroundColor: journey.color, opacity: 0.2 }}
            />
          </div>
        </section>
      )}

      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <nav className="text-sm text-warm mb-6 flex items-center gap-2">
          <Link href="/" className="hover:text-china-red transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href="/sophies-journey" className="hover:text-china-red transition-colors">
            Sophie&apos;s Journey
          </Link>
          <span>/</span>
          <span className="text-ink">{journey.title}</span>
        </nav>

        {/* Header fallback when no hero image (epilogue etc.) */}
        {!heroImage && (
          <header className="mb-10 border-b-2 pb-6" style={{ borderColor: journey.color }}>
            <div className="flex items-center gap-2 mb-3">
              <span
                className="text-xs font-medium px-2.5 py-1 rounded-full text-white"
                style={{ backgroundColor: journey.color }}
              >
                {journey.chapter === 0
                  ? "PROLOGUE"
                  : journey.chapter === 11
                  ? "EPILOGUE"
                  : `CHAPTER ${journey.chapter}`}
              </span>
              {journey.school && (
                <span className="text-xs text-warm tracking-wide uppercase">
                  {journey.school} · {journey.school_zh}
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-ink mb-1">
              {journey.title}
            </h1>
            <p className="text-lg text-warm">{journey.title_zh}</p>
            {(journey.philosopher || journey.era || journey.location) && (
              <p className="text-sm text-warm/70 mt-3">
                {journey.philosopher} {journey.philosopher_zh}
                {journey.era && ` · ${journey.era}`}
                {" · "}
                {journey.location}
              </p>
            )}
          </header>
        )}

        <CitationSnippet text={generateCitationSnippet({ type: "journey", data: journey })} />

        <JourneyReader
          contentHtml={journey.content}
          contentZhHtml={journey.content_zh}
          title={journey.title}
          title_zh={journey.title_zh}
          philosopher={journey.philosopher}
          philosopher_zh={journey.philosopher_zh}
          quote={journey.quote}
          quote_zh={journey.quote_zh}
          quote_source={journey.quote_source}
          color={journey.color}
        />

        <RelatedContent
          items={getRelatedContent({
            type: "journey",
            slug: journey.slug,
            philosopher: journey.philosopher,
            school: journey.school,
          })}
        />
        {(() => {
          const faqs = generateFAQs({ type: "journey", data: journey });
          return <FAQ items={faqs} jsonLd={generateFAQJsonLd(faqs)} />;
        })()}

        <nav className="mt-12 pt-6 border-t border-sand flex justify-between">
          {prev ? (
            <Link
              href={`/sophies-journey/${prev.slug}`}
              className="text-sm text-warm hover:text-china-red transition-colors"
            >
              ← {prev.chapter === 0 ? "Prologue" : `Chapter ${prev.chapter}`}: {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={`/sophies-journey/${next.slug}`}
              className="text-sm font-medium text-china-red hover:text-china-red/80 transition-colors"
            >
              {next.chapter === 11 ? "Epilogue" : `Chapter ${next.chapter}`}: {next.title} →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </div>
    </article>
  );
}
