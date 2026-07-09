import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Terms of Service — GoEast.ai",
  description:
    "GoEast.ai terms of service: rules and conditions for using our website, AI tools, and subscription services.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Terms of Service",
          url: "https://www.goeast.ai/terms",
          description:
            "GoEast.ai terms of service: rules and conditions for using our website, AI tools, and subscription services.",
        }}
      />
      <h1 className="text-3xl font-bold text-ink mb-6">Terms of Service</h1>
      <p className="text-sm text-warm mb-8">Last updated: July 9, 2026</p>

      <div className="prose prose-warm max-w-none prose-headings:text-ink prose-headings:font-semibold prose-a:text-china-red">
        <p>
          These Terms of Service (“Terms”) govern your access to and use of the
          GoEast.ai website, applications, and services (“Services”). By using
          our Services, you agree to these Terms. If you do not agree, please do
          not use our Services.
        </p>

        <h2>1. Use of Services</h2>
        <p>
          GoEast.ai provides AI-powered tools, articles, and guides related to
          Chinese philosophy, China travel, and daily life in China. You may use
          our Services for personal, non-commercial purposes unless you have a
          paid subscription that permits otherwise.
        </p>

        <h2>2. Accounts</h2>
        <p>
          To access certain features, you may need to create an account. You are
          responsible for maintaining the confidentiality of your account
          credentials and for all activities that occur under your account.
        </p>

        <h2>3. Subscriptions and Payments</h2>
        <p>
          Some features require a paid subscription. Payments are processed by
          Creem. By subscribing, you agree to Creem’s terms and conditions.
          Subscriptions automatically renew unless cancelled before the renewal
          date.
        </p>

        <h2>4. Cancellation and Refunds</h2>
        <p>
          You may cancel your subscription at any time from your account page.
          Cancellation will take effect at the end of the current billing
          period. Refunds are provided at our sole discretion, unless required
          by applicable law.
        </p>

        <h2>5. Intellectual Property</h2>
        <p>
          All content, trademarks, logos, and materials on GoEast.ai are owned
          by or licensed to us. You may not reproduce, distribute, modify, or
          create derivative works without our prior written permission.
        </p>

        <h2>6. User Content</h2>
        <p>
          If you submit content to us (such as feedback, skill submissions, or
          comments), you grant us a worldwide, non-exclusive, royalty-free
          license to use, display, and distribute that content in connection
          with our Services.
        </p>

        <h2>7. Prohibited Conduct</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use our Services for illegal or unauthorized purposes</li>
          <li>Attempt to disrupt or interfere with our Services</li>
          <li>Scrape, crawl, or automate access to our content in abusive ways</li>
          <li>Impersonate another person or entity</li>
        </ul>

        <h2>8. Disclaimer of Warranties</h2>
        <p>
          Our Services are provided “as is” without warranties of any kind. We
          do not guarantee that the content is accurate, complete, or suitable
          for your specific situation. AI-generated content may contain errors
          or outdated information.
        </p>

        <h2>9. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, GoEast.ai and its team will
          not be liable for any indirect, incidental, or consequential damages
          arising out of your use of our Services.
        </p>

        <h2>10. Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time. Continued use of our
          Services after changes means you accept the updated Terms.
        </p>

        <h2>11. Governing Law</h2>
        <p>
          These Terms are governed by the laws of the jurisdiction where
          GoEast.ai operates, without regard to conflict of law principles.
        </p>

        <h2>12. Contact Us</h2>
        <p>
          If you have questions about these Terms, please contact us at{" "}
          <a href="mailto:helena.liuhanqing@gmail.com">helena.liuhanqing@gmail.com</a>.
        </p>
      </div>
    </div>
  );
}
