import { getAllGlossary } from "@/lib/glossary";
import { SCHOOLS } from "@/lib/types";
import Link from "next/link";
import OracleCta from "@/components/OracleCta";
import JsonLd from "@/components/JsonLd";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chinese Philosophy Glossary — GoEast.ai",
  description: "Key concepts in Chinese philosophy explained: Dao, Wuwei, Ren, Yin-Yang, Qi, and more. Bilingual definitions with modern applications.",
  alternates: { canonical: "/glossary", languages: { en: "/glossary", zh: "/glossary" } },
  openGraph: {
    title: "Chinese Philosophy Glossary — GoEast.ai",
    description: "Key concepts in Chinese philosophy: Dao, Wuwei, Ren, Qi, and 20 more terms explained in depth.",
    type: "website",
  },
};

export default function GlossaryPage() {
  const concepts = getAllGlossary();

  return (
    <main>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Chinese Philosophy Glossary",
          description: "Key concepts in Chinese philosophy with bilingual definitions and modern applications.",
          url: "https://www.goeast.ai/glossary",
          partOf: { "@type": "WebSite", name: "GoEast.ai", url: "https://www.goeast.ai" },
        }}
      />

      {/* Hero */}
      <section className="bg-cream py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-ink mb-3">
            Chinese Philosophy Glossary
          </h1>
          <p className="text-xl text-warm">中国哲学词汇表</p>
          <p className="text-base text-warm/70 mt-4 max-w-2xl mx-auto">
            Essential concepts from 3,000 years of Chinese thought — explained in depth with modern applications.
          </p>
        </div>
      </section>

      {/* School sections */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        {SCHOOLS.map((school) => {
          const schoolConcepts = concepts.filter((c) => c.school === school.id);
          if (schoolConcepts.length === 0) return null;
          return (
            <div key={school.id} className="mb-12">
              <h2 className="text-2xl font-bold text-ink mb-1">
                <span style={{ color: school.color }}>{school.symbol}</span> {school.name}
              </h2>
              <p className="text-sm text-warm mb-6">{school.name_zh}</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {schoolConcepts.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/glossary/${c.slug}`}
                    className="p-4 bg-white rounded-lg border border-sand hover:border-warm/40 transition-colors group"
                  >
                    <h3 className="text-lg font-semibold text-ink group-hover:text-china-red transition-colors">
                      {c.name}
                    </h3>
                    <p className="text-sm text-warm">{c.name_zh}</p>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
        {/* "Various" concepts */}
        {(() => {
          const variousConcepts = concepts.filter((c) => c.school === "various");
          if (variousConcepts.length === 0) return null;
          return (
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-ink mb-1">Cross-School Concepts</h2>
              <p className="text-sm text-warm mb-6">跨学派概念</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {variousConcepts.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/glossary/${c.slug}`}
                    className="p-4 bg-white rounded-lg border border-sand hover:border-warm/40 transition-colors group"
                  >
                    <h3 className="text-lg font-semibold text-ink group-hover:text-china-red transition-colors">
                      {c.name}
                    </h3>
                    <p className="text-sm text-warm">{c.name_zh}</p>
                  </Link>
                ))}
              </div>
            </div>
          );
        })()}
      </section>

      <div className="max-w-3xl mx-auto px-4">
        <OracleCta message="Want to discuss these concepts with a philosopher? Try the Oracle." />
      </div>
    </main>
  );
}
