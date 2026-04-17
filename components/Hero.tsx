import Link from "next/link";

export default function Hero() {
  return (
    <section className="text-center py-16 md:py-24 px-4">
      <h1 className="text-4xl md:text-5xl font-bold text-ink mb-4">
        GoEast<span className="text-china-red">.ai</span>
      </h1>
      <p className="text-lg md:text-xl text-warm max-w-2xl mx-auto mb-2">
        Curated AI Skills for Living & Traveling in China
      </p>
      <p className="text-sm text-warm/70 max-w-xl mx-auto mb-8">
        精选 AI 技能，助力外国人在中国的生活与旅行
      </p>
      <div className="flex gap-4 justify-center">
        <Link
          href="/skills"
          className="bg-china-red text-white px-6 py-2.5 rounded-lg font-medium hover:bg-china-red/90 transition-colors"
        >
          Browse Skills
        </Link>
        <Link
          href="/llms.txt"
          className="border border-sand text-warm px-6 py-2.5 rounded-lg font-medium hover:border-china-red hover:text-china-red transition-colors"
        >
          For Agents →
        </Link>
      </div>
    </section>
  );
}
