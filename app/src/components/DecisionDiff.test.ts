import { describe, expect, it } from "vitest";
import { pairsOf, splitRows } from "./DecisionDiff";
import type { DiffRow, Pick } from "../api";

const sel = { model_id: "m", configuration_id: "c", variant: null, channel: "official",
              price: 1, price_low: 1, price_high: 1, availability: "in_stock" };
const pick = (has = true) => ({ selected_offer: has ? sel : null }) as unknown as Pick;
const row = (key: string, a: string, b: string, direction: DiffRow["direction"],
             relevance: DiffRow["relevance"] = "context"): DiffRow => ({
  key, label: key, basis: "specification", direction, relevance,
  cells: [{ model_id: "a", configuration_id: "x", text: a, evidence_ids: [] },
          { model_id: "b", configuration_id: "y", text: b, evidence_ids: [] }],
});

describe("pairsOf", () => {
  it("compares the main pick with each alternative, then the two alternatives", () => {
    expect(pairsOf([pick(), pick(), pick(), pick()])).toEqual([[0, 1], [0, 2], [1, 2]]);
  });
  it("two picks are one pair; one pick or none selected is nothing to compare", () => {
    expect(pairsOf([pick(), pick()])).toEqual([[0, 1]]);
    expect(pairsOf([pick()])).toEqual([]);
    expect(pairsOf([pick(false), pick(false)])).toEqual([]);
  });
});

describe("splitRows", () => {
  it("puts the buyer's priorities first and names equal rows once", () => {
    const { differ, same } = splitRows([
      row("Price", "Tk1", "Tk2", "left"),
      row("Camera", "13MP", "50MP", null, "priority"),
      row("Charging", "15W", "15W", "same"),
      row("Screen size", '7"', '7"', null),
      row("Configuration", "8/256", "8/128", null, "hard_requirement"),
    ]);
    expect(differ.map((r) => r.key)).toEqual(["Camera", "Configuration", "Price"]);
    expect(same.map((r) => r.key)).toEqual(["Charging", "Screen size"]);
  });
  it("an unresolved row is a difference, never folded into 'same'", () => {
    expect(splitRows([row("Price", "Not known", "Tk2", "unresolved")]).differ).toHaveLength(1);
  });
});
