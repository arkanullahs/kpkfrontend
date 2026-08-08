import { describe, expect, it } from "vitest";
import { NODES, ENTRY, FEW, replay, nextNode, prevNode, askPosition, screenOf, type Counts } from "./flow";
import { FORM_PATHS, UNOWNED, SCREENS, type Screen, type StepOption } from "./steps";
import { DEFAULT_FORM, type Form } from "./need";
import { hasBothLangs, setLang, t } from "./i18n";

const form = (o: Partial<Form> = {}): Form => ({ ...DEFAULT_FORM, ...o });
const COUNTS: Counts = { pool: 50, cheapestIphone: 80000 };

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

  it("every ask node has a screen; guards, popups and the end do not", () => {
    for (const n of Object.values(NODES)) {
      if (n.kind === "ask") expect(screenOf(n.id), `${n.id}`).toBeDefined();
      else expect(screenOf(n.id), `${n.id}`).toBeUndefined();
    }
  });

  it("translates every screen's title, why and option labels", () => {
    for (const s of Object.values(SCREENS)) {
      expect(hasBothLangs(s.titleKey), `${s.id} title`).toBe(true);
      expect(hasBothLangs(s.whyKey), `${s.id} why`).toBe(true);
      // a fork renders no skip control, so its skip copy is never read
      if (s.skipStyle !== "none") expect(hasBothLangs(s.skipKey), `${s.id} skip`).toBe(true);
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

  /* Every count in the picker -- the pills and the step position -- runs
     through one template, because assembling it as `n + t("of") + m` printed
     the numbers the wrong way round in Bangla: "টির মধ্যে" is a postposition,
     so "3 of 37" came out as "৩ টির মধ্যে ৩৭", which reads "37 out of 3".
     A template can only be got wrong once, per language, visibly. */
  it("the count template names both numbers, in each language's own order", () => {
    for (const lang of ["en", "bn"] as const) {
      setLang(lang);
      const s = t("fg_n_of_m");
      expect(s, `${lang} template`).toContain("{n}");
      expect(s, `${lang} template`).toContain("{m}");
    }
    setLang("bn");
    // the small number is the survivors, the big one the pool it came from
    expect(t("fg_n_of_m").indexOf("{m}")).toBeLessThan(t("fg_n_of_m").indexOf("{n}"));
    setLang("en");
    expect(t("fg_n_of_m").indexOf("{n}")).toBeLessThan(t("fg_n_of_m").indexOf("{m}"));
  });

  /* A screen whose options cannot all be reached is a dead control. The
     channel screen shipped a "choose an import market" sheet behind a Next
     that only existed because of the sheet -- while both of its tiles
     auto-advanced, so neither the sheet nor the Next was reachable. */
  it("a sheet only sits on a screen the buyer can stay on", () => {
    for (const s of Object.values(SCREENS)) {
      if (!s.sheet) continue;
      expect(s.kind === "multi" || !!s.reveal,
        `${s.id} has a sheet but auto-advances on the first tap`).toBe(true);
    }
  });
});

describe("the graph terminates", () => {
  it("every node's next() resolves to a real node id", () => {
    for (const n of Object.values(NODES)) {
      for (const f of [form(), form({ forElderly: true }), form({ platform: "ios" }),
                       form({ includeBrands: ["Apple"] }), form({ wantMore: true }),
                       form({ rechannel: "widen" }), form({ rechannel: "keep" })]) {
        for (const c of [COUNTS, { pool: null, cheapestIphone: null },
                         { pool: 1, cheapestIphone: 1 }]) {
          const nid = n.next(f, c);
          expect(NODES[nid], `${n.id} -> ${nid}`).toBeDefined();
        }
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
    const path = replay(form({ forElderly: true, platform: "ios", budget: 95000 }),
                        { ...COUNTS, cheapestIphone: 50000 });
    expect(path).toContain("plat_e");
    expect(path[path.length - 1]).toBe("END");
  });

  it("elderly below the iphone budget skips plat_e", () => {
    const path = replay(form({ forElderly: true, budget: 20000 }),
                        { pool: 20, cheapestIphone: 90000 });
    expect(path).not.toContain("plat_e");
    expect(path).toContain("extras");
  });

  /* The shape the owner hit: every reachable set of answers must still land on
     END, including the thin-pool divert with the counts pinned at their worst. */
  it("terminates for every combination of the branching answers", () => {
    for (const forElderly of [false, true])
      for (const officialOnly of [false, true])
        for (const rechannel of ["", "widen", "keep"] as const)
          for (const wantMore of [false, true])
            for (const platform of ["any", "ios", "android"] as const)
              for (const c of [COUNTS, { pool: 1, cheapestIphone: 1 },
                               { pool: null, cheapestIphone: null }]) {
                const f = form({ forElderly, officialOnly, rechannel, wantMore,
                                 platform, budget: 30000 });
                const path = replay(f, c);
                expect(path[path.length - 1], JSON.stringify({ forElderly, officialOnly, rechannel, wantMore, platform })).toBe("END");
                expect(path.length).toBeLessThan(20);
              }
  });
});

/* The owner's report, in one describe: "double asking official unofficial for
   elders" and "disgusting loop". Both were the flow, not the paint. */
describe("the channel question is asked exactly once", () => {
  const thin: Counts = { pool: 1, cheapestIphone: null };

  it("an unofficial buyer is never offered the channel again", () => {
    const path = replay(form({ forElderly: true, officialOnly: false, budget: 15000 }), thin);
    expect(path).not.toContain("rechannel");
  });

  it("an official buyer with a real pool is never offered it either", () => {
    const path = replay(form({ forElderly: true, officialOnly: true, budget: 15000 }),
                        { pool: FEW + 1, cheapestIphone: null });
    expect(path).not.toContain("rechannel");
  });

  it("an official buyer with a thin pool IS offered it, once", () => {
    const path = replay(form({ forElderly: true, officialOnly: true, budget: 15000 }), thin);
    expect(path.filter((n) => n === "rechannel")).toHaveLength(1);
  });

  it("widening carries on forward — it never returns to the channel screen", () => {
    const f = form({ forElderly: true, officialOnly: false, rechannel: "widen", budget: 15000 });
    expect(nextNode(f, thin, "rechannel")).not.toBe("channel");
    expect(replay(f, thin)).not.toContain("rechannel");
  });

  it("keeping official returns to budget and the offer does not re-arm", () => {
    const f = form({ forElderly: true, officialOnly: true, rechannel: "keep", budget: 15000 });
    expect(nextNode(f, thin, "rechannel")).toBe("budget");
    // budget -> g_official: the guard reads the answer and passes through
    expect(nextNode(f, thin, "budget")).not.toBe("rechannel");
  });
});

describe("the priority screens do not loop", () => {
  it("no node leads back to the more popup", () => {
    for (const n of Object.values(NODES)) {
      if (n.id === "need1") continue;   // the one legitimate edge into it
      for (const f of [form(), form({ wantMore: true }), form({ q: { picks: ["camera", "battery"], hw: [] } })]) {
        expect(n.next(f, COUNTS), `${n.id} re-opens the popup`).not.toBe("more");
      }
    }
  });

  it("need1 leads to the more popup", () => {
    expect(nextNode(form(), COUNTS, "need1")).toBe("more");
  });

  it("the more popup routes on wantMore", () => {
    expect(nextNode(form({ wantMore: true }), COUNTS, "more")).toBe("needN");
    expect(nextNode(form({ wantMore: false }), COUNTS, "more")).toBe("brands");
  });

  it("needN goes on to brands however many priorities were added", () => {
    const f = form({ wantMore: true, q: { picks: ["camera", "battery", "speed", "video"], hw: [] } });
    expect(nextNode(f, COUNTS, "needN")).toBe("brands");
  });

  it("needN takes more than one pick — it is a multi screen", () => {
    expect(SCREENS.needN.kind).toBe("multi");
    const f = form({ q: { picks: ["camera"], hw: [] } });
    const battery = SCREENS.needN.options(f).find((o) => o.id === "battery")!;
    const after = { ...f, ...battery.patch(f) } as Form;
    expect(after.q.picks).toEqual(["camera", "battery"]);
    // tapping a second axis appends rather than replacing the first
    const speed = SCREENS.needN.options(after).find((o) => o.id === "speed")!;
    expect({ ...after, ...speed.patch(after) }.q!.picks).toEqual(["camera", "battery", "speed"]);
    // and tapping one already on takes it back off
    expect({ ...after, ...battery.patch(after) }.q!.picks).toEqual(["camera"]);
  });

  it("never re-offers the leading priority", () => {
    const ids = SCREENS.needN.options(form({ q: { picks: ["camera"], hw: [] } })).map((o) => o.id);
    expect(ids).not.toContain("camera");
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
    const nxt = nextNode(form({ forElderly: true, budget: 95000 }),
                         { pool: 50, cheapestIphone: 60000 }, "budget");
    expect(NODES[nxt].kind).not.toBe("guard");
  });
  /* The staleness bug behind "chose iPhone, got asked about headphone jacks":
     the route has to be resolved against the form the answer PRODUCED. */
  it("plat_e ends the walk when the answer that just landed is iOS", () => {
    const c: Counts = { pool: 50, cheapestIphone: 60000 };
    expect(nextNode(form({ forElderly: true, budget: 95000, platform: "ios" }), c, "plat_e")).toBe("END");
    expect(nextNode(form({ forElderly: true, budget: 95000, platform: "android" }), c, "plat_e")).toBe("extras");
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

  /* The rail read "5 / 5" on the add-more screen while four screens were still
     to come, because the old replay broke out of the priority cycle and never
     reached them. */
  it("the total still counts the screens after needN", () => {
    const f = form({ wantMore: true, q: { picks: ["camera"], hw: [] } });
    const { at, of } = askPosition(f, COUNTS, "needN");
    expect(of).toBeGreaterThan(at + 1);
    expect(replay(f, COUNTS)).toContain("extras");
  });

  it("never reports a position past the end", () => {
    for (const id of Object.keys(NODES)) {
      if (NODES[id].kind !== "ask") continue;
      for (const f of [form(), form({ forElderly: true, officialOnly: true }),
                       form({ wantMore: true })]) {
        const { at, of } = askPosition(f, { pool: 1, cheapestIphone: 60000 }, id);
        expect(at, `${id} at`).toBeLessThan(of);
        expect(of, `${id} of`).toBeGreaterThan(0);
      }
    }
  });
});
