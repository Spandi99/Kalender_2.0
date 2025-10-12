import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // ⚙️ Fix für FullCalendar CSS in Docker + ARM (Pi)
  resolve: {
    alias: {
      "@fullcalendar/daygrid/main.css":
        "/node_modules/@fullcalendar/daygrid/main.css",
      "@fullcalendar/timegrid/main.css":
        "/node_modules/@fullcalendar/timegrid/main.css",
      "@fullcalendar/list/main.css":
        "/node_modules/@fullcalendar/list/main.css",
    },
  },

  optimizeDeps: {
    include: [
      "@fullcalendar/core",
      "@fullcalendar/daygrid",
      "@fullcalendar/timegrid",
      "@fullcalendar/list",
    ],
  },
})
