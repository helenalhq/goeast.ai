import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import FAQ from "@/components/FAQ";
import { generateFAQs, generateFAQJsonLd } from "@/lib/faq-templates";

export const metadata: Metadata = {
  title: "Chinese Philosophy Guide: Concepts, Thinkers & Modern Use | GoEast.ai",
  description:
    "A beginner-friendly guide to Chinese philosophy: Confucius, Laozi, Sunzi, Mencius, Zhuangzi, Yin Yang, Wu Wei, and the I Ching. Learn how ancient wisdom applies to modern life.",
  alternates: {
    canonical: "/chinese-philosophy-guide",
    languages: {
      en: "https://www.goeast.ai/chinese-philosophy-guide",
      "x-default": "https://www.goeast.ai/chinese-philosophy-guide",
    },
  },
  openGraph: {
    title: "Chinese Philosophy Guide: Concepts, Thinkers & Modern Use | GoEast.ai",
    description:
      "Explore Chinese philosophy from Confucius to Wang Yangming and apply ancient wisdom to leadership, decisions, and daily life.",
    type: "website",
  },
};

const clusters = [
  {
    title: "Core Concepts",
    titleZh: "核心概念",
    description: "Foundational ideas that appear across schools.",
    links: [
      { href: "/glossary/yin-yang", label: "Yin Yang" },
      { href: "/glossary/wuwei", label: "Wu Wei" },
      { href: "/glossary/qi", label: "Qi" },
      { href: "/glossary/dao", label: "Dao" },
      { href: "/insights/yin-yang-explained", label: "Yin Yang Explained" },
    ],
  },
  {
    title: "Major Thinkers",
    titleZh: "主要思想家",
    description: "Philosophers who shaped Chinese thought.",
    links: [
      { href: "/philosophers/confucius", label: "Confucius" },
      { href: "/philosophers/laozi", label: "Laozi" },
      { href: "/philosophers/sunzi", label: "Sunzi" },
      { href: "/philosophers/zhuangzi", label: "Zhuangzi" },
      { href: "/philosophers/zhou-gong", label: "Zhou Gong" },
      { href: "/philosophers/wangyangming", label: "Wang Yangming" },
    ],
  },
  {
    title: "Modern Applications",
    titleZh: "现代应用",
    description: "Ancient ideas applied to today.",
    links: [
      { href: "/insights/wu-wei-philosophy", label: "Wu Wei and effortless action" },
      { href: "/insights/iching-decision-making", label: "I Ching for decision-making" },
      { href: "/insights/sunzi-strategy-ai", label: "Sunzi, strategy, and AI" },
      { href: "/insights/confucius-leadership", label: "Confucius on leadership" },
      { href: "/sophies-journey", label: "Sophie's Journey East" },
    ],
  },
];

export default function ChinesePhilosophyGuidePage() {
  const faqs = generateFAQs({ type: "chinese_philosophy_guide" });

  return (
    <main>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "LearningResource",
          name: "Chinese Philosophy Guide",
          description:
            "A guide to Chinese philosophical concepts, thinkers, and their modern applications.",
          url: "https://www.goeast.ai/chinese-philosophy-guide",
          educationalLevel: "beginner",
          learningResourceType: "guide",
          teaches: [
            "Confucian ethics",
            "Daoist philosophy",
            "Yin Yang",
            "Wu Wei",
            "I Ching",
            "Chinese strategic thought",
          ],
        }}
      />

      {/* Hero */}
      <section className="bg-cream py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-ink mb-3">
            Chinese Philosophy Guide
          </h1>
          <p className="text-xl text-warm">中国哲学指南</p>
          <p className="text-base text-warm/70 mt-4 max-w-2xl mx-auto">
            From Confucius to Wang Yangming — explore the concepts, thinkers, and practical wisdom that shaped 3,000 years of Chinese thought.
          </p>
        </div>
      </section>

      {/* What you will learn */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl border border-sand p-6 md:p-8">
          <h2 className="font-serif text-2xl font-bold text-ink mb-4">What You Will Learn</h2>
          <ul className="space-y-3 text-ink/80">
            <li className="flex gap-3">
              <span className="text-china-red font-bold">1.</span>
              <span>The difference between <strong>Confucian</strong>, <strong>Daoist</strong>, and <strong>Legalist</strong> approaches to life and society.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-china-red font-bold">2.</span>
              <span>How <strong>Yin Yang</strong> and <strong>Wu Wei</strong> apply to decision-making, leadership, and stress.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-china-red font-bold">3.</span>
              <span>How <strong>Sunzi's strategy</strong> translates into modern business and AI thinking.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-china-red font-bold">4.</span>
              <span>How to use the <strong>I Ching</strong> as a reflective decision tool.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-china-red font-bold">5.</span>
              <span>Where Chinese philosophy intersects with psychology, design, and leadership today.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Topic clusters */}
      <section className="max-w-5xl mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {clusters.map((cluster) => (
            <div key={cluster.title} className="bg-white rounded-xl border border-sand p-5">
              <h2 className="text-base font-semibold text-ink mb-1">{cluster.title}</h2>
              <p className="text-xs text-warm/80 mb-1">{cluster.titleZh}</p>
              <p className="text-xs text-warm/80 mb-4">{cluster.description}</p>
              <div className="space-y-2">
                {cluster.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block text-sm text-ink hover:text-china-red transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive tools */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="bg-cream/60 rounded-xl border border-sand p-6">
          <h2 className="font-serif text-xl font-bold text-ink mb-2">Explore with AI Oracles</h2>
          <p className="text-sm text-warm mb-4">
            Ask questions to AI models of Laozi, Confucius, Sunzi, and other thinkers.
          </p>
          <Link
            href="/iching"
            className="inline-block text-sm font-medium text-china-red hover:text-china-red/80 transition-colors mr-6"
          >
            Consult the I Ching →
          </Link>
          <Link
            href="/philosophers"
            className="inline-block text-sm font-medium text-china-red hover:text-china-red/80 transition-colors"
          >
            Meet the philosophers →
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 pb-16">
        <FAQ items={faqs} jsonLd={generateFAQJsonLd(faqs)} />
      </section>
    </main>
  );
}
