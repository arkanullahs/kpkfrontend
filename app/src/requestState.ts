import { toParams, type Form } from "./need";
import type { RecParams } from "./api";

export type Screen = "ask" | "results" | "detail" | "method";
export interface Submission {
  requestId: string;
  form: Form;
  params: RecParams;
  matchCount: number | null;
}
export interface Navigation {
  kpk: true;
  screen: Screen;
  node: string;
  submission?: Submission;
  phoneId?: string;
}
export function captureSubmission(form: Form, requestId: string, matchCount: number | null): Submission {
  const snapshot: Form = JSON.parse(JSON.stringify(form));
  return { requestId, form: snapshot, params: { ...toParams(snapshot, 5), request_id: requestId }, matchCount };
}
export function navigation(screen: Screen, node: string, submission?: Submission | null, phoneId?: string): Navigation {
  return { kpk: true, screen, node, ...(submission ? { submission } : {}), ...(phoneId ? { phoneId } : {}) };
}
export function readNavigation(value: unknown): Navigation | null {
  const h = value as Navigation | null;
  if (!h?.kpk || !["ask", "results", "detail", "method"].includes(h.screen)) return null;
  // Old detail entries did not identify a phone. Return to results rather than
  // showing whichever unrelated phone happened to finish most recently.
  if (h.screen === "detail" && !h.phoneId) return { ...h, screen: "results" };
  return h;
}

export interface RequestTicket { id: string; key: string; controller: AbortController; pending: boolean; }
/** Cancellation saves work; ownership checks also cover APIs ignoring abort and
 * post-fetch waits/loader callbacks. This is separate from the backend UUID. */
export class RequestGate {
  private active: RequestTicket | null = null;
  begin(id: string, key: string): RequestTicket | null {
    if (this.active?.pending && this.active.key === key) return null;
    this.invalidate();
    return this.active = { id, key, controller: new AbortController(), pending: true };
  }
  owns(ticket: RequestTicket): boolean { return this.active === ticket && !ticket.controller.signal.aborted; }
  ownsId(id: string): boolean { return this.active?.id === id && !this.active.controller.signal.aborted; }
  finish(ticket: RequestTicket): void { if (this.owns(ticket)) ticket.pending = false; }
  finishId(id: string): void { if (this.active && this.ownsId(id)) this.active.pending = false; }
  invalidate(): void { this.active?.controller.abort(); this.active = null; }
}
