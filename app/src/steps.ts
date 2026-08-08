import { deriveIntent, type Form } from "./need";
import { toggleBrand, toggleHardware } from "./filters";

/* The nine steps, as data.

   One question owns one screen (spec 2026-08-08). The table is pure so the
   thing that actually protects the restructure -- "every settable field is
   owned by exactly one step" -- can be asserted without booting React.

   `owns` is a PATH, not a field name, because the two need questions share
   `q.picks` and own different slots of it.

   Revision 2026-08-08b, from the owner's walk-through of the live build:
   long scrolling lists became grids, two conflated questions were split
   (a platform is not a software skin; a chipset is not an amount of RAM),
   the official/unofficial channel was promoted to its own screen because it
   is what buyers here care about most, and the overflow lists moved into
   sheets instead of growing the page. */

export type StepKind = "budget" | "single" | "multi";

/** How a step lays its options out.
    `grid2` -- icon tiles, two up. The default: a nine-screen walk of
      full-width rows reads as a queue, which is what the owner saw.
    `grid3` -- compact tiles, three up. Brands.
    `chips` -- a wrapping row of short text pills. Sizes and markets. */
export type StepLayout = "grid2" | "grid3" | "chips";

export interface StepOption {
  /** stable across renders: it keys the /count probe map and the tests */
  id: string;
  labelKey: string;
  /** the trade-off, one line under the label. An option a buyer cannot price
      is an option they guess at — "official" and "unofficial" are the case
      that proved it. */
  subKey?: string;
  /** SVG path `d`. Omitted on chips, which are text. */
  icon?: string;
  /** the brand's own colour, as the fill behind its mark. */
  dot?: string;
  /** the brand's mark, drawn in white on `dot`. Xiaomi's MI and OnePlus's 1+
      are the real marks; the single letters stand in for wordmarks, which
      cannot be hand-traced without becoming both brand misuse and an
      illegible squiggle at 40px. Swap in the vendors' own SVG files and this
      field is what they replace. */
  mark?: string;
  patch: (f: Form) => Partial<Form>;
  isOn: (f: Form) => boolean;
  /** the form to count against, for the "1 of 46" pill. Omitted = no pill;
      see the four-probe cap in the tests. */
  probe?: (f: Form) => Partial<Form>;
}

/** A second, labelled group on the same screen, shown only when the main
    answer makes it meaningful. This is progressive disclosure, not a tenth
    screen: "which Android skin" is not a question to ask someone who just
    said iPhone, and "which import market" is noise to someone who just asked
    for official warranty. */
export interface StepGroup {
  when: (f: Form) => boolean;
  titleKey: string;
  layout: StepLayout;
  options: (f: Form) => StepOption[];
}

/** The overflow list, behind a button. A list long enough to scroll past the
    question is a list that stops being read. */
export interface StepSheet {
  buttonKey: string;
  titleKey: string;
  options: (f: Form) => StepOption[];
}

export interface Step {
  id: string;
  kind: StepKind;
  titleKey: string;
  whyKey: string;
  layout: StepLayout;
  /** paths on Form this step is the only owner of */
  owns: string[];
  options: (f: Form) => StepOption[];
  reveal?: StepGroup;
  sheet?: StepSheet;
  /** The answer an earlier screen already settled, or null if the question is
      still open. A non-null result means this screen is SKIPPED and the patch
      applied on the way past.

      Owner 2026-08-08: "if someone choose apple why fucking ask this stupid
      question again?" Asking an Apple buyer to choose Android or iPhone, and
      then to pick a chipset vendor Apple does not use, is not a question --
      it is a screen that can only be answered wrong. */
  moot?: (f: Form) => Partial<Form> | null;
  /** what "doesn't matter" does */
  clear: (f: Form) => Partial<Form>;
  /** "doesn't matter" as a full-size peer of the real answers, or as a quiet
      line below them. The two need questions are FORCED CHOICES -- that is the
      finding the whole quiz rests on (an evenly-weighted pair is flat 70% of
      the time) -- so their skip is quiet. Every filter step's is equal.
      `equal` now means what it says: the skip renders as a TILE in the same
      grid, not as a wide bare box under it. The channel screen is why -- with
      "official" as a tile and "unofficial" as a box, one of two equal answers
      looked like the way out. */
  skipStyle: "quiet" | "equal";
  skipKey: string;
  skipSubKey?: string;
  skipIcon?: string;
}

/** Every settable path on Form. The test asserts this is exactly the union of
    the steps' `owns`, so a control cannot be orphaned by a restructure. */
