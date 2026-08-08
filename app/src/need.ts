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
  // flow-graph control (spec 2026-08-08). forElderly forks the whole flow and
  // rides in the URL; the other two are transient answers to a guard's dialog
  // and a popup, never serialised.
  forElderly: boolean;
  rechannelWiden: boolean;
  wantMore: boolean;
  includeCnRom: boolean;         // "a China ROM is fine" — actively re-admits
                                 // cn_rom phones the engine excludes by default
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
  forElderly: false, rechannelWiden: false, wantMore: false, includeCnRom: false,
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

    Now: an UNBOUNDED ordered list of trade-off choices, and the weights go
    over the wire (weights= on /recommend, live since the flow-graph work).

    THE GEOMETRIC LADDER IS THE DESIGN, not a taste call. See weightAt below:
    3*(1/3)^i means the first priority (3.0) outweighs every later slot summed
    to infinity (1.5), so the vector cannot flatten no matter how many the
    buyer adds. That replaced the fixed [3.0, 1.0] two-slot array, which capped
    the list at two and still needed hand-tuning to beat is_flat(). */
export interface QuizIntent {
  useCase: string;
  priorities: string[];
  weights: Record<string, number>;
}

/* The geometric ladder: slot i weighs 3*(1/3)^i. Slot 0 = 3.0, and every
   later slot summed to infinity = 1.5, so the first priority outweighs all
   others combined AT ANY COUNT. That is what lets the picker offer an
   unbounded priority list (spec 2026-08-08 §5) without the vector flattening
   -- the failure the old additive multi-select shipped (44 of 672 paths
   produced a dominant axis; measured 08-03 §1.3). The guarantee is arithmetic,
   not a cap. */
export const weightAt = (i: number): number => 3 * (1 / 3) ** i;

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
  q.picks.filter((k) => CHOICES[k]).forEach((k, i) => {
    for (const [ax, share] of CHOICES[k].votes) {
      w[ax] = Math.round(((w[ax] || 0) + share * weightAt(i)) * 100) / 100;
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
  if (f.includeCnRom) p.include_cn = true;   // re-admit cn_rom phones (rom node)
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

/* ---------- the brief in the URL ----------

   That is what makes browser back and forward genuinely work, survives a
   reload, and makes a brief shareable -- before this the picker was one static
   URL and Back exited the app entirely.

   Only non-default fields are written, so a fresh visit has a clean URL. */

/** The last screen's index.

    Deliberately NOT imported from steps.ts: steps imports filters imports
    need, and closing that loop would be a real cycle. steps.test.ts asserts
    this against STEPS.length instead, so adding or merging a step fails a
    test rather than silently clamping people onto the wrong screen. */
const LAST_STEP = 8;

export function formToQuery(f: Form, step = 0): string {
  const p = new URLSearchParams();
  // written only when it is not the first, so a fresh visit still looks clean
  if (step > 0) p.set("s", String(Math.min(LAST_STEP, Math.floor(step))));
  if (f.budget !== DEFAULT_FORM.budget) p.set("b", String(f.budget));
  if (f.forElderly) p.set("eld", "1");
  if (f.includeCnRom) p.set("cnrom", "1");
  if (f.q.picks.length) p.set("w", f.q.picks.join(","));
  if (f.q.hw.length) p.set("hw", f.q.hw.join(","));
  if (f.officialOnly) p.set("official", "1");
  if (f.avoidChinese) p.set("nocn", "1");
  if (f.platform !== "any") p.set("plat", f.platform);
  if (f.osStyle !== "any") p.set("os", f.osStyle);
  if (f.socVendor !== "any") p.set("soc", f.socVendor);
  if (f.minRam) p.set("ram", String(f.minRam));
  if (f.minStorage) p.set("rom", String(f.minStorage));
  if (f.includeBrands.length) p.set("only", f.includeBrands.join(","));
  if (f.excludeBrands.length) p.set("not", f.excludeBrands.join(","));
  if (f.regions.length) p.set("mkt", f.regions.join(","));
  if (f.requireRom) p.set("lineage", "1");
  if (f.hwStrict) p.set("strict", "1");
  return p.toString();
}

/** A URL is a trust boundary — anything at all can be typed into it, and a
    shared link is exactly where hand-edited junk arrives. Every scalar is
    validated back to a legal value rather than cast: `?b=abc` would otherwise
    put NaN in the form and 422 every /count call with no visible cause. */
export function queryToForm(s: string): Partial<Form> & { step: number } {
  const p = new URLSearchParams(s);
  const list = (k: string) => (p.get(k) ? p.get(k)!.split(",").filter(Boolean) : []);
  const nat = (k: string) => { const n = Number(p.get(k)); return Number.isFinite(n) && n > 0 ? n : 0; };
  const oneOf = <T extends string>(k: string, ok: readonly T[], dflt: T): T => {
    const v = p.get(k) as T | null;
    return v && ok.includes(v) ? v : dflt;
  };
  const hw = list("hw").filter((k) => k === "jack" || k === "ir" || k === "fm");
  // clamped, not cast: "?s=99" must land on the last screen and "?s=abc" on
  // the first, never on undefined
  const stepRaw = Number(p.get("s"));
  const step = Number.isFinite(stepRaw)
    ? Math.min(LAST_STEP, Math.max(0, Math.floor(stepRaw)))
    : 0;
  const out: Partial<Form> = {
    budget: nat("b") || DEFAULT_FORM.budget,
    forElderly: p.get("eld") === "1",
    includeCnRom: p.get("cnrom") === "1",
    q: { picks: list("w"), hw },
    officialOnly: p.get("official") === "1",
    avoidChinese: p.get("nocn") === "1",
    platform: oneOf("plat", ["any", "android", "ios"] as const, "any"),
    osStyle: oneOf("os", ["any", "clean", "feature"] as const, "any"),
    socVendor: oneOf("soc", ["any", "snapdragon", "mediatek"] as const, "any"),
    minRam: nat("ram"),
    minStorage: nat("rom"),
    includeBrands: list("only"),
    excludeBrands: list("not"),
    regions: list("mkt"),
    requireRom: p.get("lineage") === "1",
    hwStrict: p.get("strict") === "1",
    // the hardware answers are BOTH a need field and three hard filters, so
    // they have to be rebuilt on both sides or a shared URL loses the filter
    requireJack: hw.includes("jack"),
    requireIr: hw.includes("ir"),
    requireFm: hw.includes("fm"),
  };
  // deriveIntent already drops picks it does not recognise, so ?w=telepathy
  // costs a clause in the brief and nothing else
  return { ...out, ...deriveIntent(out.q!), step };
}
