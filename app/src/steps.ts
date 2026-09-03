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

/** A further labelled group on the same screen, shown only when the main
    answer makes it meaningful. Progressive disclosure, not another screen.

    A screen can carry SEVERAL. It carried one, and the chipset screen used it
    to put RAM and storage in a single six-tile grid under "How much memory?" —
    "6GB RAM" and "128GB storage" are the same shape, the same size, and near
    enough the same icon, so the owner read the block as one confusing list of
    numbers. They are two different questions and now say so. */
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
  groups?: StepGroup[];
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

/* The tile icons.

   One `d` per option, stroked at 1.9 in a 0 0 24 24 box, drawn at 28px. They
   are PLACEHOLDERS: drop `src/assets/icon/<option-id>.svg` and the tile uses
   that instead, colour and all (see the README there).

   Redrawn 2026-08-09. The owner's screenshot showed "Any brand" wearing a tick
   with a stray horizontal stroke through its tail -- that was a second subpath
   (`M4 18h6`) welded onto the tick for no reason -- and the elderly tile
   wearing a stick figure that at 28px reads as a smudge. Several others were
   the same kind of sketch: open rectangles for a camera, a two-line "apple".

   Rules that keep this set coherent:
     - closed shapes close (`z`), so a stroke join never leaves a notch;
     - nothing thinner than ~2px of real geometry, because 1.9 stroke eats it;
     - `v.01` / `h.01` stubs are deliberate DOTS -- round caps render them as
       circles, which is how eyes and indicator lights are drawn here;
     - one metaphor per axis, and no two icons on the same screen may share a
       silhouette. RAM and storage broke that rule and the owner could not
       tell the two groups apart. */
