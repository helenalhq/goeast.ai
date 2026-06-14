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
          GoEast.ai
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
          {philosopher ? (
            <div
              style={{
                fontSize: 14,
                color: "#8b7355",
                backgroundColor: "#e0d5c5",
                padding: "4px 12px",
                borderRadius: 12,
              }}
            >
              {philosopher.name_zh} · {philosopher.name}
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
          {insight.title}
        </div>
        {insight.title_zh ? (
          <div
            style={{
              fontSize: 24,
              color: "#8b7355",
            }}
          >
            {insight.title_zh}
          </div>
        ) : null}
      </div>
    ),
    { ...size }
  );
}
