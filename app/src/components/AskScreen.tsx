import { useRef, useState, type ReactNode } from "react";
import { fmt, st, taka } from "../theme";
import { bnNum, bnToAscii, t } from "../i18n";
import type { Archetype, Meta } from "../api";
import { type Form, type Mode } from "../App";
import { QuizStep } from "./QuizStep";

interface Props {
  form: Form;
  patch: (d: Partial<Form>) => void;
  mode: Mode;
  onMode: (m: Mode) => void;
  modeChosen: boolean;
  meta: Meta | null;
  archetypes: Archetype[];
  metaStock: string;
  matchCount: number | null;
  onSubmit: () => void;
  step: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
}

const ARCH_BN: Record<string, string> = {
  photographer: "ছবি তোলা", gamer: "গেমিং", vlogger: "ভিডিও / ভ্লগ",
  rider: "রাইড / ড্রাইভ", parents: "আম্মু-আব্বুর জন্য", student: "শিক্ষার্থী",
  professional: "পেশাদার কাজ", balanced: "সব দিকেই ভালো",
};
// short English line under each (kept plain, no marketing fluff)
const ARCH_DESC: Record<string, string> = {
  photographer: "Cameras that beat the price",
  gamer: "High refresh, cool chipset",
  vlogger: "Steady video, sharp selfies",
  rider: "All-day battery, bright screen",
  parents: "Simple, reliable, easy to read",
  student: "Best value that lasts years",
  professional: "Fast and polished for work",
  balanced: "Strong all round, no weak spots",
};
const ARCH_ICON: Record<string, string> = {
  photographer: "M4 8h3l1.5-2h7L17 8h3v10H4V8zM12 11a3 3 0 100 6 3 3 0 000-6z",
  gamer: "M6 10h12a3 3 0 110 6H6a3 3 0 110-6zM7 11.5v3M5.5 13h3M16 12.5h.01M18 14h.01",
  vlogger: "M3 7h11v10H3V7zM14 10.5l7-3v9l-7-3",
  rider: "M12 2l8 18-8-4-8 4 8-18z",
  parents: "M12 20s-7-4.3-7-9a4 4 0 017-2.6A4 4 0 0119 11c0 4.7-7 9-7 9z",
  student: "M12 4l10 5-10 5L2 9l10-5zM6 11v5c0 1.4 3 3 6 3s6-1.6 6-3v-5",
  professional: "M4 8h16v11H4V8zM9 8V6h6v2",
  balanced: "M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2L12 3z",
};
const ARCH_ORDER = ["photographer", "gamer", "vlogger", "rider", "parents", "student", "professional", "balanced"];

const BRANDS = ["Samsung", "Xiaomi", "vivo", "OnePlus", "realme", "Apple"];
// import markets seen on Rio-pricelist offers (the only source that labels them)
const MARKETS: [string, string][] = [["IN", "India"], ["Global", "Global"], ["CN", "China"], ["US", "USA"], ["JP", "Japan"], ["SG", "Singapore"], ["AU", "Australia"]];
const QUICK = [15000, 25000, 40000, 70000, 120000];
const BUDGET_MIN = 3000, BUDGET_MAX = 500000;

const LABEL = "font-size:12px; font-weight:700; letter-spacing:1.6px; text-transform:uppercase; color:var(--mut2);";

function seg(sel: boolean): string {
  return `flex:1; padding:12px 4px; border-radius:var(--r); border:none; cursor:pointer; font-size:14.5px; font-weight:600; transition:all .15s ease; background:${sel ? "var(--card)" : "transparent"}; color:${sel ? "var(--lnk)" : "var(--mut2)"}; box-shadow:${sel ? "0 1px 3px rgba(var(--rgb-ink),.14)" : "none"};`;
}

const STEP_COPY = [
  { tt: "q_budget_t", ss: "q_budget_s" },
  { tt: "q_purpose_t", ss: "q_purpose_s" },
  { tt: "q_tune_t", ss: "q_tune_s" },
];

