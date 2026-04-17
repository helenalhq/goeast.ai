import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Submit a Skill — GoEast.ai",
  description: "Submit an AI skill to the GoEast.ai directory",
};

export default function SubmitPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-ink mb-6">Submit a Skill</h1>
      <div className="prose prose-warm max-w-none prose-headings:text-ink prose-headings:font-semibold prose-a:text-china-red">
        <p>
          Have an AI skill that helps foreigners in China? We&apos;d love to
          include it in our directory.
        </p>
        <h2>How to Submit</h2>
        <ol>
          <li>
            Open a GitHub Issue on our{" "}
            <a
              href="https://github.com/goeast-ai/skills/issues/new"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub repository
            </a>
          </li>
          <li>
            Include the skill name, source platform, category, and a brief
            description
          </li>
          <li>We&apos;ll review and add it to the directory</li>
        </ol>
        <h2>What We&apos;re Looking For</h2>
        <ul>
          <li>
            AI skills related to traveling, living, or doing business in China
          </li>
          <li>
            Skills from platforms like Claude Hub, skills.sh, or any other
            source
          </li>
          <li>
            Tools that help with practical tasks: visa, payments, transport,
            health, housing
          </li>
        </ul>
        <h2>提交技能</h2>
        <p>
          如果你发现了帮助外国人在中国生活的AI技能，欢迎通过 GitHub Issue
          提交。我们会审核后添加到目录中。
        </p>
      </div>
      <a
        href="https://github.com/goeast-ai/skills/issues/new"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block mt-8 bg-china-red text-white px-6 py-3 rounded-lg font-medium hover:bg-china-red/90 transition-colors"
      >
        Open GitHub Issue &rarr;
      </a>
    </div>
  );
}