const ICON = {
  // ---- the priority axes ----
  camera: "M4 8h3.2L9 5.5h6L16.8 8H20a1.5 1.5 0 011.5 1.5v8A1.5 1.5 0 0120 19H4a1.5 1.5 0 01-1.5-1.5v-8A1.5 1.5 0 014 8zM12 16.6a3.3 3.3 0 100-6.6 3.3 3.3 0 000 6.6z",
  battery: "M4.5 8.5h11a2.5 2.5 0 012.5 2.5v2a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 012 13v-2a2.5 2.5 0 012.5-2.5zM20.5 10.5v3M5.5 11v2M8.5 11v2M11.5 11v2",
  speed: "M13 2.5L4.5 13.5H11l-1 8 8.5-11H12l1-8z",
  // a face, not a heart: the axis is "simple, never confusing", and a heart
  // read as "favourite"
  // the smile is an explicit quadratic, not `s`: a smooth-curve command with
  // no preceding curve reflects off the current point, which flattened it
  simple: "M12 21a9 9 0 100-18 9 9 0 000 18zM8.4 14.6q3.6 3.2 7.2 0M9.2 9.8v.01M14.8 9.8v.01",
  gaming: "M7 8.5h10a4 4 0 010 8H7a4 4 0 010-8zM9.5 11v3M8 12.5h3M15.4 11.6v.01M17.6 13.4v.01",
  video: "M4 6.5h10.5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2v-7a2 2 0 012-2zM16.5 11.2l5-2.7v7l-5-2.7z",

  // ---- channel ----
  shield: "M12 2.5l7.5 3v6c0 4.6-3.1 8.3-7.5 9.2-4.4-.9-7.5-4.6-7.5-9.2v-6l7.5-3zM8.8 12l2.3 2.3 4.1-4.6",
  globe: "M12 21a9 9 0 100-18 9 9 0 000 18zM3.4 9h17.2M3.4 15h17.2M12 3c2.4 2.4 3.7 5.6 3.7 9s-1.3 6.6-3.7 9c-2.4-2.4-3.7-5.6-3.7-9S9.6 5.4 12 3z",

  // ---- the elderly fork: a person with a walking stick ----
  elder: "M10 7.4a2.45 2.45 0 100-4.9 2.45 2.45 0 000 4.9zM10 9.6a3.1 3.1 0 00-3.1 3.1v3.4h1.3l.6 5.4h2.4l.6-5.4h1.3v-3.4A3.1 3.1 0 0010 9.6zM17.5 21.5v-7.2a2.1 2.1 0 014.2 0",

  // ---- platform ----
  android: "M6.6 11.6h10.8v5.9a1.5 1.5 0 01-1.5 1.5H8.1a1.5 1.5 0 01-1.5-1.5v-5.9zM6.6 11.6a5.4 5.4 0 0110.8 0M8.3 6.6L6.9 4.4M15.7 6.6l1.4-2.2M9.6 9.2v.01M14.4 9.2v.01M3.4 12.6v3.9M20.6 12.6v3.9",
  // a piece of FRUIT — stem and leaf, no bite. The tile is labelled "iPhone",
  // so the glyph does not need to be the vendor's mark, and tracing that mark
  // would be brand misuse for an icon we drew ourselves
  apple: "M12 21.4c-3.1 0-5.6-3.2-5.6-7.1S8.9 7.2 12 7.2s5.6 3.2 5.6 7.1-2.5 7.1-5.6 7.1zM12 7.2V4.1M12.1 5.6c1.5-2 3.5-1.8 3.5-1.8s.1 2-1.5 2.7c-1.1.5-2-.9-2-.9z",

  // ---- software ----
  chip: "M7.5 7.5h9a1 1 0 011 1v7a1 1 0 01-1 1h-9a1 1 0 01-1-1v-7a1 1 0 011-1zM10.2 10.2h3.6v3.6h-3.6zM9.8 3.5V6M14.2 3.5V6M9.8 18v2.5M14.2 18v2.5M3.5 9.8H6M3.5 14.2H6M18 9.8h2.5M18 14.2h2.5",
  lineage: "M12 2.8l3 2.6 3.9.4.4 3.9 2.6 3-2.6 3-.4 3.9-3.9.4-3 2.6-3-2.6-3.9-.4-.4-3.9-2.6-3 2.6-3 .4-3.9 3.9-.4 3-2.6zM9.2 12.1l2 2 3.6-4",

  /* ---- RAM and storage, deliberately unalike ----
     A stick of memory (flat, pinned along one edge) against a stack of platters
     (round, tall). They sat next to each other as two near-identical slabs, and
     the buyer read six tiles of numbers with no idea which was which. */
  ram: "M2.5 8.6h19a1 1 0 011 1v4.8a1 1 0 01-1 1h-19a1 1 0 01-1-1V9.6a1 1 0 011-1zM5.5 15.4v2.8M9.2 15.4v2.8M12.8 15.4v2.8M16.5 15.4v2.8M5.8 10.6h4v2.8h-4zM14.2 10.6h4v2.8h-4z",
  storage: "M12 7.6c4.1 0 7.5-1.1 7.5-2.55S16.1 2.5 12 2.5 4.5 3.6 4.5 5.05 7.9 7.6 12 7.6zM19.5 5.05V19c0 1.4-3.4 2.55-7.5 2.55S4.5 20.4 4.5 19V5.05M19.5 12.05c0 1.4-3.4 2.55-7.5 2.55S4.5 13.45 4.5 12.05",

  // ---- the extras ----
  jack: "M4.5 15v-2.6a7.5 7.5 0 1115 0V15M4.6 14.4h1.6a1.4 1.4 0 011.4 1.4v3a1.4 1.4 0 01-1.4 1.4H4.6a1.4 1.4 0 01-1.4-1.4v-3a1.4 1.4 0 011.4-1.4zM17.8 14.4h1.6a1.4 1.4 0 011.4 1.4v3a1.4 1.4 0 01-1.4 1.4h-1.6a1.4 1.4 0 01-1.4-1.4v-3a1.4 1.4 0 011.4-1.4z",
  remote: "M8.6 2.6h6.8a2 2 0 012 2v14.8a2 2 0 01-2 2H8.6a2 2 0 01-2-2V4.6a2 2 0 012-2zM12 6.2v.01M10 10h4M10 13h4M10 16h4",
  radio: "M3.8 9.4h16.4a1.5 1.5 0 011.5 1.5v6.6a1.5 1.5 0 01-1.5 1.5H3.8a1.5 1.5 0 01-1.5-1.5v-6.6a1.5 1.5 0 011.5-1.5zM7.5 9.2L17.4 4.6M8.4 15.7a1.6 1.6 0 100-3.2 1.6 1.6 0 000 3.2zM13.5 13h4.8M13.5 15.6h4.8",

  // ---- "doesn't matter", on every skip tile ----
  // a plain, closed tick. It shipped with a second subpath grafted below it,
  // which drew a stray line through the tail (owner screenshot 2026-08-09).
  any: "M4.5 12.6l5 5L19.5 6.8",
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
        isOn: (f) => f.forElderly === true },
      { id: "eld_no", labelKey: "s_elderly_no", subKey: "s_elderly_no_sub", icon: ICON.any,
        patch: () => ({ forElderly: false }),
        isOn: (f) => f.forElderly === false },
    ],
    clear: () => ({ forElderly: null }),   // clearing UNASKS it
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
    /* TWO groups, not one six-tile grid. RAM and storage were rendered
       together under "How much memory?" as six identical compact tiles, and
       the owner could not tell them apart -- correctly, because "8GB RAM" and
       "128GB storage" differed only in the number. They answer different
       questions (how much can it juggle vs how much can it hold), so they get
       their own heading, their own icon, and their own row. */
    groups: [
      {
        when: () => true,
        titleKey: "s_ram_t", layout: "grid3",
        options: () => [6, 8, 12].map((n) => sizeTile("ram" + n, "s_ram_" + n, ICON.ram,
          (f) => ({ minRam: f.minRam === n ? 0 : n }), (f) => f.minRam === n,
          () => ({ minRam: n }))),
      },
      {
        when: () => true,
        titleKey: "s_storage_t", layout: "grid3",
        options: () => [128, 256, 512].map((n) => sizeTile("rom" + n, "s_rom_" + n, ICON.storage,
          (f) => ({ minStorage: f.minStorage === n ? 0 : n }), (f) => f.minStorage === n,
          () => ({ minStorage: n }))),
      },
    ],
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
    groups: [{
      when: (f) => f.forElderly !== true,
      titleKey: "s_rom_support_t", layout: "grid2",
      options: () => [
        { id: "lineage", labelKey: "fg_rom_on", icon: ICON.lineage,
          patch: (f: Form) => ({ requireRom: !f.requireRom }),
          isOn: (f: Form) => f.requireRom,
          probe: () => ({ requireRom: true }) },
      ],
    }],
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
