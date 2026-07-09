import type { Metadata } from "next";
import Link from "next/link";
import { getSiteConfig } from "@/lib/config";
import JsonLd from "@/components/JsonLd";
import PricingClient from "./pricing-client";

export const metadata: Metadata = {
  title: "Pricing — GoEast.ai",
  description:
    "GoEast.ai Pro pricing: free access to Chinese philosophy tools, or upgrade for more AI oracle consultations and deeper features.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  const config = getSiteConfig();

  const freeFeatures = [
    "3 AI Oracle consultations per day",
    "Browse all philosophers and schools",
    "Access public I Ching and Zi Wei content",
    "Read China travel and philosophy guides",
  ];

  const proFeatures = [
    "10 AI Oracle consultations per day",
    "Deep interpretations and extended sessions",
    "Full Zi Wei Dou Shu chart analysis",
    "Priority access to new AI tools",
    "Cancel anytime",
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Pricing",
          url: "https://www.goeast.ai/pricing",
          description:
            "GoEast.ai Pro pricing: free access to Chinese philosophy tools, or upgrade for more AI oracle consultations and deeper features.",
        }}
      />

      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-ink mb-4">
          Simple, transparent pricing
        </h1>
        <p className="text-warm max-w-xl mx-auto">
          Explore Chinese philosophy and China guides for free, or upgrade to
          Pro for more daily consultations and deeper AI features.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-12">
        {/* Free tier */}
        <div className="rounded-xl border border-sand bg-white p-8">
          <h2 className="text-xl font-semibold text-ink mb-2">Free</h2>
          <p className="text-sm text-warm mb-6">For curious explorers</p>
          <div className="mb-6">
            <span className="text-4xl font-bold text-ink">$0</span>
            <span className="text-warm">/month</span>
          </div>
          <ul className="space-y-3 mb-8">
            {freeFeatures.map((feature) => (
              <li key={feature} className="flex items-start gap-3 text-sm text-ink">
                <svg
                  className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
          <Link
            href="/login"
            className="block w-full text-center px-6 py-2.5 rounded-lg border border-sand text-ink text-sm font-medium hover:bg-cream/50 transition-colors"
          >
            Get started free
          </Link>
        </div>

        {/* Pro tier */}
        <div className="rounded-xl border-2 border-china-red bg-white p-8 relative">
          <span className="absolute -top-3 left-8 bg-china-red text-white text-xs px-3 py-1 rounded-full font-medium">
            Pro
          </span>
          <h2 className="text-xl font-semibold text-ink mb-2">GoEast.ai Pro</h2>
          <p className="text-sm text-warm mb-6">For deeper practice</p>
          <div className="mb-6">
            <span className="text-4xl font-bold text-ink">$4.99</span>
            <span className="text-warm">/month</span>
          </div>
          <ul className="space-y-3 mb-8">
            {proFeatures.map((feature) => (
              <li key={feature} className="flex items-start gap-3 text-sm text-ink">
                <svg
                  className="w-5 h-5 text-china-red flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
          <PricingClient paymentEnabled={config.paymentEnabled} />
        </div>
      </div>

      <div className="text-center text-sm text-warm">
        <p>
          Questions? Read our{" "}
          <Link href="/terms" className="text-china-red hover:underline">
            Terms of Service
          </Link>{" "}
          or{" "}
          <Link href="/contact" className="text-china-red hover:underline">
            contact us
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
