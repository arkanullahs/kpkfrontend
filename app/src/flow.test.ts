import { describe, expect, it } from "vitest";
import { NODES, ENTRY, replay, nextNode, prevNode, askPosition, screenOf, type Counts } from "./flow";
import { FORM_PATHS, UNOWNED, SCREENS, type Screen, type StepOption } from "./steps";
import { DEFAULT_FORM, type Form } from "./need";
import { hasBothLangs } from "./i18n";

const form = (o: Partial<Form> = {}): Form => ({ ...DEFAULT_FORM, ...o });
const COUNTS: Counts = { pool: 50, officialPool: 50, cheapestIphone: 80000 };

/** Everything a screen can put on glass: grid, revealed group, sheet. */
const everyOption = (s: Screen, f: Form = form()): StepOption[] => [
  ...s.options(f),
  ...(s.reveal ? s.reveal.options(f) : []),
  ...(s.sheet ? s.sheet.options(f) : []),
];

describe("the screens own every control", () => {
  it("every settable field belongs to exactly one screen", () => {
    const owned = Object.values(SCREENS).flatMap((s) => s.owns);
    expect(new Set(owned).size, "a field owned by two screens").toBe(owned.length);
    expect(owned.slice().sort()).toEqual([...FORM_PATHS].sort());
  });

  it("names a reason for every Form field no screen owns", () => {
    const root = new Set(Object.values(SCREENS).flatMap((s) => s.owns).map((p) => p.split(/[.[]/)[0]));
    for (const k of Object.keys(DEFAULT_FORM)) {
      if (root.has(k)) continue;
      expect(UNOWNED[k], `${k} is on Form, owned by no screen, and unexplained`).toBeTruthy();
    }
  });

  it("every ask node has a screen; guards and the end do not", () => {
    for (const n of Object.values(NODES)) {
      if (n.kind === "ask") expect(screenOf(n.id), `${n.id}`).toBeDefined();
      if (n.kind === "guard" || n.kind === "end") expect(screenOf(n.id), `${n.id}`).toBeUndefined();
    }
  });

  it("translates every screen's title, why, skip and option labels", () => {
    for (const s of Object.values(SCREENS)) {
      expect(hasBothLangs(s.titleKey), `${s.id} title`).toBe(true);
      expect(hasBothLangs(s.whyKey), `${s.id} why`).toBe(true);
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
});

describe("the graph terminates", () => {
  it("every node's next() resolves to a real node id", () => {
    for (const n of Object.values(NODES)) {
      for (const f of [form(), form({ forElderly: true }), form({ platform: "ios" }),
                       form({ includeBrands: ["Apple"] }), form({ wantMore: true }),
                       form({ rechannelWiden: true })]) {
        const nid = n.next(f, COUNTS);
        expect(NODES[nid], `${n.id} -> ${nid}`).toBeDefined();
      }
    }
  });

  it("reaches END from the entry on the main path", () => {
    const path = replay(form(), COUNTS);
    expect(path[0]).toBe(ENTRY);
    expect(path[path.length - 1]).toBe("END");
  });

  it("reaches END on the elderly path", () => {
    const path = replay(form({ forElderly: true }), COUNTS);
    expect(path[path.length - 1]).toBe("END");
  });

  it("Apple-only ends right after brands, never reaching rom/sizes", () => {
    const path = replay(form({ includeBrands: ["Apple"] }), COUNTS);
    expect(path).toContain("brands");
    expect(path).not.toContain("rom");
    expect(path[path.length - 1]).toBe("END");
  });

  it("elderly + iphone budget ends at plat_e -> END when iphone chosen", () => {
    const path = replay(form({ forElderly: true, platform: "ios" }),
                        { ...COUNTS, cheapestIphone: 50000 });
    expect(path).toContain("plat_e");
    expect(path[path.length - 1]).toBe("END");
  });

  it("elderly below the iphone budget skips plat_e", () => {
    const path = replay(form({ forElderly: true, budget: 20000 }),
                        { pool: 20, officialPool: 20, cheapestIphone: 90000 });
    expect(path).not.toContain("plat_e");
    expect(path).toContain("extras");
  });

  it("does not loop forever when a guard's condition always holds", () => {
    const path = replay(form({ forElderly: true }),
                        { pool: 1, officialPool: 1, cheapestIphone: 80000 });
    expect(path[path.length - 1]).toBe("END");
    expect(path.length).toBeLessThan(50);
  });
});

describe("nextNode / prevNode walk the resolved path", () => {
  it("prevNode of the entry is null", () => {
    expect(prevNode(form(), COUNTS, ENTRY)).toBeNull();
  });
  it("next then prev returns to where you were", () => {
    const f = form();
    const after = nextNode(f, COUNTS, "channel");
    expect(prevNode(f, COUNTS, after)).toBe("channel");
  });
  it("skips guard nodes — never returns one to navigate to", () => {
    // elderly budget -> g_official/g_iphone (guards) -> plat_e or extras
    const nxt = nextNode(form({ forElderly: true, budget: 95000 }),
                         { pool: 50, officialPool: 50, cheapestIphone: 60000 }, "budget");
    expect(NODES[nxt].kind).not.toBe("guard");
  });
  it("need1 leads to the more popup, not straight to brands", () => {
    expect(nextNode(form(), COUNTS, "need1")).toBe("more");
  });
  it("needN loops back to the more popup, guard skipped", () => {
    expect(nextNode(form({ q: { picks: ["camera", "battery"], hw: [] } }), COUNTS, "needN")).toBe("more");
  });
  it("the more popup routes on wantMore", () => {
    expect(nextNode(form({ wantMore: true }), COUNTS, "more")).toBe("needN");
    expect(nextNode(form({ wantMore: false }), COUNTS, "more")).toBe("brands");
  });
});

describe("askPosition counts only ask screens on the live path", () => {
  it("guards and popups do not count", () => {
    const { at, of } = askPosition(form(), COUNTS, "budget");
    expect(at).toBe(2); // channel(0) elderly(1) budget(2)
    expect(of).toBeGreaterThan(at);
    const asks = replay(form(), COUNTS).filter((id) => NODES[id].kind === "ask");
    expect(of).toBe(asks.length);
  });
});
