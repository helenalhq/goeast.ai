import Link from "next/link";
import { HexagramLines } from "./HexagramDisplay";

export default function Hero() {
  return (
    <section
      className="relative"
      style={{
        minHeight: 520,
        display: "flex",
        alignItems: "center",
        background: "#101923",
        overflow: "hidden",
        maxWidth: "100%",
      }}
    >
      {/* Subtle radial glow — static, not animated */}
      <div
        style={{
          position: "absolute",
          top: "-20%",
          right: "-10%",
          width: "60%",
          height: "80%",
          background:
            "radial-gradient(ellipse, rgba(142,109,69,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* SVG Mountain Silhouettes — kept from original, adjusted for deep blue */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          height: "45%",
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        <svg
          viewBox="0 0 1920 600"
          preserveAspectRatio="none"
          fill="none"
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          <path
            d="M0 600V280L180 180L360 260L520 140L700 240L880 180L1060 280L1240 200L1420 260L1600 160L1780 240L1920 200V600H0Z"
            fill="#0D151E"
          />
          <path
            d="M0 600V380L220 280L420 360L580 240L760 340L940 280L1120 380L1300 300L1480 360L1660 260L1840 320L1920 300V600H0Z"
            fill="#0A111A"
          />
          <path
            d="M0 600V480L240 400L480 460L660 360L840 440L1020 380L1200 480L1380 400L1560 460L1740 380L1920 440V600H0Z"
            fill="#070E16"
          />
        </svg>
      </div>

      {/* Content — left text + right hexagram card on desktop; stacked on mobile */}
      <div
        className="relative"
        style={{
          maxWidth: 1152,
          margin: "0 auto",
          padding: "64px 32px",
          width: "100%",
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 64,
          alignItems: "center",
        }}
      >
        {/* Left: text content */}
        <div>
          {/* Eyebrow */}
          <p
            style={{
              fontSize: 13,
              letterSpacing: "0.15em",
              color: "#8e6d45",
              textTransform: "uppercase",
              marginBottom: 16,
              fontWeight: 500,
            }}
          >
            东方观象台 · Observatory
          </p>

          {/* H1 — consultation-first narrative, SEO keywords preserved */}
          <h1
            className="font-serif"
            style={{
              fontSize: "clamp(32px, 4.5vw, 48px)",
              fontWeight: 700,
              color: "#F2EDE4",
              lineHeight: 1.3,
              marginBottom: 12,
              letterSpacing: "0.01em",
            }}
          >
            I Ching, Zi Wei Astrology &amp; Relationship Readings
          </h1>

          {/* Chinese subtitle */}
          <p
            className="font-serif"
            style={{
              fontSize: "clamp(16px, 2.5vw, 22px)",
              fontWeight: 400,
              color: "#A8B3BE",
              marginBottom: 28,
            }}
          >
            人工智能驱动的中国哲学与中国实用指南
          </p>

          {/* Description */}
          <p
            style={{
              fontSize: 16,
              color: "#A8B3BE",
              lineHeight: 1.7,
              marginBottom: 32,
              maxWidth: 480,
            }}
          >
            I Ching consultation, Zi Wei Dou Shu natal charts, and relationship
            synastry — grounded in 3,000 years of Chinese philosophy, interpreted by AI.
          </p>

          {/* Primary CTA */}
          <div
            style={{
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <a
              href="/consult"
              style={{
                display: "inline-block",
                padding: "16px 36px",
                background: "#B84938",
                color: "#fff",
                fontSize: 16,
                fontWeight: 500,
                borderRadius: 8,
                textDecoration: "none",
                transition: "background 120ms ease-out",
              }}
            >
              Begin a Free Consultation →
            </a>
            <Link
              href="/insights"
              style={{
                display: "inline-block",
                padding: "16px 24px",
                background: "transparent",
                color: "#A8B3BE",
                fontSize: 15,
                fontWeight: 400,
                borderRadius: 8,
                border: "1px solid rgba(168,179,190,0.25)",
                textDecoration: "none",
                transition: "border-color 120ms ease-out, color 120ms ease-out",
              }}
            >
              Explore Guides
            </Link>
          </div>

          {/* Free quota note */}
          <p
            style={{
              fontSize: 13,
              color: "#A8B3BE",
              marginTop: 14,
            }}
          >
            Free · 3 readings per day · No coins needed
          </p>
        </div>

        {/* Right: example hexagram card — data-driven from lib/iching-data.ts */}
        <div
          className="hidden md:block"
          style={{
            background: "#192633",
            border: "1px solid #253548",
            borderRadius: 12,
            padding: 32,
            textAlign: "center",
            minWidth: 200,
          }}
        >
          <p
            className="font-serif"
            style={{ fontSize: 18, color: "#F2EDE4", marginBottom: 4 }}
          >
            恒 Heng · Duration
          </p>
          <p style={{ fontSize: 12, color: "#C8D0DA", marginBottom: 16 }}>
            Hexagram 32 · Changing line 3
          </p>
          <HexagramLines
            hexagramNumber={32}
            changingLines={[3]}
            size="lg"
            color="#F2EDE4"
          />
          <span
            style={{
              display: "inline-block",
              marginTop: 16,
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 4,
              background: "rgba(200,208,218,0.15)",
              color: "#C8D0DA",
              fontWeight: 500,
              border: "1px solid rgba(200,208,218,0.3)",
            }}
          >
            示例 Example
          </span>
        </div>
      </div>


      {/* Responsive grid override for mobile */}
      <style>{`
        @media (max-width: 767px) {
          section > div.relative {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
            padding: 48px 16px 72px !important;
            max-width: 100% !important;
            overflow-x: hidden !important;
          }
          section {
            min-height: auto !important;
          }
        }
      `}</style>
    </section>
  );
}
