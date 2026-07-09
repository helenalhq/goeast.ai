import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import FAQ from "@/components/FAQ";
import { generateFAQs, generateFAQJsonLd } from "@/lib/faq-templates";

export const metadata: Metadata = {
  title: "China Travel Guide for Foreigners (2026) | GoEast.ai",
  description:
    "A practical China travel guide for foreigners: payments, transport, hospitals, eSIM, translation apps, and daily life. Bilingual English-Chinese.",
  alternates: {
    canonical: "/china-travel-guide",
    languages: {
      en: "https://www.goeast.ai/china-travel-guide",
      "x-default": "https://www.goeast.ai/china-travel-guide",
    },
  },
  openGraph: {
    title: "China Travel Guide for Foreigners (2026) | GoEast.ai",
    description:
      "Practical guides for payments, transport, hospitals, eSIM, and translation in China.",
    type: "website",
  },
};

const clusters = [
  {
    title: "Payments & Money",
    titleZh: "支付与货币",
    description: "Set up mobile payments before you need them.",
    links: [
      { href: "/insights/alipay-vs-wechat-pay-foreigner", label: "Alipay vs WeChat Pay for foreigners" },
      { href: "/insights/wechat-pay-foreigner", label: "How to set up WeChat Pay" },
      { href: "/skills/china-payment-setup", label: "China Payment Setup Skill" },
    ],
  },
  {
    title: "Transport & Connectivity",
    titleZh: "交通与网络",
    description: "Move between cities and stay online.",
    links: [
      { href: "/insights/china-high-speed-rail-12306-guide", label: "High-speed rail booking (12306)" },
      { href: "/insights/didi-english-guide-china", label: "How to use DiDi without Chinese" },
      { href: "/insights/china-esim-foreigner-guide", label: "China eSIM setup and backup" },
    ],
  },
  {
    title: "Health & Communication",
    titleZh: "健康与沟通",
    description: "Prepare for hospital visits and language barriers.",
    links: [
      { href: "/insights/china-hospital-foreigner-guide", label: "Hospital navigation for foreigners" },
      { href: "/insights/best-translation-apps-china-travel", label: "Best translation apps for China" },
      { href: "/skills/hospital-recommendation-report", label: "Hospital Recommendation Report" },
    ],
  },
];

export default function ChinaTravelGuidePage() {
  const faqs = generateFAQs({ type: "china_travel_guide" });

  return (
    <main>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "TravelAction",
          name: "China Travel Guide for Foreigners",
          description:
            "Practical China travel guide covering payments, transport, hospitals, eSIM, and translation for foreigners.",
          url: "https://www.goeast.ai/china-travel-guide",
          fromLocation: { "@type": "Place", name: "Anywhere" },
          toLocation: { "@type": "Country", name: "China" },
        }}
      />

      {/* Hero */}
      <section className="bg-cream py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-ink mb-3">
            China Travel Guide for Foreigners
          </h1>
          <p className="text-xl text-warm">外国人在中国旅行指南</p>
          <p className="text-base text-warm/70 mt-4 max-w-2xl mx-auto">
            Payments, transport, hospitals, eSIM, translation apps, and daily workflows — built for first-time visitors and long-stay expats.
          </p>
        </div>
      </section>

      {/* Before-you-go checklist */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl border border-sand p-6 md:p-8">
          <h2 className="font-serif text-2xl font-bold text-ink mb-4">Before You Arrive</h2>
          <ul className="space-y-3 text-ink/80">
            <li className="flex gap-3">
              <span className="text-china-red font-bold">1.</span>
              <span>Install and verify <strong>Alipay</strong> and <strong>WeChat Pay</strong> with your passport.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-china-red font-bold">2.</span>
              <span>Buy a <strong>China eSIM</strong> or plan your local SIM strategy for day-one connectivity.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-china-red font-bold">3.</span>
              <span>Download offline translation packs and save key phrases.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-china-red font-bold">4.</span>
              <span>Save 2-3 hospital options and a bilingual symptom card.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-china-red font-bold">5.</span>
              <span>Install <strong>DiDi</strong> and a reliable maps app (Baidu or Amap).</span>
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

      {/* Advanced medical travel cross-promo */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="bg-cream/60 rounded-xl border border-sand p-6">
          <h2 className="font-serif text-xl font-bold text-ink mb-2">Need Medical Care in China?</h2>
          <p className="text-sm text-warm mb-4">
            For specialist hospital selection, second opinions, or fast-track appointments, see our sister site ChinaMed Select.
          </p>
          <a
            href="https://www.chinamed.cc"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm font-medium text-china-red hover:text-china-red/80 transition-colors"
          >
            Explore 50+ top-ranked Chinese hospitals →
          </a>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 pb-16">
        <FAQ items={faqs} jsonLd={generateFAQJsonLd(faqs)} />
      </section>
    </main>
  );
}
