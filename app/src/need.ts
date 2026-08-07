/* The picker's pure logic: the buyer's answers, the weights they imply, and
   the query the server sees. No React, no DOM, no network.

   Lifted out of App.tsx on 2026-08-07 so it can be unit tested. App.tsx pulls
   in React, every screen component and two analytics SDKs, which meant the one
   function that decides what the ranker receives could not be exercised
   without booting the entire app. That function had already shipped a silent
   bug for a year -- deriveIntent computed a real weight vector and then threw
   the numbers away at the API boundary -- so it is exactly the code that
   earns a test.

   App.tsx re-exports everything here, so existing imports keep working. */
import type { RecParams } from "./api";

export interface Form {
  budget: number;
  archetypes: string[];          // multi-select: the buyer can pick several needs
  platform: "any" | "android" | "ios";
  osStyle: "any" | "clean" | "feature";
  avoidChinese: boolean;         // hide China-HQ brands entirely (Xiaomi, Oppo…)
  officialOnly: boolean;         // only phones with an official-warranty listing
  excludeBrands: string[];
  traitText: string;
  // advanced mode (feedback #2/#7) — hardware dealbreakers + brand whitelist
  requireJack: boolean;
  requireIr: boolean;
  requireFm: boolean;
  socVendor: "any" | "snapdragon" | "mediatek";
  includeBrands: string[];       // only these brands (engine `brand` whitelist)
  hwStrict: boolean;             // unverified hardware also fails must-have filters
  regions: string[];             // accepted import markets (Rio-labeled offers only)
  requireRom: boolean;           // only phones with an official LineageOS build
  // spec-level floors in GB, 0 = no floor. engine.Params has accepted these
  // since the variant work; they have simply never had a control.
  minRam: number;
  minStorage: number;
  // Simple-mode quiz answers (feedback #4) — dynamically weighted, no buckets.
  // `me` is the branch question asked only when the buyer answers "for myself".
  // picks[0] is the buyer's biggest trade-off, picks[1] the runner-up.
  // ORDER IS THE LADDER (3.0 / 1.0) — see deriveIntent.
  q: { picks: string[]; hw: string[] };
  useCase: string;               // EN sentence sent as use_case (embedded intent)
  priorities: string[];          // ordered axes, for the summary screen
  weights: Record<string, number>; // the REAL vector — now sent to the server
}

export const DEFAULT_FORM: Form = {
  budget: 95000, archetypes: [], platform: "any",
  osStyle: "any", avoidChinese: false, officialOnly: false,
  excludeBrands: [], traitText: "",
  requireJack: false, requireIr: false, requireFm: false,
  socVendor: "any", includeBrands: [], hwStrict: false, regions: [], requireRom: false,
  minRam: 0, minStorage: 0,
  q: { picks: [], hw: [] },
  useCase: "", priorities: [], weights: {},
};

/** The forced-choice quiz → the buyer's need.

    THE OLD QUIZ SELF-CANCELLED. It was an additive multi-select over six
    activities ("what do you do on your phone?") and additive multi-select
    provably flattens: only 44 of its 672 reachable combinations produced a
    dominant axis. Tapping photos AND games AND watching says the buyer wants
    everything, which is the same as saying nothing. Worse, this function then
    sorted, sliced three names off and sent `priorities=camera,battery` — the
    numbers it had just computed died in the browser, and the server had to
    invent magnitudes back from rank order.

    Now: two forced choices about TRADE-OFFS, and the weights go over the wire.

    THE LADDER (3.0 then 1.0) IS THE DESIGN, not a taste call. is_flat() on the
    server takes the median of the axes actually touched, so answer 1 must be
    at least twice answer 2, and two answers landing on one axis must not
    out-weigh answer 1. Measured across every reachable path:
      3.0 / 1.8 → 150 of 216 flat;  3.0 / 1.4 → 30;  3.0 / 1.0 → 0.
    Mirrors _CHOICE_LADDER and _CHOICES in kpk_backend/core/need.py. */
