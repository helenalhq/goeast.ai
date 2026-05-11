import Link from "next/link";
import { JourneyMeta } from "@/lib/types";

export default function JourneyTimeline({ journeys }: { journeys: JourneyMeta[] }) {
  return (
    <div className="relative">
      <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-sand" />
      <div className="space-y-8">
        {journeys.map((journey) => {
          const isLeft = journey.chapter % 2 === 0;
          return (
            <div
              key={journey.slug}
              className={`relative flex items-center ${
                isLeft ? "md:flex-row" : "md:flex-row-reverse"
              } flex-row`}
            >
              <div
                className="absolute left-4 md:left-1/2 w-4 h-4 rounded-full border-2 border-white -translate-x-1/2 z-10"
                style={{ backgroundColor: journey.color }}
              />
              <div className={`ml-12 md:ml-0 ${isLeft ? "md:mr-auto md:pr-12" : "md:ml-auto md:pl-12"} md:w-1/2`}>
                <Link href={`/sophies-journey/${journey.slug}`} className="block group">
                  <div className="bg-white rounded-xl border border-sand p-5 hover:border-china-red/30 hover:shadow-sm transition-all">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: journey.color }}
                      >
                        {journey.chapter === 0 ? "Prologue" : journey.chapter === 11 ? "Epilogue" : `Chapter ${journey.chapter}`}
                      </span>
                      {journey.school && (
                        <span className="text-xs text-warm">{journey.school}</span>
                      )}
                    </div>
                    <h3 className="font-semibold text-ink group-hover:text-china-red transition-colors">
                      {journey.title}
                    </h3>
                    <p className="text-sm text-warm mt-1">{journey.title_zh}</p>
                    {journey.philosopher && (
                      <p className="text-xs text-warm/70 mt-2">
                        {journey.philosopher} {journey.philosopher_zh} · {journey.era}
                      </p>
                    )}
                  </div>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
