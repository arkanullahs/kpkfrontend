import { useEffect, useRef, useState } from "react";
import { fmt, st, taka } from "../theme";
import { bnNum, bnToAscii, t } from "../i18n";
import { buildBrief } from "../filters";
import { LAST, STEPS, type Step, type StepLayout, type StepOption } from "../steps";
import { useCounts } from "../useCounts";
import type { Form } from "../need";

/* One step's controls.

   Budget keeps its own body -- it is a number field, not a list. Everything
   else renders from the table: a GRID of options (rows read as a queue, which
   is exactly what nine screens must not feel like), then any revealed
   follow-up group, then "doesn't matter" as either a full-size peer (filter
   steps) or a quiet line (the two forced choices, where making the buyer
   choose IS the design).

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
  const [sheet, setSheet] = useState(false);
  const opts = s.options(form);

  // only the CURRENT step probes, and the table caps it at four options, so
  // this is at most four /count calls in flight -- never twelve
  const probes: Record<string, Partial<Form>> = {};
  for (const o of opts) if (o.probe) probes[o.id] = o.probe(form);
  const counts = useCounts(form, probes);

  const answer = (o: StepOption) => {
    patch(o.patch(form));
    // a step with a follow-up group cannot auto-advance: the answer that was
    // just given is what makes the next question appear, and leaving the
    // screen would take it away in the same beat
    if (s.kind !== "single" || s.reveal) return;
    setTapped(o.id);
    window.setTimeout(onAnswered, TAP_MS);
  };

  const skip = () => {
    patch(s.clear(form));
    setTapped("__skip");
    window.setTimeout(onAnswered, TAP_MS);
  };

  // Budget has no options to tap, so nothing would ever call onAnswered for
  // it -- it needs the same explicit Next the multi steps use, or the walk
  // dead-ends on its first screen. It gets no skip: the field always holds a
  // number, so there is nothing to decline.
  if (s.kind === "budget") return (
    <>
      <BudgetBody form={form} patch={patch} metaStock={metaStock} />
      <Next onClick={onAnswered} />
    </>
  );

  const last = s.id === STEPS[LAST].id;
  const revealed = s.reveal && s.reveal.when(form) ? s.reveal : null;
  /* A step needs an explicit Next whenever tapping one option cannot mean
     "done": multi steps, steps that reveal a follow-up, and steps with a
     sheet. The sheet case is not theoretical — the channel screen shipped
     without it for one build, and a buyer who chose an import market had no
     way forward except the skip, which clears the market they just chose. */
  const needsNext = s.kind === "multi" || !!s.reveal || !!s.sheet;

  /* The skip joins the grid as a real tile on the `equal` steps. It used to
     render as a wide bare box under the options, which on the channel screen
     made one of two equally valid answers look like the exit. */
  const skipTile: StepOption | null = s.skipStyle !== "equal" ? null : {
    id: "__skip", labelKey: s.skipKey, subKey: s.skipSubKey, icon: s.skipIcon,
    patch: (f) => s.clear(f),
    // never pre-lit: on most steps "doesn't matter" IS the current state, and
    // a screen that arrives already answered is a screen nobody reads
    isOn: () => false,
  };

  /* The skip joins the main grid only when this step asks one question. With
     a follow-up group it has to come AFTER both, or "whatever fits the
     budget" sits in the RAM row and reads as an answer about RAM alone. */
  const skipInGrid = skipTile && !revealed ? skipTile : null;
  const skipAfter = skipTile && revealed ? skipTile : null;
  const pick = (o: StepOption) => (o.id === "__skip" ? skip() : answer(o));

  return (
    <>
      <Options layout={s.layout} opts={skipInGrid ? [...opts, skipInGrid] : opts} form={form}
        counts={counts} total={matchCount} tapped={tapped} onPick={pick} />

      {revealed && (
        <div style={st("margin-top:26px;")}>
          <GroupLabel>{t(revealed.titleKey)}</GroupLabel>
          <Options layout={revealed.layout} opts={revealed.options(form)} form={form}
            counts={counts} total={matchCount} tapped={tapped} onPick={answer} />
        </div>
      )}

      {skipAfter && (
        <div style={st("margin-top:22px;")}>
          <Options layout={s.layout} opts={[skipAfter]} form={form}
            counts={counts} total={matchCount} tapped={tapped} onPick={pick} />
        </div>
      )}

      {/* the overflow list, one tap away rather than doubling the grid */}
      {s.sheet && (
        <button onClick={() => setSheet(true)} className="k-press"
          style={st("display:flex; align-items:center; justify-content:center; gap:9px; width:100%; min-height:52px; margin-top:14px; padding:12px 16px; border-radius:var(--r); cursor:pointer; background:transparent; border:1.5px dashed var(--rule); font-size:15px; font-weight:600; color:var(--lnk); font-family:var(--f-bn);")}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="var(--lnk)" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {t(s.sheet.buttonKey)}
        </button>
      )}

      {/* The two need questions keep the quiet skip -- an evenly-weighted pair
          of answers is flat most of the time, so making the buyer actually
          choose is the whole instrument. Every other step's skip is already
          up there in the grid. */}
      {s.skipStyle === "quiet" && (
        <button onClick={skip} className="k-press"
          style={st("display:block; margin:20px auto 0; min-height:48px; padding:12px 18px; border:none; background:none; cursor:pointer; font-size:16px; font-weight:600; color:var(--mut); font-family:var(--f-bn); text-decoration:underline dotted; text-underline-offset:4px;")}>
          {t(s.skipKey)}
        </button>
      )}

      {needsNext && !last && <Next onClick={onAnswered} />}

      {last && <Commit form={form} matchCount={matchCount} onCommit={onCommit} />}

      {sheet && s.sheet && (
        <Sheet title={t(s.sheet.titleKey)} onClose={() => setSheet(false)}>
          <Options layout="chips" opts={s.sheet.options(form)} form={form}
            counts={{}} total={null} tapped={null} onPick={(o) => patch(o.patch(form))} />
        </Sheet>
      )}
    </>
  );
}