export const FORM_PATHS = [
  "budget", "q.picks[0]", "q.picks[1]", "q.hw",
  "officialOnly", "requireJack", "requireIr", "requireFm",
  "includeBrands", "excludeBrands", "avoidChinese",
  "platform", "osStyle", "socVendor", "minRam", "minStorage",
  "regions", "requireRom",
] as const;

/** Fields on Form that no step owns, and why. Anything else uncovered fails
    the test — which is the point. */
export const UNOWNED: Record<string, string> = {
  hwStrict: "no control, by owner ruling 2026-08-08 ('remove How strict? / verified only'). It asked the buyer to arbitrate our own data coverage, which is our problem, not theirs. It stays on Form at its default because toParams still sends it.",
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
  ram: "M4 8h16v8H4V8zM7 16v3M12 16v3M17 16v3M8 11h2v2H8zM14 11h2v2h-2z",
  rom: "M4 6h16v12H4V6zM4 12h16M7 9h.01M7 15h.01M11 15h6",
  // every "doesn't matter" tile carries this, so no grid has a tile with no
  // icon sitting next to tiles that do
  any: "M4 12l5 5L20 6M4 18h6",
};

const Q1_KEYS = ["camera", "battery", "speed", "simple"];
const Q2_KEYS = ["camera", "battery", "speed", "simple", "gaming", "video"];

/* Each brand's own colour, used as a delineated dot beside the name — never
   as the label's colour and never as a fill.

   These are the brands' real palette values, not approximations of their
   wordmarks. Redrawing a logo from memory is how brand misuse happens, and a
   guessed path is worse than no path: the name in the product's own type is
   both accurate and legible, which a hand-traced wordmark is neither. */
const BRANDS: [string, string, string][] = [
  ["Samsung", "#1428A0", "S"], ["Xiaomi", "#FF6900", "MI"], ["vivo", "#415FFF", "v"],
  ["OnePlus", "#EB0028", "1+"], ["realme", "#FFC915", "r"], ["Apple", "#1D1D1F", ""],
];
const MARKETS = ["IN", "Global", "CN", "US", "JP", "SG", "AU"];

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

/** The buyer asked for Apple and nothing else, which settles both the platform
    and the chipset without another screen. */
const onlyApple = (f: Form) =>
  f.includeBrands.length === 1 && f.includeBrands[0] === "Apple";

/** A size tile: icon, the number, and what that number actually buys. */
const sizeTile = (id: string, labelKey: string, icon: string,
                  patch: StepOption["patch"], isOn: StepOption["isOn"],
                  probe: StepOption["probe"]): StepOption =>
  ({ id, labelKey, subKey: labelKey + "_sub", icon, patch, isOn, probe });

