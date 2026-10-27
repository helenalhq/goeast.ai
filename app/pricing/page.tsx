import type { Metadata } from "next";
import Link from "next/link";
import { getSiteConfig } from "@/lib/config";
import JsonLd from "@/components/JsonLd";
import TryIChingLink from "@/components/TryIChingLink";
import PricingClient from "./pricing-client";
import ExampleViewed from "./example-viewed";
import {
  SAMPLE_DEMO_CONDITIONS,
  SAMPLE_QUESTION,
  SAMPLE_FREE,
  SAMPLE_PRO,
} from "@/lib/sample-reading";

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
    "10 AI consultations per day (free: 3)",
    "Deep readings — ~2× length with Going Deeper, reflection prompts & follow-ups",
    "Zi Wei deep mode: timing (大限流年) & palace-interaction analysis",
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
            href="/login?next=/pricing"
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
          <p className="text-xs text-warm/70 mt-3 break-words">
            $4.99/month · auto-renews · cancel anytime in Account ·{" "}
            <Link href="/terms" className="underline hover:text-china-red">
              Terms &amp; refund policy
            </Link>
            . Taxes, if any, are calculated at checkout.
          </p>
        </div>
      </div>

      {/* What Pro actually adds — faithful to the implementation (docs/entitlements.md) */}
      <section className="mb-12 p-6 bg-cream rounded-xl border border-sand">
        <h2 className="text-lg font-semibold text-ink mb-3">What a Pro reading adds</h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="p-4 bg-white rounded-lg border border-sand">
            <p className="font-medium text-ink mb-2">Free reading</p>
            <ul className="space-y-1 text-warm">
              <li>• Traditional teaching, quoted from the classic</li>
              <li>• AI interpretation of your question</li>
              <li>• I Ching consults end with reflection questions</li>
              <li>• 300–800 words depending on philosopher</li>
            </ul>
          </div>
          <div className="p-4 bg-white rounded-lg border-2 border-china-red">
            <p className="font-medium text-china-red mb-2">Pro deep reading — everything in Free, plus</p>
            <ul className="space-y-1 text-warm">
              <li>• “Going Deeper”: a second angle on your question</li>
              <li>• Zi Wei: decade &amp; year timing, palace interactions</li>
              <li>• 3 reflection questions + one follow-up invitation</li>
              <li>• Up to ~2× the length</li>
            </ul>
          </div>
        </div>
        <p className="text-xs text-warm/60 mt-3">
          Same engine, same sources — Pro readings go deeper and longer, and you get 10 per day instead of 3.
        </p>
      </section>

      {/* Real same-condition example — verbatim excerpts from docs/samples/ */}
      <section id="example" className="mb-12 p-6 bg-cream rounded-xl border border-sand">
        <ExampleViewed />
        <h2 className="text-lg font-semibold text-ink mb-2">
          The same cast, twice — Free vs Pro
        </h2>
        <p className="text-xs text-warm/70 mb-6 break-words">{SAMPLE_DEMO_CONDITIONS}</p>
        <div className="grid md:grid-cols-2 gap-4">
          {/* Free card */}
          <div className="p-4 bg-white rounded-lg border border-sand break-words">
            <p className="font-medium text-ink mb-2 text-sm">Free reading (excerpt)</p>
            <p className="text-sm italic text-warm mb-3 break-words">“{SAMPLE_QUESTION}”</p>
            <div className="text-sm text-ink/90 space-y-3">
              <div className="text-xs leading-relaxed break-words">{SAMPLE_FREE.traditional}</div>
              <p className="text-[11px] text-warm/70">
                (The free reading also interprets the transformed hexagram — elided here; full text linked below.)
              </p>
              <div className="text-xs leading-relaxed break-words">{SAMPLE_FREE.interpretation}</div>
              <div>
                <p className="text-xs font-semibold text-ink mb-1">Reflection</p>
                <ul className="text-xs leading-relaxed space-y-1 text-warm break-words">
                  {SAMPLE_FREE.reflection.split("\n").map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="text-xs text-warm/60 mt-4 pt-3 border-t border-sand">
              Excerpt — full unedited readings:{" "}
              <a
                href="/examples/iching-writing-habit"
                className="underline hover:text-china-red break-words"
              >
                view complete Free and Pro readings →
              </a>
            </p>
          </div>
          {/* Pro card — only what Pro adds */}
          <div className="p-4 bg-white rounded-lg border-2 border-china-red break-words">
            <p className="font-medium text-china-red mb-2 text-sm">
              Pro deep reading (excerpt) — everything in Free, plus:
            </p>
            <div className="text-sm text-ink/90 space-y-3">
              <div>
                <p className="text-xs font-semibold text-ink mb-1">Going Deeper</p>
                <div className="text-xs leading-relaxed break-words">
                  {SAMPLE_PRO.goingDeeper.split("\n\n").map((para) => (
                    <p key={para} className="mb-2 last:mb-0">{para}</p>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-ink mb-1">Deeper reflection</p>
                <ul className="text-xs leading-relaxed space-y-1 text-warm break-words">
                  {SAMPLE_PRO.deeperReflection.split("\n").map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
              <div className="text-xs italic text-warm break-words">{SAMPLE_PRO.followUp}</div>
            </div>
            <p className="text-xs text-warm/60 mt-4 pt-3 border-t border-sand">
              Excerpt — full unedited readings:{" "}
              <a
                href="/examples/iching-writing-habit"
                className="underline hover:text-china-red break-words"
              >
                view complete Free and Pro readings →
              </a>
            </p>
          </div>
        </div>
        <div className="text-center mt-6 flex flex-wrap justify-center gap-3">
          <TryIChingLink
            source="pricing"
            className="inline-block px-6 py-2.5 rounded-lg bg-china-red text-white text-sm font-medium hover:bg-china-red/90 transition-colors no-underline"
          >
            Try I Ching →
          </TryIChingLink>
          <Link
            href="/iching"
            className="inline-block px-6 py-2.5 rounded-lg border border-sand text-ink text-sm font-medium hover:border-china-red hover:text-china-red transition-colors"
          >
            Browse hexagrams
          </Link>
        </div>
      </section>

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
