import { ImageResponse } from "next/og";
import { getAllHexagrams, getHexagramBySlug } from "@/lib/iching-data";

export const alt = "I Ching Hexagram — GoEast.ai";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return getAllHexagrams().map((h) => ({ hexagram: h.slug }));
}

export default async function HexagramOG({
  params,
}: {
  params: Promise<{ hexagram: string }>;
}) {
  const { hexagram } = await params;
  const hexagramData = getHexagramBySlug(hexagram);
  if (!hexagramData) {
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
            fontSize: 20,
            color: "#c0392b",
            fontWeight: 600,
            marginBottom: 16,
          }}
        >
          <span>GoEast.ai</span>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 16,
            color: "#c0392b",
            backgroundColor: "rgba(192,57,43,0.08)",
            padding: "4px 12px",
            borderRadius: 12,
            marginBottom: 24,
          }}
        >
          <span>Hexagram {hexagramData.number}</span>
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
          <span>{hexagramData.name}</span>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 24,
            color: "#8b7355",
            marginBottom: 32,
          }}
        >
          <span>The Book of Changes</span>
        </div>
        <div
          style={{
            display: "flex",
            gap: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 16,
              color: "#8b7355",
              backgroundColor: "#e0d5c5",
              padding: "6px 14px",
              borderRadius: 12,
            }}
          >
            <span>Upper: {hexagramData.upper_trigram}</span>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 16,
              color: "#8b7355",
              backgroundColor: "#e0d5c5",
              padding: "6px 14px",
              borderRadius: 12,
            }}
          >
            <span>Lower: {hexagramData.lower_trigram}</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
