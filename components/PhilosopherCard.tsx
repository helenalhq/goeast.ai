import Image from "next/image";
import Link from "next/link";
import { JourneyMeta, SCHOOLS, getPhilosopherImage } from "@/lib/types";

/** SVG fallback icons by school id — minimal linear strokes */
function SchoolIcon({ schoolId }: { schoolId: string }) {
  const common = {
    viewBox: "0 0 40 40",
    style: {
      width: 36,
      height: 36,
      stroke: "#2c1810",
      strokeWidth: 1,
      strokeLinecap: "round" as const,
      fill: "none",
      opacity: 0.3,
    },
  };

  switch (schoolId) {
    case "confucianism":
      return (
        <svg {...common}>
          <line x1="20" y1="6" x2="20" y2="34" strokeWidth="1.5" />
          <line x1="10" y1="16" x2="30" y2="16" strokeWidth="1" />
          <line x1="12" y1="26" x2="28" y2="26" strokeWidth="0.8" opacity="0.5" />
        </svg>
      );
    case "daoism":
      return (
        <svg {...common}>
          <path d="M10 8 Q10 20 20 20 Q30 20 30 32" strokeWidth="1.5" fill="none" />
          <circle cx="10" cy="8" r="1.5" fill="#2c1810" stroke="none" opacity="0.4" />
        </svg>
      );
    case "strategy":
      return (
        <svg {...common}>
          <line x1="28" y1="8" x2="12" y2="32" strokeWidth="1.8" />
          <line x1="24" y1="10" x2="30" y2="8" strokeWidth="0.8" opacity="0.4" />
        </svg>
      );
    case "mohism":
      return (
        <svg {...common}>
          <circle cx="20" cy="20" r="10" strokeWidth="1.2" fill="none" />
          <circle cx="20" cy="20" r="2" fill="#2c1810" stroke="none" opacity="0.5" />
        </svg>
      );
    case "mind-school":
      return (
        <svg {...common}>
          <circle cx="20" cy="20" r="2.5" fill="#2c1810" stroke="none" />
          <path d="M14 14 Q20 8 26 14" strokeWidth="0.8" fill="none" opacity="0.4" />
          <path d="M14 26 Q20 32 26 26" strokeWidth="0.8" fill="none" opacity="0.4" />
        </svg>
      );
    case "neo-confucianism":
      return (
        <svg {...common}>
          <line x1="8" y1="8" x2="32" y2="8" strokeWidth="1.2" />
          <line x1="8" y1="16" x2="32" y2="16" strokeWidth="1" />
          <line x1="8" y1="24" x2="32" y2="24" strokeWidth="0.8" opacity="0.6" />
          <line x1="8" y1="32" x2="24" y2="32" strokeWidth="0.6" opacity="0.4" />
        </svg>
      );
    case "zen":
      return (
        <svg {...common}>
          <circle cx="20" cy="20" r="12" strokeWidth="1.2" fill="none" />
          <circle cx="20" cy="20" r="4" strokeWidth="0.8" fill="none" opacity="0.5" />
          <circle cx="20" cy="20" r="1" fill="#2c1810" stroke="none" opacity="0.6" />
        </svg>
      );
    case "ancient":
      return (
        <svg {...common}>
          <path d="M20 6 L20 34" strokeWidth="1.5" />
          <path d="M12 12 L28 12" strokeWidth="1" />
          <path d="M10 20 L30 20" strokeWidth="1" opacity="0.6" />
          <path d="M14 28 L26 28" strokeWidth="0.8" opacity="0.4" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="20" cy="20" r="6" strokeWidth="1" fill="none" />
          <circle cx="20" cy="20" r="1.5" fill="#2c1810" stroke="none" opacity="0.4" />
        </svg>
      );
  }
}

export default function PhilosopherCard({ journey }: { journey: JourneyMeta }) {
  const school = SCHOOLS.find((s) => s.id === journey.school);
  const imagePath = getPhilosopherImage(journey.slug);

  return (
    <Link href={`/sophies-journey/${journey.slug}`} className="block group">
      <div className="bg-cream/60 rounded-sm overflow-hidden shadow-sm hover:shadow-md transition-shadow text-center h-full">
        {imagePath ? (
          <div className="relative aspect-[3/4] overflow-hidden">
            <Image
              src={imagePath}
              alt={`${journey.philosopher} portrait`}
              fill
              className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
            />
            {/* Bottom gradient overlay */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "50%",
                background: "linear-gradient(to top, rgba(44,24,16,0.12), transparent)",
              }}
            />
          </div>
        ) : (
          <div className="h-24 flex items-center justify-center">
            <SchoolIcon schoolId={journey.school || ""} />
          </div>
        )}
        <div className="p-5">
          <h3 className="font-serif font-semibold text-ink group-hover:text-china-red transition-colors text-sm">
            {journey.philosopher || "Journey's End"}
          </h3>
          {journey.philosopher_zh && (
            <p className="font-serif text-xs text-warm mt-0.5">{journey.philosopher_zh}</p>
          )}
          {school && (
            <p className="text-[11px] text-warm/60 mt-1.5">
              {school.name_zh}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
