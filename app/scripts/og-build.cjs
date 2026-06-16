/* prebuild hook: regenerate the OG share image when Python + Pillow are
 * available (local dev), otherwise no-op so the committed public/og-image.png
 * ships unchanged. This runs in Vercel's Node-only build too — where Python is
 * absent — so it MUST never fail the build (always exits 0). */
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const script = path.join(__dirname, "make_og.py");

for (const py of ["python", "python3"]) {
  const r = spawnSync(py, [script], { stdio: "inherit" });
  if (r.error) continue; // interpreter not found — try the next name
  if (r.status === 0) {
    console.log("[og] regenerated public/og-image.png via " + py);
    process.exit(0);
  }
  console.log("[og] generator ran but exited " + r.status + " — keeping committed og-image.png");
  process.exit(0);
}
console.log("[og] Python not available (e.g. Vercel) — keeping committed og-image.png");
process.exit(0);
