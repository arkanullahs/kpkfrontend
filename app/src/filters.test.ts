import { describe, expect, it } from "vitest";
import { GROUPS, activeGroupCount, anyFilterSet } from "./filters";
import { DEFAULT_FORM, type Form } from "./need";
import { STRING_KEYS, hasBothLangs, t } from "./i18n";

const form = (over: Partial<Form> = {}): Form => ({ ...DEFAULT_FORM, ...over });

describe("collapsed rows state their own value", () => {
  it("a fresh form filters nothing, so every row reads 'any'", () => {
    const f = form();
    for (const g of GROUPS) expect(g.summary(f)).toBeNull();
    expect(activeGroupCount(f)).toBe(0);
    expect(anyFilterSet(f)).toBe(false);
  });

  it("a set group names what it is doing", () => {
    const g = GROUPS.find((x) => x.id === "warranty")!;
    expect(g.summary(form({ officialOnly: true }))).toBe(t("fg_warranty_on"));
  });

  it("lists every hardware dealbreaker, not just the first", () => {
    const g = GROUPS.find((x) => x.id === "hardware")!;
    const s = g.summary(form({ requireJack: true, requireFm: true }))!;
    expect(s).toContain(t("fg_hw_jack"));
    expect(s).toContain(t("fg_hw_fm"));
    expect(s).not.toContain(t("fg_hw_ir"));
  });

  it("merges two different controls in one group", () => {
    const g = GROUPS.find((x) => x.id === "market")!;
    const s = g.summary(form({ regions: ["IN"], hwStrict: true }))!;
    expect(s).toContain("IN");
    expect(s).toContain(t("fg_strict_on"));
  });
});

describe("clearing a group really clears it", () => {
  it("every group's patchOff returns its own summary to null", () => {
    // a form with EVERY filter set at once
    const loud = form({
      officialOnly: true, requireJack: true, requireIr: true, requireFm: true,
      avoidChinese: true, excludeBrands: ["Apple"], platform: "android",
      osStyle: "clean", socVendor: "mediatek", minRam: 8, minStorage: 256,
      includeBrands: ["Samsung"], regions: ["IN"], requireRom: true, hwStrict: true,
    });
    expect(activeGroupCount(loud)).toBe(GROUPS.length);
    for (const g of GROUPS) {
      const after = { ...loud, ...g.patchOff(loud) };
      expect(g.summary(after), `${g.id} did not clear`).toBeNull();
    }
  });

  it("clearing hardware also clears the quiz answer behind it", () => {
    // the hardware answers live in TWO places: q.hw builds the sentence the
    // ranker reads, requireJack is the hard filter. Clearing only the filter
    // leaves the prompt still asking for a jack we no longer filter on.
    const f = form({ requireJack: true, q: { picks: ["camera"], hw: ["jack"] } });
    const g = GROUPS.find((x) => x.id === "hardware")!;
    const after = { ...f, ...g.patchOff(f) } as Form;
    expect(after.requireJack).toBe(false);
    expect(after.q.hw).toEqual([]);
    expect(after.q.picks, "must not clobber the quiz answers").toEqual(["camera"]);
  });

  it("clearing one group leaves the others alone", () => {
    const loud = form({ officialOnly: true, avoidChinese: true });
    const g = GROUPS.find((x) => x.id === "warranty")!;
    const after = { ...loud, ...g.patchOff(loud) };
    expect(activeGroupCount(after)).toBe(1);
  });
});

describe("the groups are well-formed", () => {
  it("splits into exactly two tiers with nothing stranded", () => {
    expect(GROUPS.filter((g) => g.tier === 1)).toHaveLength(3);
    expect(GROUPS.filter((g) => g.tier === 2)).toHaveLength(4);
  });

  it("has no duplicate ids", () => {
    expect(new Set(GROUPS.map((g) => g.id)).size).toBe(GROUPS.length);
  });

  it("every label and help key exists in BOTH languages", () => {
    // a missing key silently renders the key name, which ships as gibberish
    for (const g of GROUPS) {
      expect(STRING_KEYS, `${g.id} label`).toContain(g.labelKey);
      expect(STRING_KEYS, `${g.id} help`).toContain(g.helpKey);
      expect(hasBothLangs(g.labelKey), `${g.id} label missing a language`).toBe(true);
      expect(hasBothLangs(g.helpKey), `${g.id} help missing a language`).toBe(true);
    }
  });

  it("every value string a summary can emit is translated too", () => {
    // summary() builds its text from t() calls; an untranslated one would show
    // the buyer a bare key inside an otherwise fine sentence
    for (const k of ["fg_warranty_on", "fg_hw_jack", "fg_hw_ir", "fg_hw_fm",
                     "fg_avoid_cn", "fg_platform_android", "fg_platform_ios",
                     "fg_os_clean", "fg_os_feature", "fg_soc_snapdragon",
                     "fg_soc_mediatek", "fg_rom_on", "fg_strict_on"]) {
      expect(hasBothLangs(k), `${k} missing`).toBe(true);
    }
  });

  it("every icon is a real SVG path, not an emoji", () => {
    for (const g of GROUPS) {
      expect(g.icon).toMatch(/^M[\d.\s]/);
      expect(g.icon).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
    }
  });
});
