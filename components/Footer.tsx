import Link from "next/link";
import FooterFeedbackButton from "./FooterFeedbackButton";

export default function Footer() {
  return (
    <footer className="border-t border-sand mt-16">
      {/* Row 1: Main navigation */}
      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-wrap justify-center gap-6">
        <Link href="/philosophers" className="text-sm text-ink hover:text-china-red transition-colors no-underline">Philosophers</Link>
        <Link href="/iching" className="text-sm text-ink hover:text-china-red transition-colors no-underline">I Ching</Link>
        <Link href="/glossary" className="text-sm text-ink hover:text-china-red transition-colors no-underline">Glossary</Link>
        <Link href="/insights" className="text-sm text-ink hover:text-china-red transition-colors no-underline">Insights</Link>
        <Link href="/skills" className="text-sm text-ink hover:text-china-red transition-colors no-underline">Skills</Link>
        <Link href="/#journey" className="text-sm text-ink hover:text-china-red transition-colors no-underline">Journey</Link>
        <FooterFeedbackButton />
      </div>

      {/* Divider */}
      <hr className="max-w-6xl mx-auto border-none border-t border-sand opacity-50" />

      {/* Row 2: Secondary links */}
      <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap justify-center gap-5">
        <Link href="/about" className="text-xs text-warm/60 hover:text-warm transition-colors no-underline">About</Link>
        <Link href="/contact" className="text-xs text-warm/60 hover:text-warm transition-colors no-underline">Contact</Link>
        <Link href="/llms.txt" className="text-xs text-warm/60 hover:text-warm transition-colors no-underline">For Agents</Link>
        <Link href="/api/skills" className="text-xs text-warm/60 hover:text-warm transition-colors no-underline">API</Link>
      </div>

      {/* Row 3: Copyright */}
      <div className="max-w-6xl mx-auto px-4 pb-8 flex justify-center">
        <span className="text-xs text-warm/40">© 2024 GoEast.ai — 苏菲的东方之旅</span>
      </div>
    </footer>
  );
}
