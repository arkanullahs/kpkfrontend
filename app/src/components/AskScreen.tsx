import { fmt, st, taka } from "../theme";
import { bnNum, t } from "../i18n";
import type { Archetype } from "../api";
import type { Form } from "../App";

interface Props {
  form: Form;
  patch: (d: Partial<Form>) => void;
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
const QUICK = [15000, 25000, 40000, 70000, 120000];
const BUDGET_MIN = 3000, BUDGET_MAX = 500000;

const LABEL = "font-size:12px; font-weight:700; letter-spacing:1.6px; text-transform:uppercase; color:#9a9da4;";

function seg(sel: boolean): string {
  return `flex:1; padding:11px 4px; border-radius:13px; border:none; cursor:pointer; font-size:13.5px; font-weight:600; transition:all .15s ease; background:${sel ? "#fff" : "transparent"}; color:${sel ? "var(--acd)" : "#80868f"}; box-shadow:${sel ? "0 1px 3px rgba(15,25,35,.14)" : "none"};`;
}

const STEP_COPY = [
  { tt: "q_budget_t", ss: "q_budget_s" },
  { tt: "q_purpose_t", ss: "q_purpose_s" },
  { tt: "q_tune_t", ss: "q_tune_s" },
];

export function AskScreen({ form, patch, archetypes, metaStock, step, totalSteps, onNext }: Props) {
  const archKeys = (archetypes.length ? ARCH_ORDER.filter((k) => archetypes.some((a) => a.key === k)) : ARCH_ORDER);
  const copy = STEP_COPY[step] ?? STEP_COPY[0];
  const pad = (n: number) => bnNum(String(n).padStart(2, "0"));

  return (
    <div style={st("max-width:680px; margin:0 auto; animation:kfade .45s cubic-bezier(.2,.7,.2,1) both;")}>
      {/* progress + counter */}
      <div style={st("display:flex; align-items:center; gap:6px; margin-top:clamp(20px,4vh,46px);")}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <span key={i} style={st(`height:5px; flex:1; max-width:60px; border-radius:99px; transition:background .35s ease; background:${i <= step ? "var(--ac)" : "rgba(15,25,35,.1)"};`)} />
        ))}
        <span style={st("margin-left:9px; font-family:var(--f-serif); font-style:italic; font-size:19px; color:var(--acd); white-space:nowrap;")}>
          {pad(step + 1)} / {pad(totalSteps)}
        </span>
      </div>

      <h1 style={st("font-family:var(--f-display); margin:22px 0 0; font-size:clamp(32px,5vw,50px); font-weight:600; letter-spacing:-1.4px; line-height:1.05; text-wrap:balance;")}>
        {t(copy.tt)}
        {step === totalSteps - 1 && <span style={st("font-family:var(--f-serif); font-style:italic; font-weight:400; font-size:.6em; color:#b6bcc4; margin-left:13px;")}>{t("optional")}</span>}
      </h1>
      <p style={st("margin:14px 0 0; font-size:clamp(14.5px,1.6vw,16.5px); color:#7b818a; line-height:1.55; max-width:520px; text-wrap:pretty;")}>{t(copy.ss)}</p>

      {/* body re-mounts per step for the entrance */}
      <div key={step} style={st("animation:kpop .42s cubic-bezier(.2,.7,.2,1) both;")}>
        {step === 0 && <BudgetStep form={form} patch={patch} metaStock={metaStock} onNext={onNext} />}
        {step === 1 && <PurposeStep form={form} patch={patch} archKeys={archKeys} />}
        {step === 2 && <TuneStep form={form} patch={patch} />}
      </div>
    </div>
  );
}