export function AskScreen({ form, patch, archetypes, metaStock, step, totalSteps, onNext, onBack, mode, onMode, modeChosen, meta }: Props) {
  // first visit: the mode choice IS the first question (feedback #2/#4)
  if (!modeChosen) return <ModeGate onMode={onMode} />;
  const archKeys = (archetypes.length ? ARCH_ORDER.filter((k) => archetypes.some((a) => a.key === k)) : ARCH_ORDER);
  const copy = (mode === "simple" && step === 1)
    ? { tt: "q_you_t", ss: "q_you_s" }
    : (STEP_COPY[step] ?? STEP_COPY[0]);
  const pad = (n: number) => bnNum(String(n).padStart(2, "0"));

  return (
    <div style={st("max-width:680px; margin:0 auto; animation:kfade .45s cubic-bezier(.2,.7,.2,1) both;")}>
      {/* progress + counter */}
      <div style={st("display:flex; align-items:center; gap:6px; margin-top:clamp(20px,4vh,46px);")}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <span key={i} style={st(`height:5px; flex:1; max-width:60px; border-radius:var(--r); transition:background .35s ease; background:${i <= step ? "var(--teal)" : "rgba(var(--rgb-ink),.1)"};`)} />
        ))}
        <span style={st("margin-left:9px; font-family:var(--f-serif); font-style:italic; font-size:19px; color:var(--lnk); white-space:nowrap;")}>
          {pad(step + 1)} / {pad(totalSteps)}
        </span>
      </div>

      {/* No Simple/Advanced switch here on purpose (v2 decision #1): the mode
          picked at the gate is the only one the buyer sees — no pressure to
          "upgrade". Reloading the page re-offers the gate. */}
      <h1 style={st("font-family:var(--f-display); margin:22px 0 0; font-size:clamp(32px,5vw,50px); font-weight:600; letter-spacing:-1.4px; line-height:1.05; text-wrap:balance;")}>
        {t(copy.tt)}
        {step === totalSteps - 1 && <span style={st("font-family:var(--f-serif); font-style:italic; font-weight:400; font-size:.6em; color:var(--faint); margin-left:13px;")}>{t("optional")}</span>}
      </h1>
      <p style={st("margin:14px 0 0; font-size:clamp(14.5px,1.6vw,16.5px); color:var(--mut2); line-height:1.55; max-width:520px; text-wrap:pretty;")}>{t(copy.ss)}</p>

      {/* body re-mounts per step for the entrance */}
      <div key={step} style={st("animation:kpop .42s cubic-bezier(.2,.7,.2,1) both;")}>
        {step === 0 && <BudgetStep form={form} patch={patch} metaStock={metaStock} onNext={onNext} />}
        {step === 1 && (mode === "simple"
          ? <QuizStep form={form} patch={patch} onNext={onNext} onBack={onBack} />
          : <PurposeStep form={form} patch={patch} archKeys={archKeys} />)}
        {step === 2 && <TuneStep form={form} patch={patch} mode={mode} />}
      </div>

      {mode === "advanced" && meta && (
        <div style={st("margin-top:26px; padding:12px 16px; border-radius:var(--r); background:rgba(var(--rgb-ink),.04); font-size:12px; color:var(--mut2); line-height:1.7;")}>
          <b style={st("color:var(--mut);")}>{t("adv_stats_t")}</b>{" "}
          {meta.total_phones} {t("adv_stats_phones")} · {meta.with_specs} {t("adv_stats_specs")} · {meta.with_cards ?? "—"} {t("adv_stats_cards")} · {meta.embedded ?? "—"} {t("adv_stats_embedded")} · {meta.in_stock} {t("adv_stats_stock")}
        </div>
      )}
    </div>
  );
}

