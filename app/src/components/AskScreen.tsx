import { useState } from "react";
import { st, taka } from "../theme";
import type { Archetype } from "../api";
import type { Form } from "../App";

interface Props {
  form: Form;
  patch: (d: Partial<Form>) => void;
  archetypes: Archetype[];
  metaStock: string;
  matchCount: number | null;
  onSubmit: () => void;
}

const ARCH_BN: Record<string, string> = {
  photographer: "ছবি তোলা", gamer: "গেমিং", vlogger: "ভিডিও / ভ্লগ",
  rider: "রাইডার / ড্রাইভার", parents: "আম্মু-আব্বুর জন্য", student: "শিক্ষার্থী",
  professional: "পেশাদার কাজ", balanced: "সব দিকেই ভালো",
};
const ARCH_ORDER = ["photographer", "gamer", "vlogger", "rider", "parents", "student", "professional", "balanced"];

const EXAMPLES = ["আম্মুর জন্য ১৫ হাজারে", "গেমিং ফোন ৩০ হাজারে", "সেরা ক্যামেরা, অফিসিয়াল"];
const BRANDS = ["Samsung", "Xiaomi", "vivo", "OnePlus", "realme", "Apple"];
const BUDGET_MIN = 8000, BUDGET_MAX = 250000;

const LABEL = "margin-top:48px; font-size:12px; font-weight:700; letter-spacing:1.8px; text-transform:uppercase; color:#9a9da4;";

function seg(sel: boolean): string {
  return `flex:1; padding:10px 4px; border-radius:12px; border:none; cursor:pointer; font-size:13.5px; font-weight:600; transition:all .15s ease; background:${sel ? "#fff" : "transparent"}; color:${sel ? "var(--acd)" : "#80868f"}; box-shadow:${sel ? "0 1px 3px rgba(15,25,35,.14)" : "none"};`;
}

