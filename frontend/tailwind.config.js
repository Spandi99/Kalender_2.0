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
      keyframes: {
        'avatar-breathe': {
          '0%': { transform: 'scale(0.97)' },
          '50%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(0.97)' },
        },
        'avatar-level-up': {
          '0%': { transform: 'translateY(0) scale(1)', filter: 'drop-shadow(0 0 0 rgba(74,222,128,0))' },
          '25%': { transform: 'translateY(-10px) scale(1.05)', filter: 'drop-shadow(0 0 16px rgba(74,222,128,0.6))' },
          '60%': { transform: 'translateY(3px) scale(0.98)', filter: 'drop-shadow(0 0 12px rgba(74,222,128,0.45))' },
          '100%': { transform: 'translateY(0) scale(1)', filter: 'drop-shadow(0 0 0 rgba(74,222,128,0))' },
        },
        'avatar-halo': {
          '0%': { opacity: '0.25', transform: 'scale(0.95)' },
          '50%': { opacity: '0.55', transform: 'scale(1.05)' },
          '100%': { opacity: '0.25', transform: 'scale(0.95)' },
        },
        'levelup-badge': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '30%': { opacity: '1', transform: 'translateY(0)' },
          '70%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(-10px)' },
        },
      },
      animation: {
        'avatar-breathe': 'avatar-breathe 6s ease-in-out infinite',
        'avatar-level-up': 'avatar-level-up 1.4s ease-in-out forwards',
        'avatar-halo': 'avatar-halo 3s ease-in-out infinite',
        'levelup-badge': 'levelup-badge 1.8s ease-in-out forwards',
      },
    },
  },
  plugins: [],
};
