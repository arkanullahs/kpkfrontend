import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev proxy: frontend talks to /api/*, forwarded to the FastAPI server.
// Override the target with VITE_API_TARGET if the API runs elsewhere.
const API_TARGET = process.env.VITE_API_TARGET || "http://127.0.0.1:8000";

export default defineConfig({
  plugins: [react()],
  // The picker app lives at /pick; / is the static SEO homepage that the
  // nightly pipeline publishes into public/index.html. The entry moved to
  // pick/index.html so the build emits dist/pick/index.html (Vercel serves
  // it at /pick) while public/ keeps owning the root document. Asset URLs
  // stay absolute (/assets/*), so no `base` change is needed.
  build: { rollupOptions: { input: resolve(__dirname, "pick/index.html") } },
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
