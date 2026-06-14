import { ImageResponse } from "next/og";
import { getAllHexagrams, getHexagramBySlug } from "@/lib/iching-data";
import { TRIGRAMS } from "@/lib/types";

export const alt = "I Ching Hexagram — GoEast.ai";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return getAllHexagrams().map((h) => ({ hexagram: h.slug }));
}

function renderHexagramLines(binary: string) {
  const lines = binary.split("");
  const lineHeight = 12;
  const lineGap = 8;
  const solidWidth = 120;
  const brokenWidth = 52;
  const brokenGap = 16;

  const elements = lines.map((bit, i) => {
    if (bit === "1") {
      return (
        <div
          key={i}
          style={{
            width: solidWidth,
            height: lineHeight,
            backgroundColor: "#2c1810",
            borderRadius: 2,
          }}
        />
      );
    }
    return (
      <div
        key={i}
        style={{
          display: "flex",
          gap: brokenGap,
        }}
      >
        <div
          style={{
            width: brokenWidth,
            height: lineHeight,
            backgroundColor: "#2c1810",
            borderRadius: 2,
          }}
        />
        <div
          style={{
            width: brokenWidth,
            height: lineHeight,
            backgroundColor: "#2c1810",
            borderRadius: 2,
          }}
        />
      </div>
    );
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: lineGap,
        alignItems: "center",
      }}
    >
      {elements}
    </div>
  );
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
          GoEast.ai
        </div>
      ),
      { ...size }
    );
  }

  const upperTrigram = TRIGRAMS.find((t) => t.name === hexagramData.upper_trigram);
  const lowerTrigram = TRIGRAMS.find((t) => t.name === hexagramData.lower_trigram);

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
          <div
            style={{
              fontSize: 14,
              backgroundColor: "#c0392b15",
              color: "#c0392b",
              padding: "4px 12px",
              borderRadius: 12,
              fontWeight: 600,
            }}
          >
            Hexagram {hexagramData.number}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 40,
            marginBottom: 24,
          }}
        >
          {renderHexagramLines(hexagramData.binary)}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div
              style={{
                fontSize: 48,
                fontWeight: 700,
                color: "#2c1810",
                lineHeight: 1.2,
              }}
            >
              {hexagramData.name}
            </div>
            <div
              style={{
                fontSize: 32,
                color: "#8b7355",
              }}
            >
              {hexagramData.name_zh}
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 16,
          }}
        >
          {upperTrigram ? (
            <div
              style={{
                fontSize: 16,
                color: "#8b7355",
                backgroundColor: "#e0d5c5",
                padding: "6px 14px",
                borderRadius: 12,
              }}
            >
              {upperTrigram.symbol} Upper: {upperTrigram.name_zh} ({upperTrigram.nature})
            </div>
          ) : null}
          {lowerTrigram ? (
            <div
              style={{
                fontSize: 16,
                color: "#8b7355",
                backgroundColor: "#e0d5c5",
                padding: "6px 14px",
                borderRadius: 12,
              }}
            >
              {lowerTrigram.symbol} Lower: {lowerTrigram.name_zh} ({lowerTrigram.nature})
            </div>
          ) : null}
        </div>
      </div>
    ),
    { ...size }
  );
}
