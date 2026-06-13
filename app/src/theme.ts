import type { CSSProperties } from "react";

/* ---------- accent palette (ported verbatim from the DC mockup) ---------- */

export type Accent = "cobalt" | "emerald" | "teal" | "violet" | "sunset";

interface Pal {
  name: string; main: string; dark: string; g1: string; g2: string;
  soft: string; soft2: string; glow: string; orbA: string; orbB: string; orbC: string;
}

export const PALETTES: Record<Accent, Pal> = {
  cobalt:  { name: "Cobalt", main: "#2563d9", dark: "#1c4eae", g1: "#3b7bf0", g2: "#1f56c2", soft: "rgba(37,99,217,.10)", soft2: "rgba(37,99,217,.30)", glow: "rgba(31,86,194,.34)", orbA: "rgba(37,99,217,.16)", orbB: "rgba(120,90,232,.13)", orbC: "rgba(40,180,200,.11)" },
  emerald: { name: "Emerald", main: "#0b9f73", dark: "#0a6e58", g1: "#14b487", g2: "#0a8a64", soft: "rgba(11,159,115,.10)", soft2: "rgba(11,159,115,.30)", glow: "rgba(10,138,100,.34)", orbA: "rgba(11,159,115,.16)", orbB: "rgba(86,132,232,.12)", orbC: "rgba(232,178,86,.11)" },
  teal:    { name: "Ocean Teal", main: "#0e9b97", dark: "#0a716e", g1: "#16b3ae", g2: "#0c8581", soft: "rgba(14,155,151,.10)", soft2: "rgba(14,155,151,.30)", glow: "rgba(12,133,129,.34)", orbA: "rgba(14,155,151,.16)", orbB: "rgba(60,140,230,.12)", orbC: "rgba(120,200,180,.12)" },
  violet:  { name: "Violet", main: "#6d4bd6", dark: "#5234ab", g1: "#8160e8", g2: "#5e3fc4", soft: "rgba(109,75,214,.10)", soft2: "rgba(109,75,214,.30)", glow: "rgba(94,63,196,.34)", orbA: "rgba(109,75,214,.15)", orbB: "rgba(220,120,200,.12)", orbC: "rgba(90,140,235,.11)" },
  sunset:  { name: "Sunset", main: "#d2643a", dark: "#a8492a", g1: "#e87b4d", g2: "#c2532e", soft: "rgba(210,100,58,.10)", soft2: "rgba(210,100,58,.30)", glow: "rgba(194,83,46,.34)", orbA: "rgba(210,100,58,.15)", orbB: "rgba(210,160,70,.13)", orbC: "rgba(120,170,140,.10)" },
};

export function accentVars(accent: Accent): CSSProperties {
  const p = PALETTES[accent] || PALETTES.cobalt;
  return {
    ["--ac" as any]: p.main, ["--acd" as any]: p.dark,
    ["--acg1" as any]: p.g1, ["--acg2" as any]: p.g2,
    ["--acsoft" as any]: p.soft, ["--acsoft2" as any]: p.soft2,
    ["--acglow" as any]: p.glow,
    ["--orbA" as any]: p.orbA, ["--orbB" as any]: p.orbB, ["--orbC" as any]: p.orbC,
  };
}

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
  return "৳" + fmt(n);
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
    buy: { label: "Top pick", c: "#0a7d57", bg: "rgba(10,157,106,.12)" },
    consider: { label: "Worth a look", c: "#a8761a", bg: "rgba(192,137,42,.14)" },
    avoid: { label: "Avoid", c: "#c4503c", bg: "rgba(196,80,60,.12)" },
  };
  return M[v || ""] || M.consider;
}

export function sevColor(s: string | undefined): string {
  return ({ low: "#a8761a", med: "#c47a1e", high: "#c4503c" } as Record<string, string>)[s || ""] || "#a8761a";
}

export function channelStyle(unofficial: boolean): string {
  return unofficial
    ? "color:#a8761a; background:rgba(192,137,42,.13);"
    : "color:#0a7d57; background:rgba(10,157,106,.12);";
}

/** Is the displayed price an unofficial (gray) one? Matches the price against
    the phone's official/unofficial bests — best_price alone is just the
    cheapest offer, which is usually the gray one. */
export function isUnofficialPrice(
  p: { best_official_price?: number | null; best_unofficial_price?: number | null },
  price: number | null,
  channel: "any" | "official" | "unofficial",
): boolean {
  if (channel === "unofficial") return true;
  if (channel === "official") return false;
  if (p.best_official_price == null && p.best_unofficial_price != null) return true;
  return price != null && price === p.best_unofficial_price && price !== p.best_official_price;
}

export interface Fit { fit: string; fitColor: string; }
export function fitOf(price: number, budget: number): Fit {
  const ratio = price / budget;
  if (ratio >= 0.92 && ratio <= 1.12) return { fit: "Uses your full budget", fitColor: "var(--acd)" };
  if (ratio < 0.92) return { fit: "Saves you " + taka(budget - price), fitColor: "#0a7d57" };
  return { fit: Math.round((ratio - 1) * 100) + "% over budget", fitColor: "#a8761a" };
}
