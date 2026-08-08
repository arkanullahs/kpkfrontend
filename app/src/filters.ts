import { CHOICES, type Form } from "./need";
import { t } from "./i18n";
import { taka } from "./theme";

/* The controls, grouped by the QUESTION they answer rather than by the param
   they set. Twelve loose toggles read as homework; six rows that state their
   own value read as a receipt — which is the whole answer to "more controls
   without overwhelming" (spec 2026-08-07 section 4.1).

   `summary` returns the value shown on the COLLAPSED row, or null for "any".
   Returning null is load-bearing: a row reading "any" tells the buyer nothing
   is silently filtering them, which is what makes hidden controls frightening.

   Icons are inline SVG path `d` strings at stroke-width 1.85, matching the set
   the app already ships. No emoji — they render differently on every Android
   build and cannot take a theme colour. */
export interface FilterGroup {
  id: string;
  tier: 1 | 2;
  icon: string;
  labelKey: string;
  helpKey: string;
  summary: (f: Form) => string | null;
  /** Takes the current form because clearing a group is not always a constant:
      the hardware answers live in TWO places at once (`q.hw` feeds the
      statement the ranker reads, `requireJack` and friends are the hard
      filter), so clearing one without the other leaves the prompt claiming the
      buyer still wants a jack we are no longer filtering for. */
  patchOff: (f: Form) => Partial<Form>;
}

const ICON = {
  shield: "M12 3l7 3v5.5c0 4.2-2.9 7.6-7 8.5-4.1-.9-7-4.3-7-8.5V6l7-3zM9 12l2 2 4-4",
  remote: "M8 3h8a2 2 0 012 2v14a2 2 0 01-2 2H8a2 2 0 01-2-2V5a2 2 0 012-2zM12 7v.01M9.5 11h5M9.5 14h5M9.5 17h5",
  tag: "M3 11.5V4a1 1 0 011-1h7.5L21 12.5 12.5 21 3 11.5zM7.5 7.5h.01",
  phone: "M7 2h10a2 2 0 012 2v16a2 2 0 01-2 2H7a2 2 0 01-2-2V4a2 2 0 012-2zM10 19h4",
  chip: "M7 7h10v10H7V7zM4 10h3M4 14h3M17 10h3M17 14h3M10 4v3M14 4v3M10 17v3M14 17v3",
  star: "M12 3l2.6 6.3 6.4.5-4.9 4.2 1.5 6.3L12 17l-5.6 3.3 1.5-6.3L3 9.8l6.4-.5L12 3z",
  globe: "M12 3a9 9 0 100 18 9 9 0 000-18zM3.5 9h17M3.5 15h17M12 3c2.5 2.4 3.8 5.6 3.8 9s-1.3 6.6-3.8 9c-2.5-2.4-3.8-5.6-3.8-9S9.5 5.4 12 3z",
};

const join = (bits: (string | false | null)[]) => {
  const on = bits.filter(Boolean) as string[];
  return on.length ? on.join(", ") : null;
};

