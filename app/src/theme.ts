import type { CSSProperties } from "react";
import { bnNum } from "./i18n";

/* The five switchable accent palettes are gone. The accent system is
   single-brand now and lives in one place -- the :root token block in
   pick/index.html, which is the same vocabulary the static pages use. A
   palette change is an edit there, not a record in here. */

/* ---------- raw-CSS → React style object ----------
   Lets us paste the mockup's inline CSS strings nearly verbatim. Converts
   kebab-case props to camelCase, preserves --custom-properties as-is. */

const _cache = new Map<string, CSSProperties>();
export function st(css: string): CSSProperties {
  const hit = _cache.get(css);
  if (hit) return hit;
  const out: Record<string, string> = {};
  for (const decl of css.split(";")) {
    const i = decl.indexOf(":");
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim();
    const val = decl.slice(i + 1).trim();
    if (!prop || !val) continue;
    const key = prop.startsWith("--")
      ? prop
      : prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    out[key] = val;
  }
  _cache.set(css, out as CSSProperties);
  return out as CSSProperties;
}

/* ---------- number / currency formatting (Indian grouping, like mockup) ---------- */

export function fmt(n: number): string {
  const s = String(Math.round(n));
  if (s.length <= 3) return s;
  const l3 = s.slice(-3);
  return s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + l3;
}
export function taka(n: number | null | undefined): string {
  if (n == null) return "—";
  return "৳" + bnNum(fmt(n));
}
/** SP1 price rule: show the in-stock range, never a lone lowest number. */
export function takaRange(lo: number | null | undefined, hi?: number | null): string {
  if (lo == null) return taka(lo);
  return hi != null && hi > lo ? `${taka(lo)} – ${taka(hi)}` : taka(lo);
}

/** The range the buyer would actually pay in the SHOWN price's channel —
    prefers the per-channel summary (same numbers the listings sections show,
    so card and listings can never disagree), falls back to combine's
    price_low/high for stale cached picks. */
export function shownRange(p: {
  best_price: number | null; best_price_official?: boolean;
  channels?: { official?: { lo: number; hi: number } | null; unofficial?: { lo: number; hi: number } | null } | null;
  price_low?: number | null; price_high?: number | null;
}): { lo: number | null; hi: number | null } {
  const side = p.best_price_official ? p.channels?.official : p.channels?.unofficial;
  return { lo: side?.lo ?? p.price_low ?? p.best_price, hi: side?.hi ?? p.price_high ?? null };
}

/** The RAM/storage rows a card may print, read from the ONE channel that card
    is quoting — see shownRange above, which picks that channel for the
    headline. Both must agree or the card contradicts itself, which is exactly
    what audit PICK-07 caught: an "Official (BD warranty)" card headlining
    TK19,499 while its config list printed TK14,990 and TK17,490, an
    unstated-channel offer and an unofficial one.

    A config with no offer in the quoted channel is dropped, not relabelled:
    there is nothing to show for it on this side of the counter.

    The exception is data with no channel attribution at all — an older cached
    pick, or shops that never said. There the prices make no channel claim to
    contradict, so they are printed as they were. */
export function variantRows(
  variants: { variant: string; price: number | null;
              channels?: { channel: string; price: number | null }[] }[] | null | undefined,
  channel?: "official" | "unofficial" | null,
): { variant: string; price: number }[] {
  const vs = variants ?? [];
  const attributed = !!channel && vs.some((v) => v.channels?.length);
  return vs
    .map((v) => attributed
      ? { variant: v.variant, price: v.channels?.find((c) => c.channel === channel)?.price ?? null }
      : { variant: v.variant, price: v.price })
    .filter((r): r is { variant: string; price: number } => r.price != null);
}

/* ---------- domain label / style maps (from the DC logic) ---------- */

export type AxisKey = "camera" | "battery" | "gaming" | "performance" | "ease_of_use";
export const AXES: AxisKey[] = ["camera", "battery", "gaming", "performance", "ease_of_use"];

export function axisLabel(a: string): string {
  return ({ camera: "Camera", battery: "Battery", gaming: "Gaming",
    performance: "Performance", ease_of_use: "Ease of use", ease: "Ease of use",
    balanced: "Balance", video: "Video" } as Record<string, string>)[a] || a;
}

// short tagline shown next to the model name (API has no marketing headline)
export function headlinePhrase(axis: string | null): string {
  return ({ camera: "Camera standout", battery: "Battery champion",
    gaming: "Built for gaming", performance: "Performance pick",
    ease_of_use: "Easy to live with", balanced: "Well-rounded",
    video: "Made for video" } as Record<string, string>)[axis || "balanced"] || "Top match";
}