/* ---------- the option grid ---------- */

/* Two up for icon tiles, three up for brands, and a wrapping row for the
   short text sizes. auto-fit with a minimum means one column on a narrow
   phone without a media query, and never a tile too small to read. */
const TRACK: Record<StepLayout, string> = {
  grid2: "repeat(auto-fit, minmax(150px, 1fr))",
  grid3: "repeat(auto-fit, minmax(104px, 1fr))",
  chips: "",
};

function Options({ layout, opts, form, counts, total, tapped, onPick }: {
  layout: StepLayout; opts: StepOption[]; form: Form;
  counts: Record<string, number | null>; total: number | null;
  tapped: string | null; onPick: (o: StepOption) => void;
}) {
  if (layout === "chips") {
    return (
      <div style={st("display:flex; flex-wrap:wrap; gap:9px;")}>
        {opts.map((o) => (
          <Chip key={o.id} o={o} on={o.isOn(form) || tapped === o.id} onPick={() => onPick(o)} />
        ))}
      </div>
    );
  }
  return (
    <div className="k-stagger" style={st(`display:grid; grid-template-columns:${TRACK[layout]}; gap:10px;`)}>
      {opts.map((o) => (
        <Tile key={o.id} o={o} form={form} count={counts[o.id] ?? null}
          total={total} tapped={tapped === o.id} compact={layout === "grid3"}
          onPick={() => onPick(o)} />
      ))}
    </div>
  );
}

/* One tile. The icon sits above the label rather than beside it, which is what
   lets two fit across a 375px phone without either one truncating.

   The type is sized against the control, not against the page: an 18px answer
   in a 130px tile reads as the thing you are choosing. 16px in the same box
   read as a caption, which is what the owner saw. */
