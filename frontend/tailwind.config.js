/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      colors: {
        brand: {
          50:  "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
        dark: {
          950: "#04040a",
          900: "#080810",
          800: "#0e0e1a",
          700: "#141424",
          600: "#1c1c30",
          500: "#24243c",
          400: "#2e2e4e",
        },
        accent: {
          cyan:   "#06b6d4",
          amber:  "#f59e0b",
          emerald:"#10b981",
          rose:   "#f43f5e",
        },
      },
      backgroundImage: {
        "grid-pattern": "linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)",
        "hero-glow": "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,102,241,0.3), transparent)",
        "card-shine": "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%)",
      },
      backgroundSize: {
        "grid": "48px 48px",
      },
      animation: {
        "fade-up":     "fadeUp 0.6s ease forwards",
        "fade-in":     "fadeIn 0.4s ease forwards",
        "glow-pulse":  "glowPulse 3s ease-in-out infinite",
        "float":       "float 6s ease-in-out infinite",
        "shimmer":     "shimmer 2s linear infinite",
        "slide-in":    "slideIn 0.3s ease forwards",
      },
      keyframes: {
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        glowPulse: {
          "0%, 100%": { opacity: "0.4" },
          "50%":      { opacity: "0.8" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-12px)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        slideIn: {
          "0%":   { opacity: "0", transform: "translateX(-12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
      boxShadow: {
        "glow-sm":   "0 0 20px rgba(99,102,241,0.15)",
        "glow-md":   "0 0 40px rgba(99,102,241,0.2)",
        "glow-lg":   "0 0 80px rgba(99,102,241,0.25)",
        "card":      "0 1px 1px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
        "card-hover":"0 2px 2px rgba(0,0,0,0.3), 0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 1px rgba(99,102,241,0.2)",
      },
    },
  },
  plugins: [],
};