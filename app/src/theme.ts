import type { CSSProperties } from "react";
import { bnNum } from "./i18n";

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
  return "৳" + bnNum(fmt(n));
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
    avoid: { label: "Has trade-offs", c: "#c4503c", bg: "rgba(196,80,60,.12)" },
  };
  return M[v || ""] || M.consider;
}

/** Badge for OUR top recommendation. It is the #1 we picked, so it never reads
    as a lukewarm "worth a look" — confidence only tunes how strongly we say it. */
export function topPickBadge(confidence: string | null | undefined): VerdictMeta {
  const c = (confidence || "").toLowerCase();
  if (c === "low" || c === "unranked")
    return { label: "Closest match", c: "var(--acd)", bg: "var(--acsoft)" };
  if (c === "medium")
    return { label: "Best match", c: "#0a7d57", bg: "rgba(10,157,106,.12)" };
  return { label: "Our top pick", c: "#0a7d57", bg: "rgba(10,157,106,.12)" };
}

export function sevColor(s: string | undefined): string {
  return ({ low: "#a8761a", med: "#c47a1e", high: "#c4503c" } as Record<string, string>)[s || ""] || "#a8761a";
}

/** Soft "maybe official" chip — used only when GadgetGear carries the phone,
    the single BD shop we trust as an official channel. */
export const MAYBE_OFFICIAL_STYLE = "color:#0a7d57; background:rgba(10,157,106,.1);";

export interface Fit { fit: string; fitColor: string; }
/** Budget fit, framed so that USING the budget is the win and leaving money on
    the table is neutral-at-best — never the green "you saved!" that nudges
    buyers toward a weaker, cheaper phone. */
export function fitOf(price: number, budget: number): Fit {
  const ratio = price / budget;
  if (ratio >= 0.9 && ratio <= 1.12) return { fit: "Uses your full budget", fitColor: "var(--acd)" };
  if (ratio < 0.9) return { fit: taka(budget - price) + " under budget", fitColor: "#80868f" };
  return { fit: taka(price - budget) + " over budget", fitColor: "#a8761a" };
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
