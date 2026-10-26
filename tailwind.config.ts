import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#080B11",
          card: "#0F1622",
          cardHover: "#162030",
          border: "rgba(255, 255, 255, 0.08)",
          borderHover: "rgba(229, 169, 60, 0.4)",
          gold: "#E5A93C",
          goldLight: "#F5C77E",
          orange: "#FF6B00",
          accent: "#38BDF8",
          muted: "#94A3B8"
        }
      },
      fontFamily: {
        serif: ["Cormorant Garamond", "Georgia", "serif"],
        sans: ["Manrope", "system-ui", "-apple-system", "sans-serif"]
      }
    },
  },
  plugins: [],
};

export default config;
