import { ImageResponse } from "next/og";
import { getJourneyBySlug, getJourneySlugs } from "@/lib/journeys";

export const alt = "Sophie's Journey East";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return getJourneySlugs().map((slug) => ({ slug }));
}

export default async function JourneyOG({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const journey = getJourneyBySlug(slug);
  if (!journey) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#faf5ef",
            fontSize: 32,
            color: "#8b7355",
          }}
        >
          GoEast.ai
        </div>
      ),
      { ...size }
    );
  }

  const chapterLabel =
    journey.chapter === 0
      ? "PROLOGUE"
      : journey.chapter === 11
      ? "EPILOGUE"
      : `CHAPTER ${journey.chapter}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px 80px",
          backgroundColor: "#faf5ef",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontSize: 14,
              color: "#ffffff",
              backgroundColor: journey.color,
              padding: "4px 12px",
              borderRadius: 12,
              fontWeight: 600,
            }}
          >
            {chapterLabel}
          </div>
          {journey.school ? (
            <div
              style={{
                fontSize: 14,
                color: "#8b7355",
              }}
            >
              {journey.school}
            </div>
          ) : null}
        </div>
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: "#2c1810",
            marginBottom: 8,
            lineHeight: 1.2,
            maxWidth: 900,
          }}
        >
          {journey.title}
        </div>
        <div
          style={{
            fontSize: 24,
            color: "#8b7355",
            marginBottom: 16,
          }}
        >
          {journey.title_zh}
        </div>
        {journey.philosopher ? (
          <div
            style={{
              fontSize: 20,
              color: journey.color,
              fontWeight: 600,
            }}
          >
            {[
              journey.philosopher,
              journey.philosopher_zh ? `· ${journey.philosopher_zh}` : null,
              journey.era ? `· ${journey.era}` : null,
            ]
              .filter(Boolean)
              .join(" ")}
          </div>
        ) : null}
      </div>
    ),
    { ...size }
  );
}