/* ---------- step 1: budget (typed, with an inline go arrow) ---------- */
function BudgetStep({ form, patch, metaStock, onNext }: { form: Form; patch: Props["patch"]; metaStock: string; onNext: () => void }) {
  const b = form.budget;
  const setRaw = (s: string) => {
    const n = Math.min(BUDGET_MAX, +s.replace(/[^0-9]/g, "") || 0);
    patch({ budget: n });
  };
  return (
    <>
      <div style={st("margin-top:34px; display:flex; align-items:center; gap:14px; padding:14px 14px 14px 26px; border-radius:26px; background:rgba(255,255,255,.85); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:.5px solid rgba(255,255,255,.95); box-shadow:inset 0 1px 1px rgba(255,255,255,.9), 0 10px 34px rgba(15,25,35,.08), 0 0 0 1px rgba(15,25,35,.04);")}>
        <span style={st("font-family:var(--f-display); font-size:clamp(38px,7vw,64px); font-weight:300; color:#c2c6cd; line-height:1;")}>৳</span>
        <input className="kbudget" inputMode="numeric" autoFocus value={bnNum(fmt(b))}
          onChange={(e) => setRaw(e.target.value)}
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => { if (e.key === "Enter" && b >= BUDGET_MIN) onNext(); }}
          style={st("flex:1; min-width:0; border:none; outline:none; background:transparent; font-family:var(--f-display); font-size:clamp(40px,8vw,72px); font-weight:400; letter-spacing:-2px; color:#17191d; line-height:1;")} />
        <button onClick={() => b >= BUDGET_MIN && onNext()} aria-label="Continue" disabled={b < BUDGET_MIN} className="k-press k-glow"
          style={st(`flex-shrink:0; width:clamp(54px,9vw,64px); height:clamp(54px,9vw,64px); border-radius:50%; border:none; cursor:${b < BUDGET_MIN ? "not-allowed" : "pointer"}; display:flex; align-items:center; justify-content:center; transition:opacity .2s ease, transform .15s ease; opacity:${b < BUDGET_MIN ? 0.4 : 1}; background:linear-gradient(180deg,var(--acg1),var(--acg2)); box-shadow:0 8px 20px var(--acglow), inset 0 1px 0 rgba(255,255,255,.4);`)}>
          <svg width="24" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 12h14M12 6l6 6-6 6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>

      {/* quick picks fill the space and help non-typers */}
      <div style={st("display:flex; gap:9px; flex-wrap:wrap; margin-top:18px;")}>
        {QUICK.map((q) => {
          const sel = b === q;
          return (
            <button key={q} onClick={() => patch({ budget: q })} className="k-press"
              style={st(`padding:10px 17px; border-radius:99px; cursor:pointer; font-size:14px; font-weight:600; transition:all .15s ease; background:${sel ? "var(--ac)" : "rgba(255,255,255,.75)"}; color:${sel ? "#fff" : "#41464d"}; border:.5px solid ${sel ? "transparent" : "rgba(15,25,35,.1)"}; box-shadow:${sel ? "0 3px 12px var(--acglow)" : "0 1px 2px rgba(15,25,35,.04)"};`)}>
              {taka(q)}
            </button>
          );
        })}
      </div>

      <p style={st("margin:24px 2px 0; font-size:13px; color:#8a8e96; line-height:1.55;")}>
        Live prices across <span style={st("color:#17191d; font-weight:600;")}>{metaStock}</span> phones in Bangladesh. We look for the best fit, not the cheapest box.
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
      <p style={st("margin:14px 2px 0; font-size:13px; font-weight:600; color:var(--acd);")}>
        Pick all that apply{sel.length ? ` — ${sel.length} selected` : ""}.
      </p>
      <div style={st("display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:11px; margin-top:14px;")}>
        {archKeys.map((key) => {
          const on = sel.includes(key);
          return (
            <button key={key} onClick={() => toggle(key)} className="k-press"
              style={st(`position:relative; text-align:left; padding:17px 17px 16px; border-radius:20px; cursor:pointer; transition:all .18s cubic-bezier(.2,.7,.2,1); background:${on ? "var(--ac)" : "rgba(255,255,255,.8)"}; border:.5px solid ${on ? "transparent" : "rgba(15,25,35,.08)"}; box-shadow:${on ? "0 10px 26px var(--acglow), inset 0 1px 1px rgba(255,255,255,.25)" : "0 1px 2px rgba(15,25,35,.05)"}; transform:translateY(${on ? "-2px" : "0"});`)}>
              {on && (
                <span style={st("position:absolute; top:13px; right:13px; width:19px; height:19px; border-radius:50%; background:#fff; display:flex; align-items:center; justify-content:center;")}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7" stroke="var(--ac)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              )}
              <span style={st(`display:flex; align-items:center; justify-content:center; width:40px; height:40px; border-radius:13px; margin-bottom:12px; transition:all .18s ease; background:${on ? "rgba(255,255,255,.2)" : "var(--acsoft)"}; color:${on ? "#fff" : "var(--acd)"};`)}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d={ARCH_ICON[key] || ARCH_ICON.balanced} stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              <div style={st(`font-family:var(--f-bn); font-size:16px; font-weight:600; line-height:1.2; color:${on ? "#fff" : "#17191d"};`)}>{ARCH_BN[key] || key}</div>
              <div style={st(`font-size:12px; line-height:1.4; margin-top:4px; color:${on ? "rgba(255,255,255,.85)" : "#8a8e96"};`)}>{ARCH_DESC[key] || ""}</div>
            </button>
          );
        })}
      </div>
    </>
  );
}

