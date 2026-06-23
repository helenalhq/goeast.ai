import Image from "next/image";
import Link from "next/link";
import { JourneyMeta, getPhilosopherImage } from "@/lib/types";

export default function JourneyTimeline({ journeys }: { journeys: JourneyMeta[] }) {
  return (
    <div className="relative">
      <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-sand" />
      <div className="space-y-8">
        {journeys.map((journey) => {
          const isLeft = journey.chapter % 2 === 0;
          const imagePath = getPhilosopherImage(journey.slug);
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
                  <div className="bg-cream/60 rounded-sm overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    {imagePath ? (
                      <div className="flex">
                        {/* Portrait thumbnail */}
                        <div className="relative w-20 sm:w-24 flex-shrink-0">
                          <Image
                            src={imagePath}
                            alt={`${journey.philosopher} portrait`}
                            width={96}
                            height={144}
                            className="object-cover object-top h-full group-hover:scale-105 transition-transform duration-500"
                          />
                          {/* Bottom ink gradient overlay */}
                          <div
                            style={{
                              position: "absolute",
                              bottom: 0,
                              left: 0,
                              right: 0,
                              height: "40%",
                              background: "linear-gradient(to top, rgba(44,24,16,0.15), transparent)",
                            }}
                          />
                        </div>
                        {/* Text content */}
                        <div className="flex-1 p-5 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span
                              className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded-sm text-white"
                              style={{ backgroundColor: journey.color }}
                            >
                              {journey.chapter === 0 ? "Prologue" : journey.chapter === 11 ? "Epilogue" : `Ch.${journey.chapter}`}
                            </span>
                            {journey.school && (
                              <span className="text-[10px] text-warm">{journey.school_zh}</span>
                            )}
                          </div>
                          <h3 className="font-serif font-semibold text-ink group-hover:text-china-red transition-colors text-sm leading-tight">
                            {journey.title}
                          </h3>
                          <p className="font-serif text-xs text-warm mt-0.5 truncate">{journey.title_zh}</p>
                          {journey.philosopher && (
                            <p className="font-mono text-[11px] text-warm/70 mt-1.5">
                              {journey.philosopher} · {journey.era}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className="font-mono text-xs font-medium px-2 py-0.5 rounded-sm text-white"
                            style={{ backgroundColor: journey.color }}
                          >
                            {journey.chapter === 0 ? "Prologue" : journey.chapter === 11 ? "Epilogue" : `Chapter ${journey.chapter}`}
                          </span>
                          {journey.school && (
                            <span className="text-xs text-warm">{journey.school}</span>
                          )}
                        </div>
                        <h3 className="font-serif font-semibold text-ink group-hover:text-china-red transition-colors">
                          {journey.title}
                        </h3>
                        <p className="font-serif text-sm text-warm mt-1">{journey.title_zh}</p>
                        {journey.philosopher && (
                          <p className="font-mono text-xs text-warm/70 mt-2">
                            {journey.philosopher} {journey.philosopher_zh} · {journey.era}
                          </p>
                        )}
                      </div>
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
