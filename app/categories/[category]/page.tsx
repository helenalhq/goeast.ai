import { notFound } from "next/navigation";
import { CATEGORIES, Category } from "@/lib/types";
import { getSkillsByCategory } from "@/lib/skills";
import SkillCard from "@/components/SkillCard";
import JsonLd from "@/components/JsonLd";
import type { Metadata } from "next";

export function generateStaticParams() {
  return CATEGORIES.map((cat) => ({ category: cat.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const catInfo = CATEGORIES.find((c) => c.id === category);
  if (!catInfo) return {};
  const skills = getSkillsByCategory(category as Category);
  return {
    title: `${catInfo.name} Skills — GoEast.ai`,
    description: `Curated AI skills for ${catInfo.name.toLowerCase()} in China`,
    alternates: { canonical: `/categories/${category}` },
    openGraph: {
      title: `${catInfo.name} Skills — GoEast.ai`,
      description: `Curated AI skills for ${catInfo.name.toLowerCase()} in China. ${skills.length} tools available.`,
      type: "website",
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const catInfo = CATEGORIES.find((c) => c.id === category);
  if (!catInfo) notFound();

  const skills = getSkillsByCategory(category as Category);

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${catInfo.name} Skills`,
          description: `Curated AI skills for ${catInfo.name.toLowerCase()} in China`,
          url: `https://www.goeast.ai/categories/${category}`,
          partOf: { "@type": "WebSite", name: "GoEast.ai", url: "https://www.goeast.ai" },
          numberOfItems: skills.length,
          itemListElement: skills.map((skill, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: skill.title,
            url: `https://www.goeast.ai/skills/${skill.slug}`,
          })),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://www.goeast.ai" },
            { "@type": "ListItem", position: 2, name: "Skills", item: "https://www.goeast.ai/skills" },
            { "@type": "ListItem", position: 3, name: catInfo.name, item: `https://www.goeast.ai/categories/${category}` },
          ],
        }}
      />
      <div className="mb-8">
        <div className="text-4xl mb-2">{catInfo.icon}</div>
        <h1 className="text-3xl font-bold text-ink">{catInfo.name}</h1>
        <p className="text-warm">{catInfo.name_zh}</p>
        <p className="text-sm text-warm/60 mt-2">
          {skills.length} skill{skills.length !== 1 ? "s" : ""} in this
          category
        </p>
      </div>
      {skills.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills.map((skill) => (
            <SkillCard key={skill.slug} skill={skill} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-warm">
          No skills in this category yet.
        </div>
      )}
    </div>
  );
}
