import Image from "next/image";
import Link from "next/link";
import { JourneyMeta, SCHOOLS, getPhilosopherImage } from "@/lib/types";

export default function PhilosopherCard({ journey }: { journey: JourneyMeta }) {
  const school = SCHOOLS.find((s) => s.id === journey.school);
  const symbol = school?.symbol || "●";
  const imagePath = getPhilosopherImage(journey.slug);

  return (
    <Link href={`/sophies-journey/${journey.slug}`} className="block group">
      <div className="bg-white rounded-xl border border-sand overflow-hidden hover:border-china-red/30 hover:shadow-md transition-all text-center h-full">
        {imagePath ? (
          <div className="relative aspect-[3/4] overflow-hidden">
            <Image
              src={imagePath}
              alt={`${journey.philosopher} portrait`}
              fill
              className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
            />
          </div>
        ) : (
          <div className="h-24 flex items-center justify-center">
            <div className="text-3xl" style={{ color: journey.color }}>
              {symbol}
            </div>
          </div>
        )}
        <div className="p-3">
          <h3 className="font-semibold text-ink group-hover:text-china-red transition-colors text-sm">
            {journey.philosopher || "Journey's End"}
          </h3>
          {journey.philosopher_zh && (
            <p className="text-xs text-warm mt-0.5">{journey.philosopher_zh}</p>
          )}
          {school && (
            <p className="text-[11px] text-warm/70 mt-1.5">
              {school.name_zh}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
