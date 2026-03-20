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
        "bg-primary": "rgb(var(--bg-primary) / <alpha-value>)",
        "bg-secondary": "rgb(var(--bg-secondary) / <alpha-value>)",
        "text-primary": "rgb(var(--text-primary) / <alpha-value>)",
        "text-secondary": "rgb(var(--text-secondary) / <alpha-value>)",
        "border-color": "rgb(var(--border-color) / <alpha-value>)",
        "card-bg": "rgb(var(--card-bg) / <alpha-value>)",
        "hover-bg": "rgb(var(--hover-bg) / <alpha-value>)",
        background: "rgb(var(--bg-primary) / <alpha-value>)",
        sidebar: "rgb(var(--bg-secondary) / <alpha-value>)",
        header: "rgb(var(--bg-secondary) / <alpha-value>)",
        card: "rgb(var(--card-bg) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        accentSoft: "rgb(var(--accent-soft) / <alpha-value>)"
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