export const GROUPS: FilterGroup[] = [
  {
    id: "warranty", tier: 1, icon: ICON.shield,
    labelKey: "fg_warranty", helpKey: "fg_warranty_help",
    summary: (f) => (f.officialOnly ? t("fg_warranty_on") : null),
    patchOff: () => ({ officialOnly: false }),
  },
  {
    id: "hardware", tier: 1, icon: ICON.remote,
    labelKey: "fg_hardware", helpKey: "fg_hardware_help",
    summary: (f) => join([f.requireJack && t("fg_hw_jack"),
                          f.requireIr && t("fg_hw_ir"),
                          f.requireFm && t("fg_hw_fm")]),
    patchOff: (f) => ({
      requireJack: false, requireIr: false, requireFm: false,
      q: { ...f.q, hw: [] },
    }),
  },
  {
    id: "avoid", tier: 1, icon: ICON.tag,
    labelKey: "fg_avoid", helpKey: "fg_avoid_help",
    summary: (f) => join([f.avoidChinese && t("fg_avoid_cn"),
                          f.excludeBrands.length ? f.excludeBrands.join(", ") : null]),
    patchOff: () => ({ avoidChinese: false, excludeBrands: [] }),
  },
  {
    id: "type", tier: 2, icon: ICON.phone,
    labelKey: "fg_type", helpKey: "fg_type_help",
    summary: (f) => join([f.platform !== "any" && t("fg_platform_" + f.platform),
                          f.osStyle !== "any" && t("fg_os_" + f.osStyle)]),
    patchOff: () => ({ platform: "any", osStyle: "any" }),
  },
  {
    id: "power", tier: 2, icon: ICON.chip,
    labelKey: "fg_power", helpKey: "fg_power_help",
    summary: (f) => join([f.socVendor !== "any" && t("fg_soc_" + f.socVendor),
                          f.minRam > 0 && `${f.minRam}GB RAM`,
                          f.minStorage > 0 && `${f.minStorage}GB`]),
    patchOff: () => ({ socVendor: "any", minRam: 0, minStorage: 0 }),
  },
  {
    id: "only", tier: 2, icon: ICON.star,
    labelKey: "fg_only", helpKey: "fg_only_help",
    summary: (f) => (f.includeBrands.length ? f.includeBrands.join(", ") : null),
    patchOff: () => ({ includeBrands: [] }),
  },
  {
    id: "market", tier: 2, icon: ICON.globe,
    labelKey: "fg_market", helpKey: "fg_market_help",
    summary: (f) => join([f.regions.length ? f.regions.join(", ") : null,
                          f.requireRom && t("fg_rom_on"),
                          f.hwStrict && t("fg_strict_on")]),
    patchOff: () => ({ regions: [], requireRom: false, hwStrict: false }),
  },
];

/** Toggle a brand in the "only these" or "never these" list.

    The two lists live in separate groups now, so unlike the old screen -- which
    held one list at a time behind a mode switch -- they CAN both name the same
    brand, and "only Samsung, never Samsung" filters to nothing. Resolved where
    the contradiction is created: picking a side removes the brand from the
    other list. */
export function toggleBrand(f: Form, brand: string, side: "only" | "avoid"): Partial<Form> {
  const flip = (list: string[]) =>
    list.includes(brand) ? list.filter((x) => x !== brand) : [...list, brand];
  const drop = (list: string[]) => list.filter((x) => x !== brand);
  return side === "only"
    ? { includeBrands: flip(f.includeBrands), excludeBrands: drop(f.excludeBrands) }
    : { excludeBrands: flip(f.excludeBrands), includeBrands: drop(f.includeBrands) };
}

/** How many groups the buyer has actually set. Drives the nudge trigger and the
    "N set" badge on the tier-2 opener. */
export function activeGroupCount(f: Form): number {
  return GROUPS.filter((g) => g.summary(f) !== null).length;
}

/** The nudge fires only when this is false. */
export function anyFilterSet(f: Form): boolean {
  return activeGroupCount(f) > 0;
}

/** The whole ask, restated in plain words, as the brief bar renders it.

    Three clauses, always three, in the order the screen asks them -- a clause
    that vanished when it was empty would make the bar jump as the buyer typed,
    and worse, would hide the fact that a question is still unanswered. Each
    `id` matches a `#brief-<id>` section, so tapping a clause scrolls to the
    control it describes.

    Kept pure and here rather than in the bar because this text is the buyer's
    only proof of what we are about to ask the ranker; if it silently drifts
    from the form, the bar lies with total confidence. */
export interface BriefClause { id: string; text: string; set: boolean; }

export function buildBrief(f: Form): BriefClause[] {
  const picks = f.q.picks.filter((k) => CHOICES[k]).map((k) => t("qc_" + k));
  const filters = GROUPS.map((g) => g.summary(f)).filter(Boolean) as string[];
  return [
    { id: "budget", text: taka(f.budget), set: true },
    { id: "need", text: picks.length ? picks.join(", ") : t("brief_need_none"), set: picks.length > 0 },
    { id: "filters", text: filters.length ? filters.join(", ") : t("brief_filters_none"), set: filters.length > 0 },
  ];
}
