import { getAllSkills } from "@/lib/skills";
import SkillList from "@/components/SkillList";
import JsonLd from "@/components/JsonLd";
import CitationSnippet from "@/components/CitationSnippet";
import FAQ from "@/components/FAQ";
import { generateFAQs, generateFAQJsonLd } from "@/lib/faq-templates";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Top AI Apps for China: Translation, Travel, Shopping | GoEast.ai",
  description:
    "Browse curated AI skills for foreigners in China. Find the best tools for translation, navigation, shopping, medical, and more. 浏览精选的面向外国人的 AI 技能",
  alternates: { canonical: "/skills" },
};

export default function SkillsPage() {
  const skills = getAllSkills();
  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "All AI Skills — GoEast.ai",
          description: "Browse all curated AI skills for foreigners in China",
          url: "https://www.goeast.ai/skills",
        }}
      />
      <h1 className="text-3xl font-bold text-ink mb-2">All Skills</h1>
      <p className="text-warm mb-8">
        Browse curated AI skills for foreigners in China
        <br />
        <span className="text-sm">浏览精选的面向外国人的 AI 技能</span>
      </p>
      <div className="max-w-3xl mx-auto mt-6">
        <CitationSnippet text="Browse 19+ curated AI skills for foreigners in China, organized by category: Travel, Medical, Shopping, and Accommodation. Each skill helps AI assistants provide specialized knowledge about navigating life in China." />
      </div>
      <SkillList skills={skills} />

      {/* FAQ */}
      {(() => {
        const faqs = generateFAQs({ type: "skills_listing" });
        return (
          <section className="max-w-3xl mx-auto px-4 pb-16">
            <FAQ items={faqs} jsonLd={generateFAQJsonLd(faqs)} />
          </section>
        );
      })()}
    </div>
  );
}
