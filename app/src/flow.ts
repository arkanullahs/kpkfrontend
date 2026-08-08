/* The picker as a graph (spec 2026-08-08). Each node names its own successor
   given the answers so far; the flat step array could not express the owner's
   flowchart -- it branches (iphone-or-android exists only on the elderly
   path), diverts backward (the channel re-offer), and exits early (Apple is
   done).

   History is NOT stored: the URL carries every answer, so replaying the graph
   from those answers reproduces the path. Pure -- no React, no DOM -- so the
   whole flow is asserted without booting the app.

   THE GRAPH IS ACYCLIC BY CONSTRUCTION. It did not start that way: the
   priority question shipped as needN -> g_prio -> more -> needN, a real cycle
   that put a modal on screen after every single tap. The owner walked it and
   called it "a disgusting loop". The loop is gone -- `needN` is now one
   multi-select screen where the ladder grows in place -- and the only backward
   edge left (rechannel -> budget) is one the buyer chooses and which cannot
   re-arm, because the guard that offered it reads the answer. */
import type { Form } from "./need";
import { SCREENS, type Screen } from "./steps";

export type NodeKind = "ask" | "guard" | "popup" | "end";

/** Live counts a guard reads. null = not resolved yet; a guard with a null
    count passes through and re-evaluates when it lands (spec §4.2). */
export interface Counts {
  /** candidates for the whole current form. When the buyer has asked for the
      official channel this IS the official pool -- toParams already sends
      official_only -- which is why there is no second count to fetch. */
  pool: number | null;
  /** cheapest in-stock iPhone eff-price, or null. */
  cheapestIphone: number | null;
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
    and end nodes have none; the `more` popup has none either -- it is a
    dialog, not a screen. */
export const screenOf = (id: string): Screen | undefined => SCREENS[id];

const onlyApple = (f: Form) =>
  f.includeBrands.length === 1 && f.includeBrands[0] === "Apple";

export const ENTRY = "channel";

export const NODES: Record<string, FlowNode> = {
  channel:  { id: "channel",  kind: "ask",   next: () => "elderly" },
  elderly:  { id: "elderly",  kind: "ask",   next: () => "budget" },
  budget:   { id: "budget",   kind: "ask",   next: (f) => f.forElderly ? "g_official" : "need1" },

  /* The channel re-offer (owner edge -29/-28), and the bug the owner hit
     first: this used to fire on a thin pool ALONE, so a buyer who had just
     chosen *unofficial* was asked official-or-unofficial a second time, two
     screens after answering it. Three conditions now, all required:
       - the buyer actually asked for official (else there is nothing to widen)
       - they have not already answered this offer (else it re-arms forever,
         because "keep official" returns to budget and lands here again)
       - the pool really is thin. */
  g_official: { id: "g_official", kind: "guard",
    next: (f, c) => (f.officialOnly && !f.rechannel &&
                     c.pool !== null && c.pool <= FEW ? "rechannel" : "g_iphone") },
  rechannel:  { id: "rechannel",  kind: "ask",
    // "widen" already cleared officialOnly in its own patch, so the channel
    // question is ANSWERED -- going forward is the whole point. Only "keep
    // official" goes back, to the one screen that can actually help: budget.
    next: (f) => (f.rechannel === "keep" ? "budget" : "g_iphone") },
  g_iphone:   { id: "g_iphone",   kind: "guard",
    next: (f, c) => (c.cheapestIphone !== null && f.budget >= c.cheapestIphone ? "plat_e" : "extras") },
  plat_e:     { id: "plat_e",     kind: "ask",
    next: (f) => (f.platform === "ios" ? "END" : "extras") },

  need1: { id: "need1", kind: "ask",   next: () => "more" },
  /* The one popup the diagram asks for (edge -1 -> -42, labelled "popup"). It
     fires ONCE, after the first priority. "Yes" opens needN, which takes as
     many more as the buyer wants on a single screen -- that is what the
     owner's "let them choose however many more they like" needs, and it does
     not need a modal per tap. */
  more:  { id: "more",  kind: "popup", next: (f) => (f.wantMore ? "needN" : "brands") },
  needN: { id: "needN", kind: "ask",   next: () => "g_prio" },
  g_prio:{ id: "g_prio",kind: "guard", next: () => "brands" },

  brands:  { id: "brands",  kind: "ask",
    next: (f) => (onlyApple(f) ? "END" : "g_brands") },
  g_brands:{ id: "g_brands",kind: "guard", next: () => "rom" },

  rom:    { id: "rom",    kind: "ask", next: () => "sizes" },
  sizes:  { id: "sizes",  kind: "ask", next: () => "extras" },
  extras: { id: "extras", kind: "ask", next: () => "END" },

  END: { id: "END", kind: "end", next: () => "END" },
};

/** The nodes this buyer actually visits, entry to END, for THIS set of answers.

    The graph is acyclic for any fixed form (the one backward edge is taken
    only while `rechannel === "keep"`, and that same value disarms the guard
    that leads to it), so this is a plain walk. The hop ceiling is a backstop
    against a future table edit reintroducing a cycle -- caught by the
    termination test rather than by hanging a buyer. */
export function replay(f: Form, c: Counts): string[] {
  const path: string[] = [];
  const seen = new Set<string>();
  let id = ENTRY;
  for (let hops = 0; hops < 64 && id !== "END"; hops++) {
    if (seen.has(id)) break;
    path.push(id);
    seen.add(id);
    id = NODES[id].next(f, c);
  }
  path.push("END");
  return path;
}

/** The next node the buyer interacts with: an ask, the `more` popup, or END.
    Walks ONE step forward from `from` with live counts, chaining through any
    guards (which render nothing) to the first interactive node. */
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

/** Where this screen sits on THIS buyer's live path, counting only screens.

    `of` is honest, which means it can change: answering "for an elder" really
    does shorten the walk. It never runs behind the buyer -- a node the walk
    cannot reach from the current answers (the buyer is standing on it after a
    divert) still counts as the position it occupies. */
export function askPosition(f: Form, c: Counts, id: string): { at: number; of: number } {
  const asks = replay(f, c).filter((n) => NODES[n].kind === "ask");
  const at = asks.indexOf(id);
  if (at < 0) return { at: 0, of: Math.max(1, asks.length) };
  return { at, of: asks.length };
}
