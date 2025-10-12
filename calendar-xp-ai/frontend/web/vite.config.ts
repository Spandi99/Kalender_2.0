import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        manifest: {
          name: "AI Calendar XP",
          short_name: "CalendarXP",
          start_url: "/",
          display: "standalone",
          background_color: "#020617",
          theme_color: "#0ea5e9",
          icons: [],
        },
      }),
    ],
    define: {
      __APP_VERSION__: JSON.stringify(env.npm_package_version ?? "0.1.0"),
    },
    server: {
      host: "0.0.0.0",
      port: 5173,
    },
  };
});
