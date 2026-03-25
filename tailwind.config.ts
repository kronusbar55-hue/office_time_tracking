import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  darkMode: "class", // Use class-based dark mode
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-playfair)", "serif"],
      },
      colors: {
        /* PRIMARY BACKGROUNDS */
        "bg-primary": "rgb(var(--bg-primary) / <alpha-value>)",
        "bg-secondary": "rgb(var(--bg-secondary) / <alpha-value>)",
        "bg-tertiary": "rgb(var(--bg-tertiary) / <alpha-value>)",
        
        /* TEXT COLORS */
        "text-primary": "rgb(var(--text-primary) / <alpha-value>)",
        "text-secondary": "rgb(var(--text-secondary) / <alpha-value>)",
        "text-tertiary": "rgb(var(--text-tertiary) / <alpha-value>)",
        
        /* BORDER COLORS */
        "border-color": "rgb(var(--border-color) / <alpha-value>)",
        "border-light": "rgb(var(--border-light) / <alpha-value>)",
        "border-dark": "rgb(var(--border-dark) / <alpha-value>)",
        
        /* CARD STYLING */
        "card-bg": "rgb(var(--card-bg) / <alpha-value>)",
        "card-hover": "rgb(var(--card-hover) / <alpha-value>)",
        "card-border": "rgb(var(--card-border) / <alpha-value>)",
        
        /* INTERACTIVE ELEMENTS */
        "hover-bg": "rgb(var(--hover-bg) / <alpha-value>)",
        "focus-ring": "rgb(var(--focus-ring) / <alpha-value>)",
        "active-bg": "rgb(var(--active-bg) / <alpha-value>)",
        
        /* STATUS COLORS */
        "success": "rgb(var(--success) / <alpha-value>)",
        "warning": "rgb(var(--warning) / <alpha-value>)",
        "error": "rgb(var(--error) / <alpha-value>)",
        "info": "rgb(var(--info) / <alpha-value>)",
        
        /* ACCENT COLORS */
        "accent": "rgb(var(--accent) / <alpha-value>)",
        "accent-soft": "rgb(var(--accent-soft) / <alpha-value>)",
        "accent-hover": "rgb(var(--accent-hover) / <alpha-value>)",
        
        /* SEMANTIC COLORS */
        "disabled": "rgb(var(--disabled) / <alpha-value>)",
        "disabled-text": "rgb(var(--disabled-text) / <alpha-value>)",
        "input-bg": "rgb(var(--input-bg) / <alpha-value>)",
        "input-border": "rgb(var(--input-border) / <alpha-value>)",
        
        /* KANBAN COLORS */
        "kanban-column-bg": "rgb(var(--kanban-column-bg) / <alpha-value>)",
        "kanban-card-bg": "rgb(var(--kanban-card-bg) / <alpha-value>)",
        
        /* CHART COLORS */
        "chart-grid": "rgb(var(--chart-grid) / <alpha-value>)",
        "chart-axis": "rgb(var(--chart-axis) / <alpha-value>)",
        "chart-bar": "rgb(var(--chart-bar) / <alpha-value>)",
        "chart-bar-alt": "rgb(var(--chart-bar-alt) / <alpha-value>)",
        "chart-bar-success": "rgb(var(--chart-bar-success) / <alpha-value>)",
        
        /* Semantic aliases for backward compatibility */
        background: "rgb(var(--bg-primary) / <alpha-value>)",
        sidebar: "rgb(var(--bg-secondary) / <alpha-value>)",
        header: "rgb(var(--bg-secondary) / <alpha-value>)",
        card: "rgb(var(--card-bg) / <alpha-value>)"
      },
      borderRadius: {
        xl: "1rem"
      },
      boxShadow: {
        card: "0 18px 45px rgba(15,23,42,0.7)",
        "card-dark": "0 18px 45px rgba(0,0,0,0.5)",
        "card-light": "0 18px 45px rgba(15,23,42,0.1)"
      },
      transitionDuration: {
        "theme": "200ms"
      },
      keyframes: {
        "theme-transition": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        }
      },
      animation: {
        "theme-transition": "theme-transition 200ms ease-in-out"
      }
    }
  },
  plugins: []
};

export default config;

