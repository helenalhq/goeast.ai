import Link from "next/link";

export default function JourneyBanner() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/95 to-gold/30" />
      <div className="relative max-w-6xl mx-auto px-4 py-14 md:py-20 flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1 text-center md:text-left">
          <p className="text-sm tracking-[0.2em] text-white/60 mb-3">苏菲的东方之旅</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Sophie&apos;s Journey East
          </h2>
          <p className="text-white/80 max-w-lg mb-6 leading-relaxed">
            Having escaped the pages of a book, a young girl travels East and encounters
            the philosophers who shaped a civilization — from Laozi to Wang Yangming,
            three thousand years of Chinese thought in one journey.
          </p>
          <div className="flex items-center gap-3 justify-center md:justify-start flex-wrap">
            <span className="text-xs text-white/50 bg-white/10 px-2.5 py-1 rounded-full">☯ Daoism</span>
            <span className="text-xs text-white/50 bg-white/10 px-2.5 py-1 rounded-full">仁 Confucianism</span>
            <span className="text-xs text-white/50 bg-white/10 px-2.5 py-1 rounded-full">禅 Zen</span>
            <span className="text-xs text-white/50 bg-white/10 px-2.5 py-1 rounded-full">+ 4 more schools</span>
          </div>
          <Link
            href="/sophies-journey"
            className="inline-block mt-6 bg-china-red text-white px-6 py-2.5 rounded-lg font-medium hover:bg-china-red/90 transition-colors"
          >
            Begin the Journey →
          </Link>
        </div>
        <div className="flex-shrink-0 w-48 md:w-56">
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-br from-gold/20 to-china-red/20 rounded-2xl blur-xl" />
            <div className="relative bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 text-center">
              <div className="text-5xl mb-3">📜</div>
              <p className="text-white/90 font-semibold text-sm">12 Chapters</p>
              <p className="text-white/60 text-xs mt-1">11 Philosophers · 3000 Years</p>
              <div className="mt-4 flex justify-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#8b4513]" />
                <span className="w-2 h-2 rounded-full bg-[#2d5016]" />
                <span className="w-2 h-2 rounded-full bg-[#8b0000]" />
                <span className="w-2 h-2 rounded-full bg-[#4a4a4a]" />
                <span className="w-2 h-2 rounded-full bg-[#1a5276]" />
                <span className="w-2 h-2 rounded-full bg-[#6c3483]" />
                <span className="w-2 h-2 rounded-full bg-[#d4a017]" />
                <span className="w-2 h-2 rounded-full bg-[#c0392b]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
