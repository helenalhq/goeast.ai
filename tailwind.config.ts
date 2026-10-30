import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Legacy palette (existing pages — keep for backward compatibility)
        cream: "#faf5ef",
        ink: "#2c1810",
        warm: "#8b7355",
        "china-red": "#c0392b",
        gold: "#8e6d45",
        sand: "#e0d5c5",

        // Observatory V1 — deep zone (homepage hero, exploration)
        deep: "#101923",
        panel: "#192633",
        "panel-border": "#253548",
        light: "#F2EDE4",
        "light-muted": "#A8B3BE",

        // Observatory V1 — paper zone (reports, input forms, long content)
        paper: "#F5F0E7",
        "paper-panel": "#FFFFFF",
        "paper-ink": "#25313C",
        "paper-muted": "#5C6B77",

        // Observatory V1 — actions & highlights
        cinnabar: "#B84938",
        "cinnabar-hover": "#A03D2E",
        jade: "#3D8B6E",
        "jade-text": "#2D6B54",
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', "Georgia", "serif"],
        sans: ['"Noto Sans SC"', "Inter", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      transitionDuration: {
        "fast": "120ms",
        "normal": "180ms",
        "panel": "250ms",
      },
    },
  },
  plugins: [],
};
export default config;
