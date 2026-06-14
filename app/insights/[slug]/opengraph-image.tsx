import { ImageResponse } from "next/og";
import { getInsightBySlug, getInsightSlugs } from "@/lib/insights";
import { PHILOSOPHER_SLUGS } from "@/lib/types";

export const alt = "Philosophical Insight — GoEast.ai";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return getInsightSlugs().map((slug) => ({ slug }));
}

export default async function InsightOG({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const insight = getInsightBySlug(slug);
  if (!insight) {
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

  const philosopher = insight.philosopher_slug
    ? PHILOSOPHER_SLUGS[insight.philosopher_slug]
    : null;

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
          {philosopher ? (
            <div
              style={{
                display: "flex",
                fontSize: 14,
                color: "#8b7355",
                backgroundColor: "#e0d5c5",
                padding: "4px 12px",
                borderRadius: 12,
              }}
            >
              <span>{philosopher.name}</span>
            </div>
          ) : null}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 48,
            fontWeight: 700,
            color: "#2c1810",
            marginBottom: 12,
          }}
        >
          <span>{insight.title}</span>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 24,
            color: "#8b7355",
          }}
        >
          <span>Philosophical Insights</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