/* ---------- first-visit gate: Simple or Advanced ---------- */
function ModeGate({ onMode }: { onMode: (m: Mode) => void }) {
  const CARDS: [Mode, string, string, string][] = [
    ["simple", "🙋", "mode_simple", "mode_gate_simple_d"],
    ["advanced", "🎛️", "mode_advanced", "mode_gate_advanced_d"],
  ];
  return (
    <div style={st("max-width:680px; margin:0 auto; animation:kfade .45s cubic-bezier(.2,.7,.2,1) both;")}>
      <h1 style={st("font-family:var(--f-display); margin:clamp(30px,7vh,70px) 0 0; font-size:clamp(32px,5vw,50px); font-weight:600; letter-spacing:-1.4px; line-height:1.05; text-wrap:balance;")}>{t("mode_gate_t")}</h1>
      <p style={st("margin:14px 0 0; font-size:clamp(14.5px,1.6vw,16.5px); color:var(--mut2); line-height:1.55; max-width:520px;")}>{t("mode_gate_s")}</p>
      <div style={st("display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:14px; margin-top:30px;")}>
        {CARDS.map(([m, icon, titleKey, descKey]) => (
          <button key={m} onClick={() => onMode(m)} className="k-press"
            style={st("text-align:left; padding:24px 22px; border-radius:var(--r); cursor:pointer; background:var(--card); border:.5px solid rgba(var(--rgb-ink),.08); box-shadow:0 2px 10px rgba(var(--rgb-ink),.05); transition:all .18s cubic-bezier(.2,.7,.2,1);")}>
            <span style={st("font-size:34px; display:block;")}>{icon}</span>
            <div style={st("font-family:var(--f-bn); font-size:20px; font-weight:700; margin-top:12px; color:var(--ink);")}>{t(titleKey)}</div>
            <div style={st("font-size:14px; color:var(--mut2); line-height:1.5; margin-top:6px;")}>{t(descKey)}</div>
          </button>
        ))}
      </div>
      <p style={st("margin:18px 2px 0; font-size:13px; color:var(--mut2);")}>{t("mode_gate_note")}</p>
    </div>
  );
}

/* ---------- step 1: budget (typed, with an inline go arrow) ---------- */
function BudgetStep({ form, patch, metaStock, onNext }: { form: Form; patch: Props["patch"]; metaStock: string; onNext: () => void }) {
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
      <div style={st("margin-top:34px; display:flex; align-items:center; gap:14px; padding:14px 14px 14px 26px; border-radius:var(--r); background:var(--card); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:.5px solid rgba(var(--rgb-white),.95); box-shadow:inset 0 1px 1px rgba(var(--rgb-white),.9), 0 10px 34px rgba(var(--rgb-ink),.08), 0 0 0 1px rgba(var(--rgb-ink),.04);")}>
        <span style={st("font-family:var(--f-display); font-size:clamp(38px,7vw,64px); font-weight:300; color:var(--faint); line-height:1;")}>৳</span>
        <input ref={inputRef} className="kbudget" inputMode="numeric" autoFocus value={bnNum(fmt(b))}
          onChange={(e) => setRaw(e.target.value)}
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => { if (e.key === "Enter" && b >= BUDGET_MIN) onNext(); }}
          style={st("flex:1; min-width:0; border:none; outline:none; background:transparent; font-family:var(--f-display); font-size:clamp(40px,8vw,72px); font-weight:400; letter-spacing:-2px; color:var(--ink); line-height:1;")} />
        <button onClick={() => b >= BUDGET_MIN && onNext()} aria-label="Continue" disabled={b < BUDGET_MIN} className="k-press k-glow"
          style={st(`flex-shrink:0; width:clamp(54px,9vw,64px); height:clamp(54px,9vw,64px); border-radius:var(--r); border:none; cursor:${b < BUDGET_MIN ? "not-allowed" : "pointer"}; display:flex; align-items:center; justify-content:center; transition:opacity .2s ease, transform .15s ease; opacity:${b < BUDGET_MIN ? 0.4 : 1}; background:var(--teal); box-shadow:0 8px 20px rgba(var(--rgb-ink),.14), inset 0 1px 0 rgba(var(--rgb-white),.4);`)}>
          <svg width="24" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 12h14M12 6l6 6-6 6" stroke="var(--card)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>

      {/* Your OWN number is the whole point: buyers who tap a preset get ranked
          against a budget that is not theirs, and they tapped anyway because
          the chips looked like the answer (owner 2026-07-26). The chips are a
          STARTING POINT now — secondary, labelled as such, and tapping one
          drops the caret back in the field with the number selected so the
          next keystroke is the buyer's real figure. */}
      <p style={st("margin:20px 2px 9px; font-size:13px; font-weight:600; color:var(--mut2);")}>
        Type the number you can actually spend. Not sure? Start from one of these and edit it.
      </p>
      <div style={st("display:flex; gap:8px; flex-wrap:wrap;")}>
        {QUICK.map((q) => {
          const sel = b === q;
          return (
            <button key={q} onClick={() => { patch({ budget: q }); focusBudget(); }} className="k-press"
              style={st(`padding:8px 14px; border-radius:var(--r); cursor:pointer; font-size:13px; font-weight:600; transition:all .15s ease; background:${sel ? "var(--tint)" : "transparent"}; color:${sel ? "var(--lnk)" : "var(--mut2)"}; border:.5px solid ${sel ? "var(--tint2)" : "rgba(var(--rgb-ink),.12)"};`)}>
              {taka(q)}
            </button>
          );
        })}
      </div>

      <p style={st("margin:24px 2px 0; font-size:13px; color:var(--mut2); line-height:1.55;")}>
        Live prices across <span style={st("color:var(--ink); font-weight:600;")}>{metaStock}</span> phones in Bangladesh. We look for the best fit, not the cheapest box.
      </p>
    </>
  );
}

