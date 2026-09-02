import { useState } from "react";
import { st } from "../theme";

/** Product photo, or a soft phone-silhouette placeholder — never a broken img.

    There used to be a resolver step here: no image (or a failed one) meant
    asking /phone-image/{pid} to outsource one from GSMArena or a live
    GadgetGear search. That endpoint stopped doing any of that when every photo
    became a self-hosted /pimg WebP — its own docstring now says "No live
    hotlink resolution" — and it resolves the pid through exactly the function
    that filled the `image` field we were handed.

    So the lookup could only ever return what the caller already had. Missing
    meant one round trip to be told null; BROKEN was worse — it answered with
    the very URL that had just failed to load, which we then set as the src and
    watched fail a second time before finally drawing the placeholder. Two
    wasted requests per broken card, on every result set and every browse page,
    to arrive where we started. `pid` is kept in the signature because callers
    pass it and it costs nothing to ignore. */
export function PhonePhoto({ src, w, h, radius = 14, pad = 6, bg }: {
  src?: string | null; pid?: string | null; w: string; h: string; radius?: number;
  /** paint behind the render. The detail hero passes "transparent" because
      there the tile is stretched to the full height of the text beside it and
      the panel tint is painted by the grid cell instead. */
  bg?: string;
  /** inset around the render, in percent. 6 is right for a thumbnail in a row
      of them; the results hero passes ~1, because there the photo IS the
      subject and every percent of inset is the phone drawn smaller (owner
      2026-08-30: "make hero image even fuller"). */
  pad?: number;
}) {
  const [failed, setFailed] = useState(false);

  // GadgetGear's image host 404s for everything — treat those URLs as no image
  // so we draw the placeholder instead of flashing a broken img
  const goodSrc = src && !src.includes("gadgetandgear.com") ? src : null;

  const box = `width:${w}; height:${h}; border-radius:${radius}px; flex-shrink:0; box-shadow:inset 0 0 0 1px rgba(var(--rgb-ink),.06); overflow:hidden;`;

  if (goodSrc && !failed) {
    return (
      <div style={st(box + ` background:${bg || "var(--card)"}; display:flex; align-items:center; justify-content:center;`)}>
        <img src={goodSrc} alt="" loading="lazy"
          onError={() => setFailed(true)}
          style={st(`width:100%; height:100%; object-fit:contain; padding:${pad}%;`)} />
      </div>
    );
  }
  return (
    <div style={st(box + ` background:${bg || "var(--bg)"}; display:flex; align-items:center; justify-content:center;`)}>
      <svg width="42%" height="42%" viewBox="0 0 24 24" fill="none">
        <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" stroke="var(--faint)" strokeWidth="1.4" />
        <line x1="10.5" y1="18.6" x2="13.5" y2="18.6" stroke="var(--faint)" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </div>
  );
}
