import { describe, expect, it } from "vitest";
import { CHOICES, CHOICE_LADDER, DEFAULT_FORM, deriveIntent, toParams, type Form } from "./need";

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

describe("the ladder", () => {
  it("is 3.0 then 1.0 -- the gap is the design, not a taste call", () => {
    expect(CHOICE_LADDER).toEqual([3.0, 1.0]);
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

  it("ignores a third answer -- the ladder only has two rungs", () => {
    const two = deriveIntent({ picks: ["camera", "battery"], hw: [] }).weights;
    const three = deriveIntent({ picks: ["camera", "battery", "gaming"], hw: [] }).weights;
    expect(three).toEqual(two);
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
