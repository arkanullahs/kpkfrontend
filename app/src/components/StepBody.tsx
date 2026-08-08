import { useRef, useState } from "react";
import { fmt, st, taka } from "../theme";
import { bnNum, bnToAscii, t } from "../i18n";
import { buildBrief } from "../filters";
import { LAST, STEPS, type Step, type StepOption } from "../steps";
import { useCounts } from "../useCounts";
import type { Form } from "../need";

/* One step's controls.

   Budget keeps its own body -- it is a number field, not a list. Everything
   else renders from the table: a list of options, then "doesn't matter" as
   either a full-size peer (filter steps) or a quiet line (the two forced
   choices, where making the buyer choose IS the design).

   The tap beat is the thing that makes nine steps bearable: the chosen option
   fills teal for 140ms BEFORE the screen leaves, so the tap lands visibly
   instead of being eaten by the transition. */

const TAP_MS = 140;
const QUICK = [15000, 25000, 40000, 70000, 120000];
const BUDGET_MAX = 500000;

export function StepBody({ s, form, patch, matchCount, metaStock, onAnswered, onCommit }: {
  s: Step; form: Form; patch: (d: Partial<Form>) => void;
  matchCount: number | null; metaStock: string;
  onAnswered: () => void; onCommit: () => void;
}) {
  const [tapped, setTapped] = useState<string | null>(null);
  const opts = s.options(form);

  // only the CURRENT step probes, and the table caps it at four options, so
  // this is at most four /count calls in flight -- never twelve
  const probes: Record<string, Partial<Form>> = {};
  for (const o of opts) if (o.probe) probes[o.id] = o.probe(form);
  const counts = useCounts(form, probes);

  const answer = (o: StepOption) => {
    patch(o.patch(form));
    if (s.kind !== "single") return;      // multi steps wait for Next
    setTapped(o.id);
    window.setTimeout(onAnswered, TAP_MS);
  };

  const skip = () => {
    patch(s.clear(form));
    setTapped("__skip");
    window.setTimeout(onAnswered, TAP_MS);
  };

  if (s.kind === "budget") return <BudgetBody form={form} patch={patch} metaStock={metaStock} />;

  const last = s.id === STEPS[LAST].id;

  return (
    <>
      <div className="k-stagger">
        {opts.map((o) => (
          <Option key={o.id} o={o} form={form} count={counts[o.id] ?? null}
            total={matchCount} tapped={tapped === o.id} onPick={() => answer(o)} />
        ))}
      </div>

      {/* "doesn't matter" as a full-size peer on the filter steps: a buyer who
          taps it six times reaches results in nine taps, and a grey skip link
          in a corner would make that feel like giving up rather than
          answering. The two need questions get the quiet form -- an
          evenly-weighted pair of answers is flat most of the time, so making
          the buyer actually choose is the whole instrument. */}
      {s.skipStyle === "equal" ? (
        <button onClick={skip} className="k-press"
          style={st(`display:flex; align-items:center; width:100%; min-height:54px; padding:14px 15px; margin-top:8px; border-radius:var(--r); cursor:pointer; text-align:left; font-size:16px; font-weight:500; color:var(--ink); font-family:var(--f-bn); background:var(--card); border:1.5px solid var(--rule); opacity:${tapped === "__skip" ? .6 : 1};`)}>
          {t(s.skipKey)}
        </button>
      ) : (
        <button onClick={skip} className="k-press"
          style={st("display:block; margin:16px auto 0; min-height:44px; padding:10px 16px; border:none; background:none; cursor:pointer; font-size:14px; font-weight:600; color:var(--mut); font-family:var(--f-bn); text-decoration:underline dotted; text-underline-offset:3px;")}>
          {t(s.skipKey)}
        </button>
      )}

      {s.kind === "multi" && !last && (
        <button onClick={onAnswered} className="k-press"
          style={st("margin-top:18px; width:100%; min-height:54px; border-radius:var(--r); border:none; cursor:pointer; background:var(--teal); color:var(--onp); font-size:16.5px; font-weight:700; font-family:var(--f-bn); box-shadow:0 10px 26px -14px rgba(var(--rgb-ink),.5);")}>
          {t("qz_next")} →
        </button>
      )}

      {last && <Commit form={form} matchCount={matchCount} onCommit={onCommit} />}
    </>
  );
}

