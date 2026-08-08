import { deriveIntent, type Form } from "./need";
import { toggleBrand, toggleHardware } from "./filters";

/* The nine steps, as data.

   One question owns one screen (spec 2026-08-08). The table is pure so the
   thing that actually protects the restructure -- "every settable field is
   owned by exactly one step" -- can be asserted without booting React.

   `owns` is a PATH, not a field name, because the two need questions share
   `q.picks` and own different slots of it. */

export type StepKind = "budget" | "single" | "multi";

export interface StepOption {
  /** stable across renders: it keys the /count probe map and the tests */
  id: string;
  labelKey: string;
  /** SVG path `d`. Omitted on chip lists, which are text. */
  icon?: string;
  patch: (f: Form) => Partial<Form>;
  isOn: (f: Form) => boolean;
  /** the form to count against, for the "1 of 46" pill. Omitted = no pill;
      see the four-probe cap in the tests. */
  probe?: (f: Form) => Partial<Form>;
}

export interface Step {
  id: string;
  kind: StepKind;
  titleKey: string;
  whyKey: string;
  /** paths on Form this step is the only owner of */
  owns: string[];
  options: (f: Form) => StepOption[];
  /** what "doesn't matter" does */
  clear: (f: Form) => Partial<Form>;
  /** "doesn't matter" as a full-size peer of the real answers, or as a quiet
      line below them. The two need questions are FORCED CHOICES -- that is the
      finding the whole quiz rests on (an evenly-weighted pair is flat 70% of
      the time) -- so their skip is quiet. Every filter step's is equal. */
  skipStyle: "quiet" | "equal";
  skipKey: string;
}

/** Every settable path on Form. The test asserts this is exactly the union of
    the steps' `owns`, so a control cannot be orphaned by a restructure. */
export const FORM_PATHS = [
  "budget", "q.picks[0]", "q.picks[1]", "q.hw",
  "officialOnly", "requireJack", "requireIr", "requireFm",
  "includeBrands", "excludeBrands", "avoidChinese",
  "platform", "osStyle", "socVendor", "minRam", "minStorage",
  "regions", "requireRom", "hwStrict",
] as const;

/** Fields on Form that no step owns, and why. Anything else uncovered fails
    the test — which is the point. */
export const UNOWNED: Record<string, string> = {
  archetypes: "the deleted door. Still on Form only because toParams branches on it; removing it is its own change.",
  traitText: "the free-text door. Owner ruled it out 2026-08-07: 'no free text, llm may interpret wrong'.",
  useCase: "derived from q by deriveIntent",
  priorities: "derived from q by deriveIntent",
  weights: "derived from q by deriveIntent",
};

const ICON = {
  camera: "M4 8h3l1.5-2h7L17 8h3v10H4V8zM12 11a3 3 0 100 6 3 3 0 000-6z",
  battery: "M3 8h14v8H3V8zM17 11h2v2h-2zM6 10.5v3M9 10.5v3M12 10.5v3",
  speed: "M13 2L4.5 13H11l-1 9 8.5-11H12l1-9z",
  simple: "M12 20s-7-4.3-7-9a4 4 0 017-2.6A4 4 0 0119 11c0 4.7-7 9-7 9z",
  gaming: "M6 10h12a3 3 0 110 6H6a3 3 0 110-6zM7 11.5v3M5.5 13h3M16 12.5h.01M18 14h.01",
  video: "M3 7h11v10H3V7zM14 10.5l7-3v9l-7-3",
  shield: "M12 3l7 3v5.5c0 4.2-2.9 7.6-7 8.5-4.1-.9-7-4.3-7-8.5V6l7-3zM9 12l2 2 4-4",
  jack: "M9 3h6v7h-6V3zM12 10v6M9.5 16h5v5h-5v-5z",
  remote: "M8 3h8a2 2 0 012 2v14a2 2 0 01-2 2H8a2 2 0 01-2-2V5a2 2 0 012-2zM12 7v.01M9.5 11h5M9.5 14h5M9.5 17h5",
  radio: "M4 9h16v10H4V9zM7 5l10-2M8 13h.01M12 13h4M12 16h4",
  android: "M6 10h12v8H6v-8zM8 10V7a4 4 0 018 0v3M4 12v4M20 12v4",
  apple: "M12 8c-3 0-5 2.3-5 5.5S9 21 12 21s5-4.3 5-7.5S15 8 12 8zM12 8c0-2 1.4-4 3.5-4",
  clean: "M4 7h16M4 12h10M4 17h7",
  chip: "M7 7h10v10H7V7zM4 10h3M4 14h3M17 10h3M17 14h3M10 4v3M14 4v3M10 17v3M14 17v3",
  globe: "M12 3a9 9 0 100 18 9 9 0 000-18zM3.5 9h17M3.5 15h17M12 3c2.5 2.4 3.8 5.6 3.8 9s-1.3 6.6-3.8 9c-2.5-2.4-3.8-5.6-3.8-9S9.5 5.4 12 3z",
};

