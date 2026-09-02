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
  // assetsInlineLimit 0: never base64 an asset into the JS. The 36 brand
  // logos are 1.4-6 KB each, so the 4 KB default inlined about twenty of them
  // and put +49 KB gzip into the main bundle -- paid by every visitor, on a
  // market that is mostly mobile data, to ship 36 marks when a session shows
  // six. As files they are fetched only by the screens that draw them. No
  // other asset here is small enough to have been inlined anyway.
  build: {
    assetsInlineLimit: 0,
    rollupOptions: {
      input: resolve(__dirname, "pick/index.html"),
      // React and our app changed at completely different rates and shipped in
      // one 111 KB-gzip file, so every deploy — a copy tweak included — made
      // every returning visitor re-download React over BD mobile data. Split
      // out, the ~45 KB vendor chunk keeps its hash across app deploys and is
      // served from cache.
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-dom/client"],
        },
      },
    },
  },
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
