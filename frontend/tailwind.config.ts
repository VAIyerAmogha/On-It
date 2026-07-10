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
        accent: {
          DEFAULT: "#7C6AEF",
          50: "#f2f0fd",
          100: "#e5e1fc",
          200: "#cac3f8",
          300: "#b0a5f4",
          400: "#9687f0",
          500: "#7c6aef",
          600: "#6355bf",
          700: "#4a408f",
          800: "#322a60",
          900: "#191530",
        },
        glass: {
          light: "rgba(255, 255, 255, 0.55)",
          dark: "rgba(30, 30, 35, 0.55)",
        },
      },
    },
  },
  plugins: [],
};

export default config;
