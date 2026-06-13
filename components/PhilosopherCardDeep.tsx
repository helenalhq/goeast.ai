import Image from "next/image";
import Link from "next/link";
import { PhilosopherMeta, SCHOOLS, getPhilosopherImage } from "@/lib/types";

export default function PhilosopherCardDeep({ philosopher }: { philosopher: PhilosopherMeta }) {
  const school = SCHOOLS.find((s) => s.id === philosopher.school);
  const portrait = philosopher.portrait_slug ? getPhilosopherImage(philosopher.portrait_slug) : null;

  return (
    <Link href={`/philosophers/${philosopher.slug}`} className="group block">
      <div className="bg-white rounded-xl border border-sand hover:border-warm/40 transition-all overflow-hidden">
        <div className="relative aspect-[2/3] overflow-hidden">
          {portrait ? (
            <Image
              src={portrait}
              alt={`${philosopher.name} — ${philosopher.name_zh}`}
              fill
              className="object-cover object-top group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div
              className="flex items-center justify-center w-full h-full text-6xl"
              style={{ backgroundColor: school?.color || "#8b7355" }}
            >
              <span className="text-white/80">{school?.symbol || "?"}</span>
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="text-lg font-semibold text-ink group-hover:text-china-red transition-colors">
            {philosopher.name}
          </h3>
          <p className="text-sm text-warm">{philosopher.name_zh}</p>
          {school && (
            <p className="text-xs text-warm/60 mt-1">
              {school.name} · {school.name_zh}
            </p>
          )}
          <p className="text-xs text-warm/50 mt-1">{philosopher.era}</p>
        </div>
      </div>
    </Link>
  );
}