const Q1_KEYS = ["camera", "battery", "speed", "simple"];
const Q2_KEYS = ["camera", "battery", "speed", "simple", "gaming", "video"];
const BRANDS = ["Samsung", "Xiaomi", "vivo", "OnePlus", "realme", "Apple"];
const MARKETS: [string, string][] = [
  ["IN", "India"], ["Global", "Global"], ["CN", "China"],
  ["US", "USA"], ["JP", "Japan"], ["SG", "Singapore"], ["AU", "Australia"],
];

/** Answering slot i REPLACES it — this is a choice, not an accumulation. */
function pickPatch(f: Form, slot: number, key: string): Partial<Form> {
  const picks = [...f.q.picks];
  picks[slot] = key;
  const q = { ...f.q, picks: picks.filter(Boolean).filter((k, i, a) => a.indexOf(k) === i) };
  return { q, ...deriveIntent(q) };
}

function needOption(slot: number, k: string): StepOption {
  return {
    id: k,
    labelKey: "qc_" + k,
    icon: ICON[k as keyof typeof ICON],
    patch: (f) => pickPatch(f, slot, k),
    isOn: (f) => f.q.picks[slot] === k,
  };
}

/** Which ladder slot the second question fills.

    `picks` is DENSE. deriveIntent applies the 3.0/1.0 ladder by array
    POSITION, and that contract is mirrored in kpk_backend/core/need.py, so an
    empty leading slot cannot be held -- ["", "gaming"] would weigh gaming at
    3.0 anyway, and the URL cannot carry the hole either.

    So if the buyer skipped the first question, this one IS their first
    priority: it fills slot 0, and it excludes nothing, because there is no
    earlier answer to avoid repeating. Without this the answer collapsed into
    slot 0 while the chip kept checking slot 1, and the option the buyer had
    just tapped both failed to light AND vanished from the list. */
const q2Slot = (f: Form) => (f.q.picks.length ? 1 : 0);

const chip = (id: string, labelKey: string,
              patch: StepOption["patch"], isOn: StepOption["isOn"]): StepOption =>
  ({ id, labelKey, patch, isOn });

const toggleIn = (list: string[], v: string) =>
  list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

