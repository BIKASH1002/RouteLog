/** @type {import('tailwindcss').Config} */

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#2563EB",
          dark: "#1D4ED8",
          light: "#3B82F6",
          subtle: "#EFF6FF",
        },
        navy: "#0F172A",
        eld: {
          offduty: "#F59E0B",
          sleeper: "#EAB308",
          driving: "#3B82F6",
          onutyd: "#22C55E",
          line: "#0F172A",
        },
        map: {
          bg: "#F1F5F9",
          route: "#2563EB",
          start: "#16A34A",
          stop: "#F59E0B",
          fuel: "#14B8A6",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      fontSize: {
        "2xs": ["11px", "16px"],
        xs: ["12px", "18px"],
        sm: ["13px", "20px"],
        base: ["14px", "22px"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
        pop: "0 10px 30px -10px rgb(15 23 42 / 0.15)",
      },
      borderRadius: {
        xl: "12px",
        "2xl": "16px",
      },
    },
  },
  plugins: [],
};