function Tile({ o, form, count, total, tapped, compact, onPick }: {
  o: StepOption; form: Form; count: number | null; total: number | null;
  tapped: boolean; compact: boolean; onPick: () => void;
}) {
  const on = o.isOn(form);
  // an option that would leave nothing standing is pre-marked rather than
  // discovered afterwards -- but only while it is OFF: a set filter must
  // always be un-settable, and disabling the control that undoes it would
  // trap the buyer on an empty result with no way back.
  const dead = count === 0 && !on;
  const lit = on || tapped;
  const sub = o.subKey ? t(o.subKey) : null;
  return (
    <button onClick={onPick} disabled={dead} className="k-press" aria-pressed={on}
      style={st(`display:flex; flex-direction:column; align-items:flex-start; gap:${compact ? 10 : 12}px; min-height:${compact ? 96 : 130}px; padding:${compact ? "14px 13px" : "18px 17px"}; border-radius:var(--r); cursor:${dead ? "not-allowed" : "pointer"}; text-align:left; transition:background .14s ease, box-shadow .14s ease, border-color .14s ease; opacity:${dead ? .5 : 1}; background:${lit ? "var(--teal)" : "var(--card)"}; border:1.5px solid ${lit ? "transparent" : "var(--rule)"}; box-shadow:${lit ? "0 10px 24px -14px rgba(var(--rgb-ink),.55)" : "none"};`)}>
      {o.icon && (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={st("flex-shrink:0;")}>
          <path d={o.icon} stroke={lit ? "var(--onp)" : "var(--lnk)"} strokeWidth="1.9"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {o.dot && <BrandMark dot={o.dot} mark={o.mark} />}

      <span style={st(`width:100%; font-size:${compact ? 15.5 : 18}px; font-weight:700; line-height:1.28; letter-spacing:-.2px; color:${lit ? "var(--onp)" : "var(--ink)"}; font-family:var(--f-bn); text-wrap:balance;`)}>
        {t(o.labelKey)}
      </span>
      {sub && (
        <span style={st(`width:100%; font-size:14px; font-weight:500; line-height:1.45; color:${lit ? "var(--onp2)" : "var(--tx)"}; font-family:var(--f-bn); text-wrap:pretty;`)}>
          {sub}
        </span>
      )}
      {!lit && count !== null && (
        <span style={st("margin-top:auto; padding-top:10px;")}><CountPill n={count} total={total} /></span>
      )}
    </button>
  );
}

/* The brand's own colour, filled, with its mark on top.

   MI and 1+ are the marks those brands actually use. The single letters stand
   in for wordmarks: a hand-traced Samsung or realme wordmark would be brand
   misuse AND unreadable at 40px, so the name sits right below every one of
   these and carries the meaning by itself. Drop the vendors' own SVG files in
   here and this component is the only thing that changes. */
function BrandMark({ dot, mark }: { dot: string; mark?: string }) {
  return (
    <span aria-hidden="true"
      style={st(`display:flex; align-items:center; justify-content:center; width:40px; height:40px; border-radius:var(--r); flex-shrink:0; background:${dot}; box-shadow:0 0 0 1px rgba(var(--rgb-ink),.14), 0 4px 10px -6px rgba(var(--rgb-ink),.5);`)}>
      {mark
        ? <span style={st("font-family:var(--f-display); font-size:16px; font-weight:800; letter-spacing:-.5px; color:#fff; line-height:1;")}>{mark}</span>
        : <svg width="21" height="21" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
            <path d="M16.4 12.7c0-2 1.6-3 1.7-3-.9-1.4-2.4-1.5-2.9-1.6-1.2-.1-2.4.7-3 .7-.6 0-1.6-.7-2.6-.7-1.3 0-2.6.8-3.2 2-1.4 2.4-.4 6 1 8 .7 1 1.5 2 2.5 2 1 0 1.4-.6 2.6-.6s1.5.6 2.6.6 1.7-1 2.4-1.9c.7-1.1 1-2.2 1-2.2s-1.9-.8-1.9-3.3zM14.5 6.6c.5-.7.9-1.6.8-2.6-.8 0-1.8.5-2.4 1.2-.5.6-.9 1.6-.8 2.5.9.1 1.8-.4 2.4-1.1z" />
          </svg>}
    </span>
  );
}

function Chip({ o, on, onPick }: { o: StepOption; on: boolean; onPick: () => void }) {
  return (
    <button onClick={onPick} className="k-press" aria-pressed={on}
      style={st(`display:inline-flex; align-items:center; gap:9px; min-height:52px; padding:13px 19px; border-radius:var(--r); cursor:pointer; transition:background .14s ease; font-size:16.5px; font-weight:700; font-family:var(--f-bn); background:${on ? "var(--teal)" : "var(--card)"}; color:${on ? "var(--onp)" : "var(--ink)"}; border:1.5px solid ${on ? "transparent" : "var(--rule)"};`)}>
      {o.dot && (
        <span aria-hidden="true" style={st(`display:block; width:18px; height:18px; border-radius:var(--r); flex-shrink:0; background:${o.dot}; box-shadow:0 0 0 1px rgba(var(--rgb-ink),.18);`)} />
      )}
      {t(o.labelKey)}
    </button>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={st("margin:0 2px 12px; font-size:16px; font-weight:700; color:var(--ink); font-family:var(--f-bn);")}>
      {children}
    </div>
  );
}

/* Fractions, never arrows: "1 of 46" says what the option costs. "→ 18" makes
   the buyer work out what they are losing. */
function CountPill({ n, total }: { n: number | null; total: number | null }) {
  if (n === null) return null;
  const dead = n === 0;
  return (
    <span style={st(`display:inline-block; font-size:14px; font-weight:700; padding:5px 11px; border-radius:var(--r); background:${dead ? "var(--dangerL)" : "var(--tint)"}; color:${dead ? "var(--danger)" : "var(--lnk)"};`)}>
      {dead ? t("fg_zero") : `${bnNum(String(n))} ${t("fg_of")} ${total != null ? bnNum(String(total)) : "?"}`}
    </span>
  );
}

/* ---------- the overflow sheet ---------- */

/* Same material as NarrowSheet: .k-scrim, because live content sits behind it,
   which is the whole test for whether a blur is material or decoration.
   Three gestures dismiss it -- the handle, the scrim, and Escape. */
function Sheet({ title, children, onClose }: {
  title: string; children: React.ReactNode; onClose: () => void;
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", esc); document.body.style.overflow = prev; };
  }, [onClose]);

  return (
    <div onClick={onClose} role="dialog" aria-modal="true" aria-label={title} className="k-scrim"
      style={st("position:fixed; inset:0; z-index:1000; display:flex; align-items:flex-end; justify-content:center; background:rgba(var(--rgb-ink),.42); animation:kfade .28s ease both;")}>
      <div onClick={(e) => e.stopPropagation()}
        style={st("width:100%; max-width:640px; background:var(--card); border-radius:14px 14px 0 0; padding:22px 20px calc(20px + env(safe-area-inset-bottom)); box-shadow:0 -22px 40px -24px rgba(var(--rgb-ink),.45); animation:kslide .34s cubic-bezier(.2,.7,.2,1) both;")}>
        <style>{"@keyframes kslide{from{transform:translateY(26px);opacity:0}to{transform:none;opacity:1}}"}</style>
        <button onClick={onClose} aria-label={t("s_sheet_done")}
          style={st("display:block; width:44px; height:5px; background:var(--mut); border:none; border-radius:3px; margin:0 auto 18px; cursor:pointer; padding:0;")} />
        <div style={st("margin-bottom:16px; font-size:20px; font-weight:700; color:var(--ink); font-family:var(--f-bn);")}>{title}</div>
        {children}
        <button onClick={onClose} className="k-press"
          style={st("margin-top:20px; width:100%; min-height:54px; border-radius:var(--r); border:none; cursor:pointer; background:var(--teal); color:var(--onp); font-size:16.5px; font-weight:700; font-family:var(--f-bn);")}>
          {t("s_sheet_done")}
        </button>
      </div>
    </div>
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
      <p style={st("margin:20px 2px 9px; font-size:13.5px; font-weight:600; color:var(--tx);")}>{t("q_budget_own")}</p>
      <div style={st("display:flex; gap:9px; flex-wrap:wrap;")}>
        {QUICK.map((q) => {
          const sel = form.budget === q;
          return (
            <button key={q} onClick={() => { patch({ budget: q }); focusBudget(); }} className="k-press"
              style={st(`min-height:48px; padding:11px 16px; border-radius:var(--r); cursor:pointer; font-size:14px; font-weight:600; background:${sel ? "var(--tint)" : "var(--card)"}; color:${sel ? "var(--lnk)" : "var(--tx)"}; border:1.5px solid ${sel ? "var(--tint2)" : "var(--rule)"};`)}>
              {taka(q)}
            </button>
          );
        })}
      </div>
      <p style={st("margin:22px 2px 0; font-size:13.5px; color:var(--tx); line-height:1.55;")}>
        {t("q_budget_live_1")} <span style={st("color:var(--ink); font-weight:600;")}>{metaStock}</span> {t("q_budget_live_2")}
      </p>
    </>
  );
}

/* ---------- shared ---------- */

/* The explicit advance, for the steps where no single tap can mean "done":
   budget (a number, not a choice), the multi steps (where the buyer may want
   two of the three), and any step with a revealed follow-up (where the tap
   that answered is what made the next question appear). The plain single
   steps never show it -- their answer IS the advance, which is what keeps
   nine screens down to nine taps. */
function Next({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="k-press"
      style={st("margin-top:18px; width:100%; min-height:56px; border-radius:var(--r); border:none; cursor:pointer; background:var(--teal); color:var(--onp); font-size:16.5px; font-weight:700; font-family:var(--f-bn); box-shadow:0 10px 26px -14px rgba(var(--rgb-ink),.5);")}>
      {t("qz_next")} →
    </button>
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
        style={st("margin-top:16px; width:100%; min-height:58px; border-radius:var(--r); border:none; cursor:pointer; background:linear-gradient(180deg,var(--ac),var(--acd)); box-shadow:0 6px 18px rgba(var(--rgb-amber),.35); color:var(--onp); font-size:17px; font-weight:700; font-family:var(--f-bn);")}>
        {t("s_commit")}{matchCount != null ? ` · ${bnNum(String(matchCount))}` : ""} →
      </button>
    </div>
  );
}
