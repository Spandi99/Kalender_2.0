/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#020617",
        foreground: "#f8fafc",
        brand: {
          primary: "#0066FF",
          accent: "#00C896",
          deep: "#0F172A",
        },
        muted: {
          DEFAULT: "#1E293B",
          foreground: "#94A3B8",
        },
        accent: {
          DEFAULT: "#0F172A",
          foreground: "#E2E8F0",
        },
        primary: {
          DEFAULT: "#0066FF",
          foreground: "#F8FBFF",
        },
        secondary: {
          DEFAULT: "#1E293B",
          foreground: "#E2E8F0",
        },
      },
      borderRadius: {
        lg: "0.5rem",
        md: "calc(0.5rem - 2px)",
        sm: "calc(0.5rem - 4px)",
      },
    },
  },
  plugins: [],
};
