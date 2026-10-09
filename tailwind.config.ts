import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ground:      "var(--ground)",
        surface:     "var(--surface)",
        "surface-sunk": "var(--surface-sunk)",
        rule:        "var(--rule)",
        "rule-strong": "var(--rule-strong)",
        ink: {
          DEFAULT: "var(--ink)",
          2: "var(--ink-2)",
          3: "var(--ink-3)",
        },
        amber: {
          DEFAULT: "var(--amber)",
          soft:    "var(--amber-soft)",
        },
        flame: {
          DEFAULT: "var(--flame)",
          soft:    "var(--flame-soft)",
        },
      },
      fontFamily: {
        sans: ["var(--font-archivo)", "system-ui", "sans-serif"],
      },
      fontSize: {
        // A quantity is the loudest thing on any screen it appears on.
        quantity: ["1.75rem", { lineHeight: "1", letterSpacing: "-0.03em", fontWeight: "800" }],
        hero:     ["4.5rem", { lineHeight: "1", letterSpacing: "-0.04em", fontWeight: "800" }],
      },
      spacing: {
        safe: "env(safe-area-inset-bottom)",
      },
      borderRadius: {
        // Radius marks what you can touch. Rows are square; controls are not.
        control: "0.625rem",
        sheet:   "1.25rem",
      },
    },
  },
  plugins: [],
};
export default config;
