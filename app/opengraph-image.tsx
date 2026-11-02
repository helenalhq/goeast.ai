import { ImageResponse } from "next/og";

export const alt = "GoEast.ai — I Ching Readings & Zi Wei Dou Shu";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function ImageOG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#faf5ef",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: "#c0392b",
              letterSpacing: "-0.02em",
            }}
          >
            GoEast.ai
          </div>
        </div>
        <div
          style={{
            fontSize: 28,
            color: "#2c1810",
            marginBottom: 12,
          }}
        >
          I Ching Readings &amp; Zi Wei Dou Shu
        </div>
        <div
          style={{
            fontSize: 20,
            color: "#8b7355",
          }}
        >
          Classical text · AI interpretation · Private action record
        </div>
        <div
          style={{
            marginTop: 32,
            fontSize: 18,
            color: "#8b7355",
            opacity: 0.6,
          }}
        >
          易经解读 · 紫微斗数 · 中国旅行指南
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
