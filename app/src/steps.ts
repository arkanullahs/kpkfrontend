import { deriveIntent, type Form } from "./need";
import { toggleBrand, toggleHardware } from "./filters";

/* The picker's SCREENS, keyed by the flow node that owns them (spec
   2026-08-08). The flow itself -- what comes after what -- lives in flow.ts;
   this file is only what each ask node puts on the glass.

   One question owns one screen. The table is pure so the thing that actually
   protects the restructure -- "every settable field is owned by exactly one
   node" -- can be asserted without booting React (flow.test.ts).

   `owns` is a PATH, not a field name, because the two need questions share
   `q.picks` and own different slots of it.

   History: this was a flat STEPS array walked by index. The owner's flowchart
   branches, loops and exits early, which an index walk cannot express, so the
   array became a graph (flow.ts) and these screens became a node-keyed map.
   The screens, tiles, sheets and copy are otherwise the ones the owner already
   reviewed at becf4564. */

export type StepKind = "budget" | "single" | "multi";

/** How a step lays its options out.
    `grid2` -- icon tiles, two up.
    `grid3` -- compact tiles, three up. Brands, sizes.
    `chips` -- a wrapping row of short text pills. Markets. */
export type StepLayout = "grid2" | "grid3" | "chips";

export interface StepOption {
  /** stable across renders: it keys the /count probe map and the tests */
  id: string;
  labelKey: string;
  /** the trade-off, one line under the label. */
  subKey?: string;
  /** SVG path `d`. Omitted on chips, which are text. */
  icon?: string;
  /** the brand's own colour, as the fill behind its mark. */
  dot?: string;
  /** the brand's mark, drawn in white on `dot`. */
  mark?: string;
  patch: (f: Form) => Partial<Form>;
  isOn: (f: Form) => boolean;
  /** the form to count against, for the "1 of 46" pill. */
  probe?: (f: Form) => Partial<Form>;
}

/** A second, labelled group on the same screen, shown only when the main
    answer makes it meaningful. Progressive disclosure, not another screen. */
export interface StepGroup {
  when: (f: Form) => boolean;
  titleKey: string;
  layout: StepLayout;
  options: (f: Form) => StepOption[];
}

/** The overflow list, behind a button. */
export interface StepSheet {
  buttonKey: string;
  titleKey: string;
  options: (f: Form) => StepOption[];
}

/** One screen. Attached to an `ask` (or `popup`) node in flow.ts via its id. */
export interface Screen {
  id: string;
  kind: StepKind;
  titleKey: string;
  whyKey: string;
  layout: StepLayout;
  /** paths on Form this screen is the only owner of */
  owns: string[];
  options: (f: Form) => StepOption[];
  reveal?: StepGroup;
  sheet?: StepSheet;
  /** what "doesn't matter" does */
  clear: (f: Form) => Partial<Form>;
  /** "doesn't matter" as a full-size peer (`equal`), a quiet line below
      (`quiet`), or absent (`none`). The need questions are forced choices, so
      their skip is quiet; every filter's is equal.

      `none` is for the FORKS. "Is this for an elderly person?" shipped with
      yes / no / Skip, where Skip did exactly what No did -- a third control
      that adds a decision and answers nothing. A fork's two tiles already
      cover the whole question. */
  skipStyle: "quiet" | "equal" | "none";
  skipKey: string;
  skipSubKey?: string;
  skipIcon?: string;
}

/** Every settable path on Form. flow.test.ts asserts this is exactly the union
    of the screens' `owns`, so a control cannot be orphaned by a restructure. */
export const FORM_PATHS = [
  "budget", "q.picks[0]", "q.picks[1]", "q.hw",
  "officialOnly", "requireJack", "requireIr", "requireFm",
  "includeBrands", "excludeBrands", "avoidChinese",
  "platform", "socVendor", "minRam", "minStorage",
  "requireRom",
  "forElderly", "rechannel", "includeCnRom",
] as const;