/* ---------- step 2: purpose (rich cards, multi-select) ----------
   Buyers rarely want exactly one thing — let them pick every need that matters.
   "balanced" (no strong preference) is exclusive: choosing it clears the rest,
   and choosing a specific need clears "balanced". */
function PurposeStep({ form, patch, archKeys }: { form: Form; patch: Props["patch"]; archKeys: string[] }) {
  const sel = form.archetypes;
  const toggle = (key: string) => {
    if (key === "balanced") { patch({ archetypes: ["balanced"] }); return; }
    const next = sel.includes(key)
      ? sel.filter((k) => k !== key)
      : [...sel.filter((k) => k !== "balanced"), key];
    patch({ archetypes: next.length ? next : ["balanced"] });
  };
  return (
    <>
      <p style={st("margin:14px 2px 0; font-size:14.5px; font-weight:600; color:var(--lnk);")}>
        Pick all that matter{sel.length ? ` — ${sel.length} chosen` : ""}.
      </p>
      <div style={st("display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:11px; margin-top:14px;")}>
        {archKeys.map((key) => {
          const on = sel.includes(key);
          return (
            <button key={key} onClick={() => toggle(key)} className="k-press" title={t("exp_" + key)}
              style={st(`position:relative; text-align:left; padding:17px 17px 16px; border-radius:var(--r); cursor:pointer; transition:all .18s cubic-bezier(.2,.7,.2,1); background:${on ? "var(--teal)" : "rgba(var(--rgb-white),.8)"}; border:.5px solid ${on ? "transparent" : "rgba(var(--rgb-ink),.08)"}; box-shadow:${on ? "0 10px 26px rgba(var(--rgb-ink),.14), inset 0 1px 1px rgba(var(--rgb-white),.25)" : "0 1px 2px rgba(var(--rgb-ink),.05)"}; transform:translateY(${on ? "-2px" : "0"});`)}>
              {on && (
                <span style={st("position:absolute; top:13px; right:13px; width:19px; height:19px; border-radius:var(--r); background:var(--card); display:flex; align-items:center; justify-content:center;")}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7" stroke="var(--teal)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              )}
              <span style={st(`display:flex; align-items:center; justify-content:center; width:40px; height:40px; border-radius:var(--r); margin-bottom:12px; transition:all .18s ease; background:${on ? "rgba(var(--rgb-white),.2)" : "var(--tint)"}; color:${on ? "var(--card)" : "var(--lnk)"};`)}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d={ARCH_ICON[key] || ARCH_ICON.balanced} stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              <div style={st(`font-family:var(--f-bn); font-size:17.5px; font-weight:600; line-height:1.2; color:${on ? "var(--card)" : "var(--ink)"};`)}>{ARCH_BN[key] || key}</div>
              <div style={st(`font-size:13px; line-height:1.4; margin-top:4px; color:${on ? "rgba(var(--rgb-white),.85)" : "var(--mut2)"};`)}>{ARCH_DESC[key] || ""}</div>
            </button>
          );
        })}
      </div>
      {/* always-on: every chosen need is spelled out in plain words automatically */}
      <ChoicesBanner keys={sel} />
    </>
  );
}

