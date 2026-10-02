import { describe, expect, it } from "vitest";
import { subjectLine } from "./SubjectAnswer";
import { DEFAULT_FORM, formToQuery, queryToForm, validSubject } from "../need";
import type { Pick, SubjectEval } from "../api";

const ev = (over: Partial<SubjectEval>): SubjectEval => ({
  status: "qualified", reasons: [], model_id: "Samsung|galaxy a56 5g",
  brand: "Samsung", model: "Galaxy A56 5G", ...over,
});
const picks = [{ id: "Xiaomi|redmi note 14" }, { id: "Samsung|galaxy a56 5g" }] as Pick[];

describe("subjectLine", () => {
  it("names the rank when the phone made the picks", () => {
    expect(subjectLine(ev({}), picks)?.head).toBe("The Samsung Galaxy A56 5G you came for is #2 here.");
  });
  it("says it qualifies when it fits but ranked lower", () => {
    expect(subjectLine(ev({}), picks.slice(0, 1))?.head).toMatch(/fits your search too/);
  });
  it("gives the buyer's actual blocker, with the price when it is the budget", () => {
    const l = subjectLine(ev({ status: "requirements_failed", reasons: ["over_budget"],
      selected_offer: { price: 52999 } as SubjectEval["selected_offer"] }), picks);
    expect(l?.head).toMatch(/doesn't fit this search/);
    expect(l?.why).toMatch(/52,999.*above your budget/);
  });
  it("joins several reasons and drops a code it has no words for", () => {
    const l = subjectLine(ev({ status: "requirements_failed", reasons: ["channel", "made_up"] }), picks);
    expect(l?.why).toBe("no listing on the warranty channel you chose");
  });
  it("an unknown id says nothing at all", () => {
    expect(subjectLine({ status: "unknown_model", reasons: [] }, picks)).toBeNull();
  });
});

describe("subject in the URL", () => {
  it("round-trips, so back, edit and share keep it", () => {
    const q = formToQuery({ ...DEFAULT_FORM, budget: 41000, subject: "Samsung|galaxy a56 5g" });
    expect(queryToForm(q).subject).toBe("Samsung|galaxy a56 5g");
  });
  it("accepts only brand|key", () => {
    expect(validSubject("Samsung|galaxy a56 5g")).toBe("Samsung|galaxy a56 5g");
    for (const bad of ["no-bar", "a|b|c", "|key", "x".repeat(50) + "|k", "a|\u0007"]) {
      expect(validSubject(bad)).toBe("");
    }
  });
});
