import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ritual: {
          bg:     "#050f0a",
          panel:  "#07130d",
          accent: "#00ff88",
          purple: "#a855f7",
          red:    "#ff5c5c",
          yellow: "#facc15",
          border: "rgba(0, 255, 136, 0.2)",
          borderStrong: "#00ff88",
          muted:  "#5c7a68",
          text:   "#dae5dd",
        },
      },
      borderRadius: {
        DEFAULT: "0px",
        lg: "0px",
        xl: "0px",
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      keyframes: {
        blink: {
          "50%": { opacity: "0" },
        },
        "pulse-node": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
      animation: {
        blink: "blink 1s step-end infinite",
        "pulse-node": "pulse-node 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
