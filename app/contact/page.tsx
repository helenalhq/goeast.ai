import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact — GoEast.ai",
  description: "Get in touch with the GoEast.ai team",
};

export default function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-ink mb-6">Contact Us</h1>
      <div className="prose prose-warm max-w-none prose-headings:text-ink prose-headings:font-semibold prose-a:text-china-red">
        <p>
          Have questions, suggestions, or want to collaborate? We&apos;d love to
          hear from you.
        </p>

        <h2>Email</h2>
        <p>
          Reach us at{" "}
          <a href="mailto:helena.liuhanqing@gmail.com">
            helena.liuhanqing@gmail.com
          </a>
        </p>

        <h2>Submit a Skill</h2>
        <p>
          Know a great AI skill that helps foreigners in China?{" "}
          <a href="/submit">Submit it here</a> and we&apos;ll review it for the
          directory.
        </p>

        <h2>联系我们</h2>
        <p>
          有任何问题、建议或合作意向？欢迎通过邮件联系我们。
        </p>
      </div>
    </div>
  );
}
