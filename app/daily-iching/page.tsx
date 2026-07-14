import { HEXAGRAMS } from "@/lib/iching-data";
import OracleCta from "@/components/OracleCta";
import JsonLd from "@/components/JsonLd";
import EmailCapture from "@/components/EmailCapture";
import ShareButtons from "@/components/ShareButtons";
import FAQ from "@/components/FAQ";
import { generateFAQJsonLd } from "@/lib/faq-templates";
import Link from "next/link";
import type { Metadata } from "next";

/** Deterministically pick today's hexagram based on the date */
function getDailyHexagram(date: Date) {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const index = dayOfYear % 64;
  return HEXAGRAMS[index];
}

const DAILY_WISDOM: Record<number, string> = {
  1: "Today calls for bold initiative. The creative force is strong — act with confidence and vision.",
  2: "Today favors receptivity and patience. Listen more than you speak; support rather than lead.",
  3: "Today brings initial challenges. Don't force things — seek allies and let order emerge from chaos.",
  4: "Today is about learning. Approach situations with beginner's mind — genuine curiosity opens doors.",
  5: "Today requires patience. Nourish yourself and wait for the right moment; certainty will come.",
  6: "Today may bring conflict. Seek mediation rather than confrontation — compromise is not weakness.",
  7: "Today calls for discipline and organization. Lead by example, not by force.",
  8: "Today favors unity and collaboration. Seek like-minded people and build alliances.",
  9: "Today requires gentle persistence. Small steps accumulate into great achievements.",
  10: "Today calls for careful conduct. Tread mindfully — even dangerous paths can be navigated safely.",
  11: "Today brings harmony and flow. Things align naturally — enjoy the peace and prepare for future.",
  12: "Today may feel stagnant. Don't force progress — use this time for inner cultivation.",
  13: "Today favors community and shared purpose. Align with others who share your values.",
  14: "Today brings abundance. Be generous and use your resources wisely for lasting impact.",
  15: "Today calls for modesty. Understate rather than overstate — true worth needs no advertising.",
  16: "Today brings enthusiasm and momentum. Channel your energy into inspired action.",
  17: "Today favors adaptability. Follow the natural flow of events rather than resisting.",
  18: "Today calls for repair and renewal. Address what has been neglected — restoring order brings success.",
  19: "Today brings approaching opportunity. Prepare yourself — greatness is on the horizon.",
  20: "Today requires contemplation. Observe carefully before acting — clarity comes through stillness.",
  21: "Today calls for decisive action. Bite through obstacles with determination and focus.",
  22: "Today favors grace and attention to form. Beauty in details brings success.",
  23: "Today may bring endings. Let go of what is no longer serving you — clearing space for renewal.",
  24: "Today marks a turning point. Return to what matters most — the cycle begins anew.",
  25: "Today calls for spontaneity. Act without calculation — natural authenticity attracts good fortune.",
  26: "Today favors accumulation. Gather your strength and knowledge for future use.",
  27: "Today is about nourishment. Feed your body, mind, and spirit with what truly sustains you.",
  28: "Today may require extraordinary measures. When the load is heavy, rise to meet it.",
  29: "Today calls for caution. Navigate dangerous waters carefully — truthfulness is your anchor.",
  30: "Today brings clarity and illumination. Attach yourself to what gives light and purpose.",
  31: "Today favors mutual attraction. Connections formed now have natural resonance.",
  32: "Today calls for persistence. Enduring commitment brings lasting results.",
  33: "Today favors strategic withdrawal. Sometimes stepping back is the wisest advance.",
  34: "Today brings power. Use it with restraint — true strength is measured, not displayed.",
  35: "Today brings progress and recognition. Let your light shine naturally.",
  36: "Today may require discretion. Conceal your brilliance until the time is right.",
  37: "Today focuses on home and family. Tend to your closest relationships with care.",
  38: "Today may bring opposition. Seek the common ground beneath apparent differences.",
  39: "Today presents obstacles. Look for alternative paths — sometimes difficulty points the way.",
  40: "Today brings release. Problems find solutions; tension dissolves naturally.",
  41: "Today calls for simplification. Let go of excess — what remains becomes more valuable.",
  42: "Today favors increase. Invest in what is growing — your contribution will multiply.",
  43: "Today calls for resolute action. Address problems directly and with full determination.",
  44: "Today warns against carelessness. Small intrusions can grow — be vigilant.",
  45: "Today favors gathering. Bring people together around a shared purpose.",
  46: "Today marks steady ascent. Push upward with patience and consistent effort.",
  47: "Today may feel restrictive. Use limitation as fuel for creativity — constraints breed innovation.",
  48: "Today taps deep resources. Go to the source — the well of wisdom never runs dry.",
  49: "Today calls for transformation. The time is ripe for meaningful change.",
  50: "Today brings transformation through nourishment. New forms emerge from what you cultivate.",
  51: "Today brings sudden shock. Stay centered — disruption clears the old and makes way for the new.",
  52: "Today calls for stillness. Stop, rest, and meditate — mountains don't rush.",
  53: "Today favors gradual progress. Step by step, you reach the summit.",
  54: "Today cautions against overreaching. Know your place and proceed with appropriate humility.",
  55: "Today brings abundance and clarity. Make the most of this peak — it won't last forever.",
  56: "Today favors exploration. Be a mindful traveler — learn from every encounter.",
  57: "Today calls for gentle persuasion. The wind penetrates through soft persistence.",
  58: "Today brings joy and open communication. Share your happiness — it multiplies.",
  59: "Today favors dispersion of tension. Melt rigidity with warmth and understanding.",
  60: "Today calls for setting limits. Boundaries bring freedom — structure creates space.",
  61: "Today favors inner truth. Listen to your heart — sincerity resonates beyond words.",
  62: "Today calls for attention to small details. Minor matters handled well prevent major problems.",
  63: "Today marks a state of completion. Enjoy the achievement, but remain vigilant.",
  64: "Today sits at the threshold. You're nearly there — careful attention in this final phase is crucial.",
};