export const STEPS: Step[] = [
  {
    id: "budget", kind: "budget", layout: "grid2",
    titleKey: "s_budget_t", whyKey: "s_budget_why",
    owns: ["budget"],
    options: () => [],
    clear: () => ({}),
    skipStyle: "quiet", skipKey: "s_skip",
  },
  {
    id: "need1", kind: "single", layout: "grid2",
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
    id: "need2", kind: "single", layout: "grid2",
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
    /* The channel. Owner 2026-08-08: "people care most about those."
       Official and unofficial are not a warranty checkbox — they are two
       different things to buy, at two different prices, with two different
       answers to "who fixes it". So the screen says that, and the import
       market rides behind it, because a market is only a question for
       someone who has already accepted an unofficial set. */
    id: "channel", kind: "single", layout: "grid2",
    titleKey: "s_channel_t", whyKey: "s_channel_why",
    owns: ["officialOnly", "regions"],
    options: () => [{
      id: "official", labelKey: "s_official", subKey: "s_official_sub", icon: ICON.shield,
      patch: () => ({ officialOnly: true, regions: [] }),
      isOn: (f) => f.officialOnly,
      probe: () => ({ officialOnly: true }),
    }],
    sheet: {
      buttonKey: "s_market_open", titleKey: "s_market_t",
      options: () => MARKETS.map((code) => chip("mkt:" + code, "mkt_" + code,
        (f) => ({ regions: toggleIn(f.regions, code) }), (f) => f.regions.includes(code))),
    },
    clear: () => ({ officialOnly: false, regions: [] }),
    /* The second half of a two-sided answer: a tile, with its own trade-off,
       its own icon and its own count. Owner 2026-08-08 on the first cut --
       "why u make sound unofficial too much bad or sub option like" -- so it
       is named plainly, its upside is stated first, and the count that used
       to appear on official alone now appears on both. */
    skipStyle: "equal", skipKey: "s_unofficial",
    skipSubKey: "s_unofficial_sub", skipIcon: ICON.globe,
  },
  {
    id: "brands", kind: "multi", layout: "grid3",
    titleKey: "s_brands_t", whyKey: "s_brands_why",
    owns: ["includeBrands", "excludeBrands", "avoidChinese"],
    // Tapping a tile means "only this one". Ruling a brand OUT is the rarer
    // intent and a different question, so it lives in the sheet rather than
    // doubling the grid into twelve tiles where half of them repeat the names
    // in the other half.
    options: () => BRANDS.map(([b, dot, mark]) => ({
      id: "only:" + b, labelKey: "brand_" + b, dot, mark,
      patch: (f: Form) => toggleBrand(f, b, "only"),
      isOn: (f: Form) => f.includeBrands.includes(b),
    })),
    sheet: {
      buttonKey: "s_brands_hide", titleKey: "s_brands_hide",
      options: () => [
        ...BRANDS.map(([b, dot, mark]) => ({
          id: "not:" + b, labelKey: "brand_" + b, dot, mark,
          patch: (f: Form) => toggleBrand(f, b, "avoid"),
          isOn: (f: Form) => f.excludeBrands.includes(b),
        })),
        chip("nocn", "fg_avoid_cn",
          (f) => ({ avoidChinese: !f.avoidChinese }), (f) => f.avoidChinese),
      ],
    },
    clear: () => ({ includeBrands: [], excludeBrands: [], avoidChinese: false }),
    skipStyle: "equal", skipKey: "s_skip_brands", skipIcon: ICON.any,
  },
  {
    /* Platform only. The skin question used to sit in the same list, which
       made "iPhone" and "plain software" look like alternatives to each
       other — they are not, and the owner read it as one confused screen. */
    id: "platform", kind: "single", layout: "grid2",
    titleKey: "s_type_t", whyKey: "s_type_why",
    owns: ["platform", "osStyle", "requireRom"],
    // Apple only makes iPhones. Asking is not a question.
    moot: (f) => (onlyApple(f) ? { platform: "ios" as const, osStyle: "any" as const, requireRom: false } : null),
    options: () => [
      { id: "android", labelKey: "fg_platform_android", icon: ICON.android,
        patch: () => ({ platform: "android" as const }), isOn: (f) => f.platform === "android",
        probe: () => ({ platform: "android" as const }) },
      { id: "ios", labelKey: "fg_platform_ios", icon: ICON.apple,
        patch: () => ({ platform: "ios" as const, osStyle: "any" as const, requireRom: false }),
        isOn: (f) => f.platform === "ios",
        probe: () => ({ platform: "ios" as const }) },
    ],
    // Skins and custom ROMs are Android facts. Asking an iPhone buyer about
    // them is asking a question with no answer.
    reveal: {
      when: (f) => f.platform === "android",
      titleKey: "s_skin_t", layout: "grid2",
      options: () => [
        { id: "clean", labelKey: "fg_os_clean", icon: ICON.clean,
          patch: () => ({ osStyle: "clean" as const }), isOn: (f) => f.osStyle === "clean",
          probe: () => ({ osStyle: "clean" as const }) },
        { id: "feature", labelKey: "fg_os_feature", icon: ICON.chip,
          patch: () => ({ osStyle: "feature" as const }), isOn: (f) => f.osStyle === "feature",
          probe: () => ({ osStyle: "feature" as const }) },
        { id: "lineage", labelKey: "fg_rom_on", icon: ICON.rom,
          patch: (f: Form) => ({ requireRom: !f.requireRom }),
          isOn: (f: Form) => f.requireRom,
          probe: () => ({ requireRom: true }) },
      ],
    },
    clear: () => ({ platform: "any" as const, osStyle: "any" as const, requireRom: false }),
    skipStyle: "equal", skipKey: "s_skip_type", skipIcon: ICON.any,
  },
  {
    /* Chipset alone. It used to share a screen with RAM and storage — three
       unrelated axes in one eight-item list, which is the other conflation
       the owner named. */
    id: "chipset", kind: "single", layout: "grid2",
    titleKey: "s_power_t", whyKey: "s_power_why",
    owns: ["socVendor"],
    // Apple designs its own silicon: neither answer on this screen exists on
    // an iPhone, so both would read "nothing matches" and the screen would be
    // a dead end wearing a question mark
    moot: (f) => (onlyApple(f) || f.platform === "ios" ? { socVendor: "any" as const } : null),
    options: () => [
      { id: "snapdragon", labelKey: "fg_soc_snapdragon", icon: ICON.chip,
        patch: (f) => ({ socVendor: f.socVendor === "snapdragon" ? "any" as const : "snapdragon" as const }),
        isOn: (f) => f.socVendor === "snapdragon",
        probe: () => ({ socVendor: "snapdragon" as const }) },
      { id: "mediatek", labelKey: "fg_soc_mediatek", icon: ICON.speed,
        patch: (f) => ({ socVendor: f.socVendor === "mediatek" ? "any" as const : "mediatek" as const }),
        isOn: (f) => f.socVendor === "mediatek",
        probe: () => ({ socVendor: "mediatek" as const }) },
    ],
    clear: () => ({ socVendor: "any" as const }),
    skipStyle: "equal", skipKey: "s_skip_power", skipIcon: ICON.any,
  },
  {
    /* Sizes as explained tiles, not bare chips. "8GB" is a number a buyer
       cannot price; "comfortable for years, and where most people should
       stop" is a decision. Every one carries its own live count, so the cost
       of asking for more is on screen before the tap. */
    id: "memory", kind: "multi", layout: "grid3",
    titleKey: "s_memory_t", whyKey: "s_memory_why",
    owns: ["minRam", "minStorage"],
    options: () => [6, 8, 12].map((n) => sizeTile("ram" + n, "s_ram_" + n, ICON.ram,
      (f) => ({ minRam: f.minRam === n ? 0 : n }), (f) => f.minRam === n,
      () => ({ minRam: n }))),
    // storage is its own axis, always asked, never mixed into the RAM row
    reveal: {
      when: () => true,
      titleKey: "s_storage_t", layout: "grid3",
      options: () => [128, 256, 512].map((n) => sizeTile("rom" + n, "s_rom_" + n, ICON.rom,
        (f) => ({ minStorage: f.minStorage === n ? 0 : n }), (f) => f.minStorage === n,
        () => ({ minStorage: n }))),
    },
    clear: () => ({ minRam: 0, minStorage: 0 }),
    skipStyle: "equal", skipKey: "s_skip_memory", skipIcon: ICON.any,
  },
  {
    id: "musthave", kind: "multi", layout: "grid2",
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
    // No "verified only" follow-up. Owner 2026-08-08: it asked the buyer to
    // arbitrate our own data coverage, which is our problem to fix, not a
    // question to put in front of someone buying a phone.
    clear: (f) => ({
      requireJack: false, requireIr: false, requireFm: false,
      q: { ...f.q, hw: [] },
    }),
    skipStyle: "equal", skipKey: "s_skip_hardware", skipIcon: ICON.any,
  },
];