/* Always-visible banner that plainly explains what EACH chosen need does to the
   ranking — no tap needed, so a first-time or older buyer always understands. */
function ChoicesBanner({ keys }: { keys: string[] }) {
  return (
    <div key={keys.join(",")} style={st("margin-top:18px; padding:17px 19px; border-radius:var(--r); background:var(--tint); border:.5px solid var(--tint2); animation:kpop .3s cubic-bezier(.2,.7,.2,1) both;")}>
      <div style={st("display:flex; align-items:center; gap:9px; margin-bottom:12px;")}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9.3" stroke="var(--teal)" strokeWidth="1.7" /><path d="M12 11v5.2M12 7.4v.4" stroke="var(--teal)" strokeWidth="2.1" strokeLinecap="round" /></svg>
        <span style={st("font-weight:700; font-size:14.5px; color:var(--lnk);")}>{t("choices_banner_t")}</span>
      </div>
      <div style={st("display:flex; flex-direction:column; gap:9px;")}>
        {keys.map((k) => (
          <div key={k} style={st("display:flex; gap:10px; align-items:flex-start;")}>
            <span style={st("width:7px; height:7px; border-radius:var(--r); background:var(--teal); margin-top:8px; flex-shrink:0;")} />
            <p style={st("margin:0; font-size:15px; color:var(--ink2); line-height:1.5; text-wrap:pretty;")}>
              <b style={st("font-family:var(--f-bn); color:var(--ink);")}>{ARCH_BN[k] || k}</b> — {t("exp_" + k)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- step 3: fine-tune (all optional) ----------
   Most buyers tap straight through with defaults, so every control carries a
   plain one-line "what this does" — and the two jargon-heavy ones (China-ROM,
   clean-vs-rich software) get a tap-to-open fuller explanation. */
function TuneStep({ form, patch, mode }: { form: Form; patch: Props["patch"]; mode: Mode }) {
  const adv = mode === "advanced";
  return (
    <div style={st("display:flex; flex-direction:column; gap:24px; margin-top:30px;")}>
      <p style={st("margin:0; font-size:15px; color:var(--mut2); line-height:1.55;")}>{t("tune_intro")}</p>

      {/* the one China control: brand origin. China-market ROM units are
          always hidden regardless (include_cn is never sent anymore). */}
      <div>
        <div style={st("display:flex; align-items:center; justify-content:space-between; gap:14px; padding:17px 19px; border-radius:var(--r); background:var(--card); border:.5px solid rgba(var(--rgb-ink),.06);")}>
          <div style={st("min-width:0;")}>
            <span style={st("font-size:15.5px; color:var(--ink2); font-weight:600;")}>Avoid Chinese brands entirely</span>
            <div style={st("font-size:13.5px; color:var(--mut2); margin-top:2px;")}>Hides Xiaomi, Oppo, Vivo &amp; co even as global versions. Off by default.</div>
          </div>
          <button onClick={() => patch({ avoidChinese: !form.avoidChinese })} aria-label="Avoid Chinese brands"
            style={st(`position:relative; width:50px; height:30px; border-radius:var(--r); border:none; cursor:pointer; flex-shrink:0; transition:background .2s ease; background:${form.avoidChinese ? "var(--teal)" : "var(--rule)"};`)}>
            <span style={st(`position:absolute; top:3px; left:${form.avoidChinese ? 23 : 3}px; width:24px; height:24px; border-radius:var(--r); background:var(--card); box-shadow:0 1px 3px rgba(var(--rgb-ink),.3); transition:left .2s ease;`)} />
          </button>
        </div>
        <AlwaysTip>{t("exp_chinese")}</AlwaysTip>
      </div>

      {/* official channel (feedback #6) — label coverage is thin, the tip says so */}
      <div>
        <div style={st("display:flex; align-items:center; justify-content:space-between; gap:14px; padding:17px 19px; border-radius:var(--r); background:var(--card); border:.5px solid rgba(var(--rgb-ink),.06);")}>
          <div style={st("min-width:0;")}>
            <span style={st("font-size:15.5px; color:var(--ink2); font-weight:600;")}>Official (BD warranty) phones only</span>
            <div style={st("font-size:13.5px; color:var(--mut2); margin-top:2px;")}>Only phones with a confirmed official-warranty listing. Off by default.</div>
          </div>
          <button onClick={() => patch({ officialOnly: !form.officialOnly })} aria-label="Official phones only"
            style={st(`position:relative; width:50px; height:30px; border-radius:var(--r); border:none; cursor:pointer; flex-shrink:0; transition:background .2s ease; background:${form.officialOnly ? "var(--teal)" : "var(--rule)"};`)}>
            <span style={st(`position:absolute; top:3px; left:${form.officialOnly ? 23 : 3}px; width:24px; height:24px; border-radius:var(--r); background:var(--card); box-shadow:0 1px 3px rgba(var(--rgb-ink),.3); transition:left .2s ease;`)} />
          </button>
        </div>
        {form.officialOnly && <AlwaysTip>{t("exp_official")}</AlwaysTip>}
      </div>

      <div style={st("display:grid; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); gap:18px;")}>
        <div>
          <div style={st(LABEL)}>Platform</div>
          <div style={st("margin-top:10px; display:flex; gap:5px; padding:4px; border-radius:var(--r); background:rgba(var(--rgb-ink),.05);")}>
            {([["any", "Any"], ["android", "Android"], ["ios", "iOS"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => patch({ platform: k })} className="k-press" style={st(seg(form.platform === k))}>{l}</button>
            ))}
          </div>
          <HelpLine>{t("exp_platform")}</HelpLine>
        </div>
        {adv && <div>
          <div style={st(LABEL)}>Software</div>
          <div style={st("margin-top:10px; display:flex; gap:5px; padding:4px; border-radius:var(--r); background:rgba(var(--rgb-ink),.05);")}>
            {([["any", "Any"], ["clean", "Clean"], ["feature", "Rich"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => patch({ osStyle: k })} className="k-press" style={st(seg(form.osStyle === k))}>{l}</button>
            ))}
          </div>
          <AlwaysTip>{t("exp_software")}</AlwaysTip>
        </div>}
      </div>

      {adv && <AdvancedSection form={form} patch={patch} />}
    </div>
  );
}

/* ---------- advanced mode (feedback #2/#7): hardware dealbreakers ----------
   Collapsed by default so the simple flow stays 3 taps; power buyers open it
   for must-have hardware, chipset brand and a brand whitelist. */
const HW_TOGGLES: [keyof Form, string, string][] = [
  ["requireJack", "Headphone jack", "3.5mm"],
  ["requireIr", "IR blaster", "TV/AC remote"],
  ["requireFm", "FM radio", ""],
  ["requireRom", "Custom ROM", "LineageOS"],
];

function AdvancedSection({ form, patch }: { form: Form; patch: Props["patch"] }) {
  // advanced mode is an explicit opt-in, so the panel starts expanded
  const [show, setShow] = useState(true);
  // one brand control (hide vs only) — same chip list, two directions.
  // Switching direction carries the selection across.
  const [brandMode, setBrandModeState] = useState<"exclude" | "only">(
    form.includeBrands.length ? "only" : "exclude");
  const brandList = brandMode === "only" ? form.includeBrands : form.excludeBrands;
  const setBrandMode = (m: "exclude" | "only") => {
    if (m === brandMode) return;
    setBrandModeState(m);
    if (m === "only") patch({ includeBrands: form.excludeBrands, excludeBrands: [] });
    else patch({ excludeBrands: form.includeBrands, includeBrands: [] });
  };
  const toggleBrand = (bd: string) => {
    const key = brandMode === "only" ? "includeBrands" : "excludeBrands";
    patch({ [key]: brandList.includes(bd)
      ? brandList.filter((x) => x !== bd)
      : [...brandList, bd] } as Partial<Form>);
  };
  return (
    <div>
      <button onClick={() => setShow(!show)} className="k-press"
        style={st(`display:flex; align-items:center; gap:10px; width:100%; padding:15px 19px; border-radius:var(--r); border:.5px solid ${show ? "var(--tint2)" : "rgba(var(--rgb-ink),.08)"}; cursor:pointer; background:${show ? "var(--tint)" : "rgba(var(--rgb-white),.7)"}; transition:all .18s ease;`)}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M4 7h9M17 7h3M4 17h3M11 17h9M13 4.5v5M7 14.5v5" stroke={show ? "var(--lnk)" : "var(--mut)"} strokeWidth="1.8" strokeLinecap="round" /></svg>
        <span style={st(`font-size:15px; font-weight:700; color:${show ? "var(--lnk)" : "var(--tx)"};`)}>{t("adv_title")}</span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={st(`margin-left:auto; transition:transform .2s ease; transform:rotate(${show ? 180 : 0}deg);`)}><path d="M6 9l6 6 6-6" stroke="var(--mut2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>

      {show && (
        <div style={st("display:flex; flex-direction:column; gap:22px; margin-top:16px; padding:19px; border-radius:var(--r); background:rgba(var(--rgb-white),.6); border:.5px solid rgba(var(--rgb-ink),.06); animation:kpop .3s cubic-bezier(.2,.7,.2,1) both;")}>
          <div>
            <div style={st(LABEL)}>Must-have hardware</div>
            <div style={st("margin-top:11px; display:flex; flex-wrap:wrap; gap:8px;")}>
              {HW_TOGGLES.map(([key, label, sub]) => {
                const on = form[key] as boolean;
                return (
                  <button key={key} onClick={() => patch({ [key]: !on } as Partial<Form>)} className="k-press"
                    style={st(`padding:10px 16px; border-radius:var(--r); cursor:pointer; font-size:13.5px; font-weight:600; transition:all .15s ease; background:${on ? "var(--teal)" : "rgba(var(--rgb-white),.85)"}; color:${on ? "var(--card)" : "var(--tx)"}; border:.5px solid ${on ? "transparent" : "rgba(var(--rgb-ink),.1)"}; box-shadow:${on ? "0 3px 12px rgba(var(--rgb-ink),.14)" : "none"};`)}>
                    {label}{sub && <span style={st(`font-weight:500; margin-left:5px; color:${on ? "rgba(var(--rgb-white),.75)" : "var(--mut2)"};`)}>{sub}</span>}
                  </button>
                );
              })}
            </div>
            <HelpLine>{t("exp_hw")}</HelpLine>
            {form.requireRom && <AlwaysTip>{t("exp_custom_rom")}</AlwaysTip>}
            <div style={st("display:flex; align-items:center; justify-content:space-between; gap:14px; margin-top:12px; padding:14px 16px; border-radius:var(--r); background:var(--card); border:.5px solid rgba(var(--rgb-ink),.06);")}>
              <div style={st("min-width:0;")}>
                <span style={st("font-size:14.5px; color:var(--ink2); font-weight:600;")}>Strict matching</span>
                <div style={st("font-size:13px; color:var(--mut2); margin-top:2px;")}>verified hardware only</div>
              </div>
              <button onClick={() => patch({ hwStrict: !form.hwStrict })} aria-label="Strict matching"
                style={st(`position:relative; width:50px; height:30px; border-radius:var(--r); border:none; cursor:pointer; flex-shrink:0; transition:background .2s ease; background:${form.hwStrict ? "var(--teal)" : "var(--rule)"};`)}>
                <span style={st(`position:absolute; top:3px; left:${form.hwStrict ? 23 : 3}px; width:24px; height:24px; border-radius:var(--r); background:var(--card); box-shadow:0 1px 3px rgba(var(--rgb-ink),.3); transition:left .2s ease;`)} />
              </button>
            </div>
            <HelpLine>{t("exp_strict")}</HelpLine>
          </div>

          <div>
            <div style={st(LABEL)}>Chipset brand</div>
            <div style={st("margin-top:10px; display:flex; gap:5px; padding:4px; border-radius:var(--r); background:rgba(var(--rgb-ink),.05); max-width:420px;")}>
              {([["any", "Any"], ["snapdragon", "Snapdragon"], ["mediatek", "MediaTek"]] as const).map(([k, l]) => (
                <button key={k} onClick={() => patch({ socVendor: k })} className="k-press" style={st(seg(form.socVendor === k))}>{l}</button>
              ))}
            </div>
            <HelpLine>{t("exp_soc")}</HelpLine>
          </div>

          <div>
            <div style={st(LABEL)}>Brands</div>
            <div style={st("margin-top:10px; display:flex; gap:5px; padding:4px; border-radius:var(--r); background:rgba(var(--rgb-ink),.05); max-width:420px;")}>
              {([["exclude", "Hide selected"], ["only", "Show only selected"]] as const).map(([k, l]) => (
                <button key={k} onClick={() => setBrandMode(k)} className="k-press" style={st(seg(brandMode === k))}>{l}</button>
              ))}
            </div>
            <div style={st("margin-top:11px; display:flex; flex-wrap:wrap; gap:8px;")}>
              {BRANDS.map((bd) => {
                const sel = brandList.includes(bd);
                const ex = brandMode === "exclude";
                return (
                  <button key={bd} onClick={() => toggleBrand(bd)} className="k-press"
                    style={st(`padding:9px 15px; border-radius:var(--r); cursor:pointer; font-size:13.5px; transition:all .15s ease; background:${sel ? (ex ? "var(--dangerL)" : "var(--tint)") : "rgba(var(--rgb-white),.8)"}; color:${sel ? (ex ? "var(--danger)" : "var(--lnk)") : "var(--mut)"}; border:.5px solid ${sel ? (ex ? "rgba(var(--rgb-danger),.3)" : "var(--tint2)") : "rgba(var(--rgb-ink),.1)"}; text-decoration:${sel && ex ? "line-through" : "none"}; font-weight:${sel ? 700 : 500};`)}>{bd}</button>
                );
              })}
            </div>
            <HelpLine>{t(brandMode === "exclude" ? "exp_exclude" : "exp_include_brands")}</HelpLine>
          </div>

          <div>
            <div style={st(LABEL)}>Import market</div>
            <div style={st("margin-top:11px; display:flex; flex-wrap:wrap; gap:8px;")}>
              {MARKETS.map(([code, label]) => {
                const sel = form.regions.includes(code);
                return (
                  <button key={code} onClick={() => patch({ regions: sel ? form.regions.filter((x) => x !== code) : [...form.regions, code] })} className="k-press"
                    style={st(`padding:9px 15px; border-radius:var(--r); cursor:pointer; font-size:13.5px; transition:all .15s ease; background:${sel ? "var(--tint)" : "rgba(var(--rgb-white),.8)"}; color:${sel ? "var(--lnk)" : "var(--mut)"}; border:.5px solid ${sel ? "var(--tint2)" : "rgba(var(--rgb-ink),.1)"}; font-weight:${sel ? 700 : 500};`)}>{label}</button>
                );
              })}
            </div>
            {form.regions.length > 0
              ? <AlwaysTip>{t("exp_regions")}</AlwaysTip>
              : <HelpLine>{t("exp_regions_off")}</HelpLine>}
          </div>

        </div>
      )}
    </div>
  );
}

/* Always-on soft explanation for the jargon-heavy controls (China-ROM, software
   feel) — shown by default so nobody has to hunt for what a setting means. */
function AlwaysTip({ children }: { children: ReactNode }) {
  return <p style={st("margin:10px 0 0; padding:12px 15px; border-radius:var(--r); background:var(--tint); font-size:14.5px; color:var(--tx); line-height:1.55; text-wrap:pretty;")}>{children}</p>;
}

function HelpLine({ children }: { children: ReactNode }) {
  return <p style={st("margin:9px 2px 0; font-size:14px; color:var(--mut2); line-height:1.5;")}>{children}</p>;
}
