import Link from "next/link";

export default function Hero() {
  return (
    <section className="text-center py-20 md:py-28 px-4 bg-gradient-to-br from-ink via-ink/95 to-gold/20">
      <p className="text-gold/60 text-xs tracking-[0.3em] uppercase mb-4">GoEast.ai presents</p>
      <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
        Sophie&apos;s Journey East
      </h1>
      <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-2">
        Having escaped the pages of a book, a young girl travels East — and meets
        the philosophers who shaped a civilization.
      </p>
      <p className="text-sm text-white/40 max-w-xl mx-auto mb-8">
        苏菲的东方之旅
      </p>
      <div className="flex gap-4 justify-center">
        <a
          href="#journey"
          className="bg-china-red text-white px-6 py-2.5 rounded-lg font-medium hover:bg-china-red/90 transition-colors"
        >
          Begin the Journey →
        </a>
        <Link
          href="/skills"
          className="border border-white/20 text-white/70 px-6 py-2.5 rounded-lg font-medium hover:border-white/40 hover:text-white transition-colors"
        >
          Explore Skills
        </Link>
      </div>
    </section>
  );
}
