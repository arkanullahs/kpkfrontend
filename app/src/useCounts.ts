import { useEffect, useRef, useState } from "react";
import { api } from "./api";
import { toParams, type Form } from "./need";

/* What each option would COST, in phones, before the buyer taps it.
   `probes` maps an option id to the form patch that option would apply; the
   hook returns the candidate count for each resulting form.

   /count is the structured pre-filter only -- no embedding, no LLM, no quota
   -- which is the only reason firing several per keystroke is affordable. All
   probes for one form are issued together and the whole batch is dropped if
   the form changes, so a fast typist never renders a stale number.

   Debounced at 400ms, slightly behind App's own 350ms count so the headline
   number settles first and the row numbers fill in after. */
export function useCounts(form: Form, probes: Record<string, Partial<Form>>) {
  const [counts, setCounts] = useState<Record<string, number | null>>({});
  const timer = useRef<number | undefined>(undefined);
  // the whole probe set, not only its ids: two options can share an id across
  // renders and still mean different patches (the same row after a budget
  // change), and a stale number is worse than a missing one.
  const key = JSON.stringify([toParams(form), probes]);

  useEffect(() => {
    window.clearTimeout(timer.current);
    let cancelled = false;
    // no budget set yet -> no per-option pills. The channel screen comes before
    // budget in the flow, and "8 of 46" against a budget the buyer never picked
    // is the number that confused the owner. /count also 422s on budget <= 0.
    if (form.budget <= 0) { setCounts({}); return; }
    timer.current = window.setTimeout(() => {
      const entries = Object.entries(probes);
      if (!entries.length) return;
      Promise.all(entries.map(([, patch]) =>
        api.count(toParams({ ...form, ...patch }))
          // relaxed = NOTHING matched and the server widened the budget band to
          // answer at all, so its `candidates` counts phones this option does
          // not actually leave standing. Measured: require_custom_rom at
          // Tk40,000 answers 1/relaxed, and a row reading "1" would be a lie.
          .then((r) => (r.relaxed ? 0 : r.candidates))
          .catch(() => null)))
        .then((res) => {
          if (cancelled) return;
          const out: Record<string, number | null> = {};
          entries.forEach(([id], i) => { out[id] = res[i]; });
          setCounts(out);
        });
    }, 400);
    return () => { cancelled = true; window.clearTimeout(timer.current); };
    // `key` is the real dependency: form and probes are read through it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return counts;
}

/** Tween a match count so 46 -> 12 is watched rather than blinked.

    It is the one number that proves a step did something; landed instantly, a
    swap reads as a re-render rather than as a consequence.

    rAF, not setInterval: a dropped frame on a cheap Android should shorten the
    tween, not desync it. The blanket prefers-reduced-motion rule in the sheet
    cannot reach this one because it is JavaScript, so it checks the query
    itself. */
export function useCountUp(n: number | null): number | null {
  const [shown, setShown] = useState<number | null>(n);
  const from = useRef<number | null>(n);

  useEffect(() => {
    if (n === null) { setShown(null); from.current = null; return; }
    const start = from.current;
    if (start === null || start === n) { setShown(n); from.current = n; return; }
    // A hidden tab does not run rAF AT ALL, so a tween started in one freezes
    // on its first frame and never corrects -- the effect only re-runs when
    // `n` changes, and it has not. Backgrounding the picker mid-count left the
    // exit button reading a number that was never true. Nothing to animate for
    // an audience that cannot see it: land on the value.
    if (document.hidden || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setShown(n); from.current = n; return;
    }
    const t0 = performance.now();
    const DUR = 320;
    let raf = 0;
    let done = false;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / DUR);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(start + (n - start) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else { done = true; from.current = n; }
    };
    raf = requestAnimationFrame(tick);
    // an interrupted tween settles rather than stranding a half-eased number:
    // the next run then starts from a value that was really on screen
    return () => {
      cancelAnimationFrame(raf);
      if (!done) { setShown(n); from.current = n; }
    };
  }, [n]);

  return shown;
}
