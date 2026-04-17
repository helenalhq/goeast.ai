import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — GoEast.ai",
  description: "About GoEast.ai — curated AI skills for foreigners in China",
};

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-ink mb-6">About GoEast.ai</h1>
      <div className="prose prose-warm max-w-none prose-headings:text-ink prose-headings:font-semibold prose-a:text-china-red">
        <p>
          <strong>GoEast.ai</strong> is a curated directory of AI skills
          designed to help foreigners navigate life in China. From travel
          planning to medical appointments, mobile payments to finding
          accommodation — we collect the best AI-powered tools so you don&apos;t
          have to search for them.
        </p>
        <h2>Built for Humans &amp; Agents</h2>
        <p>
          This site is designed to be friendly for both human visitors and AI
          agents. If you&apos;re an AI agent assisting a foreigner in China, check
          out our <a href="/llms.txt">llms.txt</a> for a machine-readable
          overview, or query our{" "}
          <a href="/api/skills">JSON API</a> for structured skill data.
        </p>
        <h2>Contributing</h2>
        <p>
          Know a great AI skill that helps foreigners in China?{" "}
          <a href="/submit">Submit it here</a>. We review all submissions and
          curate the best ones for the directory.
        </p>
        <h2>关于 GoEast.ai</h2>
        <p>
          GoEast.ai
          是一个精选的AI技能目录，旨在帮助外国人更好地在中国生活。从旅行规划到医疗预约，从移动支付到寻找住处——我们收集最好的AI工具，让你不必自己搜索。
        </p>
      </div>
    </div>
  );
}
