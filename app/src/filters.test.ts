import { describe, expect, it } from "vitest";
import { GROUPS, activeGroupCount, anyFilterSet, buildBrief, toggleBrand, toggleHardware } from "./filters";
import { CHOICES, DEFAULT_FORM, type Form } from "./need";
import { STRING_KEYS, hasBothLangs, t } from "./i18n";
import { taka } from "./theme";

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

  it("setting hardware writes BOTH places, the way clearing does", () => {
    // the hardware question left the quiz and lives only in this group now, so
    // this toggle is the ONLY thing keeping q.hw and the require* flags in step
    const f = form();
    const on = { ...f, ...toggleHardware(f, "jack") } as Form;
    expect(on.requireJack).toBe(true);
    expect(on.q.hw).toEqual(["jack"]);
    expect(on.useCase).toContain("headphone jack");

    const off = { ...on, ...toggleHardware(on, "jack") } as Form;
    expect(off.requireJack).toBe(false);
    expect(off.q.hw).toEqual([]);
    expect(off.useCase).not.toContain("headphone jack");
  });

  it("one hardware toggle never disturbs another", () => {
    const f = form();
    const a = { ...f, ...toggleHardware(f, "jack") } as Form;
    const b = { ...a, ...toggleHardware(a, "fm") } as Form;
    expect(b.requireJack).toBe(true);
    expect(b.requireFm).toBe(true);
    expect(b.requireIr).toBe(false);
    expect(b.q.hw.slice().sort()).toEqual(["fm", "jack"]);
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

describe("a brand can never be in both lists", () => {
  // the two lists now live in SEPARATE groups, so nothing structural stops
  // "only Samsung" and "never Samsung" from both being true — which filters to
  // zero phones with no visible cause
  it("picking a side removes the brand from the other list", () => {
    const f = form({ excludeBrands: ["Samsung", "Apple"] });
    const after = { ...f, ...toggleBrand(f, "Samsung", "only") } as Form;
    expect(after.includeBrands).toEqual(["Samsung"]);
    expect(after.excludeBrands).toEqual(["Apple"]);

    const back = { ...after, ...toggleBrand(after, "Samsung", "avoid") } as Form;
    expect(back.includeBrands).toEqual([]);
    expect(back.excludeBrands).toEqual(["Apple", "Samsung"]);
  });

  it("tapping the same chip twice is a plain toggle off", () => {
    const f = form();
    const on = { ...f, ...toggleBrand(f, "vivo", "only") } as Form;
    const off = { ...on, ...toggleBrand(on, "vivo", "only") } as Form;
    expect(on.includeBrands).toEqual(["vivo"]);
    expect(off.includeBrands).toEqual([]);
  });
});

describe("the brief restates the whole ask", () => {
  it("always shows three clauses, even when nothing is answered", () => {
    // a clause that vanished when empty would make the bar look complete
    // while a question was still unanswered
    const b = buildBrief(form());
    expect(b.map((c) => c.id)).toEqual(["budget", "need", "filters"]);
    expect(b.find((c) => c.id === "need")!.set).toBe(false);
    expect(b.find((c) => c.id === "filters")!.set).toBe(false);
    expect(b.find((c) => c.id === "need")!.text).toBe(t("brief_need_none"));
  });

  it("names every quiz pick and every set filter", () => {
    const b = buildBrief(form({
      budget: 40000,
      q: { picks: ["camera", "battery"], hw: [] },
      officialOnly: true, requireJack: true,
    }));
    expect(b[0].text).toBe(taka(40000));
    // the SHORT form, not the quiz's full sentence
    expect(b[1].text).toBe(`${t("qs_camera")}, ${t("qs_battery")}`);
    expect(b[2].text).toContain(t("fg_warranty_on"));
    expect(b[2].text).toContain(t("fg_hw_jack"));
    expect(b.every((c) => c.set)).toBe(true);
  });

  it("caps a long clause instead of letting the bar grow", () => {
    // measured at 375px: spelling out every value made the bar 233px tall,
    // 29% of the viewport. Two named plus a count, and the clause jumps to the
    // section that lists all of it.
    const f = form({
      officialOnly: true, requireJack: true, avoidChinese: true,
      platform: "android", socVendor: "mediatek", includeBrands: ["Samsung"], regions: ["IN"],
    });
    const b = buildBrief(f);
    expect(b[2].text).toContain(t("brief_more").replace("{n}", "5"));
    expect(b[2].text.split(",")).toHaveLength(3);
  });

  it("drops a quiz pick the CHOICES table does not know", () => {
    // picks come back from the URL too, where anything can be typed
    const b = buildBrief(form({ q: { picks: ["camera", "telepathy"], hw: [] } }));
    expect(b[1].text).toBe(t("qs_camera"));
  });

  it("says the same thing the filter rows say", () => {
    // the bar and the accordion must never describe one filter differently
    const f = form({ avoidChinese: true, regions: ["IN"] });
    const b = buildBrief(f);
    for (const g of GROUPS) {
      const s = g.summary(f);
      if (s) expect(b[2].text).toContain(s);
    }
  });

  it("has a short form for every quiz option", () => {
    // a missing qs_ key would render the raw key name in the bar
    for (const k of Object.keys(CHOICES)) {
      expect(STRING_KEYS, `qs_${k} missing`).toContain("qs_" + k);
      expect(hasBothLangs("qs_" + k), `qs_${k} missing a language`).toBe(true);
    }
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
