import { describe, expect, it } from "vitest";
import { NODES, ENTRY, replay, nextNode, prevNode, askPosition, type Counts } from "./flow";
import { DEFAULT_FORM, type Form } from "./need";

const form = (o: Partial<Form> = {}): Form => ({ ...DEFAULT_FORM, ...o });
const COUNTS: Counts = { pool: 50, officialPool: 50, cheapestIphone: 80000 };

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
