import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-sand bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-ink">
          GoEast<span className="text-china-red">.ai</span>
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <Link
            href="/skills"
            className="text-warm hover:text-china-red transition-colors"
          >
            Skills
          </Link>
          <Link
            href="/categories/travel"
            className="text-warm hover:text-china-red transition-colors"
          >
            Categories
          </Link>
          <Link
            href="/about"
            className="text-warm hover:text-china-red transition-colors"
          >
            About
          </Link>
          <Link
            href="/contact"
            className="text-warm hover:text-china-red transition-colors"
          >
            Contact
          </Link>
          <Link
            href="/submit"
            className="bg-china-red text-white px-4 py-1.5 rounded-lg text-sm hover:bg-china-red/90 transition-colors"
          >
            Submit
          </Link>
        </div>
      </nav>
    </header>
  );
}
