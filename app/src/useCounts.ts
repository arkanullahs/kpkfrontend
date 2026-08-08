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
