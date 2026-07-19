import { type ReactNode, useState } from "react";
import { axisLabel, classifyCaveats, fitOf, headlinePhrase, shownRange, st, taka, takaRange, topPickBadge } from "../theme";
import { t } from "../i18n";
import { api } from "../api";
import { PhonePhoto } from "./PhonePhoto";
import { JustSoYouKnow } from "./Compare";
import { RagProgress } from "./RagProgress";
import type { Channels, DataCaution, Pick, RecommendResp, Stretch } from "../api";
import type { Form } from "../App";

interface Props {
  result: RecommendResp | null;
  loading: boolean;
  error: string | null;
  form: Form;
  matchCount: number | null;
  ready: boolean;
  onLoaderDone: () => void;
  onEdit: () => void;
  onPick: (id: string) => void;
  onRetry: () => void;
  onHowItWorks: () => void;
  /** Client-generated UUID for per-request provider tracking */
  requestId?: string;
}

// RAG ranker confidence (high/medium/low); legacy strong/good/backup kept for
// any cached older responses
const CONF_COLOR: Record<string, string> = {
  high: "#0a7d57", medium: "#1c4eae", low: "#a8761a",
  strong: "#0a7d57", good: "#1c4eae", backup: "#a8761a", fallback: "#a8761a",
};
const CONF_KEY: Record<string, string> = {
  high: "conf_strong", medium: "conf_good", low: "conf_backup",
  strong: "conf_strong", good: "conf_good", backup: "conf_backup", fallback: "conf_backup",
};

/** Thin/stale listing-data caution (feedback #5). Renders nothing for "low"
    (single fresh listing on a recent model — half the catalog, would be noise). */
export function DataCautionChip({ dc, small }: { dc?: DataCaution | null; small?: boolean }) {
  if (!dc || dc.level === "low") return null;
  const key = dc.level === "high" ? "data_caution_stale" : "data_caution_few";
  return (
    <span style={st(`display:inline-flex; align-items:center; gap:6px; font-size:${small ? 11 : 12.5}px; font-weight:600; color:#a8761a; background:rgba(192,137,42,.12); padding:${small ? "3px 9px" : "5px 11px"}; border-radius:99px;`)}>
      <svg width={small ? 11 : 13} height={small ? 11 : 13} viewBox="0 0 24 24" fill="none" style={st("flex-shrink:0;")}><path d="M12 8v5M12 16v.5M12 3l9 16H3L12 3z" stroke="#a8761a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      {t(key)}
    </span>
  );
}

/** A3 price authority, SP1 style: shops are anonymous infrastructure, so the
    only provenance ever shown is the amber "unconfirmed" flag when no
    kept-current source lists the phone in stock. Confirmed prices render
    nothing — the range speaks for itself. */
export function PriceSource({ primary, compact }: { primary?: boolean; compact?: boolean }) {
  if (primary !== false) return null;
  const s = compact ? 11 : 12;
  return (
    <span title={t("price_unconfirmed_note")} style={st(`display:inline-flex; align-items:center; gap:5px; font-size:${s}px; font-weight:700; color:#a8761a; background:rgba(192,137,42,.12); padding:3px 9px; border-radius:99px;`)}>
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={st("flex-shrink:0;")}>
        <path d="M12 8v5M12 16v.5M12 3l9 16H3L12 3z" stroke="#a8761a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {t("price_unconfirmed")}
    </span>
  );
}

/** SP1 channel chips: the badge follows the SHOWN price's OWN channel
    (best_price_official) — never "some shop lists it official somewhere".
    When the shown price is a gray import but an official channel exists at a
    different number, that gets its own honest amber chip. */
