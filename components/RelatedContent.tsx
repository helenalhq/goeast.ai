import Link from "next/link";

type RelatedItem = {
  title: string;
  subtitle?: string;
  href: string;
  type: string;
};

const TYPE_COLORS: Record<string, string> = {
  Philosopher: "bg-[#8b0000]",
  Concept: "bg-[#2d5016]",
  Insight: "bg-[#6c3483]",
  Skill: "bg-[#c0392b]",
  Journey: "bg-[#8e6d45]",
  Hexagram: "bg-[#1a5276]",
  Category: "bg-[#8b7355]",
};

export default function RelatedContent({ items }: { items: RelatedItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold text-ink mb-4">
        Related Content <span className="text-sm text-warm font-normal">相关内容</span>
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((item, i) => (
          <Link
            key={i}
            href={item.href}
            className="flex items-center gap-3 p-3 bg-white rounded-lg border border-sand hover:border-warm/40 transition-colors group"
          >
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded text-white ${TYPE_COLORS[item.type] || "bg-warm"}`}
            >
              {item.type}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink group-hover:text-china-red transition-colors truncate">
                {item.title}
              </p>
              {item.subtitle && (
                <p className="text-xs text-warm truncate">{item.subtitle}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
