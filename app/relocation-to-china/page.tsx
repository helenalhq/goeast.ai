import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import FAQ from "@/components/FAQ";
import { generateFAQs, generateFAQJsonLd } from "@/lib/faq-templates";

export const metadata: Metadata = {
  title: "Relocation to China Guide 2026: Visa, Housing, Payments & Daily Life | GoEast.ai",
  description:
    "A practical relocation guide for moving to China in 2026: visa, housing, payments, healthcare, phone/internet, and cultural adaptation. Bilingual English-Chinese.",
  alternates: {
    canonical: "/relocation-to-china",
    languages: {
      en: "https://www.goeast.ai/relocation-to-china",
      "x-default": "https://www.goeast.ai/relocation-to-china",
    },
  },
  openGraph: {
    title: "Relocation to China Guide 2026 | GoEast.ai",
    description:
      "Practical guidance for moving to China: visa, housing, payments, healthcare, and daily life setup.",
    type: "website",
  },
};

const sections = [
  {
    title: "Visa & Legal Setup",
    titleZh: "签证与法律手续",
    items: [
      { href: "/insights/china-visa-travel-guide", label: "China visa guide for foreigners" },
      { href: "/skills/china-local-travel-expert", label: "China local travel expert skill" },
    ],
  },
  {
    title: "Housing & Neighborhoods",
    titleZh: "住房与社区",
    items: [
      { href: "/skills/hotel-rate-comparison", label: "Hotel and short-stay comparison" },
      { href: "/insights/china-food-delivery-foreigner-guide", label: "Food delivery guide" },
    ],
  },
  {
    title: "Money & Payments",
    titleZh: "货币与支付",
    items: [
      { href: "/insights/alipay-vs-wechat-pay-foreigner", label: "Alipay vs WeChat Pay" },
      { href: "/insights/wechat-pay-foreigner", label: "Set up WeChat Pay" },
      { href: "/skills/china-payment-setup", label: "China payment setup skill" },
    ],
  },
  {
    title: "Phone, Internet & Transport",
    titleZh: "手机、网络与交通",
    items: [
      { href: "/insights/china-esim-foreigner-guide", label: "China eSIM setup" },
      { href: "/insights/china-high-speed-rail-12306-guide", label: "High-speed rail booking" },
      { href: "/insights/didi-english-guide-china", label: "Using DiDi without Chinese" },
    ],
  },
  {
    title: "Healthcare & Culture",
    titleZh: "医疗与文化",
    items: [
      { href: "/insights/china-hospital-foreigner-guide", label: "Hospital navigation guide" },
      { href: "/insights/best-translation-apps-china-travel", label: "Translation apps" },
      { href: "/insights/chinese-culture-guide", label: "Chinese culture guide" },
    ],
  },
];

export default function RelocationToChinaPage() {
  const faqs = generateFAQs({ type: "relocation_to_china" });

  return (
    <main>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: "Relocation to China Guide 2026",
          description:
            "A step-by-step guide for foreigners relocating to China, covering visa, housing, payments, healthcare, and daily life.",
          totalTime: "P30D",
          step: [
            {
              "@type": "HowToStep",
              position: 1,
              name: "Secure the right visa",
              text: "Apply for a work visa (Z), business visa (M), or residence permit based on your relocation purpose before entering China.",
            },
            {
              "@type": "HowToStep",
              position: 2,
              name: "Set up payments and phone",
              text: "Verify Alipay and WeChat Pay with your passport, buy a China eSIM or local SIM, and install essential apps like DiDi and maps.",
            },
            {
              "@type": "HowToStep",
              position: 3,
              name: "Find housing",
              text: "Choose a neighborhood near your workplace or school, verify landlord documents, and set up utilities and internet.",
            },
            {
              "@type": "HowToStep",
              position: 4,
              name: "Register with local police",
              text: "Complete temporary residence registration at the local police station within 24 hours of arrival or moving.",
            },
            {
              "@type": "HowToStep",
              position: 5,
              name: "Prepare healthcare and daily routines",
              text: "Choose a nearby hospital, get international health insurance, save translation phrases, and learn local food delivery and transport workflows.",
            },
          ],
        }}
      />

      {/* Hero */}
      <section className="bg-cream py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-ink mb-3">
            Relocation to China Guide 2026
          </h1>
          <p className="text-xl text-warm">2026 年移居中国指南</p>
          <p className="text-base text-warm/70 mt-4 max-w-2xl mx-auto">
            Everything you need to move to China: visa, housing, payments, healthcare, phone/internet, transport, and cultural adaptation.
          </p>
        </div>
      </section>

      {/* First 30 days checklist */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl border border-sand p-6 md:p-8">
          <h2 className="font-serif text-2xl font-bold text-ink mb-4">Your First 30 Days Checklist</h2>
          <ul className="space-y-3 text-ink/80">
            <li className="flex gap-3">
              <span className="text-china-red font-bold">1.</span>
              <span>Confirm visa type and entry requirements; print copies of your invitation letter or work permit.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-china-red font-bold">2.</span>
              <span>Register at the local police station within 24 hours of each move.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-china-red font-bold">3.</span>
              <span>Verify <strong>Alipay</strong> and <strong>WeChat Pay</strong> with your passport and link a card.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-china-red font-bold">4.</span>
              <span>Get a local phone number or activate your <strong>China eSIM</strong>.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-china-red font-bold">5.</span>
              <span>Open a Chinese bank account if your employer or landlord requires domestic transfers.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-china-red font-bold">6.</span>
              <span>Find a hospital with international/VIP services near your home.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-china-red font-bold">7.</span>
              <span>Save key addresses and phrases in Chinese for taxis, delivery, and emergencies.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Topic sections */}
      <section className="max-w-5xl mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections.map((section) => (
            <div key={section.title} className="bg-white rounded-xl border border-sand p-5">
              <h2 className="text-base font-semibold text-ink mb-1">{section.title}</h2>
              <p className="text-xs text-warm/80 mb-1">{section.titleZh}</p>
              <div className="space-y-2 mt-3">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block text-sm text-ink hover:text-china-red transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Medical travel cross-promo */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="bg-cream/60 rounded-xl border border-sand p-6">
          <h2 className="font-serif text-xl font-bold text-ink mb-2">Healthcare for Expats in China</h2>
          <p className="text-sm text-warm mb-4">
            For specialist hospital selection, executive health checks, or second opinions in China, see our sister site ChinaMed Select.
          </p>
          <a
            href="https://www.chinamed.cc"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm font-medium text-china-red hover:text-china-red/80 transition-colors"
          >
            Browse top-ranked hospitals →
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