export function AskScreen({ form, patch, archetypes, metaStock }: Props) {
  const b = form.budget;
  const sliderPct = ((Math.min(b, BUDGET_MAX) - BUDGET_MIN) / (BUDGET_MAX - BUDGET_MIN)) * 100;

  const archKeys = (archetypes.length ? ARCH_ORDER.filter((k) => archetypes.some((a) => a.key === k)) : ARCH_ORDER);
  const nlActive = form.traitText.trim().length > 0;

  return (
    <div style={st("max-width:680px; margin:0 auto; animation:kfade .45s cubic-bezier(.2,.7,.2,1) both;")}>
      <h1 style={st("margin:clamp(20px,4vh,46px) 0 0; font-size:clamp(34px,5.2vw,54px); font-weight:600; letter-spacing:-1.5px; line-height:1.06; text-wrap:pretty;")}>
        Name your budget,<br />
        <span style={st("font-family:'Instrument Serif',serif; font-style:italic; font-weight:400; color:var(--acd); letter-spacing:-.5px;")}>we'll do the rest.</span>
      </h1>
      <p style={st("margin:16px 0 0; font-size:clamp(14.5px,1.6vw,16.5px); color:#7b818a; line-height:1.55; max-width:480px; text-wrap:pretty;")}>
        Live prices across {metaStock} phones in Bangladesh. We find the best one{" "}
        <span style={st("color:var(--acd); font-weight:600;")}>closest to your budget</span> — not the cheapest one.
      </p>

      {/* NL search */}
      <div style={st("margin-top:36px; font-size:12px; font-weight:700; letter-spacing:1.8px; text-transform:uppercase; color:#9a9da4;")}>Or just say it in Bangla</div>
      <div style={st("margin-top:12px; display:flex; align-items:center; gap:11px; padding:15px 18px; border-radius:18px; background:rgba(255,255,255,.75); backdrop-filter:blur(18px); -webkit-backdrop-filter:blur(18px); border:.5px solid rgba(255,255,255,.9); box-shadow:inset 0 1px 1px rgba(255,255,255,.9), 0 2px 8px rgba(15,25,35,.05), 0 0 0 1px rgba(15,25,35,.04);")}>
        <svg width="19" height="19" viewBox="0 0 20 20" fill="none" style={st("flex-shrink:0;")}><circle cx="9" cy="9" r="6.4" stroke="#aab0b8" strokeWidth="2" /><path d="M14 14l4 4" stroke="#aab0b8" strokeWidth="2" strokeLinecap="round" /></svg>
        <input className="ktrait" type="text" value={form.traitText} onChange={(e) => patch({ traitText: e.target.value })}
          placeholder={"“আম্মুর জন্য ১৫ হাজারে”"}
          style={st("border:none; outline:none; background:transparent; flex:1; font-family:'Anek Bangla'; font-size:15px; color:#17191d; min-width:0;")} />
      </div>
      <div style={st("display:flex; gap:8px; flex-wrap:wrap; margin-top:11px;")}>
        {EXAMPLES.map((ex) => (
          <button key={ex} onClick={() => patch({ traitText: ex })}
            style={st("font-family:'Anek Bangla'; font-size:13px; color:var(--acd); background:var(--acsoft); border:none; padding:7px 14px; border-radius:99px; cursor:pointer;")}>{ex}</button>
        ))}
      </div>

      {/* budget hero */}
      <div style={st("margin-top:46px; font-size:12px; font-weight:700; letter-spacing:1.8px; text-transform:uppercase; color:#9a9da4;")}>Your budget</div>
      <div style={st("font-size:clamp(60px,10vw,100px); font-weight:300; letter-spacing:-4px; line-height:1.05; color:#17191d; margin-top:6px;")}>{taka(b)}</div>
      <div style={st("margin-top:26px;")}>
        <input className="kb" type="range" min={BUDGET_MIN} max={BUDGET_MAX} step={1000} value={Math.min(b, BUDGET_MAX)} onChange={(e) => patch({ budget: +e.target.value })}
          style={st(`background:linear-gradient(90deg,var(--ac) ${sliderPct}%,rgba(15,25,35,.07) ${sliderPct}%);`)} />
        <div style={st("display:flex; justify-content:space-between; font-size:12.5px; color:#9aa0a8; margin-top:14px;")}>
          <span>{taka(BUDGET_MIN)}</span>
          <span>{taka(BUDGET_MAX)}</span>
        </div>
      </div>

      {/* priorities */}
      <div style={st("margin-top:48px; font-size:12px; font-weight:700; letter-spacing:1.8px; text-transform:uppercase; color:#9a9da4;")}>
        What's it for?{nlActive && <span style={st("text-transform:none; letter-spacing:0; font-weight:500; color:#b6bcc4; margin-left:8px;")}>— using your Bangla search</span>}
      </div>
      <div style={st(`display:flex; flex-wrap:wrap; gap:9px; margin-top:15px; opacity:${nlActive ? 0.45 : 1}; transition:opacity .15s ease;`)}>
        {archKeys.map((key) => {
          const sel = !nlActive && key === form.archetype;
          return (
            <button key={key} onClick={() => patch({ archetype: key, traitText: "" })}
              style={st(`padding:11px 18px; border-radius:99px; cursor:pointer; font-family:'Anek Bangla'; font-size:14.5px; font-weight:${sel ? 600 : 500}; transition:all .15s ease; background:${sel ? "var(--ac)" : "rgba(255,255,255,.72)"}; color:${sel ? "#fff" : "#3c4148"}; border:.5px solid ${sel ? "transparent" : "rgba(15,25,35,.1)"}; box-shadow:${sel ? "0 3px 12px var(--acglow)" : "0 1px 2px rgba(15,25,35,.04)"};`)}>
              {ARCH_BN[key] || key}
            </button>
          );
        })}
      </div>

      {/* channel */}
      <div style={st(LABEL)}>Which channel?</div>
      <div style={st("margin-top:15px; display:flex; gap:4px; padding:5px; border-radius:18px; background:rgba(252,252,253,.5); backdrop-filter:blur(22px) saturate(180%); -webkit-backdrop-filter:blur(22px) saturate(180%); border:.5px solid rgba(255,255,255,.85); box-shadow:inset 0 1px 1px rgba(255,255,255,.9), 0 6px 18px rgba(15,25,35,.06);")}>
        {([["any", "Any"], ["official", "Official"], ["unofficial", "Unofficial"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => patch({ channel: k })} style={st(seg(form.channel === k))}>{l}</button>
        ))}
      </div>
      <p style={st("margin:12px 2px 0; font-size:13px; color:#8a8e96; line-height:1.55;")}>
        Unofficial (gray) phones run <span style={st("color:#17191d; font-weight:600;")}>23.5% cheaper</span> on average — but the warranty comes from the shop, not the brand.
      </p>

      {/* advanced */}
      <Advanced form={form} patch={patch} seg={seg} />
    </div>
  );
}

