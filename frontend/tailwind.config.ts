import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          base: "var(--color-bg-base)",
          surface: "var(--color-bg-surface)",
          elevated: "var(--color-bg-elevated)",
          overlay: "var(--color-bg-overlay)",
        },
        brand: {
          deep: "var(--color-brand-deep)",
          mid: "var(--color-brand-mid)",
          soft: "var(--color-brand-soft)",
          muted: "var(--color-brand-muted)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          hover: "var(--color-accent-hover)",
          subtle: "var(--color-accent-subtle)",
          muted: "var(--color-accent-muted)",
        },
        text: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          muted: "var(--color-text-muted)",
          inverse: "var(--color-text-inverse)",
          "inverse-secondary": "var(--color-text-inverse-secondary)",
          accent: "var(--color-text-accent)",
        },
        border: {
          subtle: "var(--color-border-subtle)",
          default: "var(--color-border-default)",
          strong: "var(--color-border-strong)",
          dark: "var(--color-border-dark)",
          accent: "var(--color-border-accent)",
        },
        success: {
          DEFAULT: "var(--color-success)",
          subtle: "var(--color-success-subtle)",
        },
        warning: {
          DEFAULT: "var(--color-warning)",
          subtle: "var(--color-warning-subtle)",
        },
        danger: {
          DEFAULT: "var(--color-danger)",
          subtle: "var(--color-danger-subtle)",
        },
        info: {
          DEFAULT: "var(--color-info)",
          subtle: "var(--color-info-subtle)",
        },
        status: {
          pending: "var(--color-status-pending)",
          triggered: "var(--color-status-triggered)",
          invoiced: "var(--color-status-invoiced)",
          paid: "var(--color-status-paid)",
          overdue: "var(--color-status-overdue)",
        },
      },
      backgroundImage: {
        "gradient-hero": "var(--gradient-hero)",
        "gradient-dark": "var(--gradient-dark)",
        "gradient-accent": "var(--gradient-accent)",
        "gradient-accent-subtle": "var(--gradient-accent-subtle)",
        "gradient-surface": "var(--gradient-surface)",
        "gradient-dark-card": "var(--gradient-dark-card)",
        "gradient-stat-accent": "var(--gradient-stat-accent)",
      },
    },
  },
  plugins: [],
};

export default config;
