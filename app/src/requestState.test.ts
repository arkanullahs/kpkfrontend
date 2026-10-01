import { describe, expect, it } from "vitest";
import { DEFAULT_FORM } from "./need";
import { captureSubmission, navigation, readNavigation, RequestGate } from "./requestState";

describe("request generations", () => {
  it("deduplicates pending work and lets completed work retry", () => {
    const gate = new RequestGate(), a = gate.begin("A", "same")!;
    expect(gate.begin("duplicate", "same")).toBeNull();
    gate.finish(a); const retry = gate.begin("retry", "same")!;
    expect(gate.owns(retry)).toBe(true); expect(a.controller.signal.aborted).toBe(true);
  });
  it("a late finish cannot unlock or finish the new generation", () => {
    const gate = new RequestGate(), a = gate.begin("A", "a")!, b = gate.begin("B", "b")!;
    gate.finish(a); gate.finishId("A");
    expect(gate.owns(a)).toBe(false); expect(gate.owns(b)).toBe(true);
    expect(gate.begin("duplicate-B", "b")).toBeNull();
    gate.invalidate(); expect(gate.owns(b)).toBe(false); expect(gate.ownsId("B")).toBe(false);
  });
});
describe("submitted requirements and history", () => {
  it("captures nested answers independently from draft edits", () => {
    const draft = JSON.parse(JSON.stringify(DEFAULT_FORM)); draft.budget = 20000; draft.q.picks = ["camera"];
    const submission = captureSubmission(draft, "request-A", 4);
    draft.budget = 40000; draft.q.picks.push("gaming");
    expect(submission.form.budget).toBe(20000); expect(submission.form.q.picks).toEqual(["camera"]);
    expect(submission.params.budget).toBe(20000); expect(submission.params.request_id).toBe("request-A");
  });
  it("roundtrips exact phone and result identities through serializable history", () => {
    const submission = captureSubmission({ ...DEFAULT_FORM, budget: 20000 }, "request-A", 4);
    const h = readNavigation(JSON.parse(JSON.stringify(navigation("detail", "budget", submission, "Samsung/X"))));
    expect(h?.phoneId).toBe("Samsung/X"); expect(h?.submission?.requestId).toBe("request-A");
    expect(readNavigation({ kpk: true, screen: "detail", node: "budget" })?.screen).toBe("results");
    expect(readNavigation({ screen: "detail", phoneId: "X" })).toBeNull();
  });
});
