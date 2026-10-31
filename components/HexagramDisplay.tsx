import { getHexagramByNumber } from "@/lib/iching-data";

/**
 * Data-driven hexagram line renderer.
 * Reads binary from lib/iching-data.ts — never hardcodes lines.
 * Renders bottom-to-top (traditional order, matching binary index).
 */
export function HexagramLines({
  hexagramNumber,
  changingLines = [],
  size = "md",
  color = "current",
  changingColor = "#B84938",
}: {
  hexagramNumber: number;
  changingLines?: number[];
  size?: "sm" | "md" | "lg";
  color?: string;
  changingColor?: string;
}) {
  const hexagram = getHexagramByNumber(hexagramNumber);
  if (!hexagram) return null;

  const fontSizes = { sm: "16px", md: "20px", lg: "24px" };
  const widths = { sm: "48px", md: "64px", lg: "80px" };

  // binary[0] = line 1 (bottom), binary[5] = line 6 (top)
  // Render top-to-bottom for visual display: reverse the array
  const lines = hexagram.binary.split("").map((bit, i) => ({
    lineNumber: i + 1,
    isYang: bit === "1",
    isChanging: changingLines.includes(i + 1),
  })).reverse();

  return (
    <div
      aria-label={`Hexagram ${hexagram.number} ${hexagram.name} (${hexagram.name_zh}), ${changingLines.length > 0 ? `changing line${changingLines.length > 1 ? "s" : ""} ${changingLines.join(", ")}` : "static"}`}
      style={{
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: fontSizes[size],
        lineHeight: 1.7,
        color,
        textAlign: "center",
        width: widths[size],
      }}
    >
      {lines.map((line) => (
        <div
          key={line.lineNumber}
          style={{
            color: line.isChanging ? changingColor : "inherit",
            fontWeight: line.isChanging ? "bold" : "normal",
          }}
        >
          {line.isYang ? "━━━━━" : "━━ ━━"}
          {line.isChanging && <span style={{ fontSize: "0.7em", marginLeft: "4px" }}>◦</span>}
        </div>
      ))}
    </div>
  );
}

/**
 * Full hexagram card with name, number, visual, and changing-line note.
 * Data-driven from lib/iching-data.ts.
 */
export function HexagramCard({
  hexagramNumber,
  changingLines = [],
  label,
  compact = false,
}: {
  hexagramNumber: number;
  changingLines?: number[];
  label?: string;
  compact?: boolean;
}) {
  const hexagram = getHexagramByNumber(hexagramNumber);
  if (!hexagram) return null;

  if (compact) {
    return (
      <div style={{ textAlign: "center" }}>
        <HexagramLines hexagramNumber={hexagramNumber} changingLines={changingLines} size="sm" />
        <p style={{ fontSize: 12, marginTop: 4, color: "inherit" }}>
          {hexagram.name_zh} {hexagram.number}
          {label && <span style={{ opacity: 0.6 }}> · {label}</span>}
        </p>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ fontFamily: '"Noto Serif SC", serif', fontSize: 18, marginBottom: 4 }}>
        {hexagram.name_zh} {hexagram.name} · {hexagram.name === "Heng" ? "Duration" : hexagram.name}
      </p>
      <p style={{ fontSize: 12, marginBottom: 16, opacity: 0.6 }}>
        Hexagram {hexagram.number}
        {changingLines.length > 0 && ` · Changing line${changingLines.length > 1 ? "s" : ""} ${changingLines.join(", ")}`}
        {label && ` · ${label}`}
      </p>
      <HexagramLines hexagramNumber={hexagramNumber} changingLines={changingLines} />
    </div>
  );
}
