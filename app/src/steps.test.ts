import { describe, expect, it } from "vitest";
import { FORM_PATHS, STEPS, UNOWNED, stepAt } from "./steps";
import { DEFAULT_FORM, queryToForm, type Form } from "./need";
import { STRING_KEYS, hasBothLangs } from "./i18n";

const form = (over: Partial<Form> = {}): Form => ({ ...DEFAULT_FORM, ...over });

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
    expect(STEPS[8].id).toBe("market");
  });

  it("clamps an out-of-range index instead of returning undefined", () => {
    // the index arrives from the URL, where anything can be typed
    expect(stepAt(-4).id).toBe("budget");
    expect(stepAt(99).id).toBe("market");
    expect(stepAt(4).id).toBe(STEPS[4].id);
  });

  it("agrees with need.ts about the last step index", () => {
    // need.ts hard-codes 8 to avoid an import cycle; this is what keeps the two
    // honest if a step is ever added or merged.
    // The cast is here because queryToForm does not carry `step` yet — that is
    // the URL task. It keeps the build compiling while this still fails.
    const parsed = queryToForm("s=99") as Partial<Form> & { step?: number };
    expect(parsed.step).toBe(STEPS.length - 1);
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
      for (const o of s.options(form())) {
        expect(hasBothLangs(o.labelKey), `${s.id}/${o.id}`).toBe(true);
      }
    }
  });

  it("uses SVG paths, never emoji, for every option icon", () => {
    for (const s of STEPS) {
      for (const o of s.options(form())) {
        if (!o.icon) continue;
        expect(o.icon).toMatch(/^M[\d.\s]/);
        expect(o.icon).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
      }
    }
  });
});

describe("options do what they say", () => {
  it("no step is conditional — all nine always have something to answer", () => {
    // §3.1: a step whose options cannot help at this budget still APPEARS,
    // with its options dimmed. Dropping it would shorten the walk and
    // re-create the exact problem this design exists to solve.
    for (const s of STEPS) {
      if (s.kind === "budget") continue;
      // one is enough: warranty is binary, and its single option sits next to
      // the full-size "doesn't matter" that every step carries
      expect(s.options(form()).length, `${s.id} has nothing to offer`).toBeGreaterThan(0);
    }
  });

  it("every option turns itself on when tapped", () => {
    for (const s of STEPS) {
      if (s.kind === "budget") continue;
      for (const o of s.options(form())) {
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
      for (const o of s.options(after)) {
        expect(o.isOn(after), `${s.id}/${o.id} survived clear`).toBe(false);
      }
    }
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
    const jack = STEPS[4].options(form()).find((o) => o.id === "jack")!;
    const on = { ...form(), ...jack.patch(form()) } as Form;
    expect(on.requireJack).toBe(true);
    expect(on.q.hw).toEqual(["jack"]);
    expect(on.useCase).toContain("headphone jack");
  });

  it("cannot put one brand in both the only and the never list", () => {
    const f = form({ excludeBrands: ["Samsung"] });
    const only = STEPS[5].options(f).find((o) => o.id === "only:Samsung")!;
    const after = { ...f, ...only.patch(f) } as Form;
    expect(after.includeBrands).toEqual(["Samsung"]);
    expect(after.excludeBrands).toEqual([]);
  });

  it("probes at most four options per step", () => {
    // each probe is a /count call on every form edit. Six brand chips times
    // two sides would be thirteen requests per keystroke.
    for (const s of STEPS) {
      const probed = s.options(form()).filter((o) => o.probe).length;
      expect(probed, `${s.id} probes ${probed}`).toBeLessThanOrEqual(4);
    }
  });
});
