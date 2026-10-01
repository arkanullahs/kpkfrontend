import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import type { PhoneDetail, RecommendResp } from "./api";

// Exercise App's actual screen callbacks with deferred API responses. The small
// hook host avoids adding a DOM/test-renderer dependency to this pure Vitest setup.
const host = vi.hoisted(() => ({ slots: [] as any[], cursor: 0, effects: [] as (() => void)[], dirty: false }));
vi.mock("react", async () => {
  const actual = await vi.importActual<any>("react");
  return { ...actual,
    useState: (initial: any) => {
      const i = host.cursor++;
      if (!(i in host.slots)) host.slots[i] = typeof initial === "function" ? initial() : initial;
      return [host.slots[i], (next: any) => { host.slots[i] = typeof next === "function" ? next(host.slots[i]) : next; host.dirty = true; }];
    },
    useRef: (initial: any) => { const i = host.cursor++; return host.slots[i] ??= { current: initial }; },
    useCallback: (fn: any, deps: any[]) => {
      const i = host.cursor++, prev = host.slots[i];
      if (!prev || deps.some((d, j) => !Object.is(d, prev.deps[j]))) host.slots[i] = { deps, fn };
      return host.slots[i].fn;
    },
    useEffect: (fn: any, deps: any[]) => {
      const i = host.cursor++, prev = host.slots[i];
      if (!prev || deps.some((d, j) => !Object.is(d, prev.deps[j]))) {
        host.effects.push(() => { prev?.cleanup?.(); host.slots[i] = { deps, cleanup: fn() }; });
      }
    },
  };
});
vi.mock("./api", () => ({ api: { meta: vi.fn(), cheapest: vi.fn(), count: vi.fn(), recommend: vi.fn(), phone: vi.fn() } }));
vi.mock("./track", () => ({ track: vi.fn() }));
vi.mock("./i18n", () => ({ getLang: () => "en", setLang: vi.fn(), t: (s: string) => s, bnNum: (s: string) => s }));
import App from "./App";
import { api } from "./api";
import { StepScreen } from "./components/StepScreen";
import { ResultsScreen } from "./components/ResultsScreen";
import { DetailScreen } from "./components/DetailScreen";
import { ResetConfirm } from "./components/ResetConfirm";

