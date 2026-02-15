import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-playfair)", "serif"],
      },
      colors: {
        background: "#050816",
        sidebar: "#0b1020",
        header: "#0f172a",
        card: "#0f172a",
        accent: "#38bdf8",
        accentSoft: "#0b1220"
      },
      borderRadius: {
        xl: "1rem"
      },
      boxShadow: {
        card: "0 18px 45px rgba(15,23,42,0.7)"
      }
    }
  },
  plugins: []
};

export default config;

