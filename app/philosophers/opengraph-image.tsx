import { ImageResponse } from "next/og";

export const alt = "Chinese Philosophers — GoEast.ai";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function PhilosophersOG() {
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
          <span>Chinese Philosophers</span>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 20,
            color: "#8b7355",
          }}
        >
          <span>3,000 years of Chinese thought through 11 great thinkers</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
