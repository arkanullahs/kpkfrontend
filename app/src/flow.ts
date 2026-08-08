/* The picker as a graph (spec 2026-08-08). Each node names its own successor
   given the answers so far; the flat step array could not express the owner's
   flowchart -- it branches (iphone-or-android exists only on the elderly
   path), loops (priorities send you back), and exits early (Apple is done).

   History is NOT stored: the URL carries every answer, so replaying the graph
   from those answers reproduces the path. Pure -- no React, no DOM -- so the
   whole flow is asserted without booting the app, the property steps.test.ts
   already relied on. */
import type { Form } from "./need";
import { SCREENS, type Screen } from "./steps";

export type NodeKind = "ask" | "guard" | "popup" | "end";

/** Live counts a guard reads. null = not resolved yet; a guard with a null
    count passes through and re-evaluates when it lands (spec §4.2). */
export interface Counts {
  pool: number | null;          // candidates for the whole current form
  officialPool: number | null;  // candidates with officialOnly forced true
  cheapestIphone: number | null; // cheapest in-stock iPhone eff-price, or null
}

/** The threshold below which a guard offers to loosen (Global Constraint). */
export const FEW = 4;

export interface FlowNode {
  id: string;
  kind: NodeKind;
  /** the successor given answers + counts. Pure. For an `end` node, returns
      its own id. */
  next: (f: Form, c: Counts) => string;
}

/** The screen an `ask` node renders, from steps.ts keyed by the node id. Guard
    and end nodes have none; the `more` popup has one but renders as a dialog. */
export const screenOf = (id: string): Screen | undefined => SCREENS[id];

const onlyApple = (f: Form) =>
  f.includeBrands.length === 1 && f.includeBrands[0] === "Apple";

export const ENTRY = "channel";

export const NODES: Record<string, FlowNode> = {
  channel:  { id: "channel",  kind: "ask",   next: () => "elderly" },
  elderly:  { id: "elderly",  kind: "ask",   next: () => "budget" },
  budget:   { id: "budget",   kind: "ask",   next: (f) => f.forElderly ? "g_official" : "need1" },

  g_official: { id: "g_official", kind: "guard",
    next: (_f, c) => (c.officialPool !== null && c.officialPool <= FEW ? "rechannel" : "g_iphone") },
  rechannel:  { id: "rechannel",  kind: "ask",
    // "yes, widen" clears officialOnly and returns to the channel question;
    // "no" returns to budget. The answer lives on a transient field.
    next: (f) => (f.rechannelWiden ? "channel" : "budget") },
  g_iphone:   { id: "g_iphone",   kind: "guard",
    next: (f, c) => (c.cheapestIphone !== null && f.budget >= c.cheapestIphone ? "plat_e" : "extras") },
  plat_e:     { id: "plat_e",     kind: "ask",
    next: (f) => (f.platform === "ios" ? "END" : "extras") },

  need1: { id: "need1", kind: "ask",   next: () => "more" },
  more:  { id: "more",  kind: "popup", next: (f) => (f.wantMore ? "needN" : "brands") },
  needN: { id: "needN", kind: "ask",   next: () => "g_prio" },
  g_prio:{ id: "g_prio",kind: "guard", next: () => "more" },

  brands:  { id: "brands",  kind: "ask",
    next: (f) => (onlyApple(f) ? "END" : "g_brands") },
  g_brands:{ id: "g_brands",kind: "guard", next: () => "rom" },

  rom:    { id: "rom",    kind: "ask", next: () => "sizes" },
  sizes:  { id: "sizes",  kind: "ask", next: () => "extras" },
  extras: { id: "extras", kind: "ask", next: () => "END" },

  END: { id: "END", kind: "end", next: () => "END" },
};

/** The nodes this buyer actually visits, entry to END. A guard that would
    divert to an ask node it has already diverted from is neutralised by
    seenGuards, so the walk cannot cycle (spec §8, §13). */
export function replay(f: Form, c: Counts): string[] {
  const path: string[] = [];
  const seenGuards = new Set<string>();
  const visited = new Set<string>();
  let id = ENTRY;
  // hard ceiling: the graph has ~16 nodes; a well-formed walk is far shorter.
  // The ceiling is a backstop against a table edit that reintroduces a cycle,
  // caught by the termination test rather than hanging a buyer.
  for (let hops = 0; hops < 64 && id !== "END"; hops++) {
    path.push(id);
    visited.add(id);
    const node = NODES[id];
    let to: string;
    if (node.kind === "guard") {
      // A guard diverts at most once; a second firing passes through with
      // ample counts so it takes its forward successor (spec §8, §13).
      to = seenGuards.has(id)
        ? node.next(f, { pool: Infinity, officialPool: Infinity, cheapestIphone: c.cheapestIphone })
        : node.next(f, c);
      seenGuards.add(id);
    } else {
      to = node.next(f, c);
    }
    // The priority loop (needN -> g_prio -> more -> needN) is driven by the
    // buyer answering the `more` popup again and again at RUNTIME; statically
    // it is a cycle. When the next node was already visited, re-resolve it as
    // if the buyer had stopped adding (every "more"-style flag false), which
    // is the loop's exit. If that still points back, stop.
    if (visited.has(to)) {
      to = node.next({ ...f, wantMore: false }, c);
      if (visited.has(to)) break;
    }
    id = to;
  }
  path.push("END");
  return path;
}

/** The next node the buyer interacts with: an ask, the `more` popup, or END.
    Walks the graph ONE step forward from `from` with live counts, chaining
    through any guards (which render nothing) to the first interactive node.

    Deliberately NOT read off replay(): replay collapses the priority loop for
    termination, so from needN it would report `brands`. A single forward step
    must instead land on the `more` popup, which is what lets the buyer add
    another priority -- the whole point of the loop. */
export function nextNode(f: Form, c: Counts, from: string): string {
  let id = NODES[from].next(f, c);
  const seen = new Set<string>([from]);
  while (id !== "END" && NODES[id].kind === "guard") {
    if (seen.has(id)) break;   // guard cycle guard: never spin
    seen.add(id);
    id = NODES[id].next(f, c);
  }
  return id;
}

/** The previous interactive node, guards skipped, or null at the entry. */
export function prevNode(f: Form, c: Counts, from: string): string | null {
  const path = replay(f, c);
  const i = path.indexOf(from);
  if (i <= 0) return null;
  for (let j = i - 1; j >= 0; j--) {
    if (NODES[path[j]].kind !== "guard") return path[j];
  }
  return null;
}

export function askPosition(f: Form, c: Counts, id: string): { at: number; of: number } {
  const asks = replay(f, c).filter((n) => NODES[n].kind === "ask");
  const at = asks.indexOf(id);
  return { at: at < 0 ? 0 : at, of: asks.length };
}
