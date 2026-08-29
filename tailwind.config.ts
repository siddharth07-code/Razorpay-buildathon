import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#0B0F17",
        foreground: "#F1F5F9",
        brand: {
          blue: "#2563EB",
          indigo: "#4F46E5",
          purple: "#7C3AED",
          cyan: "#06B6D4",
          emerald: "#10B981",
          amber: "#F59E0B",
          rose: "#F43F5E",
        },
        razorpay: {
          50: "#f0f7ff",
          100: "#e0effe",
          200: "#bae0fd",
          300: "#7cc7fc",
          400: "#38a7f8",
          500: "#0c87eb",
          600: "#026ac8",
          700: "#0354a2",
          800: "#074785",
          900: "#0c3c6f",
          950: "#082649",
        },
        surface: {
          dark: "#0B0F17",
          card: "#0F1523",
          cardHover: "#141C2E",
          border: "#1E293B",
          borderHover: "#334155",
          muted: "#374151",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      boxShadow: {
        glow: "0 0 20px -5px rgba(12, 135, 235, 0.3)",
        glowSuccess: "0 0 20px -5px rgba(16, 185, 129, 0.3)",
        glowDanger: "0 0 20px -5px rgba(244, 63, 94, 0.3)",
      },
    },
  },
  plugins: [],
};
export default config;
