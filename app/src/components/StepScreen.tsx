import { st } from "../theme";
import { bnNum, t } from "../i18n";
import { EXIT_FROM, LAST, STEPS, stepAt } from "../steps";
import { useCountUp } from "../useCounts";
import { StepBody } from "./StepBody";
import type { Form } from "../need";

/* One step owns the screen (spec 2026-08-08).

   The frame never changes shape: back, "4 of 9", the exit. That constancy is
   what stops nine screens from feeling like nine different places -- and it is
   why the rail is the only new persistent chrome. Its one job is to make the
   end visible from step 1, because "how much more of this is there" is what
   makes a long form feel long.

   The rail is also the ONLY surface in this flow carrying backdrop-filter
   continuously. backdrop-filter costs real frames on a Tk15,000 Android; the
   step blur is `filter` on the leaving layer and lasts 260ms. */

interface Props {
  step: number;
  dir: 1 | -1;
  form: Form;
  patch: (d: Partial<Form>) => void;
  matchCount: number | null;
  metaStock: string;
  onNext: () => void;
  onBack: () => void;
  onExit: () => void;
  onCommit: () => void;
}

export function StepScreen({ step, dir, form, patch, matchCount, metaStock,
                             onNext, onBack, onExit, onCommit }: Props) {
  const s = stepAt(step);
  const shown = useCountUp(matchCount);

  return (
    <div style={st("max-width:680px; margin:0 auto;")}>
      <Rail step={step} />

      <div style={st("display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:10px; min-height:44px;")}>
        {step > 0 ? (
          <button onClick={onBack} className="k-press" aria-label={t("s_back")}
            style={st("display:inline-flex; align-items:center; gap:7px; min-height:44px; padding:8px 12px 8px 6px; border:none; background:none; cursor:pointer; font-size:14px; font-weight:600; color:var(--tx); font-family:var(--f-bn);")}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M19 12H5M11 6l-6 6 6 6" stroke="var(--tx)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t("s_back")}
          </button>
        ) : <span />}

        <span style={st("font-size:13.5px; font-weight:600; color:var(--mut); white-space:nowrap;")}>
          {bnNum(String(step + 1))} {t("s_of")} {bnNum(String(STEPS.length))}
        </span>

        {/* No exit before step 4: budget and the leading need axis are what the
            ranker actually consumes. Step 9's own button is its exit, so it
            gets none either. A text link, never amber -- amber is the commit. */}
        {step >= EXIT_FROM && step < LAST ? (
          <button onClick={onExit} className="k-press"
            style={st("min-height:44px; padding:8px 4px; border:none; background:none; cursor:pointer; font-size:13.5px; font-weight:600; color:var(--lnk); font-family:var(--f-bn); text-decoration:underline dotted; text-underline-offset:3px; white-space:nowrap;")}>
            {t("s_see_n")} {shown != null ? bnNum(String(shown)) : "…"} →
          </button>
        ) : <span />}
      </div>

      {/* keyed on the step id, so React remounts and the entry animation runs
          on every swap rather than only the first */}
      <div key={s.id} className="k-step" style={{ ...st("margin-top:20px;"), ["--dir" as string]: String(dir) }}>
        <h1 style={st("margin:0; font-family:var(--f-bn); font-size:clamp(23px,4.4vw,31px); font-weight:700; color:var(--ink); line-height:1.22; letter-spacing:-.4px; text-wrap:balance;")}>
          {t(s.titleKey)}
        </h1>
        <p style={st("margin:11px 0 0; font-size:15px; color:var(--tx); line-height:1.55; max-width:520px; text-wrap:pretty;")}>
          {t(s.whyKey)}
        </p>
        <div style={st("margin-top:22px;")}>
          <StepBody s={s} form={form} patch={patch} matchCount={matchCount}
            metaStock={metaStock} onAnswered={onNext} onCommit={onCommit} />
        </div>
      </div>
    </div>
  );
}

/* Nine segments, sticky, glass. Answered segments teal, the rest --rule, and
   the fill transitions rather than jumping.

   The segments are aria-hidden and a live text position sits beside them: nine
   decorative bars announce nothing, and a screen reader needs the number. */
function Rail({ step }: { step: number }) {
  return (
    <div className="k-glass"
      style={st("position:sticky; top:74px; z-index:40; display:flex; gap:4px; padding:10px 2px; margin:0 -2px; background:var(--hdr-bg); backdrop-filter:blur(14px) saturate(1.6); -webkit-backdrop-filter:blur(14px) saturate(1.6);")}>
      {STEPS.map((s, i) => (
        <span key={s.id} aria-hidden="true"
          style={st(`flex:1; height:4px; border-radius:var(--r); transition:background .3s ease; background:${i <= step ? "var(--teal)" : "var(--rule)"};`)} />
      ))}
      <span className="sr-only" aria-live="polite">{`${step + 1} / ${STEPS.length}`}</span>
    </div>
  );
}