function deferred<T>() {
  let resolve!: (v: T) => void, reject!: (e: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const response = (name: string) => ({ meta: { budget: 20000 }, picks: [{ id: name, model: name }], stretch: null } as RecommendResp);
const phone = (id: string) => ({ id, model: id } as PhoneDetail);
let tree: ReactElement, entries: any[], position: number, listeners: Map<string, Function>;
function render() {
  do { host.dirty = false; host.cursor = 0; tree = App(); const effects = host.effects.splice(0); effects.forEach(fn => fn()); } while (host.dirty);
}
function find(type: any, node: any = tree): any {
  if (!node) return;
  if (Array.isArray(node)) return node.map(n => find(type, n)).find(Boolean);
  if (node.type === type) return node.props;
  return find(type, node.props?.children ?? null);
}
async function settle() { for (let i = 0; i < 12; i++) await Promise.resolve(); render(); }
async function finish() { await vi.advanceTimersByTimeAsync(1100); render(); }
function pop(delta: number) {
  position += delta; const e = entries[position];
  Object.assign(window.location, { search: new URL(e.url).search });
  (window.history as any).state = e.state; listeners.get("popstate")?.({ state: e.state }); render();
}
function submit(budget = 20000) { find(StepScreen).patch({ budget }); render(); find(StepScreen).onCommit(); render(); }

beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks(); host.slots = []; host.cursor = 0; host.effects = []; host.dirty = false;
  entries = [{ state: null, url: "http://localhost/pick" }]; position = 0; listeners = new Map();
  const history = { state: null as any,
    pushState(state: any, _: string, url?: string) { entries.splice(position + 1); entries.push({ state, url: new URL(url || window.location.pathname + window.location.search, window.location.origin).href }); position++; this.state = state; if (url) window.location.search = new URL(entries[position].url).search; },
    replaceState(state: any, _: string, url?: string) { entries[position] = { state, url: new URL(url || window.location.pathname + window.location.search, window.location.origin).href }; this.state = state; if (url) window.location.search = new URL(entries[position].url).search; },
    back() { pop(-1); },
  };
  vi.stubGlobal("window", { location: { origin: "http://localhost", pathname: "/pick", search: "" }, history,
    addEventListener: (key: string, fn: Function) => listeners.set(key, fn), removeEventListener: (key: string) => listeners.delete(key),
    scrollTo: vi.fn(), setTimeout, clearTimeout, setInterval, clearInterval });
  vi.stubGlobal("sessionStorage", { getItem: () => "1", setItem: vi.fn() });
  vi.stubGlobal("crypto", { randomUUID: vi.fn().mockReturnValueOnce("request-A").mockReturnValueOnce("request-B").mockReturnValue("request-C") });
  vi.mocked(api.meta).mockResolvedValue({ in_stock: 2 } as any);
  vi.mocked(api.cheapest).mockResolvedValue({ price: 10000 });
  vi.mocked(api.count).mockResolvedValue({ candidates: 2, relaxed: false });
  render();
});
afterEach(() => { host.slots.forEach(s => s?.cleanup?.()); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("active recommendation ownership", () => {
  it("ignores delayed A success after B, including A's loader completion", async () => {
    const a = deferred<RecommendResp>(), b = deferred<RecommendResp>();
    vi.mocked(api.recommend).mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
    submit(); const oldFinish = find(ResultsScreen).onLoaderDone;
    find(ResultsScreen).onEdit(); render(); submit(30000);
    b.resolve(response("B")); await finish(); a.resolve(response("A")); await finish();
    expect(find(ResultsScreen).result.picks[0].id).toBe("B");
    oldFinish(); render(); expect(find(ResultsScreen).loading).toBe(true);
    find(ResultsScreen).onLoaderDone(); render(); expect(find(ResultsScreen).loading).toBe(false);
  });
  it("ignores an old error while B is loading and aborts A", async () => {
    const a = deferred<RecommendResp>(), b = deferred<RecommendResp>();
    vi.mocked(api.recommend).mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
    submit(); find(ResultsScreen).onEdit(); render(); submit(30000);
    a.reject(new Error("old error")); await settle();
    expect(find(ResultsScreen).error).toBeNull(); expect(find(ResultsScreen).loading).toBe(true);
    expect(vi.mocked(api.recommend).mock.calls[0][1]?.aborted).toBe(true);
  });
  it("deduplicates submission before a render and preserves request-specific progress", () => {
    vi.mocked(api.recommend).mockReturnValue(deferred<RecommendResp>().promise);
    find(StepScreen).patch({ budget: 20000 }); render();
    const commit = find(StepScreen).onCommit; commit(); commit(); render();
    expect(api.recommend).toHaveBeenCalledTimes(1);
    expect(find(ResultsScreen).requestId).toBe(vi.mocked(api.recommend).mock.calls[0][0].request_id);
  });
  it("an old finish callback cannot end B before its response arrives", async () => {
    const a = deferred<RecommendResp>(), b = deferred<RecommendResp>();
    vi.mocked(api.recommend).mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
    submit(); a.resolve(response("A")); await finish(); const oldFinish = find(ResultsScreen).onLoaderDone;
    find(ResultsScreen).onEdit(); render(); submit(30000); oldFinish(); render();
    expect(find(ResultsScreen).loading).toBe(true); expect(find(ResultsScreen).ready).toBe(false);
  });
  it("restores A's picks and requirements after a later B result", async () => {
    vi.mocked(api.recommend).mockResolvedValueOnce(response("A")).mockResolvedValueOnce(response("B"));
    submit(); await finish(); find(ResultsScreen).onLoaderDone(); render(); find(ResultsScreen).onEdit(); render();
    submit(30000); await finish(); find(ResultsScreen).onLoaderDone(); render();
    pop(-1); pop(-1);
    expect(find(ResultsScreen).result.picks[0].id).toBe("A"); expect(find(ResultsScreen).form.budget).toBe(20000);
    pop(1); pop(1); expect(find(ResultsScreen).result.picks[0].id).toBe("B"); expect(find(ResultsScreen).form.budget).toBe(30000);
  });
  it("leaving during the minimum loader wait prevents a late ready transition", async () => {
    vi.mocked(api.recommend).mockResolvedValue(response("A")); submit(); await settle();
    find(ResultsScreen).onEdit(); render(); await finish();
    pop(-1); expect(find(ResultsScreen).result).toBeNull(); expect(find(ResultsScreen).ready).toBe(false);
  });
  it("restores an unfinished A with A's count instead of B's live count", async () => {
    vi.mocked(api.count).mockImplementation(async p => ({ candidates: p.budget === 20000 ? 2 : 7, relaxed: false }));
    vi.mocked(api.recommend).mockImplementation(() => deferred<RecommendResp>().promise);
    find(StepScreen).patch({ budget: 20000 }); render(); await vi.advanceTimersByTimeAsync(400); await settle();
    find(StepScreen).onCommit(); render(); expect(find(ResultsScreen).matchCount).toBe(2);
    find(ResultsScreen).onEdit(); render(); find(StepScreen).patch({ budget: 30000 }); render();
    await vi.advanceTimersByTimeAsync(400); await settle(); find(StepScreen).onCommit(); render();
    expect(find(ResultsScreen).matchCount).toBe(7); pop(-1);
    await vi.advanceTimersByTimeAsync(400); await settle(); pop(-1);
    expect(find(ResultsScreen).form.budget).toBe(20000); expect(find(ResultsScreen).matchCount).toBe(2);
  });
  it("retry keeps the saved count even when the current draft count changes", async () => {
    vi.mocked(api.count).mockImplementation(async p => ({ candidates: p.budget === 20000 ? 2 : 7, relaxed: false }));
    vi.mocked(api.recommend).mockRejectedValueOnce(new Error("retry A")).mockReturnValueOnce(deferred<RecommendResp>().promise);
    const patch = find(StepScreen).patch;
    patch({ budget: 20000 }); render(); await vi.advanceTimersByTimeAsync(400); await settle();
    find(StepScreen).onCommit(); await settle(); patch({ budget: 30000 }); render();
    await vi.advanceTimersByTimeAsync(400); await settle(); find(ResultsScreen).onRetry(); render();
    expect(find(ResultsScreen).form.budget).toBe(20000); expect(find(ResultsScreen).matchCount).toBe(2);
  });
  it("keeps the submitted heading after draft edits and restores its result via Back/Forward", async () => {
    const patch = find(StepScreen).patch;
    vi.mocked(api.recommend).mockResolvedValue(response("A")); submit(); await finish(); find(ResultsScreen).onLoaderDone(); render();
    patch({ budget: 35000, priorities: ["camera"] }); render();
    expect(find(ResultsScreen).form.budget).toBe(20000); expect(find(ResultsScreen).form.priorities).toEqual([]);
    find(ResultsScreen).onEdit(); render(); find(StepScreen).patch({ budget: 35000, priorities: ["camera"] }); render(); pop(-1);
    expect(find(ResultsScreen).form.budget).toBe(20000); expect(find(ResultsScreen).form.priorities).toEqual([]);
    pop(1); expect(find(StepScreen).form.budget).toBe(35000);
  });
  it("retry stays on one history entry and reset invalidates abandoned work", async () => {
    vi.mocked(api.recommend).mockRejectedValueOnce(new Error("retry me")); submit(); await settle();
    const count = entries.length, a = deferred<RecommendResp>(); vi.mocked(api.recommend).mockReturnValue(a.promise);
    find(ResultsScreen).onRetry(); render(); expect(entries.length).toBe(count);
    find(ResultsScreen).onEdit(); render(); find(StepScreen).onReset(); render(); find(ResetConfirm).onYes(); render();
    a.resolve(response("late")); await finish(); pop(-1);
    expect(find(ResultsScreen)?.result?.picks[0].id).not.toBe("late");
  });
});
describe("detail and navigation ownership", () => {
  async function results() { vi.mocked(api.recommend).mockResolvedValue(response("A")); submit(); await finish(); find(ResultsScreen).onLoaderDone(); render(); }
  it("ignores X success and finally while Y loads", async () => {
    await results(); const x = deferred<PhoneDetail>(), y = deferred<PhoneDetail>(); vi.mocked(api.phone).mockReturnValueOnce(x.promise).mockReturnValueOnce(y.promise);
    const open = find(ResultsScreen).onPick; open("X"); render(); open("Y"); render();
    x.resolve(phone("X")); await settle(); expect(find(DetailScreen).detail).toBeNull(); expect(find(DetailScreen).loading).toBe(true);
    y.resolve(phone("Y")); await settle(); expect(find(DetailScreen).detail.id).toBe("Y");
  });
  it("ignores X error and finally after Y succeeds", async () => {
    await results(); const x = deferred<PhoneDetail>(), y = deferred<PhoneDetail>(); vi.mocked(api.phone).mockReturnValueOnce(x.promise).mockReturnValueOnce(y.promise);
    const open = find(ResultsScreen).onPick; open("X"); render(); open("Y"); render();
    y.resolve(phone("Y")); await settle(); x.reject(new Error("old X")); await settle(); expect(find(DetailScreen).error).toBeNull(); expect(find(DetailScreen).detail.id).toBe("Y");
  });
  it("Back and Forward reload the exact detail identity", async () => {
    await results(); vi.mocked(api.phone).mockImplementation(async id => phone(id));
    const open = find(ResultsScreen).onPick; open("X"); await settle(); open("Y"); await settle();
    pop(-1); await settle(); expect(find(DetailScreen).detail.id).toBe("X");
    pop(1); await settle(); expect(find(DetailScreen).detail.id).toBe("Y");
  });
  it("leaving detail cancels it, and a late error cannot poison Forward", async () => {
    await results(); const x = deferred<PhoneDetail>(); vi.mocked(api.phone).mockReturnValueOnce(x.promise).mockResolvedValueOnce(phone("X"));
    find(ResultsScreen).onPick("X"); render(); find(DetailScreen).onBack(); render();
    expect(vi.mocked(api.phone).mock.calls[0][1]?.aborted).toBe(true);
    x.reject(new Error("abandoned X")); await settle(); pop(1); await settle();
    expect(find(DetailScreen).error).toBeNull(); expect(find(DetailScreen).detail.id).toBe("X");
  });
  it("detail retry replaces work without adding a history entry", async () => {
    await results(); vi.mocked(api.phone).mockRejectedValueOnce(new Error("retry X")).mockResolvedValueOnce(phone("X"));
    find(ResultsScreen).onPick("X"); await settle(); const count = entries.length;
    find(DetailScreen).onRetry(); await settle(); expect(entries.length).toBe(count); expect(find(DetailScreen).detail.id).toBe("X");
  });
});
describe("draft count ownership", () => {
  it("ignores stale counts, including errors after the new draft count", async () => {
    const old = deferred<any>(), fresh = deferred<any>(); vi.mocked(api.count).mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
    find(StepScreen).patch({ budget: 20000 }); render(); await vi.advanceTimersByTimeAsync(400);
    find(StepScreen).patch({ budget: 30000 }); render(); await vi.advanceTimersByTimeAsync(400);
    fresh.resolve({ candidates: 7, relaxed: false }); await settle(); old.reject(new Error("old count")); await settle();
    expect(find(StepScreen).matchCount).toBe(7); expect(vi.mocked(api.count).mock.calls[0][1]?.aborted).toBe(true);
  });
});
