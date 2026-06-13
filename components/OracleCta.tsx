import Link from "next/link";
import { SCHOOLS } from "@/lib/types";

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
  const defaultMsg = philosopherName
    ? `Want to speak with ${philosopherName} ${philosopherNameZh || ""}? Try the Oracle.`
    : "Want to consult a Chinese philosopher? Try the Oracle.";
  const displayMsg = message || defaultMsg;

  return (
    <div className="mt-12 p-6 bg-cream rounded-xl border border-sand text-center">
      <p className="text-ink font-serif text-lg mb-4">{displayMsg}</p>
      <Link
        href="/sophies-journey"
        className="inline-block px-6 py-2.5 rounded-full text-white font-medium text-sm transition-colors hover:opacity-90"
        style={{ backgroundColor: accentColor }}
      >
        Consult the Oracle →
      </Link>
      <p className="text-xs text-warm/50 mt-2">Free: 3 consultations per day · Pro: 10 per day + deep features</p>
    </div>
  );
}
