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
          <span>GoEast.ai</span>
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
          alignItems: "center",
          backgroundColor: "#faf5ef",
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
              display: "flex",
              fontSize: 20,
              color: "#c0392b",
              fontWeight: 600,
            }}
          >
            <span>GoEast.ai</span>
          </div>
          {schoolInfo ? (
            <div
              style={{
                display: "flex",
                fontSize: 14,
                backgroundColor: "rgba(0,0,0,0.05)",
                color: schoolColor,
                padding: "4px 12px",
                borderRadius: 12,
              }}
            >
              <span>{schoolInfo.name}</span>
            </div>
          ) : null}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 56,
            fontWeight: 700,
            color: "#2c1810",
            marginBottom: 12,
          }}
        >
          <span>{philosopher.name}</span>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 24,
            color: "#8b7355",
          }}
        >
          <span>{philosopher.era} — Chinese Philosopher</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
