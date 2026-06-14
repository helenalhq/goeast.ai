import { ImageResponse } from "next/og";
import { getPhilosopherBySlug, getPhilosopherSlugs } from "@/lib/philosophers";
import { SCHOOLS } from "@/lib/types";

export const alt = "Chinese Philosopher — GoEast.ai";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return getPhilosopherSlugs().map((slug) => ({ slug }));
}

export default async function PhilosopherOG({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const philosopher = getPhilosopherBySlug(slug);
  if (!philosopher) {
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

  const schoolInfo = SCHOOLS.find((s) => s.id === philosopher.school);
  const schoolColor = schoolInfo?.color || "#8b7355";

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
              fontSize: 20,
              color: "#c0392b",
              fontWeight: 600,
            }}
          >
            GoEast.ai
          </div>
          {schoolInfo ? (
            <div
              style={{
                fontSize: 14,
                backgroundColor: schoolColor + "15",
                color: schoolColor,
                padding: "4px 12px",
                borderRadius: 12,
              }}
            >
              {schoolInfo.symbol} {schoolInfo.name} · {schoolInfo.name_zh}
            </div>
          ) : null}
        </div>
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: "#2c1810",
            marginBottom: 12,
            lineHeight: 1.2,
            maxWidth: 900,
          }}
        >
          {philosopher.name}
        </div>
        <div
          style={{
            fontSize: 32,
            color: "#8b7355",
            marginBottom: 24,
          }}
        >
          {philosopher.name_zh}
        </div>
        {philosopher.era ? (
          <div
            style={{
              fontSize: 20,
              color: schoolColor,
              fontWeight: 600,
            }}
          >
            {philosopher.era}
          </div>
        ) : null}
      </div>
    ),
    { ...size }
  );
}
