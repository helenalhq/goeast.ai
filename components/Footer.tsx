import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-sand mt-16 py-8">
      <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-sm text-warm">
          <span className="font-semibold text-ink">GoEast<span className="text-china-red">.ai</span></span>
          {" "}— Curated AI Skills for China
        </div>
        <div className="flex gap-6 text-sm text-warm">
          <Link href="/skills" className="hover:text-china-red transition-colors">Skills</Link>
          <Link href="/llms.txt" className="hover:text-china-red transition-colors">For Agents</Link>
          <Link href="/api/skills" className="hover:text-china-red transition-colors">API</Link>
          <Link href="/about" className="hover:text-china-red transition-colors">About</Link>
        </div>
      </div>
    </footer>
  );
}
