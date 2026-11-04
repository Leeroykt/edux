import type { Config } from "tailwindcss";

/**
 * eduX design tokens.
 *
 * The palette is built for long reading and writing sessions: warm paper
 * neutrals in light mode, a soft charcoal (not black) in dark mode, and one
 * calm deep-teal accent. Alarm colours are kept for the few places that need
 * attention, and they are muted so a flagged sentence never shouts.
 *
 * `slate`, `indigo` and `teal` are remapped onto these scales on purpose, so
 * every screen picks up one consistent palette.
 */
const ink = {
  50: "#f8f7f4",
  100: "#f1efea",
  200: "#e4e1d9",
  300: "#cfccc2",
  400: "#6a6862",
  500: "#5d5b56",
  600: "#4a4944",
  700: "#403f3b",
  800: "#272b32",
  900: "#1d2026",
  950: "#14171c",
};

const accent = {
  50: "#eef6f6",
  100: "#d8ebeb",
  200: "#b3d7d8",
  300: "#82bbbe",
  400: "#509ca1",
  500: "#348189",
  600: "#27676f",
  700: "#205259",
  800: "#1b4349",
  900: "#173940",
  950: "#0c2126",
};

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        slate: ink,
        elite: accent,
        indigo: accent,
        teal: accent,
        ai: {
          human: "#3f9b7a",
          uncertain: "#c8964a",
          machine: "#c8665f",
        },
        similarity: {
          source1: "#5b8db8",
          source2: "#8b7fb8",
          source3: "#b87f9c",
          source4: "#c8964a",
          source5: "#3f9b7a",
        },
      },
      fontFamily: {
        // UI text
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        // Writing surface and editorial headings
        serif: ["Newsreader", "Georgia", "Cambria", "Times New Roman", "serif"],
        raleway: ["Newsreader", "Georgia", "serif"],
        mono: ["JetBrains Mono", "Menlo", "Courier New", "monospace"],
      },
      boxShadow: {
        page: "0 1px 2px 0 rgba(20, 23, 28, 0.05), 0 12px 28px -8px rgba(20, 23, 28, 0.10)",
        elite: "0 10px 30px -8px rgba(39, 103, 111, 0.28)",
      },
    },
  },
  plugins: [],
};
export default config;