/** The index arrives from the URL, so it is clamped rather than trusted. */
export function stepAt(i: number): Step {
  return STEPS[Math.min(STEPS.length - 1, Math.max(0, Math.floor(i) || 0))];
}

/** The screens this buyer will actually see. A moot screen is not hidden to
    save them time -- it is hidden because its question has no answer left. */
export const liveSteps = (f: Form): Step[] => STEPS.filter((s) => !s.moot?.(f));

/** Where `i` lands among the screens that apply, for "4 of 8". */
export function stepPosition(f: Form, i: number): { at: number; of: number } {
  const live = liveSteps(f);
  const id = stepAt(i).id;
  const at = live.findIndex((s) => s.id === id);
  return { at: at < 0 ? 0 : at, of: live.length };
}

/** The next screen in `dir` that still has a question, and everything its
    skipped neighbours already settled. Returns the index unchanged when the
    walk runs out, which the caller clamps. */
export function nextLive(f: Form, from: number, dir: 1 | -1): { i: number; patch: Partial<Form> } {
  let patch: Partial<Form> = {};
  let i = from;
  while (i >= 0 && i <= LAST) {
    const settled = STEPS[i].moot?.({ ...f, ...patch });
    if (!settled) return { i, patch };
    patch = { ...patch, ...settled };
    i += dir;
  }
  return { i: Math.min(LAST, Math.max(0, i)), patch };
}

/** Where the escape link appears (spec §5.2): budget and the leading need axis
    are what the ranker actually consumes, so there is no exit before step 4.
    Step 9's own button is its exit. */
export const EXIT_FROM = 3;
export const LAST = STEPS.length - 1;
