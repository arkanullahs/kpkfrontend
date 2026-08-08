import { st } from "../theme";
import { t } from "../i18n";
import { deriveIntent, type Form } from "../need";
import { track } from "../track";

/* THE FORCED-CHOICE QUIZ (spec section 7).

   What this replaced: five branching questions, two of them additive
   multi-selects over activities ("what fills the day on the phone? pick all
   that fit"). Additive multi-select provably self-cancels — only 44 of its 672
   reachable combinations produced a dominant axis. A buyer who ticks photos AND
   games AND watching has said they want everything, which is identical to
   saying nothing, and the ranker got a flat vector it could not act on.

   Two changes make it work. The questions ask what the buyer would GIVE UP
   rather than what they do, because a recommendation is a choice under a budget
   and "what do you do" is near-identical across buyers. And the two answers are
   WEIGHTED UNEQUALLY (3.0 then 1.0, see deriveIntent) so two different answers
   still leave a clear leader — an evenly-weighted pair is flat 70% of the time.

   The slideshow is gone (spec 2026-08-07). Both questions sit on one screen and
   neither collapses once answered, so there is no "back" to navigate to in
   order to change an answer — it is still right there. The summary screen went
   with it: the brief bar is the summary now, permanently on screen.

   The hardware question moved into the filter groups, where it belongs: those
   are dealbreakers that filter, not preferences that weight. */

// Q1 offers the four big trade-offs; gaming and video are narrower, so they
// appear as second-answer options rather than crowding the main decision.
const Q1_KEYS = ["camera", "battery", "speed", "simple"];
const Q2_KEYS = ["camera", "battery", "speed", "simple", "gaming", "video"];

/* SVG paths, not emoji. Emoji render differently on every Android build, cannot
   take a theme colour, and are read aloud by screen readers as their CLDR name
   ("older person" for 🧓), which is not what the option says. */
const ICON: Record<string, string> = {
  camera: "M4 8h3l1.5-2h7L17 8h3v10H4V8zM12 11a3 3 0 100 6 3 3 0 000-6z",
  battery: "M3 8h14v8H3V8zM17 11h2v2h-2zM6 10.5v3M9 10.5v3M12 10.5v3",
  speed: "M13 2L4.5 13H11l-1 9 8.5-11H12l1-9z",
  simple: "M12 20s-7-4.3-7-9a4 4 0 017-2.6A4 4 0 0119 11c0 4.7-7 9-7 9z",
  gaming: "M6 10h12a3 3 0 110 6H6a3 3 0 110-6zM7 11.5v3M5.5 13h3M16 12.5h.01M18 14h.01",
  video: "M3 7h11v10H3V7zM14 10.5l7-3v9l-7-3",
};

const chip = (sel: boolean, big: boolean) =>
  st(`display:inline-flex; align-items:center; gap:10px; padding:${big ? "15px 20px" : "12px 17px"}; border-radius:var(--r); cursor:pointer; font-size:${big ? "16px" : "15px"}; font-weight:600; transition:all .15s ease; font-family:var(--f-bn); text-align:left; background:${sel ? "var(--teal)" : "rgba(var(--rgb-white),.85)"}; color:${sel ? "var(--onp)" : "var(--ink)"}; border:.5px solid ${sel ? "transparent" : "rgba(var(--rgb-ink),.1)"}; box-shadow:${sel ? "0 4px 14px rgba(var(--rgb-ink),.14)" : "0 1px 2px rgba(var(--rgb-ink),.04)"};`);

const QTITLE = st("font-size:clamp(20px,3vw,26px); font-weight:700; color:var(--ink); font-family:var(--f-bn); line-height:1.25; text-wrap:balance;");
const WHY = st("margin:10px 0 0; font-size:14px; color:var(--tx); line-height:1.55; max-width:480px; text-wrap:pretty;");

function Question({ title, why, keys, selected, big, onPick }: {
  title: string; why: string; keys: string[];
  selected: string | undefined; big: boolean; onPick: (k: string) => void;
}) {
  return (
    <div>
      <div style={QTITLE}>{title}</div>
      <p style={WHY}>{why}</p>
      <div className="k-stagger" style={st("display:flex; flex-wrap:wrap; gap:10px; margin-top:16px;")}>
        {keys.map((k) => {
          const on = selected === k;
          return (
            <button key={k} onClick={() => onPick(k)} className="k-press" aria-pressed={on} style={chip(on, big)}>
              <svg width={big ? 21 : 19} height={big ? 21 : 19} viewBox="0 0 24 24" fill="none" aria-hidden="true"
                style={st("flex-shrink:0;")}>
                <path d={ICON[k]} stroke={on ? "var(--onp)" : "var(--lnk)"} strokeWidth="1.85"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t("qc_" + k)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function QuizStep({ form, patch }: { form: Form; patch: (d: Partial<Form>) => void }) {
  const q = form.q;
  const setQ = (d: Partial<Form["q"]>) => {
    const next = { ...q, ...d };
    patch({ q: next, ...deriveIntent(next) });
  };
  /* Answering slot i REPLACES it — the whole point is that this is a choice,
     not an accumulation. Re-answering Q1 also drops Q2 when they collide, so
     the buyer can never end up with the same axis in both slots by accident. */
  const pick = (slot: number, key: string) => {
    const picks = [...q.picks];
    picks[slot] = key;
    setQ({ picks: picks.filter(Boolean).filter((k, i, a) => a.indexOf(k) === i) });
    track("quiz_answer", { q: "choice" + (slot + 1), value: key });
  };
  // Q2 never re-offers what Q1 already won: "camera matters most" followed by
  // "camera" again is not a second piece of information.
  const q2Keys = Q2_KEYS.filter((k) => k !== q.picks[0]);

  return (
    <div style={st("margin-top:34px;")}>
      <Question title={t("qc_q1")} why={t("qc_q1_why")} keys={Q1_KEYS} big
        selected={q.picks[0]} onPick={(k) => pick(0, k)} />
      {/* Q2 waits for Q1 because it is phrased as "and after that" — but once
          it appears it never leaves, even if Q1 is changed. */}
      {q.picks[0] && (
        <div style={st("margin-top:28px; animation:kpop .34s cubic-bezier(.2,.7,.2,1) both;")}>
          <Question title={t("qc_q2")} why={t("qc_q2_why")} keys={q2Keys} big={false}
            selected={q.picks[1]} onPick={(k) => pick(1, k)} />
        </div>
      )}
    </div>
  );
}
