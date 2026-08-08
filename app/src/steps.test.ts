import { describe, expect, it } from "vitest";
import { FORM_PATHS, STEPS, UNOWNED, stepAt, type Step, type StepOption } from "./steps";
import { DEFAULT_FORM, queryToForm, type Form } from "./need";
import { STRING_KEYS, hasBothLangs } from "./i18n";

const form = (over: Partial<Form> = {}): Form => ({ ...DEFAULT_FORM, ...over });

/** Everything a step can put on screen: the grid, the revealed follow-up and
    the sheet. A control that only appears in a sheet is still a control. */
const everyOption = (s: Step, f: Form = form()): StepOption[] => [
  ...s.options(f),
  ...(s.reveal ? s.reveal.options(f) : []),
  ...(s.sheet ? s.sheet.options(f) : []),
];

describe("the table owns every control", () => {
  it("every settable field belongs to exactly one step", () => {
    const owned = STEPS.flatMap((s) => s.owns);
    expect(new Set(owned).size, "a field is owned by two steps").toBe(owned.length);
    expect(owned.slice().sort()).toEqual([...FORM_PATHS].sort());
  });

  it("names a reason for every Form field no step owns", () => {
    // this is the test that matters: minRam and minStorage sat in engine.Params
    // with no UI for a year because nothing asserted the set was covered
    const root = new Set(STEPS.flatMap((s) => s.owns).map((p) => p.split(/[.[]/)[0]));
    for (const k of Object.keys(DEFAULT_FORM)) {
      if (root.has(k)) continue;
      expect(UNOWNED[k], `${k} is on Form, owned by no step, and unexplained`).toBeTruthy();
    }
  });
});

describe("the table is well-formed", () => {
  it("is exactly nine steps with unique ids", () => {
    expect(STEPS).toHaveLength(9);
    expect(new Set(STEPS.map((s) => s.id)).size).toBe(9);
  });

  it("starts on budget and ends on the commit", () => {
    expect(STEPS[0].id).toBe("budget");
    expect(STEPS[0].kind).toBe("budget");
    expect(STEPS[8].id).toBe("musthave");
  });

  it("clamps an out-of-range index instead of returning undefined", () => {
    // the index arrives from the URL, where anything can be typed
    expect(stepAt(-4).id).toBe("budget");
    expect(stepAt(99).id).toBe("musthave");
    expect(stepAt(4).id).toBe(STEPS[4].id);
  });

  it("agrees with need.ts about the last step index", () => {
    // need.ts hard-codes 8 to avoid an import cycle; this is what keeps the two
    // honest if a step is ever added or merged
    expect(queryToForm("s=99").step).toBe(STEPS.length - 1);
  });

  it("translates every title and help line into both languages", () => {
    for (const s of STEPS) {
      expect(STRING_KEYS, `${s.id} title`).toContain(s.titleKey);
      expect(STRING_KEYS, `${s.id} why`).toContain(s.whyKey);
      expect(hasBothLangs(s.titleKey), `${s.id} title`).toBe(true);
      expect(hasBothLangs(s.whyKey), `${s.id} why`).toBe(true);
    }
  });

  it("translates every skip label and every option label", () => {
    for (const s of STEPS) {
      expect(hasBothLangs(s.skipKey), `${s.id} skip`).toBe(true);
      for (const o of everyOption(s)) {
        expect(hasBothLangs(o.labelKey), `${s.id}/${o.id}`).toBe(true);
      }
      if (s.reveal) expect(hasBothLangs(s.reveal.titleKey), `${s.id} reveal`).toBe(true);
      if (s.sheet) {
        expect(hasBothLangs(s.sheet.titleKey), `${s.id} sheet title`).toBe(true);
        expect(hasBothLangs(s.sheet.buttonKey), `${s.id} sheet button`).toBe(true);
      }
    }
  });

  it("uses SVG paths, never emoji, for every option icon", () => {
    for (const s of STEPS) {
      for (const o of everyOption(s)) {
        if (!o.icon) continue;
        expect(o.icon).toMatch(/^M[\d.\s]/);
        expect(o.icon).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
      }
    }
  });

  it("gives every brand its own colour and mark, never a hand-traced wordmark", () => {
    // a guessed logo path is worse than no path: it is both brand misuse and
    // illegible at 40px. The colour and mark are the brand's; the name below
    // carries the meaning on its own.
    const brands = STEPS.find((s) => s.id === "brands")!;
    for (const o of brands.options(form())) {
      expect(o.dot, `${o.id} has no brand colour`).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(o.mark, `${o.id} has no mark`).toBeDefined();
      expect(o.icon, `${o.id} should not carry a traced logo`).toBeUndefined();
    }
  });
});

describe("options do what they say", () => {
  it("no step's main question is conditional — all nine always ask something", () => {
    // §3.1 still holds for the QUESTION. Only the follow-up group is
    // conditional, and it is a second question on the same screen, never the
    // reason a screen disappears — dropping a screen would shorten the walk
    // and re-create the exact problem this design exists to solve.
    for (const s of STEPS) {
      if (s.kind === "budget") continue;
      expect(s.options(form()).length, `${s.id} has nothing to offer`).toBeGreaterThan(0);
    }
  });

  it("every option turns itself on when tapped, sheets and follow-ups included", () => {
    for (const s of STEPS) {
      if (s.kind === "budget") continue;
      for (const o of everyOption(s)) {
        const on = { ...form(), ...o.patch(form()) } as Form;
        expect(o.isOn(on), `${s.id}/${o.id} did not turn on`).toBe(true);
      }
    }
  });

  it("'doesn't matter' clears everything its step can set", () => {
    const loud = form({
      officialOnly: true, requireJack: true, requireIr: true, requireFm: true,
      q: { picks: ["camera", "gaming"], hw: ["jack", "ir", "fm"] },
      avoidChinese: true, includeBrands: ["Samsung"], excludeBrands: ["Apple"],
      platform: "android", osStyle: "clean", socVendor: "mediatek",
      minRam: 8, minStorage: 256, regions: ["IN"], requireRom: true, hwStrict: true,
    });
    for (const s of STEPS) {
      if (s.kind === "budget") continue;
      const after = { ...loud, ...s.clear(loud) } as Form;
      // a control that only appears in a sheet is still a control: the first
      // cut of this cleared the grid and left the sheet's brands excluded
      for (const o of everyOption(s, after)) {
        expect(o.isOn(after), `${s.id}/${o.id} survived clear`).toBe(false);
      }
    }
  });

  it("only asks a follow-up when the main answer makes it mean something", () => {
    const platform = STEPS.find((s) => s.id === "platform")!;
    expect(platform.reveal!.when(form({ platform: "android" }))).toBe(true);
    expect(platform.reveal!.when(form({ platform: "ios" })), "iPhone skins").toBe(false);
    expect(platform.reveal!.when(form()), "unanswered").toBe(false);
  });

  it("spells out the trade-off on both sides of the channel question", () => {
    // owner 2026-08-08: official and unofficial are two answers with two
    // prices, not an option and a way out of the question
    const ch = STEPS.find((s) => s.id === "channel")!;
    expect(ch.options(form())[0].subKey, "official has no trade-off line").toBeTruthy();
    expect(ch.skipSubKey, "unofficial has no trade-off line").toBeTruthy();
    expect(ch.skipIcon, "unofficial renders as a tile, so it needs an icon").toBeTruthy();
    expect(ch.skipStyle).toBe("equal");
    for (const k of [ch.options(form())[0].subKey!, ch.skipSubKey!, ch.skipKey]) {
      expect(hasBothLangs(k), k).toBe(true);
    }
  });

  it("asks nothing about how strict our own data is", () => {
    // owner 2026-08-08: "remove How strict? / verified only". It asked the
    // buyer to arbitrate our coverage, which is ours to fix.
    const must = STEPS.find((s) => s.id === "musthave")!;
    expect(must.reveal).toBeUndefined();
    expect(UNOWNED.hwStrict, "hwStrict is on Form and now unexplained").toBeTruthy();
    expect(FORM_PATHS).not.toContain("hwStrict");
  });

  it("drops the Android-only answers when iPhone is chosen", () => {
    // otherwise "iPhone with a clean skin and a custom ROM" reaches the ranker
    const f = form({ platform: "android", osStyle: "feature", requireRom: true });
    const ios = STEPS.find((s) => s.id === "platform")!.options(f).find((o) => o.id === "ios")!;
    const after = { ...f, ...ios.patch(f) } as Form;
    expect(after.osStyle).toBe("any");
    expect(after.requireRom).toBe(false);
  });

  it("drops the import market when official warranty is required", () => {
    const f = form({ regions: ["IN", "CN"] });
    const ch = STEPS.find((s) => s.id === "channel")!.options(f).find((o) => o.id === "official")!;
    const after = { ...f, ...ch.patch(f) } as Form;
    expect(after.regions).toEqual([]);
  });

  it("clearing the first need question clears the second too", () => {
    // picks is a LADDER: slot 0 weighs 3.0, slot 1 weighs 1.0. Dropping slot 0
    // alone lets filter(Boolean) slide the runner-up into the leading slot and
    // silently triple a weight the buyer gave as a second thought.
    const f = form({ q: { picks: ["camera", "gaming"], hw: [] } });
    const after = { ...f, ...STEPS[1].clear(f) } as Form;
    expect(after.q.picks).toEqual([]);
    expect(after.weights).toEqual({});
  });

  it("clearing the second need question leaves the first alone", () => {
    const f = form({ q: { picks: ["camera", "gaming"], hw: [] } });
    const after = { ...f, ...STEPS[2].clear(f) } as Form;
    expect(after.q.picks).toEqual(["camera"]);
    expect(after.weights.camera).toBe(3);
  });

  it("gives the second question the leading slot when the first was skipped", () => {
    // picks is DENSE -- the ladder is applied by array POSITION, and that
    // contract is mirrored in kpk_backend/core/need.py, so an empty leading
    // slot cannot be held. If the buyer skipped Q1, this answer IS their first
    // priority. Writing it to slot 1 collapsed it into slot 0 anyway while the
    // chip kept checking slot 1, so the option they had just tapped neither lit
    // up nor stayed on the list.
    const f = form({ q: { picks: [], hw: [] } });
    const cam = STEPS[2].options(f).find((o) => o.id === "camera")!;
    const after = { ...f, ...cam.patch(f) } as Form;
    expect(after.q.picks).toEqual(["camera"]);
    expect(after.weights.camera).toBe(3);
    expect(cam.isOn(after)).toBe(true);
  });

  it("never re-offers the first need answer as the second", () => {
    const f = form({ q: { picks: ["camera"], hw: [] } });
    const ids = STEPS[2].options(f).map((o) => o.id);
    expect(ids).not.toContain("camera");
    expect(ids).toContain("gaming");
  });

  it("keeps the hardware answer and the hard filter in step", () => {
    // q.hw builds the sentence the ranker reads; requireJack is the filter.
    // One without the other describes a buyer who does not exist.
    const jack = STEPS.find((s) => s.id === "musthave")!.options(form()).find((o) => o.id === "jack")!;
    const on = { ...form(), ...jack.patch(form()) } as Form;
    expect(on.requireJack).toBe(true);
    expect(on.q.hw).toEqual(["jack"]);
    expect(on.useCase).toContain("headphone jack");
  });

  it("cannot put one brand in both the only and the never list", () => {
    const brands = STEPS.find((s) => s.id === "brands")!;
    const f = form({ excludeBrands: ["Samsung"] });
    const only = brands.options(f).find((o) => o.id === "only:Samsung")!;
    const after = { ...f, ...only.patch(f) } as Form;
    expect(after.includeBrands).toEqual(["Samsung"]);
    expect(after.excludeBrands).toEqual([]);

    // and the other way, from inside the sheet
    const not = brands.sheet!.options(after).find((o) => o.id === "not:Samsung")!;
    const back = { ...after, ...not.patch(after) } as Form;
    expect(back.excludeBrands).toEqual(["Samsung"]);
    expect(back.includeBrands).toEqual([]);
  });

  it("probes at most four options per step", () => {
    // each probe is a /count call on every form edit. Six brand tiles times
    // two sides would be thirteen requests per keystroke — which is why the
    // exclude side lives in a sheet and carries no pills at all.
    for (const s of STEPS) {
      const probed = everyOption(s).filter((o) => o.probe).length;
      expect(probed, `${s.id} probes ${probed}`).toBeLessThanOrEqual(4);
    }
  });
});
