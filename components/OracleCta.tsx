import Link from "next/link";
import { SCHOOLS, getPhilosopherMeta } from "@/lib/types";

// Generic CTAs (homepage, listings) land on Zhou Gong — the traditional
// oracle of divination — whose chapter hosts the Consult entry.
const DEFAULT_ORACLE_JOURNEY = "prologue-zhougong";

export default function OracleCta({
  philosopherSlug,
  philosopherName,
  philosopherNameZh,
  schoolId,
  message,
}: {
  philosopherSlug?: string;
  philosopherName?: string;
  philosopherNameZh?: string;
  schoolId?: string;
  message?: string;
}) {
  const school = schoolId ? SCHOOLS.find((s) => s.id === schoolId) : null;
  const accentColor = school?.color || "#c0392b";
  const journeySlug = getPhilosopherMeta(philosopherSlug || "")?.portrait_slug || DEFAULT_ORACLE_JOURNEY;
  const defaultMsg = philosopherName
    ? `Want to speak with ${philosopherName} ${philosopherNameZh || ""}? Try the Oracle.`
    : "Want to consult a Chinese philosopher? Try the Oracle.";
  const displayMsg = message || defaultMsg;

  return (
    <div className="mt-12 p-6 bg-cream/60 rounded-sm text-center">
      <p className="font-serif text-ink text-lg mb-4">{displayMsg}</p>
      <Link
        href={`/sophies-journey/${journeySlug}#oracle`}
        className="inline-block px-7 py-3 rounded-sm text-white font-medium text-sm transition-colors hover:opacity-90 no-underline"
        style={{ backgroundColor: accentColor }}
      >
        Consult the Oracle →
      </Link>
      <p className="text-xs text-warm/50 mt-2">Free: 3 consultations per day · Pro: 10 per day + deep readings</p>
    </div>
  );
}