/** Fields on Form that no screen owns, and why. */
export const UNOWNED: Record<string, string> = {
  regions: "the import-market sheet was removed from the channel screen 2026-08-09. It could not be reached: both tiles on that screen auto-advance, so the sheet's own button and the Next it forced onto the screen were dead controls the owner read as clutter. The advanced Configure screen (filters.ts) still exposes markets.",
  hwStrict: "no control, by owner ruling 2026-08-08. It asked the buyer to arbitrate our own data coverage. Stays on Form at its default because toParams still sends it.",
  archetypes: "the deleted door. Still on Form only because toParams branches on it.",
  traitText: "the free-text door. Owner ruled it out 2026-08-07.",
  osStyle: "the clean/feature screen was removed from the picker flow (spec 2026-08-08 §9). Field kept dormant like hwStrict -- the advanced Configure screen (filters.ts) still exposes it, and toParams omits it at its 'any' default -- so the picker never sets it.",
  wantMore: "transient; owned by the `more` popup in flow.ts, which is a dialog, not a Screen. Never serialised.",
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
  chip: "M7 7h10v10H7V7zM4 10h3M4 14h3M17 10h3M17 14h3M10 4v3M14 4v3M10 17v3M14 17v3",
  globe: "M12 3a9 9 0 100 18 9 9 0 000-18zM3.5 9h17M3.5 15h17M12 3c2.5 2.4 3.8 5.6 3.8 9s-1.3 6.6-3.8 9c-2.5-2.4-3.8-5.6-3.8-9S9.5 5.4 12 3z",
  ram: "M4 8h16v8H4V8zM7 16v3M12 16v3M17 16v3M8 11h2v2H8zM14 11h2v2h-2z",
  rom: "M4 6h16v12H4V6zM4 12h16M7 9h.01M7 15h.01M11 15h6",
  elder: "M12 7a2 2 0 100-4 2 2 0 000 4zM10 21v-6l-2-3 1-3h6l1 3-2 3v6M9 12h6",
  // every "doesn't matter" tile carries this
  any: "M4 12l5 5L20 6M4 18h6",
};

const Q1_KEYS = ["camera", "battery", "speed", "simple"];
const Q2_KEYS = ["camera", "battery", "speed", "simple", "gaming", "video"];

