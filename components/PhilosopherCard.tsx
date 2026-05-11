import Link from "next/link";
import { JourneyMeta, SCHOOLS } from "@/lib/types";

export default function PhilosopherCard({ journey }: { journey: JourneyMeta }) {
  const school = SCHOOLS.find((s) => s.id === journey.school);
  const symbol = school?.symbol || "●";

  return (
    <Link href={`/sophies-journey/${journey.slug}`} className="block group">
      <div className="bg-white rounded-xl border border-sand p-5 hover:border-china-red/30 hover:shadow-sm transition-all text-center h-full">
        <div className="text-3xl mb-3" style={{ color: journey.color }}>
          {symbol}
        </div>
        <h3 className="font-semibold text-ink group-hover:text-china-red transition-colors">
          {journey.philosopher || "Journey's End"}
        </h3>
        {journey.philosopher_zh && (
          <p className="text-sm text-warm mt-0.5">{journey.philosopher_zh}</p>
        )}
        {school && (
          <p className="text-xs text-warm/70 mt-2">
            {school.name} · {school.name_zh}
          </p>
        )}
        <p className="text-xs text-warm/50 mt-1">{journey.era}</p>
      </div>
    </Link>
  );
}
