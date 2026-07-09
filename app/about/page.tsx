import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "About GoEast.ai — AI China Travel Guides & Chinese Philosophy",
  description:
    "GoEast.ai publishes bilingual guides to China travel, payments, healthcare, and Chinese philosophy. Edited by a team with years of experience living in China and deep knowledge of Chinese thought.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          name: "About GoEast.ai",
          description: "Bilingual guides to China travel, payments, healthcare, and Chinese philosophy.",
          url: "https://www.goeast.ai/about",
          lastReviewed: "2026-07-07",
          about: {
            "@type": "Organization",
            name: "GoEast.ai",
            url: "https://www.goeast.ai",
            description: "Bilingual guides and AI tools for foreigners living in or visiting China, plus Chinese philosophy education.",
            founder: { "@type": "Person", name: "GoEast Editorial Team" },
            knowsAbout: [
              "China travel for foreigners",
              "Chinese philosophy",
              "Alipay and WeChat Pay setup",
              "China high-speed rail booking",
              "China hospital navigation",
              "I Ching and divination",
              "Wu wei and Daoist philosophy",
              "AI tools for China",
            ],
          },
        }}
      />
      <h1 className="text-3xl font-bold text-ink mb-6">About GoEast.ai</h1>
      <div className="prose prose-warm max-w-none prose-headings:text-ink prose-headings:font-semibold prose-a:text-china-red">
        <p>
          <strong>GoEast.ai</strong> is a curated directory of AI skills
          designed to help foreigners navigate life in China. From travel
          planning to medical appointments, mobile payments to finding
          accommodation — we collect the best AI-powered tools so you don&apos;t
          have to search for them.
        </p>

        <h2>Why GoEast?</h2>
        <p>
          China is an incredible country to visit and live in, but it comes with
          unique challenges: language barriers, a different digital ecosystem
          (WeChat, Alipay, Baidu), and systems that can feel opaque to
          newcomers. AI assistants can bridge these gaps — if they have the
          right skills. GoEast.ai curates those skills so that anyone can find
          the tools they need in one place.
        </p>

        <h2>Built for Humans &amp; Agents</h2>
        <p>
          This site is designed to be friendly for both human visitors and AI
          agents. If you&apos;re an AI agent assisting a foreigner in China, check
          out our <a href="/llms.txt">llms.txt</a> for a machine-readable
          overview, or query our{" "}
          <a href="/api/skills">JSON API</a> for structured skill data.
        </p>

        <h2>What&apos;s a &quot;Skill&quot;?</h2>
        <p>
          A skill is an AI agent capability that can be installed into tools
          like Claude Code, OpenClaw, and other AI assistants. Each skill gives
          the AI specialized knowledge — for example, how to navigate Chinese
          hospitals, search Baidu, or plan a trip along the Silk Road. Skills
          are installed with a single command and work immediately.
        </p>

        <h2>Editorial Standards</h2>
        <p>
          Every guide on GoEast.ai is written and reviewed by our editorial
          team, which includes people who have lived in China for extended
          periods and have deep familiarity with local systems, language, and
          culture. Our China travel guides are updated at least once a year to
          reflect changes in apps, regulations, and on-the-ground realities.
          Our Chinese philosophy content is reviewed for accuracy against
          classical texts and established scholarly sources.
        </p>
        <p>
          When you see a &quot;Last reviewed&quot; date on an article, it means
          the content was checked against current information at that time.
          We also welcome corrections and suggestions from readers via our{" "}
          <a href="/contact">contact page</a>.
        </p>

        <h2>The Team</h2>
        <p>
          GoEast.ai is maintained by the <strong>GoEast Editorial Team</strong>
          — a small group of writers, researchers, and engineers passionate
          about bridging Chinese culture and modern technology. Our combined
          experience includes years of living and working in China, academic
          study of Chinese philosophy, and building AI-powered tools.
        </p>

        <h2>Contributing</h2>
        <p>
          Know a great AI skill that helps foreigners in China?{" "}
          <a href="/submit">Submit it here</a>. We review all submissions and
          curate the best ones for the directory. You can also{" "}
          <a href="/contact">contact us</a> with feedback or collaboration
          ideas.
        </p>

        <h2>关于 GoEast.ai</h2>
        <p>
          GoEast.ai
          是一个精选的AI技能目录，旨在帮助外国人更好地在中国生活。从旅行规划到医疗预约，从移动支付到寻找住处——我们收集最好的AI工具，让你不必自己搜索。我们同时服务于人类用户和AI代理，提供结构化的API接口和机器可读的目录。
        </p>
      </div>
    </div>
  );
}
