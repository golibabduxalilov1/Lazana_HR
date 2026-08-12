/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Roboto", "Segoe UI", "system-ui", "sans-serif"],
      },
      colors: {
        primary: {
          50: "#EEF2FF",
          500: "#6366F1",
          600: "#4F46E5",
          700: "#4338CA",
          900: "#312E81",
        },
        status: {
          working: "#10B981",
          workingBg: "#ECFDF5",
          workingText: "#047857",
          idle: "#F59E0B",
          idleBg: "#FFFBEB",
          idleText: "#B45309",
          repair: "#EF4444",
          repairBg: "#FEF2F2",
          repairText: "#B91C1C",
          retired: "#6B7280",
          retiredBg: "#F8FAFC",
          retiredText: "#475569",
          info: "#3B82F6",
          infoBg: "#EFF6FF",
          infoText: "#1D4ED8",
        },
        surface: "#FFFFFF",
        page: "#F8FAFC",
        border: {
          DEFAULT: "#E2E8F0",
          subtle: "#F1F5F9",
        },
        ink: {
          900: "#0F172A",
          600: "#475569",
          400: "#94A3B8",
        },
      },
      borderRadius: {
        lg: "8px",
        xl: "12px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.1)",
      },
      transitionDuration: {
        150: "150ms",
        200: "200ms",
        250: "250ms",
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: "translateY(16px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        scaleIn: { from: { opacity: 0, transform: "scale(0.96)" }, to: { opacity: 1, transform: "scale(1)" } },
      },
      animation: {
        "fade-in": "fadeIn 200ms ease-out",
        "slide-up": "slideUp 250ms ease-out",
        "scale-in": "scaleIn 150ms ease-out",
      },
    },
  },
  plugins: [],
};
