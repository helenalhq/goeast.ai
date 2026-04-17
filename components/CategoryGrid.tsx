import Link from "next/link";
import { CATEGORIES, Category } from "@/lib/types";
import { getSkillsByCategory } from "@/lib/skills";

export default function CategoryGrid() {
  return (
    <section className="max-w-4xl mx-auto px-4 py-12">
      <h2 className="text-2xl font-bold text-ink mb-8 text-center">
        Explore by Category
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {CATEGORIES.map((cat) => (
          <CategoryCard key={cat.id} category={cat} />
        ))}
      </div>
    </section>
  );
}

function CategoryCard({ category }: { category: (typeof CATEGORIES)[number] }) {
  const count = getSkillsByCategory(category.id as Category).length;

  return (
    <Link
      href={`/categories/${category.id}`}
      className="bg-white rounded-xl border border-sand p-6 text-center hover:border-china-red/30 hover:shadow-sm transition-all group"
    >
      <div className="text-3xl mb-2">{category.icon}</div>
      <div className="font-semibold text-ink group-hover:text-china-red transition-colors">
        {category.name}
      </div>
      <div className="text-xs text-warm mt-1">{category.name_zh}</div>
      <div className="text-xs text-warm/60 mt-2">{count} skills</div>
    </Link>
  );
}