function Advanced({ form, patch, seg }: { form: Form; patch: (d: Partial<Form>) => void; seg: (s: boolean) => string }) {
  const [open, setOpen] = useState(false);
  const cnOn = form.includeCn;
  return (
    <>
      <button onClick={() => setOpen((o) => !o)}
        style={st("margin-top:32px; width:100%; display:flex; align-items:center; justify-content:space-between; padding:16px 4px 14px; background:none; border:none; border-top:1px solid rgba(15,25,35,.08); cursor:pointer;")}>
        <span style={st("font-size:14px; font-weight:600; color:#41464d;")}>More options</span>
        <span style={st(`font-size:18px; color:#a0a6ae; transition:transform .2s ease; display:inline-block; transform:rotate(${open ? 180 : 0}deg);`)}>⌄</span>
      </button>
      {open && (
        <div style={st("display:flex; flex-direction:column; gap:24px; padding-top:6px;")}>
          <div style={st("display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:18px;")}>
            <div>
              <div style={st("font-size:13px; font-weight:500; color:#8a8e96; margin-bottom:9px;")}>Platform</div>
              <div style={st("display:flex; gap:4px; padding:4px; border-radius:14px; background:rgba(15,25,35,.05);")}>
                {([["any", "Any"], ["android", "Android"], ["ios", "iOS"]] as const).map(([k, l]) => (
                  <button key={k} onClick={() => patch({ platform: k })} style={st(seg(form.platform === k))}>{l}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={st("font-size:13px; font-weight:500; color:#8a8e96; margin-bottom:9px;")}>Software style</div>
              <div style={st("display:flex; gap:4px; padding:4px; border-radius:14px; background:rgba(15,25,35,.05);")}>
                {([["any", "Any"], ["clean", "Clean"], ["feature", "Feature-rich"]] as const).map(([k, l]) => (
                  <button key={k} onClick={() => patch({ osStyle: k })} style={st(seg(form.osStyle === k))}>{l}</button>
                ))}
              </div>
            </div>
          </div>

          <div style={st("display:flex; align-items:center; justify-content:space-between; gap:14px;")}>
            <div>
              <div style={st("font-size:14.5px; color:#2c3036; font-weight:500;")}>Show China-ROM phones</div>
              <div style={st("font-size:12.5px; color:#9aa0a8;")}>May lack Google services or Bangla</div>
            </div>
            <button onClick={() => patch({ includeCn: !cnOn })}
              style={st(`position:relative; width:48px; height:29px; border-radius:99px; border:none; cursor:pointer; flex-shrink:0; transition:background .2s ease; background:${cnOn ? "var(--ac)" : "#dadde2"};`)}>
              <span style={st(`position:absolute; top:3px; left:${cnOn ? 22 : 3}px; width:23px; height:23px; border-radius:50%; background:#fff; box-shadow:0 1px 3px rgba(15,25,35,.3); transition:left .2s ease;`)} />
            </button>
          </div>

          <div>
            <div style={st("font-size:13px; font-weight:500; color:#8a8e96; margin-bottom:9px;")}>Exclude these brands</div>
            <div style={st("display:flex; flex-wrap:wrap; gap:8px;")}>
              {BRANDS.map((bd) => {
                const sel = form.excludeBrands.includes(bd);
                return (
                  <button key={bd} onClick={() => patch({ excludeBrands: sel ? form.excludeBrands.filter((x) => x !== bd) : [...form.excludeBrands, bd] })}
                    style={st(`padding:9px 15px; border-radius:99px; cursor:pointer; font-size:13px; font-weight:500; transition:all .15s ease; background:${sel ? "#fde8e4" : "rgba(255,255,255,.8)"}; color:${sel ? "#c4503c" : "#5c626a"}; border:.5px solid ${sel ? "rgba(196,80,60,.3)" : "rgba(15,25,35,.1)"}; text-decoration:${sel ? "line-through" : "none"};`)}>{bd}</button>
                );
              })}
            </div>
          </div>

          <div>
            <div style={st("font-size:13px; font-weight:500; color:#8a8e96; margin-bottom:9px;")}>Your current phone <span style={st("color:#b6bcc4;")}>(for upgrade comparison)</span></div>
            <input className="ktrait" type="text" value={form.currentPhone} onChange={(e) => patch({ currentPhone: e.target.value })} placeholder="e.g. Redmi Note 11"
              style={st("width:100%; border:none; outline:none; padding:14px 16px; border-radius:14px; background:rgba(255,255,255,.8); box-shadow:inset 0 0 0 1px rgba(15,25,35,.08); font-size:14px; color:#17191d;")} />
          </div>
        </div>
      )}
    </>
  );
}
