import Hero from "@/components/Hero";
import CategoryGrid from "@/components/CategoryGrid";
import SkillCard from "@/components/SkillCard";
import { getFeaturedSkills, getAllSkills } from "@/lib/skills";
import { CATEGORIES } from "@/lib/types";

export default function HomePage() {
  const featured = getFeaturedSkills();
  const totalSkills = getAllSkills().length;

  return (
    <>
      <Hero />

      <CategoryGrid />

      {featured.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-ink mb-2">Featured Skills</h2>
          <p className="text-sm text-warm mb-8">
            {totalSkills} curated skills across {CATEGORIES.length} categories
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featured.map((skill) => (
              <SkillCard key={skill.slug} skill={skill} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
