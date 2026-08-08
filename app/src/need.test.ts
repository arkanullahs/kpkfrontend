import { describe, expect, it } from "vitest";
import { CHOICES, weightAt, DEFAULT_FORM, deriveIntent, formToQuery, queryToForm, toParams, type Form } from "./need";

/* Pure logic only -- no React, no DOM, no network. These cover the two places
   the picker has already been silently wrong:

   1. deriveIntent computed a real weight vector and then discarded the numbers
      at the API boundary, sending an ordered list of names instead. The server
      had to invent magnitudes back from rank order. Shipped that way for a
      year and no check noticed.

   2. The old quiz was an additive multi-select, which provably self-cancels:
      only 44 of its 672 reachable combinations produced a dominant axis.

   Both are invisible in the UI. Both change every recommendation. */

const form = (over: Partial<Form> = {}): Form => ({ ...DEFAULT_FORM, ...over });

/** Mirrors is_flat() in kpk_backend/core/need.py: the median is taken over the
    axes actually touched, so with three axes it is the second-largest. */
function isFlat(w: Record<string, number>): boolean {
  const vals = Object.values(w).sort((a, b) => b - a);
  if (!vals.length) return true;
  if (vals.length === 1) return vals[0] < 0.6;
  const mid = vals[Math.floor(vals.length / 2)];
  return mid ? vals[0] < 2 * mid : false;
}

describe("the geometric ladder", () => {
  it("is 3*(1/3)^i: slot 0 = 3, each next a third", () => {
    expect(weightAt(0)).toBe(3);
    expect(weightAt(1)).toBeCloseTo(1);
    expect(weightAt(2)).toBeCloseTo(1 / 3);
  });

  it("first priority outweighs all others combined at any count", () => {
    for (const n of [2, 4, 8, 20]) {
      const rest = Array.from({ length: n - 1 }, (_, i) => weightAt(i + 1))
        .reduce((s, v) => s + v, 0);
      expect(weightAt(0)).toBeGreaterThan(rest);
    }
  });

  it("gives no flat vector on ANY reachable answer path", () => {
    const keys = Object.keys(CHOICES);
    const flat: string[][] = [];
    for (const a of keys) {
      if (isFlat(deriveIntent({ picks: [a], hw: [] }).weights)) flat.push([a]);
      for (const b of keys) {
        const w = deriveIntent({ picks: [a, b], hw: [] }).weights;
        if (isFlat(w)) flat.push([a, b]);
      }
    }
    expect(flat).toEqual([]);
  });

  it("would go flat on an evenly-weighted ladder -- proving the test bites", () => {
    // the same six options at 3.0/1.8 rather than 3.0/1.0
    const keys = Object.keys(CHOICES);
    let flatCount = 0;
    for (const a of keys) for (const b of keys) {
      const w: Record<string, number> = {};
      [a, b].forEach((k, i) => {
        for (const [ax, share] of CHOICES[k].votes) {
          w[ax] = (w[ax] || 0) + share * [3.0, 1.8][i];
        }
      });
      if (isFlat(w)) flatCount++;
    }
    expect(flatCount).toBeGreaterThan(0);
  });

  it("answer one outweighs answer two by 3x on its own axis", () => {
    const w = deriveIntent({ picks: ["battery", "gaming"], hw: [] }).weights;
    expect(w.battery).toBe(3.0);
    expect(w.gaming).toBe(1.0);
  });

  it("keeps every answer -- the list is unbounded now, not two rungs", () => {
    const two = deriveIntent({ picks: ["camera", "battery"], hw: [] }).weights;
    const three = deriveIntent({ picks: ["camera", "battery", "gaming"], hw: [] }).weights;
    // the third answer adds its axis; the vector grows rather than being sliced
    expect(three).not.toEqual(two);
    expect(three.gaming).toBeCloseTo(weightAt(2));
    // and the leader is untouched by later additions
    expect(three.camera).toBe(two.camera);
  });
});

describe("hardware is a filter, never a weight", () => {
  it("never lands in the weight vector", () => {
    const { weights } = deriveIntent({ picks: ["camera"], hw: ["jack", "ir", "fm"] });
    expect(Object.keys(weights)).not.toContain("jack");
  });

  it("still reaches the statement, so the ranker can mention it", () => {
    const { useCase } = deriveIntent({ picks: ["camera"], hw: ["jack"] });
    expect(useCase).toContain("headphone jack");
  });
});

