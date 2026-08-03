/* Shared chrome the app was missing while the static site already had it:
   the spec icon set, the breadcrumb trail, and the cold-start notice.

   The icons are the SAME paths device_pages.icon() draws on /phone/*, and the
   breadcrumb is the same Home > section > leaf trail pages.crumbs() renders,
   so a reader moving between the SEO pages and the picker sees one product
   (owner 2026-07-26). */
import type { ReactNode } from "react";
import { st } from "../theme";

/* ---------- spec icons (mirror of device_pages._I) ---------- */
const ICONS: Record<string, string> = {
  chip: "M7 3h6v4h4v6h-4v4H7v-4H3V7h4V3z",
  display: "M4 4h12v9H4V4zm3 12h6",
  refresh: "M4 10a6 6 0 0 1 10.5-4M16 10a6 6 0 0 1-10.5 4M14 3v3.5h-3.5M6 17v-3.5h3.5",
  bright: "M10 5.5v-2M10 16.5v-2M5.5 10h-2M16.5 10h-2M6.8 6.8 5.4 5.4M14.6 14.6l-1.4-1.4M6.8 13.2l-1.4 1.4M14.6 5.4l-1.4 1.4",
  memory: "M4 6h12v8H4V6zm3 0v8m3-8v8m3-8v8",
  battery: "M3 6.5h11v7H3v-7zm13 2v3",
  charge: "M11 3 5 11h4l-1 6 6-8h-4l1-6z",
  camera: "M3 6h3l1.2-2h5.6L14 6h3v9H3V6zm7 7.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  selfie: "M10 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM4 17c0-3 2.7-4.5 6-4.5s6 1.5 6 4.5",
  software: "M10 2.5 17 6v5c0 4-3.2 6-7 6.5C6.2 17 3 15 3 11V6l7-3.5z",
  date: "M4 5h12v12H4V5zm0 4h12M7.5 3v3M12.5 3v3",
  network: "M4 15h2v-3H4v3zm4.5 0h2V9h-2v6zm4.5 0h2V4h-2v11z",
  extra: "M10 3.2 12 8h5l-4 3.3 1.5 5.2L10 13.6 5.5 16.5 7 11.3 3 8h5l2-4.8z",
  weight: "M4 7h12l1 10H3L4 7zm3 0a3 3 0 016 0",
};

export function SpecIcon({ name, size = 16, color = "var(--mut2)" }: {
  name?: string | null; size?: number; color?: string;
}) {
  const d = name ? ICONS[name] : null;
  if (!d) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" fill="none"
      stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
      style={st("flex-shrink:0;")}>
      <path d={d} />
    </svg>
  );
}

/* ---------- breadcrumbs (mirror of pages.crumbs) ---------- */
const HOUSE = "M3 10.6 12 3l9 7.6M5.5 9.2V20h13V9.2";

export function Breadcrumbs({ trail }: { trail: { label: string; onClick?: () => void }[] }) {
  const sep = <span style={st("color:var(--faint); user-select:none;")}>/</span>;
  const link = "background:none; border:none; padding:0; cursor:pointer; font:inherit; color:var(--mut2); text-decoration:none;";
  return (
    <nav aria-label="Breadcrumb"
      style={st("display:flex; align-items:center; gap:8px; flex-wrap:wrap; font-size:13px; color:var(--mut2); margin:2px 2px 14px;")}>
      <a href="/" aria-label="Home" style={st(link + " display:inline-flex;")}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--mut2)"
          strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d={HOUSE} /></svg>
      </a>
      {trail.map((c, i) => (
        <span key={i} style={st("display:inline-flex; align-items:center; gap:8px;")}>
          {sep}
          {i === trail.length - 1 || !c.onClick
            ? <b style={st("color:var(--ink2); font-weight:700;")}>{c.label}</b>
            : <button onClick={c.onClick} style={st(link)}>{c.label}</button>}
        </span>
      ))}
    </nav>
  );
}

/* ---------- cold-start notice ----------
   The API sleeps on the free Render tier and takes ~30-50s to wake. Until it
   answers /meta the app looks broken, and a buyer who sees a dead header
   leaves before the first result is even possible (owner 2026-07-26). This is
   a non-blocking card with an honest indeterminate bar: it says what is
   happening, and it disappears the moment /meta lands.

   It sits a fifth of the viewport up rather than on the floor, so it lands
   nearer eye level and clear of the footer, while still leaving the choice
   cards -- the thing a buyer is actually here to click -- uncovered.

   Centred by auto margins, NOT by left:50% + translateX(-50%): the kpop
   entrance ends on transform:none and runs with fill-mode both, so the final
   frame wiped the centring transform and dropped the card half its own width
   to the right of centre. */
export function BootNotice({ seconds }: { seconds: number }) {
  return (
    <div role="status" aria-live="polite"
      style={st("position:fixed; left:0; right:0; margin:0 auto; bottom:calc(20vh + env(safe-area-inset-bottom,0px)); z-index:80; width:min(420px, calc(100vw - 28px)); padding:15px 17px; border-radius:var(--r); background:rgba(var(--rgb-white),.94); backdrop-filter:blur(24px) saturate(180%); -webkit-backdrop-filter:blur(24px) saturate(180%); border:.5px solid rgba(var(--rgb-white),.9); box-shadow:0 16px 44px rgba(var(--rgb-ink),.16), inset 0 1px 1px rgba(var(--rgb-white),.9); animation:kpop .4s cubic-bezier(.2,.7,.2,1) both;")}>
      <style>{`@keyframes kboot{0%{left:-38%}100%{left:100%}}`}</style>
      <div style={st("display:flex; align-items:center; gap:11px;")}>
        <span style={st("width:17px; height:17px; border-radius:var(--r); border:2px solid rgba(var(--rgb-ink),.14); border-top-color:var(--teal); animation:kspin .7s linear infinite; flex-shrink:0;")} />
        <div style={st("min-width:0; flex:1;")}>
          <div style={st("font-size:14px; font-weight:700; color:var(--ink2);")}>Waking the price server</div>
          <div style={st("font-size:12.5px; color:var(--mut2); margin-top:2px;")}>
            It sleeps when nobody is shopping. Usually up in under a minute
            {seconds > 3 ? ` · ${seconds}s` : ""}.
          </div>
        </div>
      </div>
      <div style={st("position:relative; height:4px; border-radius:var(--r); background:rgba(var(--rgb-ink),.07); margin-top:12px; overflow:hidden;")}>
        <span style={st("position:absolute; top:0; bottom:0; width:38%; border-radius:var(--r); background:var(--teal); animation:kboot 1.25s cubic-bezier(.5,0,.5,1) infinite;")} />
      </div>
    </div>
  );
}

/* Fold-away block, the app's version of the static pages' <details> spec
   dump. Same affordance, same wording. */
export function Fold({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details style={st("margin-top:16px;")}>
      <summary style={st("cursor:pointer; list-style:none; display:flex; align-items:center; justify-content:space-between; gap:10px; padding:13px 17px; border-radius:var(--r); background:var(--card); font-size:14px; font-weight:700; color:var(--lnk); box-shadow:inset 0 0 0 1px rgba(var(--rgb-ink),.06);")}>
        {label}<span style={st("font-size:20px; line-height:1;")}>›</span>
      </summary>
      <div style={st("margin-top:12px;")}>{children}</div>
    </details>
  );
}
