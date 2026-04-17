import { notFound } from "next/navigation";
import Link from "next/link";
import { getSkillWithHtml, getSkillSlugs, getAllSkills } from "@/lib/skills";
import { CATEGORIES } from "@/lib/types";
import CategoryBadge from "@/components/CategoryBadge";
import JsonLd from "@/components/JsonLd";
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
    title: `${meta.title} — GoEast.ai`,
    description: `${meta.title} - ${meta.title_zh}. ${meta.tags.join(", ")}`,
    openGraph: {
      title: `${meta.title} — GoEast.ai`,
      description: `${meta.title} - ${meta.title_zh}`,
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
    description: `${skill.title} - ${skill.title_zh}`,
    applicationCategory: skill.category,
    url: `https://goeast.ai/skills/${skill.slug}`,
    operatingSystem: "AI Agent",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  return (
    <>
      <JsonLd data={jsonLd} />
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
      </article>
    </>
  );
}