export function ChannelChips({ p, small }: {
  p: { best_price_official?: boolean; best_official_price: number | null;
       channels?: Channels | null };
  small?: boolean;
}) {
  const base = `display:inline-flex; align-items:center; font-size:${small ? 10.5 : 11.5}px; font-weight:700; padding:${small ? "3px 9px" : "4px 11px"}; border-radius:99px;`;
  // the other channel's chip shows its RANGE from the same channel summary
  // the listings render — one source, no contradictions (owner 2026-07-19)
  const off = p.channels?.official;
  return (
    <>
      {p.best_price_official
        ? <span style={st(`${base} color:#0a7d57; background:rgba(10,157,106,.1);`)}>{t("official_bd")}</span>
        : <span style={st(`${base} font-weight:600; color:#565b63; background:rgba(15,25,35,.055);`)}>{t("unofficial_import")}</span>}
      {!p.best_price_official && (off || p.best_official_price != null) && (
        <span style={st(`${base} color:#a8761a; background:rgba(192,137,42,.12);`)}>
          {off ? <>{t("official")} {takaRange(off.lo, off.hi)}</>
               : <>{t("official_from")} {taka(p.best_official_price)}</>}
        </span>
      )}
    </>
  );
}

export function ResultsScreen({ result, loading, error, form, matchCount, ready, onLoaderDone, onEdit, onPick, onRetry, onHowItWorks, requestId }: Props) {
  // the server is the budget authority: a budget typed in the Bangla trait
  // text ("১৫ হাজারে") overrides the slider, and meta.budget reflects it
  const b = result?.meta.budget ?? form.budget;
  const domain = b * 1.45;
  const pct = (v: number) => Math.max(0, Math.min(100, (v / domain) * 100));

  if (loading) return <RagProgress budget={b} candidates={matchCount} ready={ready} onDone={onLoaderDone} requestId={requestId} />;
  if (error) return <ErrorBox msg={error} onRetry={onRetry} />;
  if (!result) return <Centered>Set your budget, then tap “See results”.</Centered>;

  const { picks, stretch, meta } = result;
  if (!picks.length) {
    return <ErrorBox msg="No phones matched. Try widening the budget." onRetry={onEdit} retryLabel="Edit search" />;
  }

  const querySummary = [taka(b), meta.label || form.archetypes.join(", ")].filter(Boolean) as string[];
  if (meta.mapped_from_traits) querySummary.push(`${t("understood")}: ${meta.mapped_from_traits}`);
  const reasoning = (result.top_reasoning || []).join(" ");

  const first = picks[0];
  const rest = picks.slice(1);

  return (
    <div style={st("max-width:860px; margin:0 auto; animation:kfade .45s cubic-bezier(.2,.7,.2,1) both;")}>
      <div style={st("display:flex; align-items:flex-end; justify-content:space-between; gap:16px; flex-wrap:wrap; margin-top:clamp(12px,3vh,34px);")}>
        <div>
          <h1 style={st("font-family:var(--f-display); margin:0; font-size:clamp(30px,4.4vw,44px); font-weight:600; letter-spacing:-1.2px; line-height:1.1;")}>
            {picks.length} <span style={st("font-family:var(--f-serif); font-style:italic; font-weight:400; color:var(--acd);")}>{t("top_picks")}</span>
          </h1>
          <div style={st("display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:13px;")}>
            {querySummary.map((q, i) => (
              <span key={i} style={st("font-size:13.5px; font-weight:600; color:#565b63; background:rgba(255,255,255,.75); border:.5px solid rgba(15,25,35,.07); padding:6px 13px; border-radius:99px;")}>{q}</span>
            ))}
            <button onClick={onEdit} className="k-press" style={st("font-size:13.5px; font-weight:700; color:var(--acd); background:var(--acsoft); border:none; padding:6px 14px; border-radius:99px; cursor:pointer;")}>{t("edit")}</button>
          </div>
        </div>
      </div>

      {/* teaser linking to the full "how it works" page */}
      <button onClick={onHowItWorks} className="k-press k-lift"
        style={st("width:100%; text-align:left; display:flex; gap:13px; align-items:center; margin-top:18px; padding:16px 18px; border-radius:18px; border:none; cursor:pointer; background:linear-gradient(110deg, var(--acsoft), rgba(255,255,255,.55)); box-shadow:inset 0 0 0 1px var(--acsoft2); animation:kpop .35s cubic-bezier(.2,.7,.2,1) both;")}>
        <span style={st("display:flex; align-items:center; justify-content:center; width:38px; height:38px; border-radius:12px; background:var(--ac); flex-shrink:0; box-shadow:0 4px 12px var(--acglow);")}>
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none"><path d="M9.5 18h5M10.5 21h3M12 3a6 6 0 00-3.8 10.6c.5.5.8 1.1.8 1.8V16h6v-.6c0-.7.3-1.3.8-1.8A6 6 0 0012 3z" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
        <div style={st("flex:1; min-width:0;")}>
          <div style={st("font-weight:700; font-size:15.5px; color:var(--acd);")}>{t("results_how_t")}</div>
          <div style={st("margin-top:2px; font-size:13.5px; font-weight:600; color:#5c626a;")}>{t("read_how")} →</div>
        </div>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={st("flex-shrink:0; color:var(--acd);")}><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>

      {meta.ranking === "unavailable" && (
        <div style={st("display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin-top:16px; padding:13px 16px; border-radius:14px; background:rgba(192,137,42,.12);")}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={st("flex-shrink:0;")}><path d="M12 8v5M12 16v.5M12 3l9 16H3L12 3z" stroke="#a8761a" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span style={st("flex:1; min-width:180px; font-size:14px; color:#7a6a40; line-height:1.5;")}>The AI ranker was busy, so these are the closest matches by fit — <b>not fully ranked yet</b>. They may not use your full budget. Tap retry for the real ranking.</span>
          <button onClick={onRetry} className="k-press" style={st("font-size:12.5px; font-weight:700; color:#fff; background:#a8761a; border:none; padding:7px 16px; border-radius:99px; cursor:pointer;")}>Retry ranking</button>
        </div>
      )}
      {meta.relaxed && (
        <div style={st("margin-top:16px; padding:11px 15px; border-radius:13px; background:rgba(192,137,42,.1); font-size:14px; color:#7a6a40; line-height:1.5;")}>
          No exact matches in your band, so here are the closest phones around your budget.
        </div>
      )}
      {picks.length < 3 && !meta.relaxed && (
        <div style={st("margin-top:16px; padding:11px 15px; border-radius:13px; background:rgba(192,137,42,.1); font-size:14px; color:#7a6a40; line-height:1.5;")}>
          Only {picks.length === 1 ? "one phone" : "two phones"} genuinely fit this search. Widening the budget or relaxing a filter would show more.
        </div>
      )}

      {/* reasoning */}
      {reasoning && (
        <div style={st("display:flex; gap:11px; padding:15px 17px; border-radius:17px; background:var(--acsoft); margin-top:22px;")}>
          <svg width="17" height="17" viewBox="0 0 18 18" fill="none" style={st("flex-shrink:0; margin-top:2px;")}><path d="M9 1.5l2 4.5 4.9.4-3.7 3.2 1.1 4.8L9 11.8 4.7 14.4l1.1-4.8L2.1 6.4 7 6 9 1.5z" fill="var(--ac)" /></svg>
          <p style={st("margin:0; font-size:15px; color:#363b42; line-height:1.6; text-wrap:pretty;")}>{reasoning}</p>
        </div>
      )}

      {/* HERO pick */}
      <HeroPick p={first} budget={b} pct={pct} onClick={() => onPick(first.id)} />

      {/* rest */}
      <div className="k-stagger" style={st("display:grid; grid-template-columns:repeat(auto-fit,minmax(330px,1fr)); gap:11px; margin-top:14px;")}>
        {rest.map((r, i) => {
          // SP1: the range's low end anchors budget fit + the marker dot;
          // range = shown channel's in-stock spread (same as its listings)
          const { lo, hi } = shownRange(r);
          const { fit, fitColor } = fitOf(lo ?? b, b);
          return (
            <button key={r.id} onClick={() => onPick(r.id)} className="k-press k-lift"
              style={st("text-align:left; display:flex; align-items:center; gap:14px; padding:15px 16px; border-radius:19px; border:none; cursor:pointer; background:rgba(255,255,255,.88); box-shadow:0 1px 2px rgba(15,25,35,.05), inset 0 0 0 1px rgba(15,25,35,.05);")}>
              <span style={st("width:27px; height:27px; border-radius:50%; background:rgba(15,25,35,.055); color:#80868f; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0;")}>{i + 2}</span>
              <PhonePhoto src={r.image} pid={r.id} w="52px" h="68px" radius={12} />
              <div style={st("flex:1; min-width:0;")}>
                <div style={st("display:flex; align-items:center; gap:7px;")}>
                  <span style={st("font-size:16px; font-weight:600; color:#17191d; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;")}>{r.brand} {r.model}</span>
                </div>
                <div style={st("font-size:13.5px; color:#80868f; margin-top:2px;")}>{headlinePhrase(r.headline_axis)}{r.headline_axis && r.headline_value != null ? ` · ${axisLabel(r.headline_axis)} ${r.headline_value}` : ""}</div>
                <div style={st("display:flex; align-items:center; gap:8px; margin-top:5px; flex-wrap:wrap;")}>
                  <span style={st("font-size:15.5px; font-weight:600; color:#17191d;")}>{takaRange(lo, hi)}</span>
                  <ChannelChips p={r} small />
                  {lo != null && <PriceSource primary={r.best_price_primary} compact />}
                  <DataCautionChip dc={r.data_caution} small />
                </div>
                {/* mini budget-fit bar */}
                <div style={st("position:relative; height:4px; margin-top:8px;")}>
                  <div style={st("position:absolute; inset:0; border-radius:99px; background:rgba(15,25,35,.07);")} />
                  <div style={st(`position:absolute; top:-2px; height:8px; width:1.5px; border-radius:99px; left:${pct(b)}%; transform:translateX(-50%); background:#c2c6cd;`)} />
                  <div style={st(`position:absolute; top:-2.5px; width:9px; height:9px; border-radius:50%; left:${pct(lo ?? b)}%; transform:translateX(-50%); background:var(--ac); box-shadow:0 0 0 2px #fff;`)} />
                </div>
              </div>
              <span style={st("display:flex; flex-direction:column; align-items:flex-end; gap:4px; flex-shrink:0; max-width:96px;")}>
                <span style={st(`font-size:13px; font-weight:700; color:${fitColor}; text-align:right; line-height:1.35;`)}>{fit}</span>
                {r.confidence && CONF_KEY[r.confidence] && (
                  <span style={st(`font-size:11px; font-weight:700; letter-spacing:.4px; text-transform:uppercase; color:${CONF_COLOR[r.confidence]}; opacity:.85;`)}>{t(CONF_KEY[r.confidence])}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* stretch — promoted: spending a little more is often the smart move */}
      {stretch && <StretchCard s={stretch} budget={b} onClick={() => onPick(`${stretch.brand}|${stretch.key}`)} />}

      <p style={st("margin:22px 2px 0; font-size:12.5px; color:#9a9da4; line-height:1.5;")}>{meta.disclaimer}</p>

      <FeedbackCard picks={picks} budget={b} archetype={meta.archetype || meta.label || ""} />
    </div>
  );
}

function HeroPick({ p, budget, pct, onClick }: {
  p: Pick; budget: number;
  pct: (v: number) => number; onClick: () => void;
}) {
  const badge = topPickBadge(p.confidence);
  // SP1: price is a range; its low end anchors budget fit + the marker dot;
  // range = shown channel's in-stock spread (same numbers as its listings)
  const { lo, hi } = shownRange(p);
  const { fit, fitColor } = fitOf(lo ?? budget, budget);
  const { major, notes } = classifyCaveats(p.caveats);
  const note = notes[0];

  return (
    <div style={st("position:relative; background:linear-gradient(165deg, rgba(255,255,255,.96), rgba(255,255,255,.9)); border-radius:26px; padding:clamp(20px,3vw,30px); box-shadow:0 1px 2px rgba(15,25,35,.05), 0 18px 44px rgba(15,25,35,.1), inset 0 0 0 1px var(--acsoft2); margin-top:18px; display:grid; grid-template-columns:repeat(auto-fit,minmax(290px,1fr)); gap:clamp(18px,3vw,30px); overflow:hidden;")}>
      <div style={st("position:absolute; top:-90px; right:-70px; width:240px; height:240px; border-radius:50%; background:radial-gradient(circle, var(--acsoft), transparent 70%); pointer-events:none;")} />
      {/* LEFT: identity, price, official pitch, strengths, owner note */}
      <div style={st("min-width:0;")}>
        <div style={st("display:flex; gap:16px;")}>
          <PhonePhoto src={p.image} pid={p.id} w="clamp(88px,11vw,104px)" h="clamp(116px,14vw,136px)" />
          <div style={st("flex:1; min-width:0;")}>
            <div style={st("display:flex; align-items:flex-start; justify-content:space-between; gap:8px;")}>
              <div style={st("min-width:0;")}>
                <div style={st("font-size:13px; color:#8a8e96; font-weight:500;")}>{p.brand}</div>
                <div style={st("font-size:clamp(21px,2.4vw,26px); font-weight:700; color:#17191d; line-height:1.12; letter-spacing:-.4px;")}>{p.model}</div>
              </div>
              <span style={st(`font-size:11.5px; font-weight:700; padding:5px 11px; border-radius:99px; white-space:nowrap; flex-shrink:0; color:${badge.c}; background:${badge.bg};`)}>{badge.label}</span>
            </div>
            <div style={st("margin-top:7px; font-size:14.5px; color:#5c626a;")}>{headlinePhrase(p.headline_axis)}{p.headline_axis && p.headline_value != null && <> · {axisLabel(p.headline_axis)} <span style={st("color:var(--acd); font-weight:700;")}>{p.headline_value}</span></>}</div>
            {/* price lives beside the photo — the old full-width row left this
                whole block empty under the name (owner: dead space) */}
            <div style={st("display:flex; align-items:flex-end; gap:9px; margin-top:12px; flex-wrap:wrap;")}>
              <span style={st("font-size:clamp(23px,2.6vw,30px); font-weight:400; letter-spacing:-1px; color:#17191d; line-height:1;")}>{takaRange(lo, hi)}</span>
              <span style={st("font-size:13px; color:#80868f; margin-bottom:2px;")}>at {p.in_stock_shops ?? 0} shops</span>
            </div>
          </div>
        </div>

        <div style={st("display:flex; align-items:center; gap:7px; margin-top:12px; flex-wrap:wrap;")}>
          <ChannelChips p={p} />
          <PriceSource primary={p.best_price_primary} />
          {p.data_caution && p.data_caution.level !== "low" && <DataCautionChip dc={p.data_caution} small />}
          {(p.strengths || []).map((s, i) => (
            <span key={i} style={st("font-size:12.5px; color:#41464d; background:rgba(15,25,35,.055); padding:5px 11px; border-radius:99px;")}>{axisLabel(s.axis)} {s.score}</span>
          ))}
        </div>

        {note && (
          <div style={st("display:flex; gap:9px; margin-top:10px; padding:11px 13px; border-radius:13px; background:rgba(192,137,42,.09);")}>
            <span style={st("width:6px; height:6px; border-radius:50%; background:#a8761a; margin-top:7px; flex-shrink:0;")} />
            <span style={st("font-size:13.5px; color:#7a6a40; line-height:1.5;")}>{note.text}</span>
          </div>
        )}
      </div>

      {/* RIGHT: budget fit, must-know defect, our take, CTA pinned bottom */}
      <div style={st("display:flex; flex-direction:column; gap:13px; min-width:0;")}>
        <div style={st("padding:15px 16px; border-radius:15px; background:rgba(15,25,35,.035);")}>
          <div style={st("display:flex; justify-content:space-between; font-size:13.5px; margin-bottom:10px;")}>
            <span style={st("color:#80868f;")}>{t("budget_fit")}</span>
            <span style={st(`font-weight:600; color:${fitColor};`)}>{fit}</span>
          </div>
          <div style={st("position:relative; height:8px;")}>
            <div style={st("position:absolute; inset:0; border-radius:99px; background:rgba(15,25,35,.08);")} />
            <div style={st(`position:absolute; top:-3px; height:14px; width:2px; border-radius:99px; left:${pct(budget)}%; transform:translateX(-50%); background:#b6bcc4;`)} />
            <div style={st(`position:absolute; top:-3px; width:14px; height:14px; border-radius:50%; left:${pct(lo ?? budget)}%; transform:translateX(-50%); background:var(--ac); box-shadow:0 1px 4px var(--acglow), 0 0 0 2px #fff;`)} />
          </div>
        </div>

        {major[0] && <JustSoYouKnow text={major[0].text} />}

        {p.smart_verdict && (
          <p style={st("margin:2px 0 0; font-size:15px; color:#363b42; line-height:1.6; text-wrap:pretty;")}>{p.smart_verdict}</p>
        )}

        <button onClick={onClick} className="k-press k-glow" style={st("width:100%; margin-top:auto; padding:16px; border-radius:15px; border:none; cursor:pointer; background:linear-gradient(180deg,var(--acg1),var(--acg2)); box-shadow:0 4px 14px var(--acglow), inset 0 1px 0 rgba(255,255,255,.3); font-size:15.5px; font-weight:600; color:#fff;")}>{t("see_breakdown")}</button>
      </div>
    </div>
  );
}


function StretchCard({ s, budget, onClick }: { s: Stretch; budget: number; onClick: () => void }) {
  const over = Math.max(0, s.best_price - budget);
  return (
    <button onClick={onClick} className="k-press k-lift" style={st("width:100%; text-align:left; display:flex; align-items:center; gap:15px; padding:18px 20px; margin-top:14px; border-radius:20px; border:none; cursor:pointer; background:linear-gradient(110deg, var(--acsoft), rgba(255,255,255,.7)); box-shadow:inset 0 0 0 1px var(--acsoft2), 0 6px 20px rgba(15,25,35,.06);")}>
      <span style={st("display:flex; align-items:center; justify-content:center; width:42px; height:42px; border-radius:13px; background:var(--ac); flex-shrink:0; box-shadow:0 4px 12px var(--acglow);")}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M5 19L19 5M9 5h10v10" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
      <div style={st("flex:1; min-width:0;")}>
        <div style={st("font-size:11px; font-weight:700; color:var(--acd); letter-spacing:1.2px; text-transform:uppercase;")}>{t("worth_stretch")}</div>
        <div style={st("font-size:17px; font-weight:700; color:#17191d; margin-top:3px;")}>{s.brand} {s.model}</div>
        <div style={st("font-size:14px; color:#5c626a; margin-top:3px; line-height:1.5;")}>{s.reason || `A clear step up for ${taka(over)} more.`}</div>
      </div>
      <div style={st("text-align:right; flex-shrink:0;")}>
        <div style={st("font-size:17px; font-weight:700; color:#17191d;")}>{taka(s.best_price)}</div>
        <div style={st("font-size:11.5px; font-weight:700; color:var(--acd); margin-top:2px;")}>+{taka(over)}</div>
      </div>
    </button>
  );
}

/* ---------- feedback ---------- */
function FeedbackCard({ picks, budget, archetype }: { picks: Pick[]; budget: number; archetype: string }) {
  const [phase, setPhase] = useState<"idle" | "comment" | "done">("idle");
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const rate = (r: "up" | "down") => { setRating(r); setPhase("comment"); };

  const submit = async () => {
    setBusy(true);
    try {
      await api.feedback({
        rating: rating!,
        comment: comment.trim() || undefined,
        budget,
        archetype,
        picks: picks.map(p => `${p.brand} ${p.model}`),
      });
    } catch { /* silent — feedback loss is fine */ }
    setPhase("done");
    setBusy(false);
  };

  if (phase === "done") return (
    <div style={st("margin-top:28px; padding:18px 20px; border-radius:18px; background:rgba(10,157,106,.08); border:.5px solid rgba(10,157,106,.18); display:flex; align-items:center; gap:12px;")}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#0a9d6a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <span style={st("font-size:14.5px; font-weight:600; color:#2c3036;")}>{t("feedback_thanks")}</span>
    </div>
  );

  if (phase === "comment") return (
    <div style={st("margin-top:28px; padding:20px 22px; border-radius:20px; background:rgba(255,255,255,.88); box-shadow:0 1px 2px rgba(15,25,35,.05), inset 0 0 0 1px rgba(15,25,35,.06);")}>
      <div style={st("display:flex; align-items:center; gap:10px; margin-bottom:14px;")}>
        <button onClick={() => rate("up")} className="k-press"
          style={st(`font-size:20px; padding:6px 12px; border-radius:12px; border:none; cursor:pointer; background:${rating === "up" ? "rgba(10,157,106,.15)" : "rgba(15,25,35,.05)"}; transition:background .15s;`)}>👍</button>
        <button onClick={() => rate("down")} className="k-press"
          style={st(`font-size:20px; padding:6px 12px; border-radius:12px; border:none; cursor:pointer; background:${rating === "down" ? "rgba(220,60,60,.12)" : "rgba(15,25,35,.05)"}; transition:background .15s;`)}>👎</button>
        <span style={st("font-size:13.5px; font-weight:600; color:#5c626a;")}>{rating === "up" ? t("feedback_comment_up") : t("feedback_comment_down")}</span>
      </div>
      <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
        placeholder={t("feedback_placeholder")}
        style={st("width:100%; box-sizing:border-box; padding:11px 13px; border-radius:12px; border:.5px solid rgba(15,25,35,.12); background:rgba(15,25,35,.03); font-size:14px; color:#17191d; font-family:inherit; resize:vertical; outline:none;")} />
      <div style={st("display:flex; gap:9px; margin-top:12px; justify-content:flex-end;")}>
        <button onClick={() => setPhase("idle")} className="k-press"
          style={st("font-size:13px; font-weight:600; color:#80868f; background:transparent; border:none; cursor:pointer; padding:9px 14px; border-radius:12px;")}>{t("feedback_skip")}</button>
        <button onClick={submit} disabled={busy} className="k-press k-glow"
          style={st("font-size:13.5px; font-weight:700; color:#fff; background:linear-gradient(180deg,var(--acg1),var(--acg2)); box-shadow:0 4px 12px var(--acglow); border:none; cursor:pointer; padding:9px 20px; border-radius:12px; opacity:" + (busy ? ".6" : "1") + ";")}>
          {t("feedback_submit")}
        </button>
      </div>
    </div>
  );

  return (
    <div style={st("margin-top:28px; padding:18px 20px; border-radius:20px; background:rgba(255,255,255,.75); box-shadow:inset 0 0 0 1px rgba(15,25,35,.06); display:flex; align-items:center; gap:14px; flex-wrap:wrap;")}>
      <span style={st("flex:1; min-width:180px; font-size:14.5px; font-weight:600; color:#363b42;")}>{t("feedback_q")}</span>
      <div style={st("display:flex; gap:8px;")}>
        <button onClick={() => rate("up")} className="k-press"
          style={st("font-size:20px; padding:8px 16px; border-radius:13px; border:none; cursor:pointer; background:rgba(15,25,35,.06); transition:background .15s;")}>👍</button>
        <button onClick={() => rate("down")} className="k-press"
          style={st("font-size:20px; padding:8px 16px; border-radius:13px; border:none; cursor:pointer; background:rgba(15,25,35,.06); transition:background .15s;")}>👎</button>
      </div>
    </div>
  );
}

/* ---------- small shared bits ---------- */
function Centered({ children }: { children: ReactNode }) {
  return <div style={st("max-width:680px; margin:0 auto; padding:80px 0; text-align:center; color:#80868f; font-size:15px;")}>{children}</div>;
}
function ErrorBox({ msg, onRetry, retryLabel }: { msg: string; onRetry: () => void; retryLabel?: string }) {
  return (
    <div style={st("max-width:460px; margin:0 auto; padding:60px 0; text-align:center; animation:kpop .45s cubic-bezier(.2,.7,.2,1) both;")}>
      <div style={st("width:64px; height:64px; margin:0 auto; border-radius:20px; display:flex; align-items:center; justify-content:center; background:rgba(192,137,42,.12);")}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M11 4a7 7 0 100 14 7 7 0 000-14zM16 16l4.5 4.5" stroke="#a8761a" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
      <div style={st("margin-top:18px; font-size:16px; font-weight:600; color:#2c3036; line-height:1.45;")}>{msg}</div>
      <button onClick={onRetry} className="k-press k-glow" style={st("margin-top:20px; padding:12px 24px; border-radius:99px; border:none; cursor:pointer; background:linear-gradient(180deg,var(--acg1),var(--acg2)); box-shadow:0 4px 14px var(--acglow); color:#fff; font-size:14px; font-weight:600;")}>{retryLabel || "Try again"}</button>
    </div>
  );
}