export const metadata: Metadata = {
  title: "Daily I Ching Reading: Today's Hexagram & Wisdom | GoEast.ai",
  description:
    "Your daily I Ching hexagram reading. Discover today's wisdom from the Book of Changes — a new hexagram each day with modern interpretation and guidance.",
  alternates: {
    canonical: "/daily-iching",
    languages: {
      en: "https://www.goeast.ai/daily-iching",
      "x-default": "https://www.goeast.ai/daily-iching",
    },
  },
  openGraph: {
    title: "Daily I Ching Reading: Today's Hexagram & Wisdom | GoEast.ai",
    description:
      "Discover today's I Ching hexagram and its wisdom. A new reading every day from the Book of Changes.",
    type: "website",
    url: "https://www.goeast.ai/daily-iching",
  },
};

const DAILY_FAQS = [
  {
    question: "How is the daily I Ching hexagram selected?",
    answer:
      "Each day, a hexagram is deterministically selected based on the calendar date. The same hexagram appears for all visitors on the same day, ensuring a shared experience. The selection cycles through all 64 hexagrams of the I Ching throughout the year.",
  },
  {
    question: "Can I get a personal I Ching reading?",
    answer:
      "Yes! Visit our I Ching Divination page to cast your own hexagram using the virtual coin method. This gives you a personal reading that reflects your current situation and question.",
  },
  {
    question: "What is the I Ching (Book of Changes)?",
    answer:
      "The I Ching is one of the oldest books in the world, originating in China over 3,000 years ago. It consists of 64 hexagrams — patterns of broken and unbroken lines — each representing a fundamental situation or process of change. It has been consulted for millennia for guidance on decisions, relationships, and understanding the flow of events.",
  },
  {
    question: "Should I check my daily hexagram every day?",
    answer:
      "Daily I Ching readings offer a moment of reflection and a philosophical lens through which to view your day. Many people find it helpful as a daily mindfulness practice. The hexagram's wisdom can provide unexpected insights into your daily situations.",
  },
];

