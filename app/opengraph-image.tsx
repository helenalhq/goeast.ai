import { ImageResponse } from "next/og";

export const alt = "GoEast.ai — AI Skills for China";
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
          AI Skills for China
        </div>
        <div
          style={{
            fontSize: 20,
            color: "#8b7355",
          }}
        >
          Travel · Medical · Shopping · Accommodation
        </div>
        <div
          style={{
            marginTop: 32,
            fontSize: 18,
            color: "#8b7355",
            opacity: 0.6,
          }}
        >
          中国旅行 · 医疗 · 购物 · 住宿
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
