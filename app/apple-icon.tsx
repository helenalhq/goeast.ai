import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "22%",
          background: "#c0392b",
        }}
      >
        {/* Compass arrow pointing East */}
        <svg
          width="120"
          height="120"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Circle outline */}
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="#faf5ef"
            strokeWidth="1.2"
            fill="none"
            opacity="0.4"
          />
          {/* East-pointing arrow */}
          <path
            d="M6 12 L18 12 M14 7 L19 12 L14 17"
            stroke="#faf5ef"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