export interface VerdictMeta { label: string; c: string; bg: string; }
export function verdictMeta(v: string | null | undefined): VerdictMeta {
  const M: Record<string, VerdictMeta> = {
    buy: { label: "Top pick", c: "var(--tealD)", bg: "var(--tealL)" },
    consider: { label: "Worth a look", c: "var(--acd)", bg: "var(--amsoft)" },
    avoid: { label: "Has trade-offs", c: "var(--danger)", bg: "var(--dangerL)" },
  };
  return M[v || ""] || M.consider;
}

/** Badge for OUR top recommendation. It is the #1 we picked, so it never reads
    as a lukewarm "worth a look" — confidence only tunes how strongly we say it. */
export function topPickBadge(confidence: string | null | undefined): VerdictMeta {
  const c = (confidence || "").toLowerCase();
  if (c === "low" || c === "unranked")
    return { label: "Closest match", c: "var(--mut)", bg: "var(--tone)" };
  if (c === "medium")
    return { label: "Best match", c: "var(--tealD)", bg: "var(--tealL)" };
  return { label: "Our top pick", c: "var(--tealD)", bg: "var(--tealL)" };
}

export function sevColor(s: string | undefined): string {
  return ({ low: "var(--ac)", med: "var(--acd)", high: "var(--danger)" } as Record<string, string>)[s || ""] || "var(--ac)";
}

// Gray-market / warranty-channel noise — buyers here don't care, so drop it.
const GRAY_RE = /gray|grey|gray-?import|\bimport\b|unofficial|shop warranty|warranty.{0,12}(shop|seller)|imei|btrc|official channel/i;
// Genuinely important hardware defects — surfaced loudly even on a top pick.
const MAJOR_RE = /green ?line|dead pixel|burn-?in|boot ?loop|motherboard|board fail|swell|bulg|catch fire|overheat|won'?t turn on|brick/i;

export interface Caveatish { text: string; sev?: string; id?: string }
/** Split a phone's caveats into the must-see defects and the ordinary notes,
    dropping gray-market warranty chatter entirely. */
export function classifyCaveats(caveats?: Caveatish[] | null): { major: Caveatish[]; notes: Caveatish[] } {
  const kept = (caveats || []).filter((c) => c && c.text && !GRAY_RE.test(c.text));
  const major = kept.filter((c) => c.sev === "high" || MAJOR_RE.test(c.text));
  const notes = kept.filter((c) => !major.includes(c));
  return { major, notes };
}

/** Soft "maybe official" chip — used only when GadgetGear carries the phone,
    the single BD shop we trust as an official channel. */
export const MAYBE_OFFICIAL_STYLE = "color:var(--tealD); background:var(--tealL);";

/** Shop key (as stored on offers) → human display name. Unknown keys fall back
    to the raw key. */
const SHOP_LABEL: Record<string, string> = {
  RioInternational: "Rio International",
  GadgetAndGear: "GadgetGear",
  Pickaboo: "Pickaboo",
  Dazzle: "Dazzle",
  SumashTech: "Sumash Tech",
  GaziElectronics: "Gazi Electronics",
  ExcelTech: "Excel Tech",
  AppleGadgets: "Apple Gadgets",
};
export function shopLabel(shop?: string | null): string {
  if (!shop) return "";
  return SHOP_LABEL[shop] || shop;
}

export interface Fit { fit: string; fitColor: string; }
/** Budget fit, framed so that USING the budget is the win and leaving money on
    the table is neutral-at-best — never the green "you saved!" that nudges
    buyers toward a weaker, cheaper phone. */
export function fitOf(price: number, budget: number): Fit {
  const ratio = price / budget;
  // the budget verdict is a statement about a PRICE, which is the one thing
  // the amber is still for (owner 2026-08-03)
  if (ratio >= 0.9 && ratio <= 1.12) return { fit: "Uses your full budget", fitColor: "var(--ac)" };
  if (ratio < 0.9) return { fit: taka(budget - price) + " under budget", fitColor: "var(--mut2)" };
  return { fit: taka(price - budget) + " over budget", fitColor: "var(--acd)" };
}

/** Estimated value-retention curve from a brand's BD resale reputation (1-10).
    NOT a market quote — a reputation-based estimate, labelled as such in the UI.
    Returns % of today's price retained at year 0..3. Higher resale score → a
    flatter curve (holds value); a weak brand sheds value fast. */
export function retentionCurve(resale: number): number[] {
  const r = Math.max(1, Math.min(10, resale));
  const yearlyDrop = 0.40 - 0.025 * r;        // resale 10 → 15%/yr, resale 2 → 35%/yr
  return [0, 1, 2, 3].map((y) => Math.round(100 * Math.pow(1 - yearlyDrop, y)));
}