export interface QuizIntent {
  useCase: string;
  priorities: string[];
  weights: Record<string, number>;
}

export const CHOICE_LADDER = [3.0, 1.0];

/** option key → [axis shares, English sentence fragment]. The fraction is the
    axis that genuinely rides along: a camera buyer gets some video, a speed
    buyer some gaming. Keep in step with _CHOICES server-side. */
export const CHOICES: Record<string, { votes: [string, number][]; text: string }> = {
  camera:  { votes: [["camera", 1], ["video", 0.2]], text: "wants a camera that genuinely impresses" },
  battery: { votes: [["battery", 1]], text: "wants a battery that still has charge on the second day" },
  speed:   { votes: [["performance", 1], ["gaming", 0.2]], text: "wants speed that never stutters, for years" },
  simple:  { votes: [["ease_of_use", 1]], text: "wants a phone that is simple and never confusing, with big clear text and no ad spam" },
  gaming:  { votes: [["gaming", 1], ["performance", 0.2]], text: "wants heavy games to run smooth without the phone cooking" },
  video:   { votes: [["video", 1], ["camera", 0.2]], text: "shoots video and reels and wants them to look good" },
};

const HW_TEXT: Record<string, string> = {
  jack: "wants a headphone jack for wired earphones",
  ir: "wants an IR blaster to control the TV or AC",
  fm: "wants FM radio that works without internet",
};

export function deriveIntent(q: Form["q"]): QuizIntent {
  const w: Record<string, number> = {};
  const bits: string[] = [];
  q.picks.filter((k) => CHOICES[k]).slice(0, CHOICE_LADDER.length).forEach((k, i) => {
    for (const [ax, share] of CHOICES[k].votes) {
      w[ax] = Math.round(((w[ax] || 0) + share * CHOICE_LADDER[i]) * 100) / 100;
    }
    bits.push(CHOICES[k].text);
  });
  for (const h of q.hw) if (HW_TEXT[h]) bits.push(HW_TEXT[h]);
  const priorities = Object.keys(w).sort((a2, b2) => w[b2] - w[a2]);
  return { useCase: bits.join("; "), priorities, weights: w };
}

/** form → /recommend query params */
export function toParams(f: Form, top = 5): RecParams {
  const p: RecParams = { budget: f.budget, top };
  // NL trait text takes over (server maps it to archetype/priorities/filters)
  if (f.traitText.trim()) {
    p.traits = f.traitText.trim();
  } else if (f.useCase || Object.keys(f.weights).length) {
    // The quiz door. `weights` carries the magnitudes the quiz computed;
    // sending `priorities` instead (an ordered list of names) is what forced
    // the server to synthesise them back from rank order for a year.
    if (f.useCase) p.use_case = f.useCase;
    const w = Object.entries(f.weights);
    if (w.length) p.weights = w.map(([ax, v]) => ax + ":" + v).join(",");
  } else if (f.archetypes.length) {
    // multiple selected needs merge server-side (engine.resolve_intent)
    p.archetype = f.archetypes.join(",");
  }
  if (f.platform !== "any") p.platform = f.platform;
  if (f.osStyle !== "any") p.os_style = f.osStyle;
  if (f.avoidChinese) p.chinese = "exclude"; // brand-origin hard filter (engine)
  if (f.officialOnly) p.official_only = true;
  if (f.excludeBrands.length) p.exclude_brand = f.excludeBrands.join(",");
  if (f.requireJack) p.require_jack = true;
  if (f.requireIr) p.require_ir = true;
  if (f.requireFm) p.require_fm = true;
  if (f.socVendor !== "any") p.soc_vendor = f.socVendor;
  if (f.includeBrands.length) p.brand = f.includeBrands.join(",");
  if (f.hwStrict) p.hw_strict = true;
  if (f.regions.length) p.regions = f.regions.join(",");
  if (f.minRam > 0) p.min_ram = f.minRam;
  if (f.minStorage > 0) p.min_storage = f.minStorage;
  if (f.requireRom) p.require_custom_rom = true;
  return p;
}
