import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev proxy: frontend talks to /api/*, forwarded to the FastAPI server.
// Override the target with VITE_API_TARGET if the API runs elsewhere.
const API_TARGET = process.env.VITE_API_TARGET || "http://127.0.0.1:8000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: API_TARGET,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
});
