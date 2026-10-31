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
        // Signature elite color: Academic Royal Cobalt
        elite: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#1d4ed8", // Signature Academic Cobalt
          700: "#1e40af",
          800: "#1e3a8a",
          900: "#172554",
          950: "#0b132b",
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
        'elite': '0 10px 30px -5px rgba(29, 78, 216, 0.18)',
      }
    },
  },
  plugins: [],
};
export default config;
