import { useEffect, useState } from "react";
import { st } from "../theme";
import { api } from "../api";

// pids we've already asked the server to resolve, so a list of cards doesn't
// fire the same lookup many times (and a miss isn't retried every render)
const _resolved = new Map<string, string | null>();

/** Product photo from scraped shop data. When there's no image (or the URL
    fails), and we know the phone id, we ask the API to outsource one — from the
    phone's GSMArena render or a live GadgetGear search — then show that. Final
    fallback is a soft phone-silhouette placeholder, not a stripey box. */
export function PhonePhoto({ src, pid, w, h, radius = 14 }: {
  src?: string | null; pid?: string | null; w: string; h: string; radius?: number;
}) {
  const [failed, setFailed] = useState(false);
  const [resolved, setResolved] = useState<string | null>(() => (pid ? _resolved.get(pid) ?? null : null));

  // GadgetGear's image host 404s for everything — treat those URLs as no image
  // so we go straight to the GSMArena resolver instead of flashing a broken img
  const goodSrc = src && !src.includes("gadgetandgear.com") ? src : null;

  // no usable image and we have an id → ask the backend to find one (GSMArena)
  useEffect(() => {
    const needsLookup = (!goodSrc || failed) && pid && !_resolved.has(pid);
    if (!needsLookup) {
      if (pid && _resolved.has(pid)) setResolved(_resolved.get(pid) ?? null);
      return;
    }
    let alive = true;
    api.phoneImage(pid!)
      .then((r) => { _resolved.set(pid!, r.url); if (alive) setResolved(r.url); })
      .catch(() => { _resolved.set(pid!, null); });
    return () => { alive = false; };
  }, [goodSrc, pid, failed]);

  const show = (!failed && goodSrc) || resolved;
  const box = `width:${w}; height:${h}; border-radius:${radius}px; flex-shrink:0; box-shadow:inset 0 0 0 1px rgba(15,25,35,.06); overflow:hidden;`;

  if (show) {
    return (
      <div style={st(box + " background:#fff; display:flex; align-items:center; justify-content:center;")}>
        <img src={(failed ? resolved : goodSrc) || resolved || undefined} alt="" loading="lazy"
          onError={() => { if (!failed) setFailed(true); else setResolved(null); }}
          style={st("width:100%; height:100%; object-fit:contain; padding:6%;")} />
      </div>
    );
  }
  return (
    <div style={st(box + " background:linear-gradient(160deg,#f4f6f9,#e9edf2); display:flex; align-items:center; justify-content:center;")}>
      <svg width="42%" height="42%" viewBox="0 0 24 24" fill="none">
        <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" stroke="#c2c8d0" strokeWidth="1.4" />
        <line x1="10.5" y1="18.6" x2="13.5" y2="18.6" stroke="#c2c8d0" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </div>
  );
}
