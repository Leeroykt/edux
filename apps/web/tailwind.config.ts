import type { Config } from "tailwindcss";

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
        // One unique signature elite color: Royal Iris
        elite: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5", // Signature Elite Iris
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
        ai: {
          human: "#10b981",
          uncertain: "#f59e0b",
          machine: "#f43f5e",
        },
        similarity: {
          source1: "#3b82f6",
          source2: "#8b5cf6",
          source3: "#ec4899",
          source4: "#f97316",
          source5: "#14b8a6",
        }
      },
      fontFamily: {
        raleway: ["Raleway", "Inter", "sans-serif"],
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        serif: ["Times New Roman", "Georgia", "Cambria", "serif"],
        mono: ["JetBrains Mono", "Menlo", "Courier New", "monospace"],
      },
      boxShadow: {
        'page': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 12px 24px -4px rgba(0, 0, 0, 0.06)',
        'elite': '0 10px 30px -5px rgba(79, 70, 229, 0.18)',
      }
    },
  },
  plugins: [],
};
export default config;
