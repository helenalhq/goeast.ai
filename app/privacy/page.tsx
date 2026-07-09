import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Privacy Policy — GoEast.ai",
  description:
    "GoEast.ai privacy policy: how we collect, use, store, and protect your personal information.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Privacy Policy",
          url: "https://www.goeast.ai/privacy",
          description:
            "GoEast.ai privacy policy: how we collect, use, store, and protect your personal information.",
        }}
      />
      <h1 className="text-3xl font-bold text-ink mb-6">Privacy Policy</h1>
      <p className="text-sm text-warm mb-8">Last updated: July 9, 2026</p>

      <div className="prose prose-warm max-w-none prose-headings:text-ink prose-headings:font-semibold prose-a:text-china-red">
        <p>
          This Privacy Policy explains how GoEast.ai (“we”, “us”, or “our”)
          collects, uses, stores, and protects your personal information when
          you visit our website or use our services.
        </p>

        <h2>1. Information We Collect</h2>
        <p>
          We collect information you provide directly, such as your email
          address and name when you create an account, subscribe to our
          newsletter, or contact us. We also collect usage data automatically,
          including IP address, browser type, device information, and pages
          visited.
        </p>

        <h2>2. How We Use Your Information</h2>
        <p>We use your information to:</p>
        <ul>
          <li>Provide and maintain our services</li>
          <li>Process subscriptions and payments through Creem</li>
          <li>Communicate with you about your account or updates</li>
          <li>Improve our website, content, and user experience</li>
          <li>Comply with legal obligations</li>
        </ul>

        <h2>3. Payment Information</h2>
        <p>
          We do not store your payment card details. Payments are processed by
          Creem, our third-party payment processor. When you subscribe, Creem
          collects and processes your payment information according to their
          privacy policy.
        </p>

        <h2>4. Cookies and Analytics</h2>
        <p>
          We use cookies and similar technologies to understand how visitors use
          our site and to improve functionality. You can control cookies through
          your browser settings.
        </p>

        <h2>5. Data Sharing</h2>
        <p>
          We do not sell your personal information. We may share data with
          trusted service providers (such as hosting, analytics, and payment
          processing partners) who help us operate our services, under strict
          confidentiality obligations.
        </p>

        <h2>6. Data Security</h2>
        <p>
          We implement reasonable security measures to protect your information.
          However, no method of transmission over the internet or electronic
          storage is completely secure.
        </p>

        <h2>7. Your Rights</h2>
        <p>
          Depending on your location, you may have the right to access, correct,
          delete, or restrict the processing of your personal data. To exercise
          these rights, contact us at{" "}
          <a href="mailto:helena.liuhanqing@gmail.com">helena.liuhanqing@gmail.com</a>.
        </p>

        <h2>8. Children’s Privacy</h2>
        <p>
          Our services are not intended for children under 13. We do not
          knowingly collect personal information from children under 13.
        </p>

        <h2>9. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. Changes will be
          posted on this page with an updated effective date.
        </p>

        <h2>10. Contact Us</h2>
        <p>
          If you have questions about this Privacy Policy, please contact us at{" "}
          <a href="mailto:helena.liuhanqing@gmail.com">helena.liuhanqing@gmail.com</a>.
        </p>
      </div>
    </div>
  );
}
