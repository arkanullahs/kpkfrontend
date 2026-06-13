import type { ReactNode } from "react";
import { axisLabel, channelStyle, fitOf, headlinePhrase, isUnofficialPrice, st, taka, verdictMeta } from "../theme";
import { PhonePhoto } from "./PhonePhoto";
import type { Pick, RecommendResp, Stretch } from "../api";
import type { Form } from "../App";

interface Props {
  result: RecommendResp | null;
  loading: boolean;
  error: string | null;
  form: Form;
  onEdit: () => void;
  onPick: (id: string) => void;
  onRetry: () => void;
}

function effPrice(p: Pick, channel: Form["channel"]): number | null {
  if (channel === "official") return p.best_official_price ?? p.best_price;
  if (channel === "unofficial") return p.best_unofficial_price ?? p.best_price;
  return p.best_price;
}

const CONF_LABEL: Record<string, { t: string; c: string }> = {
  strong: { t: "top tier", c: "#0a7d57" },
  good: { t: "solid match", c: "#1c4eae" },
  backup: { t: "backup option", c: "#a8761a" },
  fallback: { t: "closest available", c: "#a8761a" },
};

export function ResultsScreen({ result, loading, error, form, onEdit, onPick, onRetry }: Props) {
  // the server is the budget authority: a budget typed in the Bangla trait
  // text ("১৫ হাজারে") overrides the slider, and meta.budget reflects it
  const b = result?.meta.budget ?? form.budget;
  const domain = b * 1.45;
  const pct = (v: number) => Math.max(0, Math.min(100, (v / domain) * 100));

  if (loading) return <Centered>Finding the closest matches…</Centered>;
  if (error) return <ErrorBox msg={error} onRetry={onRetry} />;
  if (!result) return <Centered>Set your budget, then tap “See results”.</Centered>;

  const { picks, stretch, meta } = result;
  if (!picks.length) {
    return <ErrorBox msg="No phones matched — try widening the budget or channel." onRetry={onEdit} retryLabel="Edit search" />;
  }

  // hide the form's channel chip when the trait text set its own channel —
  // the server-side mapping is what actually ran
  const channelFromTraits = (meta.mapped_from_traits || "").includes("channel=");
  const channelLabel = channelFromTraits ? "" : form.channel === "any" ? "any channel" : form.channel === "official" ? "official only" : "unofficial only";
  const querySummary = [taka(b), meta.label || form.archetype, channelLabel].filter(Boolean) as string[];
  if (meta.mapped_from_traits) querySummary.push(`understood: ${meta.mapped_from_traits}`);
  const reasoning = (result.top_reasoning || []).join(" ");

  const first = picks[0];
  const firstPrice = effPrice(first, form.channel);
  const rest = picks.slice(1);

  return (
    <div style={st("max-width:860px; margin:0 auto; animation:kfade .45s cubic-bezier(.2,.7,.2,1) both;")}>
      <div style={st("display:flex; align-items:flex-end; justify-content:space-between; gap:16px; flex-wrap:wrap; margin-top:clamp(12px,3vh,34px);")}>
        <div>
          <h1 style={st("margin:0; font-size:clamp(30px,4.4vw,44px); font-weight:600; letter-spacing:-1.2px; line-height:1.1;")}>
            {picks.length} <span style={st("font-family:'Instrument Serif',serif; font-style:italic; font-weight:400; color:var(--acd);")}>top picks</span>
          </h1>
          <div style={st("display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:13px;")}>
            {querySummary.map((q, i) => (
              <span key={i} style={st("font-size:12.5px; font-weight:600; color:#565b63; background:rgba(255,255,255,.75); border:.5px solid rgba(15,25,35,.07); padding:6px 13px; border-radius:99px;")}>{q}</span>
            ))}
            <button onClick={onEdit} style={st("font-size:12.5px; font-weight:700; color:var(--acd); background:var(--acsoft); border:none; padding:6px 14px; border-radius:99px; cursor:pointer;")}>Edit</button>
          </div>
        </div>
      </div>

      {meta.relaxed && (
        <div style={st("margin-top:16px; padding:11px 15px; border-radius:13px; background:rgba(192,137,42,.1); font-size:13px; color:#7a6a40; line-height:1.5;")}>
          No exact matches in your band — showing the closest phones around your budget instead.
        </div>
      )}

      {/* reasoning */}
      {reasoning && (
        <div style={st("display:flex; gap:11px; padding:15px 17px; border-radius:17px; background:var(--acsoft); margin-top:22px;")}>
          <svg width="17" height="17" viewBox="0 0 18 18" fill="none" style={st("flex-shrink:0; margin-top:2px;")}><path d="M9 1.5l2 4.5 4.9.4-3.7 3.2 1.1 4.8L9 11.8 4.7 14.4l1.1-4.8L2.1 6.4 7 6 9 1.5z" fill="var(--ac)" /></svg>
          <p style={st("margin:0; font-size:13.5px; color:#41464d; line-height:1.55; text-wrap:pretty;")}>{reasoning}</p>
        </div>
      )}

      {/* HERO pick */}
      <HeroPick p={first} price={firstPrice} budget={b} channel={form.channel} pct={pct} onClick={() => onPick(first.id)} />

      {/* rest */}
      <div style={st("display:grid; grid-template-columns:repeat(auto-fit,minmax(330px,1fr)); gap:11px; margin-top:14px;")}>
        {rest.map((r, i) => {
          const price = effPrice(r, form.channel);
          const un = isUnofficialPrice(r, price, form.channel);
          const { fit, fitColor } = fitOf(price ?? b, b);
          return (
            <button key={r.id} onClick={() => onPick(r.id)}
              style={st("text-align:left; display:flex; align-items:center; gap:14px; padding:15px 16px; border-radius:19px; border:none; cursor:pointer; background:rgba(255,255,255,.88); box-shadow:0 1px 2px rgba(15,25,35,.05), inset 0 0 0 1px rgba(15,25,35,.05);")}>
              <span style={st("width:27px; height:27px; border-radius:50%; background:rgba(15,25,35,.055); color:#80868f; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0;")}>{i + 2}</span>
              <PhonePhoto src={r.image} w="40px" h="53px" radius={10} />
              <div style={st("flex:1; min-width:0;")}>
                <div style={st("font-size:15px; font-weight:600; color:#17191d; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;")}>{r.brand} {r.model}</div>
                <div style={st("font-size:12.5px; color:#80868f; margin-top:1px;")}>{headlinePhrase(r.headline_axis)}{r.headline_axis && r.headline_value != null ? ` · ${axisLabel(r.headline_axis)} ${r.headline_value}` : ""}</div>
                <div style={st("display:flex; align-items:center; gap:8px; margin-top:5px;")}>
                  <span style={st("font-size:14.5px; font-weight:600; color:#17191d;")}>{taka(price)}</span>
                  <span style={st("font-size:10px; font-weight:700; padding:2px 8px; border-radius:99px; " + channelStyle(un))}>{un ? "UNOFFICIAL" : "OFFICIAL"}</span>
                </div>
              </div>
              <span style={st("display:flex; flex-direction:column; align-items:flex-end; gap:4px; flex-shrink:0; max-width:96px;")}>
                <span style={st(`font-size:12px; font-weight:700; color:${fitColor}; text-align:right; line-height:1.35;`)}>{fit}</span>
                {r.confidence && CONF_LABEL[r.confidence] && (
                  <span style={st(`font-size:10px; font-weight:700; letter-spacing:.4px; text-transform:uppercase; color:${CONF_LABEL[r.confidence].c}; opacity:.85;`)}>{CONF_LABEL[r.confidence].t}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* stretch */}
      {stretch && <StretchCard s={stretch} budget={b} onClick={() => onPick(`${stretch.brand}|${stretch.key}`)} />}

      <p style={st("margin:22px 2px 0; font-size:11.5px; color:#9a9da4; line-height:1.5;")}>{meta.disclaimer}</p>
    </div>
  );
}

function HeroPick({ p, price, budget, channel, pct, onClick }: {
  p: Pick; price: number | null; budget: number; channel: Form["channel"];
  pct: (v: number) => number; onClick: () => void;
}) {
  const vm = verdictMeta(p.verdict?.recommendation);
  const un = isUnofficialPrice(p, price, channel);
  const { fit, fitColor } = fitOf(price ?? budget, budget);
  const cav = p.caveats && p.caveats[0];
  // honest savings: only quote a % when both channels sell the SAME variant;
  // otherwise a 12/256 gray vs 16/512 official comparison inflates the gap
  const sv = p.same_variant_saving;
  const crossVariant = p.best_official_variant && p.best_unofficial_variant
    && p.best_official_variant !== p.best_unofficial_variant;
  const savingsNote = sv
    ? `${taka(sv.unofficial)} unofficial (${sv.variant}) — ${sv.pct}% less than official`
    : p.best_official_price != null && p.best_unofficial_price != null
      ? `${taka(p.best_unofficial_price)} unofficial${crossVariant ? " (different variant)" : ""}`
      : null;

  return (
    <div style={st("background:rgba(255,255,255,.92); border-radius:26px; padding:clamp(20px,3vw,30px); box-shadow:0 1px 2px rgba(15,25,35,.05), 0 16px 40px rgba(15,25,35,.09); margin-top:18px; display:grid; grid-template-columns:repeat(auto-fit,minmax(290px,1fr)); gap:clamp(18px,3vw,30px);")}>
      <div>
        <div style={st("display:flex; gap:15px;")}>
          <PhonePhoto src={p.image} w="72px" h="96px" />
          <div style={st("flex:1; min-width:0;")}>
            <div style={st("display:flex; align-items:flex-start; justify-content:space-between; gap:8px;")}>
              <div style={st("min-width:0;")}>
                <div style={st("font-size:13px; color:#8a8e96; font-weight:500;")}>{p.brand}</div>
                <div style={st("font-size:clamp(21px,2.4vw,26px); font-weight:700; color:#17191d; line-height:1.12; letter-spacing:-.4px;")}>{p.model}</div>
              </div>
              <span style={st(`font-size:11.5px; font-weight:700; padding:5px 11px; border-radius:99px; white-space:nowrap; flex-shrink:0; color:${vm.c}; background:${vm.bg};`)}>{vm.label}</span>
            </div>
            <div style={st("margin-top:7px; font-size:13.5px; color:#5c626a;")}>{headlinePhrase(p.headline_axis)}{p.headline_axis && p.headline_value != null && <> · {axisLabel(p.headline_axis)} <span style={st("color:var(--acd); font-weight:700;")}>{p.headline_value}</span></>}</div>
          </div>
        </div>

        <div style={st("display:flex; align-items:flex-end; gap:11px; margin-top:20px;")}>
          <span style={st("font-size:clamp(32px,3.6vw,42px); font-weight:300; letter-spacing:-2px; color:#17191d; line-height:1;")}>{taka(price)}</span>
          <span style={st("font-size:11px; font-weight:700; padding:4px 10px; border-radius:99px; margin-bottom:4px; " + channelStyle(un))}>{un ? "UNOFFICIAL" : "OFFICIAL"}</span>
        </div>
        {savingsNote && <div style={st("margin-top:8px; font-size:12.5px; color:#80868f;")}>{savingsNote} · at {p.in_stock_shops ?? 0} shops</div>}

        <div style={st("display:flex; flex-wrap:wrap; gap:7px; margin-top:16px;")}>
          {(p.strengths || []).map((s, i) => (
            <span key={i} style={st("font-size:12.5px; color:#41464d; background:rgba(15,25,35,.055); padding:7px 13px; border-radius:99px;")}>{axisLabel(s.axis)} {s.score}</span>
          ))}
        </div>
      </div>

      <div style={st("display:flex; flex-direction:column; justify-content:flex-end;")}>
        <div style={st("padding:15px 16px; border-radius:15px; background:rgba(15,25,35,.035);")}>
          <div style={st("display:flex; justify-content:space-between; font-size:12.5px; margin-bottom:10px;")}>
            <span style={st("color:#80868f;")}>Budget fit</span>
            <span style={st(`font-weight:600; color:${fitColor};`)}>{fit}</span>
          </div>
          <div style={st("position:relative; height:8px;")}>
            <div style={st("position:absolute; inset:0; border-radius:99px; background:rgba(15,25,35,.08);")} />
            <div style={st(`position:absolute; top:-3px; height:14px; width:2px; border-radius:99px; left:${pct(budget)}%; transform:translateX(-50%); background:#b6bcc4;`)} />
            <div style={st(`position:absolute; top:-3px; width:14px; height:14px; border-radius:50%; left:${pct(price ?? budget)}%; transform:translateX(-50%); background:var(--ac); box-shadow:0 1px 4px var(--acglow), 0 0 0 2px #fff;`)} />
          </div>
        </div>

        {cav && (
          <div style={st("display:flex; gap:9px; margin-top:13px; padding:11px 13px; border-radius:13px; background:rgba(192,137,42,.09);")}>
            <span style={st("width:6px; height:6px; border-radius:50%; background:#a8761a; margin-top:7px; flex-shrink:0;")} />
            <span style={st("font-size:12.5px; color:#7a6a40; line-height:1.5;")}>{cav.text}</span>
          </div>
        )}

        <button onClick={onClick} style={st("width:100%; margin-top:15px; padding:15px; border-radius:15px; border:none; cursor:pointer; background:linear-gradient(180deg,var(--acg1),var(--acg2)); box-shadow:0 4px 14px var(--acglow), inset 0 1px 0 rgba(255,255,255,.3); font-size:14.5px; font-weight:600; color:#fff;")}>See full breakdown</button>
      </div>
    </div>
  );
}

function StretchCard({ s, budget, onClick }: { s: Stretch; budget: number; onClick: () => void }) {
  const { fit } = fitOf(s.best_price, budget);
  return (
    <button onClick={onClick} style={st("width:100%; text-align:left; display:flex; align-items:center; gap:14px; padding:16px 18px; margin-top:12px; border-radius:19px; border:1.5px dashed rgba(15,25,35,.16); background:rgba(255,255,255,.45); cursor:pointer;")}>
      <div style={st("flex:1; min-width:0;")}>
        <div style={st("font-size:11px; font-weight:700; color:#8a8e96; letter-spacing:1.2px; text-transform:uppercase;")}>If you stretch ↗</div>
        <div style={st("font-size:15.5px; font-weight:600; color:#17191d; margin-top:3px;")}>{s.brand} {s.model}</div>
        <div style={st("font-size:13px; color:#80868f; margin-top:2px;")}>{taka(s.best_price)} · {s.reason || fit}</div>
      </div>
      <svg width="9" height="15" viewBox="0 0 9 15" fill="none" style={st("flex-shrink:0;")}><path d="M1.5 1.5l6 6-6 6" stroke="#b6bcc4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
  );
}

/* ---------- small shared bits ---------- */
function Centered({ children }: { children: ReactNode }) {
  return <div style={st("max-width:680px; margin:0 auto; padding:80px 0; text-align:center; color:#80868f; font-size:15px;")}>{children}</div>;
}
function ErrorBox({ msg, onRetry, retryLabel }: { msg: string; onRetry: () => void; retryLabel?: string }) {
  return (
    <div style={st("max-width:520px; margin:0 auto; padding:70px 0; text-align:center;")}>
      <div style={st("font-size:15px; color:#c4503c; line-height:1.5;")}>{msg}</div>
      <button onClick={onRetry} style={st("margin-top:18px; padding:11px 22px; border-radius:99px; border:none; cursor:pointer; background:var(--ac); color:#fff; font-size:14px; font-weight:600;")}>{retryLabel || "Try again"}</button>
    </div>
  );
}
