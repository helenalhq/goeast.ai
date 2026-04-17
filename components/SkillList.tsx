"use client";

import { useState, useMemo } from "react";
import { SkillMeta, CATEGORIES } from "@/lib/types";
import SkillCard from "./SkillCard";

const PER_PAGE = 12;

export default function SkillList({ skills }: { skills: SkillMeta[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let result = skills;
    if (category !== "all") {
      result = result.filter((s) => s.category === category);
    }
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.title_zh.includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return result;
  }, [skills, query, category]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <input
          type="text"
          placeholder="Search skills... 搜索技能..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          className="flex-1 px-4 py-2 border border-sand rounded-lg bg-white text-ink placeholder:text-warm/40 focus:outline-none focus:border-china-red"
        />
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => {
              setCategory("all");
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${category === "all" ? "bg-china-red text-white" : "bg-white border border-sand text-warm hover:border-china-red/30"}`}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setCategory(cat.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${category === cat.id ? "bg-china-red text-white" : "bg-white border border-sand text-warm hover:border-china-red/30"}`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-warm mb-4">
        {filtered.length} skill{filtered.length !== 1 ? "s" : ""} found
      </p>

      {paged.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paged.map((skill) => (
            <SkillCard key={skill.slug} skill={skill} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-warm">
          No skills found matching your search.
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg text-sm border border-sand text-warm disabled:opacity-30 hover:border-china-red/30"
          >
            &larr; Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`px-3 py-1.5 rounded-lg text-sm ${p === page ? "bg-china-red text-white" : "border border-sand text-warm hover:border-china-red/30"}`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg text-sm border border-sand text-warm disabled:opacity-30 hover:border-china-red/30"
          >
            Next &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
