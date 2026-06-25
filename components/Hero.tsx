import Link from "next/link";

export default function Hero() {
  return (
    <section
      className="relative text-center overflow-hidden"
      style={{
        minHeight: 520,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(170deg, #1a1410 0%, #2c1810 50%, #3d2518 100%)",
      }}
    >
      {/* SVG Mountain Silhouettes */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          height: "55%",
          pointerEvents: "none",
        }}
      >
        <svg
          viewBox="0 0 1920 600"
          preserveAspectRatio="xMidYMax slice"
          fill="none"
          style={{ width: "100%", height: "100%" }}
        >
          {/* Far mountains */}
          <path
            d="M0,380 Q120,220 320,310 Q480,180 680,290 Q840,160 1020,270 Q1180,190 1340,260 Q1500,170 1680,250 Q1800,200 1920,240 L1920,600 L0,600Z"
            fill="white"
            opacity="0.04"
          />
          {/* Mid mountains */}
          <path
            d="M0,440 Q200,320 420,390 Q560,280 760,360 Q920,290 1100,350 Q1260,300 1420,340 Q1600,280 1780,330 Q1860,310 1920,320 L1920,600 L0,600Z"
            fill="white"
            opacity="0.055"
          />
          {/* Near mountains */}
          <path
            d="M0,500 Q160,420 360,460 Q520,390 700,440 Q860,400 1040,430 Q1200,390 1380,420 Q1540,400 1700,430 Q1820,410 1920,420 L1920,600 L0,600Z"
            fill="white"
            opacity="0.07"
          />
          {/* Mist layer */}
          <path
            d="M0,540 Q400,510 800,530 Q1200,500 1600,520 Q1800,510 1920,520 L1920,600 L0,600Z"
            fill="white"
            opacity="0.03"
          />
        </svg>
      </div>

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          padding: "80px 24px 100px",
          maxWidth: 720,
        }}
      >
        {/* Eyebrow — mono small text */}
        <p
          className="font-mono"
          style={{
            fontSize: 11,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.35)",
            marginBottom: 24,
          }}
        >
          AI × Eastern Wisdom
        </p>

        {/* English main title — serif large */}
        <h1
          className="font-serif"
          style={{
            fontSize: "clamp(36px, 6vw, 60px)",
            fontWeight: 700,
            color: "#fff",
            lineHeight: 1.2,
            marginBottom: 8,
            letterSpacing: "0.04em",
          }}
        >
          Sophie&apos;s Journey East
        </h1>

        {/* Chinese subtitle — serif, subdued */}
        <p
          className="font-serif"
          style={{
            fontSize: "clamp(18px, 3vw, 28px)",
            fontWeight: 400,
            color: "rgba(255,255,255,0.45)",
            marginBottom: 28,
          }}
        >
          苏菲的东方之旅
        </p>

        {/* Functional description — English primary */}
        <p
          style={{
            fontSize: 17,
            color: "rgba(255,255,255,0.75)",
            lineHeight: 1.8,
            marginBottom: 12,
            maxWidth: 560,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          AI-powered Chinese philosophy exploration — from Confucius to the I Ching,
          <br />
          3,000 years of thought, reawakened through AI conversation.
        </p>

        {/* Poetic sub-text — Chinese secondary */}
        <p
          className="font-serif"
          style={{
            fontSize: 14,
            color: "rgba(255,255,255,0.30)",
            fontStyle: "italic",
            marginBottom: 36,
          }}
        >
          跨越书页，一位少女东行，遇见塑造文明的哲人。
        </p>

        {/* Buttons — rounded-sm */}
        <div
          style={{
            display: "flex",
            gap: 16,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <a
            href="#journey"
            style={{
              display: "inline-block",
              padding: "12px 28px",
              background: "#c0392b",
              color: "#fff",
              fontSize: 15,
              fontWeight: 500,
              borderRadius: 4,
              textDecoration: "none",
            }}
          >
            Begin the Journey →
          </a>
          <Link
            href="/skills"
            style={{
              display: "inline-block",
              padding: "12px 28px",
              background: "transparent",
              color: "rgba(255,255,255,0.65)",
              fontSize: 15,
              fontWeight: 400,
              borderRadius: 4,
              border: "1px solid rgba(255,255,255,0.20)",
              textDecoration: "none",
            }}
          >
            Browse Skills
          </Link>
        </div>
      </div>

      {/* Hero bottom fade to cream */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 120,
          background: "linear-gradient(to bottom, transparent, #faf5ef)",
          zIndex: 1,
          pointerEvents: "none",
        }}
      />
    </section>
  );
}
