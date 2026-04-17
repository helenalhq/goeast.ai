import { getAllSkills } from "@/lib/skills";
import SkillList from "@/components/SkillList";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "All Skills — GoEast.ai",
  description: "Browse all curated AI skills for foreigners in China.",
};

export default function SkillsPage() {
  const skills = getAllSkills();
  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-ink mb-2">All Skills</h1>
      <p className="text-warm mb-8">
        Browse curated AI skills for foreigners in China
        <br />
        <span className="text-sm">浏览精选的面向外国人的 AI 技能</span>
      </p>
      <SkillList skills={skills} />
    </div>
  );
}
