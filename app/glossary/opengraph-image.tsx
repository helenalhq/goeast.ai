import { ImageResponse } from "next/og";

export const alt = "Chinese Philosophy Glossary — GoEast.ai";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function GlossaryOG() {
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
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 64,
            fontWeight: 700,
            color: "#c0392b",
            marginBottom: 24,
          }}
        >
          <span>GoEast.ai</span>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 28,
            color: "#2c1810",
            marginBottom: 12,
          }}
        >
          <span>Chinese Philosophy Glossary</span>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 20,
            color: "#8b7355",
          }}
        >
          <span>Dao, Wuwei, Ren, Yin-Yang, Qi and 20 more terms explained</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
