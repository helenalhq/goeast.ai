import { notFound } from "next/navigation";
import Link from "next/link";
import { getJourneyWithHtml, getJourneySlugs, getAllJourneys } from "@/lib/journeys";
import JourneyReader from "@/components/JourneyReader";
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
    title: `${meta.title} — Sophie's Journey — GoEast.ai`,
    description: meta.quote
      ? `${meta.quote} — ${meta.quote_source}`
      : `${meta.title} - ${meta.title_zh}`,
    openGraph: {
      title: `${meta.title} — Sophie's Journey`,
      description: meta.quote || `${meta.title} - ${meta.title_zh}`,
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

  return (
    <article className="max-w-3xl mx-auto px-4 py-12">
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

      <JourneyReader
        contentHtml={journey.content}
        title={journey.title}
        title_zh={journey.title_zh}
        quote={journey.quote}
        quote_zh={journey.quote_zh}
        quote_source={journey.quote_source}
        color={journey.color}
      />

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
    </article>
  );
}
