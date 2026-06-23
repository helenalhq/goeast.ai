import Link from "next/link";
import { SkillMeta } from "@/lib/types";
import CategoryBadge from "./CategoryBadge";

export default function SkillCard({ skill }: { skill: SkillMeta }) {
  return (
    <Link href={`/skills/${skill.slug}`} className="block group">
      <article className="bg-cream/60 rounded-sm shadow-sm hover:shadow-md transition-shadow p-5 h-full">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-serif font-semibold text-ink group-hover:text-china-red transition-colors">
            {skill.title}
          </h3>
          <span className="text-xs text-warm/60 whitespace-nowrap">
            {skill.source}
          </span>
        </div>
        <p className="text-sm text-warm/80 mb-1">{skill.title_zh}</p>
        <div className="flex items-center gap-2 mt-3">
          <CategoryBadge category={skill.category} />
          {skill.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="font-mono text-xs text-warm/50 bg-cream px-2 py-0.5 rounded-sm"
            >
              {tag}
            </span>
          ))}
        </div>
      </article>
    </Link>
  );
}
