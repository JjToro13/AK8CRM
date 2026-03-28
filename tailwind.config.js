/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // ✅ Base UI (claro)
        bg: "rgb(var(--color-bg) / <alpha-value>)", // fondo tipo crema suave (similar mockup)
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        surface2: "rgb(var(--color-surface2) / <alpha-value>)",
        border: "rgb(var(--color-border) / <alpha-value>)",
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",

        // ✅ Marca (cambia solo esto si quieres otro tono)
        brand: {
          DEFAULT: "rgb(var(--color-brand) / <alpha-value>)", // blue-600
          50: "rgb(var(--color-brand-50) / <alpha-value>)",
          100: "rgb(var(--color-brand-100) / <alpha-value>)",
          200: "rgb(var(--color-brand-200) / <alpha-value>)",
          300: "rgb(var(--color-brand-300) / <alpha-value>)",
          400: "rgb(var(--color-brand-400) / <alpha-value>)",
          500: "rgb(var(--color-brand-500) / <alpha-value>)",
          600: "rgb(var(--color-brand-600) / <alpha-value>)",
          700: "rgb(var(--color-brand-700) / <alpha-value>)",
          800: "rgb(var(--color-brand-800) / <alpha-value>)",
          900: "rgb(var(--color-brand-900) / <alpha-value>)",
        },

        // Tus estados existentes (se quedan)
        "status-gray": "#6B7280",
        "status-red": "#EF4444",
        "status-yellow": "#F59E0B",
        "status-green": "#10B981",
        "status-blue": "#3B82F6",
      },

      borderRadius: {
        // para el estilo “soft”
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
        "4xl": "2.25rem",
      },

      boxShadow: {
        // ✅ Sombras premium tipo mockup
        soft: "0 20px 48px rgba(30, 41, 59, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.72)",
        soft2: "0 28px 72px rgba(30, 41, 59, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.8)",
        insetSoft: "inset 0 1px 0 rgba(255,255,255,0.7)",
      },

      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};