export default function DailyIChingPage() {
  const today = new Date();
  const hexagram = getDailyHexagram(today);
  const dailyWisdom = DAILY_WISDOM[hexagram.number] || hexagram.modern_application || "Today brings an opportunity for reflection and mindfulness.";
  const faqJsonLd = generateFAQJsonLd(DAILY_FAQS);
  const todayStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: `Daily I Ching: Hexagram ${hexagram.number} ${hexagram.name} (${hexagram.name_zh})`,
          description: dailyWisdom,
          url: "https://www.goeast.ai/daily-iching",
          author: { "@type": "Organization", name: "GoEast.ai" },
          publisher: {
            "@type": "Organization",
            name: "GoEast.ai",
            url: "https://www.goeast.ai",
          },
          datePublished: today.toISOString().split("T")[0],
        }}
      />

      {/* Hero */}
      <section className="bg-cream py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm text-warm/60 mb-3 tracking-wide uppercase">
            {todayStr}
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-ink mb-2">
            Daily I Ching · 每日一卦
          </h1>
          <p className="text-base text-warm/70 max-w-2xl mx-auto">
            Today&apos;s hexagram from the Book of Changes — a daily moment of wisdom from 3,000 years of Chinese philosophy.
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <nav className="text-sm text-warm mb-8 flex items-center gap-2">
          <Link href="/" className="hover:text-china-red transition-colors">Home</Link>
          <span>/</span>
          <Link href="/iching" className="hover:text-china-red transition-colors">I Ching</Link>
          <span>/</span>
          <span className="text-ink">Daily Reading</span>
        </nav>

        {/* Today's Hexagram */}
        <div className="p-6 bg-white rounded-xl border border-sand mb-8">
          <div className="text-center mb-6">
            <p className="text-xs text-warm/50 mb-1">Today&apos;s Hexagram</p>
            <p className="text-3xl font-bold text-ink mb-1">
              {hexagram.name} · {hexagram.name_zh}
            </p>
            <p className="text-sm text-warm">
              Hexagram #{hexagram.number} · {hexagram.upper_trigram} over {hexagram.lower_trigram}
            </p>
          </div>

          {/* Hexagram lines visual */}
          <div className="flex flex-col items-center gap-1.5 my-6">
            {hexagram.binary.split("").map((line, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-warm/40 w-4 text-right">{6 - i}</span>
                {line === "1" ? (
                  <div className="w-32 h-1.5 bg-ink rounded-sm" />
                ) : (
                  <div className="flex gap-3">
                    <div className="w-14 h-1.5 bg-ink rounded-sm" />
                    <div className="w-14 h-1.5 bg-ink rounded-sm" />
                  </div>
                )}
              </div>
            )).reverse()}
          </div>

          {/* Judgment */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-ink mb-2 uppercase tracking-wide">The Judgment · 卦辞</h2>
            <p className="text-base text-ink/80 italic leading-relaxed">{hexagram.judgment_en}</p>
            <p className="text-sm text-warm/60 mt-2">{hexagram.judgment_zh}</p>
          </div>

          {/* Image */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-ink mb-2 uppercase tracking-wide">The Image · 象辞</h2>
            <p className="text-base text-ink/80 italic leading-relaxed">{hexagram.image_en}</p>
            <p className="text-sm text-warm/60 mt-2">{hexagram.image_zh}</p>
          </div>

          {/* Today's Wisdom */}
          <div className="p-4 bg-cream rounded-lg border border-sand">
            <h2 className="text-sm font-semibold text-ink mb-2 uppercase tracking-wide">Today&apos;s Reflection</h2>
            <p className="text-base text-ink/90 leading-relaxed">{dailyWisdom}</p>
            {hexagram.modern_application_zh && (
              <p className="text-sm text-warm/60 mt-2">{hexagram.modern_application_zh}</p>
            )}
          </div>

          {/* Share */}
          <div className="mt-6 pt-6 border-t border-sand">
            <ShareButtons
              title={`Daily I Ching — Hexagram ${hexagram.number} ${hexagram.name} (${hexagram.name_zh}): ${(dailyWisdom || "Today's wisdom from the Book of Changes").slice(0, 80)}... — GoEast.ai`}
              label="Share today's reading"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mb-8">
          <Link
            href={`/iching/${hexagram.slug}`}
            className="px-5 py-2.5 bg-ink text-white text-sm rounded-full hover:bg-ink/90 transition-colors"
          >
            Read Full Hexagram →
          </Link>
          <Link
            href="/iching"
            className="px-5 py-2.5 bg-cream border border-sand text-ink text-sm rounded-full hover:border-warm/40 transition-colors"
          >
            Cast Your Own Hexagram
          </Link>
          <Link
            href="/sophies-journey/prologue-zhougong"
            className="px-5 py-2.5 bg-[#8b4513] text-white text-sm rounded-full hover:opacity-90 transition-colors"
          >
            Ask Zhou Gong for AI Interpretation →
          </Link>
        </div>

        {/* Oracle CTA */}
        <div className="mb-8">
          <OracleCta
            philosopherSlug="zhou-gong"
            philosopherName="Zhou Gong"
            philosopherNameZh="周公"
            schoolId="ancient"
            message="Want deeper insight? Consult the Oracle for a personal interpretation."
          />
        </div>

        {/* Email Capture */}
        <div className="mb-8">
          <EmailCapture
            title="Get Your Daily I Ching in Your Inbox"
            subtitle="Subscribe to receive a new hexagram reading every morning, plus weekly Chinese philosophy and practical China life guides."
            source="daily_iching"
            leadMagnet="Free bonus: China Travel Checklist PDF"
          />
        </div>

        {/* FAQ */}
        <FAQ items={DAILY_FAQS} jsonLd={faqJsonLd} />
      </div>
    </main>
  );
}
