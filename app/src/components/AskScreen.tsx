import { useRef, type ReactNode } from "react";
import { fmt, st, taka } from "../theme";
import { bnNum, bnToAscii, t } from "../i18n";
import type { Meta } from "../api";
import type { Form } from "../need";
import { FilterGroups } from "./FilterGroups";
import { QuizStep } from "./QuizStep";

interface Props {
  form: Form;
  patch: (d: Partial<Form>) => void;
  meta: Meta | null;
  metaStock: string;
  matchCount: number | null;
}

/* ONE screen. It used to be a three-step wizard behind a Simple/Advanced gate,
   and both of those are gone (spec 2026-08-07):

   - the gate asked the buyer to choose before they had seen either option, and
     locked the choice until a reload;
   - behind it both modes ran the SAME wizard, and Advanced was the weaker
     instrument -- an additive archetype multi-select that provably
     self-cancels, against Simple's forced-choice quiz with a guaranteed
     leading axis. Self-identifying as an expert was punished;
   - each step collapsed once answered, so the buyer could not see what they
     had said without walking backwards through it.

   Now budget, the two questions and the grouped filters are three sections on
   one scroll, all of them still on screen, with the brief bar restating the
   whole thing and holding the only button that spends a ranking call.

   Each section carries the `brief-<id>` anchor its brief clause jumps to. */

const QUICK = [15000, 25000, 40000, 70000, 120000];
// no floor any more: nothing gates on the budget, so a too-low number simply
// shows "0 matches" in the brief bar, which says more than a disabled button did
const BUDGET_MAX = 500000;

// the brief bar is ~118px tall over a 90px sticky header; scroll-margin-top
// keeps a jumped-to section's heading clear of the header rather than under it
const SECTION = "scroll-margin-top:96px;";

export function AskScreen({ form, patch, metaStock, matchCount, meta }: Props) {
  return (
    <div style={st("max-width:680px; margin:0 auto; padding-bottom:56px; animation:kfade .45s cubic-bezier(.2,.7,.2,1) both;")}>
      <h1 style={st("font-family:var(--f-display); margin:clamp(20px,4vh,46px) 0 0; font-size:clamp(30px,5vw,46px); font-weight:600; letter-spacing:-1.3px; line-height:1.06; text-wrap:balance;")}>
        {t("ask_title")}
      </h1>
      <p style={st("margin:14px 0 0; font-size:clamp(15px,1.6vw,16.5px); color:var(--tx); line-height:1.55; max-width:520px; text-wrap:pretty;")}>{t("ask_sub")}</p>

      <section id="brief-budget" style={st(SECTION)}>
        <BudgetStep form={form} patch={patch} metaStock={metaStock} />
      </section>

      <section id="brief-need" style={st(SECTION)}>
        <QuizStep form={form} patch={patch} />
      </section>

      <section id="brief-filters" style={st(SECTION)}>
        <FilterGroups form={form} patch={patch} matchCount={matchCount} />
      </section>

      {meta && (
        <p style={st("margin-top:26px; font-size:12.5px; color:var(--tx); line-height:1.7;")}>
          <b>{t("adv_stats_t")}</b>{" "}
          {meta.total_phones} {t("adv_stats_phones")} · {meta.with_cards ?? "—"} {t("adv_stats_cards")} · {meta.in_stock} {t("adv_stats_stock")}
        </p>
      )}
    </div>
  );
}

/* ---------- budget ---------- */
function BudgetStep({ form, patch, metaStock }: { form: Form; patch: Props["patch"]; metaStock: string }) {
  const b = form.budget;
  const inputRef = useRef<HTMLInputElement>(null);
  const focusBudget = () => { const el = inputRef.current; if (el) { el.focus(); el.select(); } };
  const setRaw = (s: string) => {
    // map Bangla digits → ASCII first (the field shows Bangla numerals in BN
    // mode, and some keyboards type them), THEN strip separators/non-digits
    const n = Math.min(BUDGET_MAX, +bnToAscii(s).replace(/[^0-9]/g, "") || 0);
    patch({ budget: n });
  };
  return (
    <>
      {/* the inline go-arrow went with the wizard: it advanced to step 2, and
          there is no step 2. Enter dismisses the numeric keypad instead, which
          is what it has to do on a phone. */}
      <div style={st("margin-top:34px; display:flex; align-items:center; gap:14px; padding:14px 22px; border-radius:var(--r); background:var(--card); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:.5px solid rgba(var(--rgb-white),.95); box-shadow:inset 0 1px 1px rgba(var(--rgb-white),.9), 0 10px 34px rgba(var(--rgb-ink),.08), 0 0 0 1px rgba(var(--rgb-ink),.04);")}>
        <span style={st("font-family:var(--f-display); font-size:clamp(38px,7vw,64px); font-weight:300; color:var(--faint); line-height:1;")}>৳</span>
        <input ref={inputRef} className="kbudget" inputMode="numeric" autoFocus value={bnNum(fmt(b))}
          aria-label={t("q_budget_t")}
          onChange={(e) => setRaw(e.target.value)}
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
          style={st("flex:1; min-width:0; border:none; outline:none; background:transparent; font-family:var(--f-display); font-size:clamp(40px,8vw,72px); font-weight:400; letter-spacing:-2px; color:var(--ink); line-height:1;")} />
      </div>

      {/* Your OWN number is the whole point: buyers who tap a preset get ranked
          against a budget that is not theirs, and they tapped anyway because
          the chips looked like the answer (owner 2026-07-26). The chips are a
          STARTING POINT now — secondary, labelled as such, and tapping one
          drops the caret back in the field with the number selected so the
          next keystroke is the buyer's real figure. */}
      <p style={st("margin:20px 2px 9px; font-size:13px; font-weight:600; color:var(--tx);")}>{t("q_budget_own")}</p>
      <div style={st("display:flex; gap:8px; flex-wrap:wrap;")}>
        {QUICK.map((q) => {
          const sel = b === q;
          return (
            <button key={q} onClick={() => { patch({ budget: q }); focusBudget(); }} className="k-press"
              style={st(`padding:8px 14px; border-radius:var(--r); cursor:pointer; font-size:13px; font-weight:600; transition:all .15s ease; background:${sel ? "var(--tint)" : "transparent"}; color:${sel ? "var(--lnk)" : "var(--tx)"}; border:.5px solid ${sel ? "var(--tint2)" : "rgba(var(--rgb-ink),.12)"};`)}>
              {taka(q)}
            </button>
          );
        })}
      </div>
      <p style={st("margin:24px 2px 0; font-size:13px; color:var(--tx); line-height:1.55;")}>
        {t("q_budget_live_1")} <span style={st("color:var(--ink); font-weight:600;")}>{metaStock}</span> {t("q_budget_live_2")}
      </p>
    </>
  );
}

/* Always-on soft explanation for the jargon-heavy controls — shown by default
   so nobody has to hunt for what a setting means. Kept here because QuizStep
   imports it; the filter groups carry their own always-visible help. */
export function AlwaysTip({ children }: { children: ReactNode }) {
  return <p style={st("margin:10px 0 0; padding:12px 15px; border-radius:var(--r); background:var(--tint); font-size:14.5px; color:var(--tx); line-height:1.55; text-wrap:pretty;")}>{children}</p>;
}

export function HelpLine({ children }: { children: ReactNode }) {
  return <p style={st("margin:9px 2px 0; font-size:14px; color:var(--tx); line-height:1.5;")}>{children}</p>;
}