const BRANDS: [string, string, string][] = [
  ["Samsung", "#1428A0", "S"], ["Xiaomi", "#FF6900", "MI"], ["vivo", "#415FFF", "v"],
  ["OnePlus", "#EB0028", "1+"], ["realme", "#FFC915", "r"], ["Apple", "#1D1D1F", ""],
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

/** Appending, for the add-more screen: tapping ranks an axis at the end of the
    ladder, tapping it again takes it back off. `picks` stays DENSE, because
    deriveIntent weighs by POSITION -- a hole would silently promote whatever
    followed it. */
function appendPatch(f: Form, key: string): Partial<Form> {
  const picks = f.q.picks.includes(key)
    ? f.q.picks.filter((k) => k !== key)
    : [...f.q.picks, key];
  const q = { ...f.q, picks };
  return { q, ...deriveIntent(q) };
}

const appendOption = (k: string): StepOption => ({
  id: k,
  labelKey: "qc_" + k,
  icon: ICON[k as keyof typeof ICON],
  patch: (f) => appendPatch(f, k),
  isOn: (f) => f.q.picks.includes(k),
});

const chip = (id: string, labelKey: string,
              patch: StepOption["patch"], isOn: StepOption["isOn"]): StepOption =>
  ({ id, labelKey, patch, isOn });

/** The buyer asked for Apple and nothing else, which settles the platform. */
const onlyApple = (f: Form) =>
  f.includeBrands.length === 1 && f.includeBrands[0] === "Apple";

/** A size tile: icon, the number, and what that number actually buys. */
const sizeTile = (id: string, labelKey: string, icon: string,
                  patch: StepOption["patch"], isOn: StepOption["isOn"],
                  probe: StepOption["probe"]): StepOption =>
  ({ id, labelKey, subKey: labelKey + "_sub", icon, patch, isOn, probe });

/** SCREENS keyed by flow node id. flow.ts attaches each to its ask/popup node. */
export const SCREENS: Record<string, Screen> = {
  channel: {
    /* The channel. Owner 2026-08-08: "people care most about those."
       Official and unofficial are two different things to buy, at two prices,
       with two answers to "who fixes it". The import market rides behind it. */
    id: "channel", kind: "single", layout: "grid2",
    titleKey: "s_channel_t", whyKey: "s_channel_why",
    owns: ["officialOnly"],
    options: () => [{
      id: "official", labelKey: "s_official", subKey: "s_official_sub", icon: ICON.shield,
      patch: () => ({ officialOnly: true, regions: [] }),
      isOn: (f) => f.officialOnly,
      probe: () => ({ officialOnly: true }),
    }],
    clear: () => ({ officialOnly: false, regions: [] }),
    skipStyle: "equal", skipKey: "s_unofficial",
    skipSubKey: "s_unofficial_sub", skipIcon: ICON.globe,
  },

  elderly: {
    /* The fork. Owner's flowchart opens on "are you choosing for elderly
       people?" -- a yes takes a shorter path and fills answers for them
       (spec §7). No skip: this is a fork, not a filter. */
    id: "elderly", kind: "single", layout: "grid2",
    titleKey: "s_elderly_t", whyKey: "s_elderly_why",
    owns: ["forElderly"],
    options: () => [
      { id: "eld_yes", labelKey: "s_elderly_yes", subKey: "s_elderly_yes_sub", icon: ICON.elder,
        // ease_of_use leads; the ranker sizes for the price; the bd_service
        // floor is applied server-side (toParams sends it when forElderly).
        // NOT avoidChinese: "global software" means excluding China-ROM gray
        // units (include_cn stays false by default), not excluding Chinese
        // brands -- a Xiaomi on a global ROM is fine, and dropping every
        // Chinese brand would empty a Tk12-15k elderly budget.
        patch: (f) => {
          const q = { ...f.q, picks: ["simple"] };
          return { forElderly: true, q, ...deriveIntent(q) };
        },
        isOn: (f) => f.forElderly },
      { id: "eld_no", labelKey: "s_elderly_no", subKey: "s_elderly_no_sub", icon: ICON.any,
        patch: () => ({ forElderly: false }),
        isOn: (f) => !f.forElderly },
    ],
    clear: () => ({ forElderly: false }),
    skipStyle: "none", skipKey: "s_skip",
  },

  budget: {
    id: "budget", kind: "budget", layout: "grid2",
    titleKey: "s_budget_t", whyKey: "s_budget_why",
    owns: ["budget"],
    options: () => [],
    clear: () => ({}),
    skipStyle: "quiet", skipKey: "s_skip",
  },

  rechannel: {
    /* The elderly channel divert (owner edge -28). Too few official phones at
       this budget -> offer to widen to unofficial.

       "Widen" IS the channel answer, so it carries on forward; sending the
       buyer back to screen one to re-answer a question they just answered is
       the loop the owner rejected. "Keep official" goes back to budget, the
       one screen that can change the outcome, and the guard reads this answer
       so it cannot ask twice. */
    id: "rechannel", kind: "single", layout: "grid2",
    titleKey: "s_rechannel_t", whyKey: "s_rechannel_why",
    owns: ["rechannel"],
    options: () => [
      { id: "widen", labelKey: "s_rechannel_widen", subKey: "s_rechannel_widen_sub", icon: ICON.globe,
        patch: () => ({ rechannel: "widen" as const, officialOnly: false, regions: [] }),
        isOn: (f) => f.rechannel === "widen" },
      { id: "keep", labelKey: "s_rechannel_keep", subKey: "s_rechannel_keep_sub", icon: ICON.shield,
        patch: () => ({ rechannel: "keep" as const }),
        isOn: (f) => f.rechannel === "keep" },
    ],
    clear: () => ({ rechannel: "keep" as const }),
    skipStyle: "none", skipKey: "s_skip",
  },

  plat_e: {
    /* iPhone or Android, on the elderly path only, and only when the budget
       clears the cheapest live iPhone (the g_iphone guard). No skin question:
       osStyle left the picker (spec §9). */
    id: "plat_e", kind: "single", layout: "grid2",
    titleKey: "s_type_t", whyKey: "s_type_why",
    owns: ["platform"],
    options: () => [
      { id: "android", labelKey: "fg_platform_android", icon: ICON.android,
        patch: () => ({ platform: "android" as const }), isOn: (f) => f.platform === "android",
        probe: () => ({ platform: "android" as const }) },
      { id: "ios", labelKey: "fg_platform_ios", icon: ICON.apple,
        patch: () => ({ platform: "ios" as const }), isOn: (f) => f.platform === "ios",
        probe: () => ({ platform: "ios" as const }) },
    ],
    clear: () => ({ platform: "any" as const }),
    skipStyle: "equal", skipKey: "s_skip_type", skipIcon: ICON.any,
  },

  need1: {
    id: "need1", kind: "single", layout: "grid2",
    titleKey: "qc_q1", whyKey: "qc_q1_why",
    owns: ["q.picks[0]"],
    options: () => Q1_KEYS.map((k) => needOption(0, k)),
    clear: (f) => {
      const q = { ...f.q, picks: [] as string[] };
      return { q, ...deriveIntent(q) };
    },
    skipStyle: "quiet", skipKey: "s_skip_need",
  },

  needN: {
    /* The unbounded add-more priority (owner's "let them choose however many
       more they like"). ONE screen, `multi`: each tap appends to the geometric
       ladder -- which cannot flatten, whatever the count (need.ts weightAt) --
       the ladder above redraws, and Next ends it.

       This used to be a single-pick screen inside a needN -> guard -> popup ->
       needN cycle, which put a modal on screen after every tap. Same
       unbounded list, no loop, no modal. Order of tapping IS the order of the
       ladder, so the tiles append rather than replace. */
    id: "needN", kind: "multi", layout: "grid2",
    titleKey: "qc_q2", whyKey: "qc_q2_why",
    owns: ["q.picks[1]"],
    // the leading priority is settled and already drawn in the ladder above;
    // re-offering it would let a buyer rank the same axis twice
    options: (f) => Q2_KEYS.filter((k) => k !== f.q.picks[0]).map(appendOption),
    clear: (f) => {
      const q = { ...f.q, picks: f.q.picks.slice(0, 1) };
      return { q, ...deriveIntent(q) };
    },
    // no skip: this screen already has a Next, and "I'm not sure" next to it
    // is the same button twice. Adding nothing and pressing Next IS the skip.
    skipStyle: "none", skipKey: "s_skip_need",
  },

  brands: {
    id: "brands", kind: "multi", layout: "grid3",
    titleKey: "s_brands_t", whyKey: "s_brands_why",
    owns: ["includeBrands", "excludeBrands", "avoidChinese"],
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

  rom: {
    /* China ROM vs global software (owner edge -59, "remove feature packed or
       plain"). "China is fine" actively re-admits cn_rom phones the engine
       excludes by default; "global only" is the default, stated. */
    id: "rom", kind: "single", layout: "grid2",
    titleKey: "s_soft_t", whyKey: "s_soft_why",
    owns: ["includeCnRom"],
    options: () => [
      { id: "global", labelKey: "s_soft_global", subKey: "s_soft_global_sub", icon: ICON.globe,
        patch: () => ({ includeCnRom: false }), isOn: (f) => !f.includeCnRom },
      { id: "cnrom", labelKey: "s_soft_cn", subKey: "s_soft_cn_sub", icon: ICON.chip,
        patch: () => ({ includeCnRom: true }), isOn: (f) => f.includeCnRom,
        probe: () => ({ includeCnRom: true }) },
    ],
    clear: () => ({ includeCnRom: false }),
    // no skip tile: "global only" IS the default, so a third tile labelled
    // "Skip" was a second button for the answer already sitting next to it
    skipStyle: "none", skipKey: "s_skip",
  },

  sizes: {
    /* Chipset + RAM + storage on one screen (owner edge -62, "then soc ram
       storage"), reversing the split that made three screens of it. */
    id: "sizes", kind: "multi", layout: "grid2",
    titleKey: "s_power_t", whyKey: "s_power_why",
    owns: ["socVendor", "minRam", "minStorage"],
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
    reveal: {
      when: () => true,
      titleKey: "s_memory_t", layout: "grid3",
      options: () => [
        ...[6, 8, 12].map((n) => sizeTile("ram" + n, "s_ram_" + n, ICON.ram,
          (f) => ({ minRam: f.minRam === n ? 0 : n }), (f) => f.minRam === n,
          () => ({ minRam: n }))),
        ...[128, 256, 512].map((n) => sizeTile("rom" + n, "s_rom_" + n, ICON.rom,
          (f) => ({ minStorage: f.minStorage === n ? 0 : n }), (f) => f.minStorage === n,
          () => ({ minStorage: n }))),
      ],
    },
    clear: () => ({ socVendor: "any" as const, minRam: 0, minStorage: 0 }),
    skipStyle: "equal", skipKey: "s_skip_power", skipIcon: ICON.any,
  },

  extras: {
    /* jack / IR / FM, plus custom-ROM support on the main path only (an elderly
       buyer is not flashing LineageOS). Merges owner edges -17 and -65. */
    id: "extras", kind: "multi", layout: "grid2",
    titleKey: "s_hardware_t", whyKey: "s_hardware_why",
    owns: ["q.hw", "requireJack", "requireIr", "requireFm", "requireRom"],
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
    reveal: {
      when: (f) => !f.forElderly,
      titleKey: "s_rom_support_t", layout: "grid2",
      options: () => [
        { id: "lineage", labelKey: "fg_rom_on", icon: ICON.rom,
          patch: (f: Form) => ({ requireRom: !f.requireRom }),
          isOn: (f: Form) => f.requireRom,
          probe: () => ({ requireRom: true }) },
      ],
    },
    clear: (f) => ({
      requireJack: false, requireIr: false, requireFm: false, requireRom: false,
      q: { ...f.q, hw: [] },
    }),
    skipStyle: "equal", skipKey: "s_skip_hardware", skipIcon: ICON.any,
  },
};

/** The screen a node id shows, or undefined for guard/popup/end nodes without
    their own screen. */
export const screenFor = (id: string): Screen | undefined => SCREENS[id];
