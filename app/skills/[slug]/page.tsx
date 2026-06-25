import { notFound } from "next/navigation";
import Link from "next/link";
import { getSkillWithHtml, getSkillSlugs, getAllSkills } from "@/lib/skills";
import CategoryBadge from "@/components/CategoryBadge";
import JsonLd from "@/components/JsonLd";
import CitationSnippet from "@/components/CitationSnippet";
import { generateCitationSnippet } from "@/lib/citation-snippets";
import FAQ from "@/components/FAQ";
import { generateFAQs, generateFAQJsonLd } from "@/lib/faq-templates";
import RelatedContent from "@/components/RelatedContent";
import { getRelatedContent } from "@/lib/cross-references";
import type { Metadata } from "next";

export async function generateStaticParams() {
  return getSkillSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const allSkills = getAllSkills();
  const meta = allSkills.find((s) => s.slug === slug);
  if (!meta) return {};
  return {
    title: `${meta.title}: AI Tool for ${meta.category} in China | GoEast.ai`,
    description: `Learn how to use ${meta.title} for ${meta.category} tasks in China. Step-by-step guide with installation and usage tips.`,
    alternates: { canonical: `/skills/${slug}` },
    openGraph: {
      title: `${meta.title}: AI Tool for ${meta.category} in China | GoEast.ai`,
      description: `${meta.title} - ${meta.title_zh}. Complete guide for using this AI tool in China.`,
      type: "article",
    },
  };
}

export default async function SkillDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const skill = await getSkillWithHtml(slug);
  if (!skill) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: skill.title,
    alternateName: skill.title_zh,
    applicationCategory: skill.category,
    operatingSystem: "AI Agent",
    featureList: skill.tags.join(", "),
    description: generateCitationSnippet({ type: "skill", data: skill }),
    url: `https://www.goeast.ai/skills/${skill.slug}`,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    publisher: { "@type": "Organization", name: "GoEast.ai", url: "https://www.goeast.ai" },
  };

  return (
    <>
      <JsonLd data={jsonLd} />
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
              name: "Skills",
              item: "https://www.goeast.ai/skills",
            },
            {
              "@type": "ListItem",
              position: 3,
              name: skill.title,
              item: `https://www.goeast.ai/skills/${skill.slug}`,
            },
          ],
        }}
      />
      <article className="max-w-3xl mx-auto px-4 py-12">
        <nav className="text-sm text-warm mb-6 flex items-center gap-2">
          <Link
            href="/"
            className="hover:text-china-red transition-colors"
          >
            Home
          </Link>
          <span>/</span>
          <Link
            href="/skills"
            className="hover:text-china-red transition-colors"
          >
            Skills
          </Link>
          <span>/</span>
          <span className="text-ink">{skill.title}</span>
        </nav>
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <CategoryBadge category={skill.category} size="md" />
            {skill.featured && (
              <span className="text-xs bg-china-red/10 text-china-red px-2 py-0.5 rounded-full">
                Featured
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold text-ink mb-1">{skill.title}</h1>
          <p className="text-lg text-warm">{skill.title_zh}</p>
        </header>
        <CitationSnippet text={generateCitationSnippet({ type: "skill", data: skill })} />
        <div
          className="prose prose-warm max-w-none prose-headings:text-ink prose-headings:font-semibold prose-a:text-china-red prose-a:no-underline hover:prose-a:underline"
          dangerouslySetInnerHTML={{ __html: skill.content }}
        />
        <footer className="mt-12 pt-6 border-t border-sand">
          <div className="flex flex-wrap gap-4 text-sm text-warm">
            <div>
              <span className="font-medium text-ink">Source:</span>{" "}
              <a
                href={skill.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-china-red hover:underline"
              >
                {skill.source}
              </a>
            </div>
            <div>
              <span className="font-medium text-ink">Install:</span>{" "}
              <a
                href={skill.skill_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-china-red hover:underline"
              >
                {skill.skill_url}
              </a>
            </div>
            <div>
              <span className="font-medium text-ink">Updated:</span>{" "}
              {skill.updated_at}
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            {skill.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs bg-cream text-warm px-2.5 py-1 rounded-full border border-sand"
              >
                {tag}
              </span>
            ))}
          </div>
        </footer>
        <RelatedContent
          items={getRelatedContent({
            type: "skill",
            slug: skill.slug,
            category: skill.category,
            tags: skill.tags,
          })}
        />
        {(() => {
          const faqs = generateFAQs({ type: "skill", data: skill });
          return <FAQ items={faqs} jsonLd={generateFAQJsonLd(faqs)} />;
        })()}
      </article>
    </>
  );
}