/* ---------- one option ---------- */

function Option({ o, form, count, total, tapped, onPick }: {
  o: StepOption; form: Form; count: number | null;
  total: number | null; tapped: boolean; onPick: () => void;
}) {
  const on = o.isOn(form);
  // an option that would leave nothing standing is pre-marked rather than
  // discovered afterwards -- but only while it is OFF: a set filter must
  // always be un-settable, and disabling the control that undoes it would
  // trap the buyer on an empty result with no way back.
  const dead = count === 0 && !on;
  const lit = on || tapped;
  return (
    <button onClick={onPick} disabled={dead} className="k-press" aria-pressed={on}
      style={st(`display:flex; align-items:center; gap:13px; width:100%; min-height:60px; padding:15px; margin-bottom:8px; border-radius:var(--r); cursor:${dead ? "not-allowed" : "pointer"}; text-align:left; transition:background .14s ease, box-shadow .14s ease; opacity:${dead ? .55 : 1}; background:${lit ? "var(--teal)" : "var(--card)"}; border:1.5px solid ${lit ? "transparent" : "var(--rule)"}; box-shadow:${lit ? "0 8px 22px -12px rgba(var(--rgb-ink),.5)" : "none"};`)}>
      {o.icon && (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={st("flex-shrink:0;")}>
          <path d={o.icon} stroke={lit ? "var(--onp)" : "var(--lnk)"} strokeWidth="1.85"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      <span style={st(`flex:1; min-width:0; font-size:16.5px; font-weight:500; color:${lit ? "var(--onp)" : "var(--ink)"}; font-family:var(--f-bn);`)}>
        {t(o.labelKey)}
      </span>
      {!lit && <CountPill n={count} total={total} />}
    </button>
  );
}

/* Fractions, never arrows: "1 of 46" says what the option costs. "→ 18" makes
   the buyer work out what they are losing. */
function CountPill({ n, total }: { n: number | null; total: number | null }) {
  if (n === null) return null;
  const dead = n === 0;
  return (
    <span style={st(`flex-shrink:0; font-size:13.5px; font-weight:600; padding:5px 10px; border-radius:var(--r); background:${dead ? "var(--dangerL)" : "var(--tint)"}; color:${dead ? "var(--danger)" : "var(--lnk)"};`)}>
      {dead ? t("fg_zero") : `${bnNum(String(n))} ${t("fg_of")} ${total != null ? bnNum(String(total)) : "?"}`}
    </span>
  );
}

/* ---------- step 1 ---------- */

function BudgetBody({ form, patch, metaStock }: {
  form: Form; patch: (d: Partial<Form>) => void; metaStock: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const focusBudget = () => { const el = inputRef.current; if (el) { el.focus(); el.select(); } };
  const setRaw = (s: string) => {
    // Bangla digits → ASCII first (the field shows Bangla numerals in BN mode
    // and some keyboards type them), THEN strip separators
    patch({ budget: Math.min(BUDGET_MAX, +bnToAscii(s).replace(/[^0-9]/g, "") || 0) });
  };
  return (
    <>
      <div style={st("display:flex; align-items:center; gap:14px; padding:14px 22px; border-radius:var(--r); background:var(--card); border:.5px solid rgba(var(--rgb-white),.95); box-shadow:inset 0 1px 1px rgba(var(--rgb-white),.9), 0 10px 34px rgba(var(--rgb-ink),.08), 0 0 0 1px rgba(var(--rgb-ink),.04);")}>
        <span style={st("font-family:var(--f-display); font-size:clamp(38px,7vw,64px); font-weight:300; color:var(--faint); line-height:1;")}>৳</span>
        <input ref={inputRef} className="kbudget" inputMode="numeric" autoFocus value={bnNum(fmt(form.budget))}
          aria-label={t("s_budget_t")}
          onChange={(e) => setRaw(e.target.value)}
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
          style={st("flex:1; min-width:0; border:none; outline:none; background:transparent; font-family:var(--f-display); font-size:clamp(40px,8vw,72px); font-weight:400; letter-spacing:-2px; color:var(--ink); line-height:1;")} />
      </div>

      {/* Your OWN number is the point: buyers who tap a preset get ranked
          against a budget that is not theirs, and they tapped anyway because
          the chips looked like the answer (owner 2026-07-26). Tapping one
          drops the caret back in the field with the number selected. */}
      <p style={st("margin:20px 2px 9px; font-size:13px; font-weight:600; color:var(--tx);")}>{t("q_budget_own")}</p>
      <div style={st("display:flex; gap:8px; flex-wrap:wrap;")}>
        {QUICK.map((q) => {
          const sel = form.budget === q;
          return (
            <button key={q} onClick={() => { patch({ budget: q }); focusBudget(); }} className="k-press"
              style={st(`min-height:44px; padding:8px 14px; border-radius:var(--r); cursor:pointer; font-size:13px; font-weight:600; background:${sel ? "var(--tint)" : "transparent"}; color:${sel ? "var(--lnk)" : "var(--tx)"}; border:.5px solid ${sel ? "var(--tint2)" : "rgba(var(--rgb-ink),.12)"};`)}>
              {taka(q)}
            </button>
          );
        })}
      </div>
      <p style={st("margin:22px 2px 0; font-size:13px; color:var(--tx); line-height:1.55;")}>
        {t("q_budget_live_1")} <span style={st("color:var(--ink); font-weight:600;")}>{metaStock}</span> {t("q_budget_live_2")}
      </p>
    </>
  );
}

/* ---------- step 9 ---------- */

/* The whole ask, restated above the only button that spends a ranking call.
   This is why there is no tenth review screen. buildBrief is the same pure
   function the deleted brief bar used, so the two can never drift. */
function Commit({ form, matchCount, onCommit }: {
  form: Form; matchCount: number | null; onCommit: () => void;
}) {
  return (
    <div style={st("margin-top:26px; padding:16px; border-radius:var(--r); background:var(--card); box-shadow:var(--sh-card);")}>
      <div style={st("font-size:13px; font-weight:700; color:var(--mut); letter-spacing:.3px; text-transform:uppercase;")}>{t("s_brief_t")}</div>
      <div style={st("margin-top:9px; display:flex; flex-wrap:wrap; align-items:baseline; gap:4px 8px;")}>
        {buildBrief(form).map((b, i) => (
          <span key={b.id} style={st("display:inline-flex; align-items:baseline; gap:8px;")}>
            {i > 0 && <span aria-hidden="true" style={st("color:var(--faint); font-size:13px;")}>·</span>}
            <span style={st(`font-size:14px; line-height:1.45; font-family:var(--f-bn); color:${b.set ? "var(--ink)" : "var(--mut)"}; font-weight:${b.set ? 600 : 400};`)}>
              {b.text}
            </span>
          </span>
        ))}
      </div>
      {/* THE one amber control in the whole flow. White on --ac alone is
          4.29:1 and fails AA at this size; fading to --acd puts 5.0:1 behind
          the text's own line, which is the same gradient PriceAlert ships. */}
      <button onClick={onCommit} className="k-press k-glow"
        style={st("margin-top:16px; width:100%; min-height:56px; border-radius:var(--r); border:none; cursor:pointer; background:linear-gradient(180deg,var(--ac),var(--acd)); box-shadow:0 6px 18px rgba(var(--rgb-amber),.35); color:var(--onp); font-size:17px; font-weight:700; font-family:var(--f-bn);")}>
        {t("s_commit")}{matchCount != null ? ` · ${bnNum(String(matchCount))}` : ""} →
      </button>
    </div>
  );
}