describe("toParams -- what the server actually receives", () => {
  it("sends the MAGNITUDES, not an ordered list of names", () => {
    const f = form({ q: { picks: ["camera", "gaming"], hw: [] } });
    const p = toParams({ ...f, ...deriveIntent(f.q) });
    // the regression that shipped: p.priorities = "camera,gaming"
    expect(p.priorities).toBeUndefined();
    expect(p.weights).toBe("camera:3,video:0.6,gaming:1,performance:0.2");
  });

  it("sends the buyer's sentence for retrieval to embed", () => {
    const f = form({ q: { picks: ["battery"], hw: [] } });
    const p = toParams({ ...f, ...deriveIntent(f.q) });
    expect(p.use_case).toContain("second day");
  });

  it("omits every filter left at its default", () => {
    const p = toParams(form());
    expect(p.official_only).toBeUndefined();
    expect(p.chinese).toBeUndefined();
    expect(p.platform).toBeUndefined();
    expect(p.brand).toBeUndefined();
  });

  it("carries hardware dealbreakers as hard filters", () => {
    const p = toParams(form({ requireJack: true, requireFm: true }));
    expect(p.require_jack).toBe(true);
    expect(p.require_fm).toBe(true);
    expect(p.require_ir).toBeUndefined();
  });

  it("a buyer who answered nothing sends no need at all", () => {
    const p = toParams(form());
    expect(p.weights).toBeUndefined();
    expect(p.use_case).toBeUndefined();
    expect(p.budget).toBe(DEFAULT_FORM.budget);
  });
});

describe("the brief survives a reload", () => {
  it("round-trips every field the form carries", () => {
    const f = form({
      budget: 42000,
      q: { picks: ["camera", "gaming"], hw: ["jack", "fm"] },
      officialOnly: true, avoidChinese: true,
      platform: "android", osStyle: "clean", socVendor: "mediatek",
      minRam: 8, minStorage: 256,
      includeBrands: ["Samsung"], excludeBrands: ["Apple"],
      regions: ["IN", "Global"], requireRom: true, hwStrict: true,
      requireJack: true, requireFm: true,
      ...deriveIntent({ picks: ["camera", "gaming"], hw: ["jack", "fm"] }),
    });
    const back = { ...DEFAULT_FORM, ...queryToForm(formToQuery(f)) } as Form;
    for (const k of Object.keys(f) as (keyof Form)[]) {
      expect(back[k], `${k} did not survive the URL`).toEqual(f[k]);
    }
  });

  it("writes nothing for an untouched form", () => {
    expect(formToQuery(form())).toBe("");
  });

  it("rebuilds the hard filters behind the hardware answers", () => {
    // q.hw is the sentence the ranker reads; requireJack is the filter. Reading
    // only one side would silently drop the filter from a shared link.
    const back = queryToForm("hw=jack,ir");
    expect(back.requireJack).toBe(true);
    expect(back.requireIr).toBe(true);
    expect(back.requireFm).toBe(false);
  });

  it("survives a hand-edited URL without poisoning the form", () => {
    // a shared link is exactly where junk arrives, and NaN in `budget` would
    // 422 every /count call with no visible cause
    const bad = queryToForm("b=abc&ram=-4&plat=windows&os=&soc=intel&w=telepathy&hw=xray");
    expect(bad.budget).toBe(DEFAULT_FORM.budget);
    expect(bad.minRam).toBe(0);
    expect(bad.platform).toBe("any");
    expect(bad.osStyle).toBe("any");
    expect(bad.socVendor).toBe("any");
    expect(bad.weights).toEqual({});          // unknown pick contributes nothing
    expect(bad.q!.hw).toEqual([]);            // unknown dealbreaker dropped
    expect(bad.requireJack).toBe(false);
  });
});

describe("the flow node survives the URL", () => {
  it("writes the node only when it is not the entry", () => {
    expect(formToQuery(DEFAULT_FORM, "channel")).toBe("");
    expect(formToQuery(DEFAULT_FORM, "brands")).toBe("s=brands");
  });

  it("reads it back", () => {
    expect(queryToForm("s=brands").node).toBe("brands");
  });

  it("passes an unknown node through for App to validate, defaulting to entry", () => {
    // App checks the id against NODES; need.ts only owes a non-empty string
    expect(queryToForm("s=telepathy").node).toBe("telepathy");
    expect(queryToForm("").node).toBe("channel");
    expect(queryToForm("s=").node).toBe("channel");
  });

  it("carries the node alongside a full brief", () => {
    const q = formToQuery({ ...DEFAULT_FORM, budget: 42000, officialOnly: true }, "sizes");
    const back = queryToForm(q);
    expect(back.node).toBe("sizes");
    expect(back.budget).toBe(42000);
    expect(back.officialOnly).toBe(true);
  });
});

describe("flow-graph control fields in the URL", () => {
  it("forElderly and includeCnRom serialise and restore", () => {
    const q = formToQuery({ ...DEFAULT_FORM, forElderly: true, includeCnRom: true });
    expect(q).toContain("eld=1");
    expect(q).toContain("cnrom=1");
    const back = queryToForm(q);
    expect(back.forElderly).toBe(true);
    expect(back.includeCnRom).toBe(true);
  });

  it("transient loop flags never serialise", () => {
    const q = formToQuery({ ...DEFAULT_FORM, wantMore: true, rechannelWiden: true });
    expect(q).not.toContain("more");
    expect(q).not.toContain("widen");
  });

  it("includeCnRom drives include_cn on the wire", () => {
    expect(toParams({ ...DEFAULT_FORM, includeCnRom: true }).include_cn).toBe(true);
    expect(toParams(DEFAULT_FORM).include_cn).toBeUndefined();
  });
});
