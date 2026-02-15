import type { Config } from "tailwindcss";

/**
 * Tailwind config — Hub de Reformas
 * Design System: Navy (#0B3D91) + Orange (#FF8C42) + Glassmorphism
 */
const config: Config = {
  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}", "./src/lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0B3D91",
          50: "#EEF2FF",
          100: "#D8E0F8",
          200: "#A8B8E8",
          300: "#7890D8",
          400: "#4868C8",
          500: "#0B3D91",
          600: "#093278",
          700: "#072660",
          800: "#051A48",
          900: "#030E30",
          950: "#020818",
        },
        orange: {
          DEFAULT: "#FF8C42",
          50: "#FFF7F0",
          100: "#FFEDD9",
          200: "#FFD4A8",
          300: "#FFBB77",
          400: "#FF8C42",
          500: "#F07020",
          600: "#D45A10",
          700: "#A84810",
          800: "#7C3410",
          900: "#4C2010",
          950: "#2C1008",
        },
        surface: {
          DEFAULT: "#FAFBFC",
          50: "#FFFFFF",
          100: "#FAFBFC",
          200: "#F1F5F9",
          300: "#E2E8F0",
          400: "#CBD5E1",
          500: "#94A3B8",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        glow: "0 0 20px rgba(11, 61, 145, 0.15)",
        "glow-orange": "0 0 20px rgba(255, 140, 66, 0.2)",
        soft: "0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)",
        "inner-soft": "inset 0 2px 4px 0 rgba(0, 0, 0, 0.04)",
        card: "0 1px 3px rgba(0,0,0,0.04), 0 6px 16px rgba(0,0,0,0.06)",
        elevated: "0 4px 6px -1px rgba(0,0,0,0.05), 0 20px 25px -5px rgba(0,0,0,0.08)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(ellipse at top, var(--tw-gradient-stops))",
        "hero-mesh": "linear-gradient(135deg, #0B3D91 0%, #1a56c4 50%, #FF8C42 100%)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "fade-up": "fadeUp 0.5s ease-out",
        "slide-in": "slideIn 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        shimmer: "shimmer 2s infinite",
        float: "float 3s ease-in-out infinite",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateX(-10px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