export const STEPS: Step[] = [
  {
    id: "budget", kind: "budget",
    titleKey: "s_budget_t", whyKey: "s_budget_why",
    owns: ["budget"],
    options: () => [],
    clear: () => ({}),
    skipStyle: "quiet", skipKey: "s_skip",
  },
  {
    id: "need1", kind: "single",
    titleKey: "qc_q1", whyKey: "qc_q1_why",
    owns: ["q.picks[0]"],
    options: () => Q1_KEYS.map((k) => needOption(0, k)),
    /* Clearing Q1 clears Q2 as well, and that is deliberate. `picks` is a
       LADDER: slot 0 weighs 3.0, slot 1 weighs 1.0. Dropping slot 0 alone
       would let filter(Boolean) slide the runner-up into the leading slot and
       silently triple a weight the buyer gave as a second thought. */
    clear: (f) => {
      const q = { ...f.q, picks: [] as string[] };
      return { q, ...deriveIntent(q) };
    },
    skipStyle: "quiet", skipKey: "s_skip_need",
  },
  {
    id: "need2", kind: "single",
    titleKey: "qc_q2", whyKey: "qc_q2_why",
    owns: ["q.picks[1]"],
    // Q2 never re-offers what Q1 already won: "camera matters most" followed
    // by "camera" again is not a second piece of information. When Q1 was
    // skipped there is no earlier answer to avoid, so nothing is excluded.
    options: (f) => {
      const slot = q2Slot(f);
      return Q2_KEYS
        .filter((k) => slot === 0 || k !== f.q.picks[0])
        .map((k) => needOption(slot, k));
    },
    clear: (f) => {
      const q = { ...f.q, picks: f.q.picks.slice(0, q2Slot(f)) };
      return { q, ...deriveIntent(q) };
    },
    skipStyle: "quiet", skipKey: "s_skip_need",
  },
  {
    id: "warranty", kind: "single",
    titleKey: "s_warranty_t", whyKey: "s_warranty_why",
    owns: ["officialOnly"],
    options: () => [{
      id: "official", labelKey: "fg_warranty", icon: ICON.shield,
      patch: () => ({ officialOnly: true }),
      isOn: (f) => f.officialOnly,
      probe: () => ({ officialOnly: true }),
    }],
    clear: () => ({ officialOnly: false }),
    skipStyle: "equal", skipKey: "s_skip_warranty",
  },
  {
    id: "hardware", kind: "multi",
    titleKey: "s_hardware_t", whyKey: "s_hardware_why",
    // q.hw and the three flags move together or the prompt and the filter
    // describe different buyers
    owns: ["q.hw", "requireJack", "requireIr", "requireFm"],
    // written out rather than mapped: a computed key gives TS
    // `{ [x: string]: boolean }`, which is not assignable to Partial<Form>
    options: () => [
      { id: "jack", labelKey: "fg_hw_jack", icon: ICON.jack,
        patch: (f: Form) => toggleHardware(f, "jack"),
        isOn: (f: Form) => f.q.hw.includes("jack"),
        probe: () => ({ requireJack: true }) },
      { id: "ir", labelKey: "fg_hw_ir", icon: ICON.remote,
        patch: (f: Form) => toggleHardware(f, "ir"),
        isOn: (f: Form) => f.q.hw.includes("ir"),
        probe: () => ({ requireIr: true }) },
      { id: "fm", labelKey: "fg_hw_fm", icon: ICON.radio,
        patch: (f: Form) => toggleHardware(f, "fm"),
        isOn: (f: Form) => f.q.hw.includes("fm"),
        probe: () => ({ requireFm: true }) },
    ],
    clear: (f) => ({
      requireJack: false, requireIr: false, requireFm: false,
      q: { ...f.q, hw: [] },
    }),
    skipStyle: "equal", skipKey: "s_skip_hardware",
  },
  {
    id: "brands", kind: "multi",
    titleKey: "s_brands_t", whyKey: "s_brands_why",
    owns: ["includeBrands", "excludeBrands", "avoidChinese"],
    options: () => [
      ...BRANDS.map((b) => chip("only:" + b, "brand_" + b,
        (f) => toggleBrand(f, b, "only"), (f) => f.includeBrands.includes(b))),
      ...BRANDS.map((b) => chip("not:" + b, "brand_" + b,
        (f) => toggleBrand(f, b, "avoid"), (f) => f.excludeBrands.includes(b))),
      chip("nocn", "fg_avoid_cn",
        (f) => ({ avoidChinese: !f.avoidChinese }), (f) => f.avoidChinese),
    ],
    clear: () => ({ includeBrands: [], excludeBrands: [], avoidChinese: false }),
    skipStyle: "equal", skipKey: "s_skip_brands",
  },
  {
    id: "type", kind: "single",
    titleKey: "s_type_t", whyKey: "s_type_why",
    owns: ["platform", "osStyle"],
    options: () => [
      { id: "android", labelKey: "fg_platform_android", icon: ICON.android,
        patch: () => ({ platform: "android" as const }), isOn: (f) => f.platform === "android",
        probe: () => ({ platform: "android" as const }) },
      { id: "ios", labelKey: "fg_platform_ios", icon: ICON.apple,
        patch: () => ({ platform: "ios" as const }), isOn: (f) => f.platform === "ios",
        probe: () => ({ platform: "ios" as const }) },
      { id: "clean", labelKey: "fg_os_clean", icon: ICON.clean,
        patch: () => ({ osStyle: "clean" as const }), isOn: (f) => f.osStyle === "clean",
        probe: () => ({ osStyle: "clean" as const }) },
      { id: "feature", labelKey: "fg_os_feature", icon: ICON.chip,
        patch: () => ({ osStyle: "feature" as const }), isOn: (f) => f.osStyle === "feature",
        probe: () => ({ osStyle: "feature" as const }) },
    ],
    clear: () => ({ platform: "any" as const, osStyle: "any" as const }),
    skipStyle: "equal", skipKey: "s_skip_type",
  },
  {
    id: "power", kind: "multi",
    titleKey: "s_power_t", whyKey: "s_power_why",
    owns: ["socVendor", "minRam", "minStorage"],
    options: () => [
      chip("snapdragon", "fg_soc_snapdragon",
        (f) => ({ socVendor: f.socVendor === "snapdragon" ? "any" : "snapdragon" }),
        (f) => f.socVendor === "snapdragon"),
      chip("mediatek", "fg_soc_mediatek",
        (f) => ({ socVendor: f.socVendor === "mediatek" ? "any" : "mediatek" }),
        (f) => f.socVendor === "mediatek"),
      ...[6, 8, 12].map((n) => chip("ram" + n, "s_ram_" + n,
        (f) => ({ minRam: f.minRam === n ? 0 : n }), (f) => f.minRam === n)),
      ...[128, 256, 512].map((n) => chip("rom" + n, "s_rom_" + n,
        (f) => ({ minStorage: f.minStorage === n ? 0 : n }), (f) => f.minStorage === n)),
    ],
    clear: () => ({ socVendor: "any" as const, minRam: 0, minStorage: 0 }),
    skipStyle: "equal", skipKey: "s_skip_power",
  },
  {
    id: "market", kind: "multi",
    titleKey: "s_market_t", whyKey: "s_market_why",
    owns: ["regions", "requireRom", "hwStrict"],
    options: () => [
      ...MARKETS.map(([code]) => chip("mkt:" + code, "mkt_" + code,
        (f) => ({ regions: toggleIn(f.regions, code) }), (f) => f.regions.includes(code))),
      chip("lineage", "fg_rom_on", (f) => ({ requireRom: !f.requireRom }), (f) => f.requireRom),
      chip("strict", "fg_strict_on", (f) => ({ hwStrict: !f.hwStrict }), (f) => f.hwStrict),
    ],
    clear: () => ({ regions: [], requireRom: false, hwStrict: false }),
    skipStyle: "equal", skipKey: "s_skip_market",
  },
];

/** The index arrives from the URL, so it is clamped rather than trusted. */
export function stepAt(i: number): Step {
  return STEPS[Math.min(STEPS.length - 1, Math.max(0, Math.floor(i) || 0))];
}

/** Where the escape link appears (spec §5.2): budget and the leading need axis
    are what the ranker actually consumes, so there is no exit before step 4.
    Step 9's own button is its exit. */
export const EXIT_FROM = 3;
export const LAST = STEPS.length - 1;
