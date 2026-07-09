import { track as vercelTrack } from "@vercel/analytics";

/* Product-funnel events (V2 step 0 instrumentation). Wrapped so call sites
   never depend on the sink — if Vercel custom events hit a plan limit, this
   one function repoints to our own backend. Analytics must never break the
   app, so failures are swallowed. */

type PropValue = string | number | boolean | null;

export function track(name: string, props?: Record<string, PropValue>) {
  try {
    vercelTrack(name, props);
  } catch {
    /* ignore — analytics is best-effort */
  }
}
