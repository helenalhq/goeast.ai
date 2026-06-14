"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) =>
      setUser(session?.user ?? null),
    );
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [menuOpen]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setMenuOpen(false);
  };

  const initial = user?.email?.charAt(0).toUpperCase() || "?";

  return (
    <header className="border-b border-sand bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-ink">
          GoEast<span className="text-china-red">.ai</span>
        </Link>
        <div className="flex items-center gap-5 text-sm">
          <Link
            href="/philosophers"
            className="text-warm hover:text-china-red transition-colors"
          >
            Philosophers
          </Link>
          <Link
            href="/iching"
            className="text-warm hover:text-china-red transition-colors"
          >
            I Ching
          </Link>
          <Link
            href="/glossary"
            className="text-warm hover:text-china-red transition-colors"
          >
            Glossary
          </Link>
          <Link
            href="/insights"
            className="text-warm hover:text-china-red transition-colors"
          >
            Insights
          </Link>
          <Link
            href="/skills"
            className="text-warm hover:text-china-red transition-colors"
          >
            Skills
          </Link>
          <Link
            href="/about"
            className="text-warm hover:text-china-red transition-colors"
          >
            About
          </Link>

          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="w-8 h-8 rounded-full bg-china-red text-white text-sm font-medium flex items-center justify-center hover:bg-china-red/90 transition-colors cursor-pointer"
                aria-label="User menu"
              >
                {initial}
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-sand py-1 z-50">
                  <div className="px-4 py-2 text-xs text-warm truncate border-b border-sand">
                    {user.email}
                  </div>
                  <Link
                    href="/account"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-ink hover:bg-cream/50 transition-colors"
                  >
                    Account
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-warm hover:bg-cream/50 transition-colors cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="text-warm hover:text-china-red transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/submit"
                className="bg-china-red text-white px-4 py-1.5 rounded-lg text-sm hover:bg-china-red/90 transition-colors"
              >
                Submit
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