/* ---------- step 3: fine-tune (all optional) ---------- */
function TuneStep({ form, patch }: { form: Form; patch: Props["patch"] }) {
  // framed as a "hide" switch: ON (default) keeps China-ROM gray imports out
  const hide = !form.includeCn;
  return (
    <div style={st("display:flex; flex-direction:column; gap:26px; margin-top:34px;")}>
      <div style={st("display:flex; align-items:center; justify-content:space-between; gap:14px; padding:17px 19px; border-radius:18px; background:rgba(255,255,255,.7); border:.5px solid rgba(15,25,35,.06);")}>
        <div>
          <div style={st("font-size:14.5px; color:#2c3036; font-weight:600;")}>Don't show China-ROM phones</div>
          <div style={st("font-size:12.5px; color:#9aa0a8; margin-top:1px;")}>They often lack Google services or Bangla. On by default.</div>
        </div>
        <button onClick={() => patch({ includeCn: !form.includeCn })} aria-label="Hide China-ROM phones"
          style={st(`position:relative; width:50px; height:30px; border-radius:99px; border:none; cursor:pointer; flex-shrink:0; transition:background .2s ease; background:${hide ? "var(--ac)" : "#dadde2"};`)}>
          <span style={st(`position:absolute; top:3px; left:${hide ? 23 : 3}px; width:24px; height:24px; border-radius:50%; background:#fff; box-shadow:0 1px 3px rgba(15,25,35,.3); transition:left .2s ease;`)} />
        </button>
      </div>
      <div style={st("display:grid; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); gap:18px;")}>
        <div>
          <div style={st(LABEL)}>Platform</div>
          <div style={st("margin-top:10px; display:flex; gap:5px; padding:4px; border-radius:14px; background:rgba(15,25,35,.05);")}>
            {([["any", "Any"], ["android", "Android"], ["ios", "iOS"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => patch({ platform: k })} className="k-press" style={st(seg(form.platform === k))}>{l}</button>
            ))}
          </div>
        </div>
        <div>
          <div style={st(LABEL)}>Software</div>
          <div style={st("margin-top:10px; display:flex; gap:5px; padding:4px; border-radius:14px; background:rgba(15,25,35,.05);")}>
            {([["any", "Any"], ["clean", "Clean"], ["feature", "Rich"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => patch({ osStyle: k })} className="k-press" style={st(seg(form.osStyle === k))}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div style={st(LABEL)}>Exclude brands</div>
        <div style={st("margin-top:11px; display:flex; flex-wrap:wrap; gap:8px;")}>
          {BRANDS.map((bd) => {
            const sel = form.excludeBrands.includes(bd);
            return (
              <button key={bd} onClick={() => patch({ excludeBrands: sel ? form.excludeBrands.filter((x) => x !== bd) : [...form.excludeBrands, bd] })} className="k-press"
                style={st(`padding:9px 15px; border-radius:99px; cursor:pointer; font-size:13px; font-weight:500; transition:all .15s ease; background:${sel ? "#fde8e4" : "rgba(255,255,255,.8)"}; color:${sel ? "#c4503c" : "#5c626a"}; border:.5px solid ${sel ? "rgba(196,80,60,.3)" : "rgba(15,25,35,.1)"}; text-decoration:${sel ? "line-through" : "none"};`)}>{bd}</button>
            );
          })}
        </div>
      </div>

      <div>
        <div style={st(LABEL)}>Current phone <span style={st("text-transform:none; letter-spacing:0; font-weight:500; color:#b6bcc4;")}>for upgrade comparison</span></div>
        <input className="ktrait" type="text" value={form.currentPhone} onChange={(e) => patch({ currentPhone: e.target.value })} placeholder="e.g. Redmi Note 11"
          style={st("margin-top:11px; width:100%; border:none; outline:none; padding:15px 17px; border-radius:15px; background:rgba(255,255,255,.8); box-shadow:inset 0 0 0 1px rgba(15,25,35,.08); font-size:14.5px; color:#17191d;")} />
      </div>
    </div>
  );
}
