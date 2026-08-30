import { type ReactNode, useState } from "react";
import { axisLabel, classifyCaveats, fitOf, headlinePhrase, shownRange, st, taka, takaRange, topPickBadge } from "../theme";
import { t } from "../i18n";
import { api } from "../api";
import { BrandLogo, brandLogo } from "./BrandLogo";
import { PhonePhoto } from "./PhonePhoto";
import { SpecIcon } from "./Chrome";
import { JustSoYouKnow } from "./Compare";
import { RagProgress } from "./RagProgress";
import type { Channels, DataCaution, Pick, RecommendResp, RegionOffer, SpecTile, Stretch, VariantPrice } from "../api";
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
  high: "var(--tealD)", medium: "var(--lnk)", low: "var(--acd)",
  strong: "var(--tealD)", good: "var(--lnk)", backup: "var(--acd)", fallback: "var(--acd)",
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
    <span style={st(`display:inline-flex; align-items:center; gap:6px; font-size:${small ? 11 : 12.5}px; font-weight:600; color:var(--acd); background:rgba(var(--rgb-amber),.12); padding:${small ? "3px 9px" : "5px 11px"}; border-radius:var(--r);`)}>
      <svg width={small ? 11 : 13} height={small ? 11 : 13} viewBox="0 0 24 24" fill="none" style={st("flex-shrink:0;")}><path d="M12 8v5M12 16v.5M12 3l9 16H3L12 3z" stroke="var(--acd)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
    <span title={t("price_unconfirmed_note")} style={st(`display:inline-flex; align-items:center; gap:5px; font-size:${s}px; font-weight:700; color:var(--acd); background:rgba(var(--rgb-amber),.12); padding:3px 9px; border-radius:var(--r);`)}>
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={st("flex-shrink:0;")}>
        <path d="M12 8v5M12 16v.5M12 3l9 16H3L12 3z" stroke="var(--acd)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {t("price_unconfirmed")}
    </span>
  );
}

/** The compact spec strip, exactly what a /best guide pick card and a /vs duel
    card print (backend core.specfmt.strip_tiles): RAM, display, battery,
    camera, charging, in that order and that wording. A result card used to
    show no specs at all, so the one surface a buyer actually configures said
    less about the phone than the page ranking it (owner 2026-07-26). */
export function SpecStrip({ tiles, small }: { tiles?: SpecTile[] | null; small?: boolean }) {
  if (!tiles || !tiles.length) return null;
  // icon tiles, not a middot run: the device page hero has read this way since
  // 2026-07-25 and the owner could not scan the grey dotted string (2026-07-26)
  return (
    <div style={st(`display:flex; flex-wrap:wrap; gap:${small ? 7 : 10}px ${small ? 14 : 20}px; margin-top:${small ? 8 : 13}px; ${small ? "" : "padding-top:13px; border-top:1px solid rgba(var(--rgb-ink),.07);"}`)}>
      {tiles.map((tl) => (
        <span key={tl.icon} style={st(`display:inline-flex; align-items:center; gap:6px; font-size:${small ? 12.5 : 13.5}px; font-weight:600; color:var(--tx);`)}>
          <SpecIcon name={tl.icon} size={small ? 14 : 15} />{tl.value}
        </span>
      ))}
    </div>
  );
}

/** Import-market chips, the same ones the device page hero carries: shops here
    stock the UK, India, China and Global builds of the same phone at different
    prices, and only the SEO pages said which one the money buys. This is also
    the disclosure that lets a phone with a China-ROM listing be ranked at all
    (backend value_pass.caveats). */
export function MarketChips({ regions, small }: { regions?: RegionOffer[] | null; small?: boolean }) {
  if (!regions || !regions.length) return null;
  const base = `display:inline-flex; align-items:center; font-size:${small ? 10.5 : 11.5}px; font-weight:700; padding:${small ? "3px 9px" : "4px 11px"}; border-radius:var(--r); color:var(--lnk); background:var(--tealL);`;
  return (
    <>
      {regions.map((r) => (
        <span key={r.code} style={st(base)}>{r.name} {t("from")} {taka(r.price)}</span>
      ))}
    </>
  );
}

/** Every RAM/storage config the shops price, cheapest first — the guides gained
    this line on 2026-07-26 because one price beside one RAM figure described
    two different products. Shop-anonymous: configs and money, never sellers. */
export function VariantLine({ variants, small }: { variants?: VariantPrice[] | null; small?: boolean }) {
  if (!variants || variants.length < 2) return null;
  // same icon-led rhythm as the spec strip above it, so the configs read as
  // part of the same block instead of a stray grey sentence
  return (
    <div style={st(`display:flex; align-items:baseline; flex-wrap:wrap; gap:${small ? 6 : 8}px 12px; margin-top:${small ? 7 : 10}px; font-size:${small ? 12 : 12.5}px;`)}>
      <span style={st("display:inline-flex; align-items:center; gap:6px; font-weight:700; color:var(--mut); letter-spacing:.2px;")}>
        <SpecIcon name="memory" size={small ? 13 : 14} />{t("variants")}
      </span>
      {variants.map((v) => (
        <span key={v.variant} style={st("display:inline-flex; align-items:center; gap:5px; color:var(--mut);")}>
          {v.variant}<b style={st("color:var(--ink2); font-weight:700;")}>{taka(v.price)}</b>
        </span>
      ))}
    </div>
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
  const base = `display:inline-flex; align-items:center; font-size:${small ? 10.5 : 11.5}px; font-weight:700; padding:${small ? "3px 9px" : "4px 11px"}; border-radius:var(--r);`;
  // the other channel's chip shows its RANGE from the same channel summary
  // the listings render — one source, no contradictions (owner 2026-07-19)
  const off = p.channels?.official;
  return (
    <>
      {p.best_price_official
        ? <span style={st(`${base} color:var(--tealD); background:rgba(var(--rgb-teal),.1);`)}>{t("official_bd")}</span>
        : <span style={st(`${base} font-weight:600; color:var(--mut); background:rgba(var(--rgb-ink),.055);`)}>{t("unofficial_import")}</span>}
      {!p.best_price_official && (off || p.best_official_price != null) && (
        <span style={st(`${base} color:var(--acd); background:rgba(var(--rgb-amber),.12);`)}>
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
    <div style={st("max-width:940px; margin:0 auto; animation:kfade .45s cubic-bezier(.2,.7,.2,1) both;")}>
      <div style={st("display:flex; align-items:flex-end; justify-content:space-between; gap:16px; flex-wrap:wrap; margin-top:clamp(12px,3vh,34px);")}>
        <div>
          <h1 style={st("font-family:var(--f-display); margin:0; font-size:clamp(30px,4.4vw,44px); font-weight:600; letter-spacing:-1.2px; line-height:1.1;")}>
            {picks.length} <span style={st("font-family:var(--f-serif); font-style:italic; font-weight:400; color:var(--lnk);")}>{t("top_picks")}</span>
          </h1>
          <div style={st("display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:13px;")}>
            {querySummary.map((q, i) => (
              <span key={i} style={st("font-size:13.5px; font-weight:600; color:var(--mut); background:var(--card); border:.5px solid rgba(var(--rgb-ink),.07); padding:6px 13px; border-radius:var(--r);")}>{q}</span>
            ))}
            <button onClick={onEdit} className="k-press" style={st("font-size:13.5px; font-weight:700; color:var(--lnk); background:var(--tint); border:none; padding:6px 14px; border-radius:var(--r); cursor:pointer;")}>{t("edit")}</button>
          </div>
        </div>
      </div>

      {/* teaser linking to the full "how it works" page */}
      <button onClick={onHowItWorks} className="k-press k-lift"
        style={st("width:100%; text-align:left; display:flex; gap:13px; align-items:center; margin-top:18px; padding:16px 18px; border-radius:var(--r); border:none; cursor:pointer; background:linear-gradient(110deg, var(--tint), rgba(var(--rgb-white),.55)); box-shadow:inset 0 0 0 1px var(--tint2); animation:kpop .35s cubic-bezier(.2,.7,.2,1) both;")}>
        <span style={st("display:flex; align-items:center; justify-content:center; width:38px; height:38px; border-radius:var(--r); background:var(--teal); flex-shrink:0; box-shadow:0 4px 12px rgba(var(--rgb-ink),.14);")}>
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none"><path d="M9.5 18h5M10.5 21h3M12 3a6 6 0 00-3.8 10.6c.5.5.8 1.1.8 1.8V16h6v-.6c0-.7.3-1.3.8-1.8A6 6 0 0012 3z" stroke="var(--card)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
        <div style={st("flex:1; min-width:0;")}>
          <div style={st("font-weight:700; font-size:15.5px; color:var(--lnk);")}>{t("results_how_t")}</div>
          <div style={st("margin-top:2px; font-size:13.5px; font-weight:600; color:var(--mut);")}>{t("read_how")} →</div>
        </div>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={st("flex-shrink:0; color:var(--lnk);")}><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>

      {meta.ranking === "unavailable" && (
        <div style={st("display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin-top:14px; padding:13px 16px; border-radius:var(--r); background:rgba(var(--rgb-amber),.12);")}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={st("flex-shrink:0;")}><path d="M12 8v5M12 16v.5M12 3l9 16H3L12 3z" stroke="var(--acd)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span style={st("flex:1; min-width:180px; font-size:14px; color:var(--acd); line-height:1.5;")}>The AI ranker was busy, so these are the closest matches by fit — <b>not fully ranked yet</b>. They may not use your full budget. Tap retry for the real ranking.</span>
          <button onClick={onRetry} className="k-press" style={st("font-size:12.5px; font-weight:700; color:var(--onp); background:var(--acd); border:none; padding:7px 16px; border-radius:var(--r); cursor:pointer;")}>Retry ranking</button>
        </div>
      )}
      {meta.relaxed && (
        <div style={st("margin-top:14px; padding:11px 15px; border-radius:var(--r); background:rgba(var(--rgb-amber),.1); font-size:14px; color:var(--acd); line-height:1.5;")}>
          No exact matches in your band, so here are the closest phones around your budget.
        </div>
      )}
      {picks.length < 3 && !meta.relaxed && (
        <div style={st("margin-top:14px; padding:11px 15px; border-radius:var(--r); background:rgba(var(--rgb-amber),.1); font-size:14px; color:var(--acd); line-height:1.5;")}>
          Only {picks.length === 1 ? "one phone" : "two phones"} genuinely fit this search. Widening the budget or relaxing a filter would show more.
        </div>
      )}

      {/* reasoning */}
      {reasoning && (
        <div style={st("display:flex; gap:11px; padding:15px 17px; border-radius:var(--r); background:var(--tint); margin-top:14px;")}>
          <svg width="17" height="17" viewBox="0 0 18 18" fill="none" style={st("flex-shrink:0; margin-top:2px;")}><path d="M9 1.5l2 4.5 4.9.4-3.7 3.2 1.1 4.8L9 11.8 4.7 14.4l1.1-4.8L2.1 6.4 7 6 9 1.5z" fill="var(--teal)" /></svg>
          <p style={st("margin:0; font-size:15px; color:var(--ink2); line-height:1.6; text-wrap:pretty;")}>{reasoning}</p>
        </div>
      )}

      {/* HERO pick */}
      <HeroPick p={first} budget={b} pct={pct} onClick={() => onPick(first.id)} />

      {/* rest */}
      {/* minmax(min(...)) — a bare minmax(340px,1fr) track is wider than the
          viewport under ~370px and pushed the whole page sideways.
          align-items:start — grid rows stretch every card to the tallest one in
          the row, so the pick with fewer chips carried a band of empty card */}
      <div className="k-stagger" style={st("display:grid; grid-template-columns:repeat(auto-fit,minmax(min(340px,100%),1fr)); align-items:start; gap:14px; margin-top:14px;")}>
        {rest.map((r, i) => {
          // SP1: the range's low end anchors budget fit + the marker dot;
          // range = shown channel's in-stock spread (same as its listings)
          const { lo, hi } = shownRange(r);
          const { fit, fitColor } = fitOf(lo ?? b, b);
          return (
            <button key={r.id} onClick={() => onPick(r.id)} className="k-press k-lift"
              style={st("text-align:left; display:flex; align-items:flex-start; gap:16px; padding:18px; border-radius:var(--r); border:none; cursor:pointer; background:var(--card); box-shadow:0 1px 2px rgba(var(--rgb-ink),.05), inset 0 0 0 1px rgba(var(--rgb-ink),.05);")}>
              {/* rank rides the photo corner. As its own flex column it cost the
                  card ~40px of width, and the text beside it had so little room
                  that every chip wrapped onto a line of its own. The photo is
                  sized off the viewport so it stays 3:4 and does not eat the
                  text column on a phone. */}
              <span style={st("position:relative; flex-shrink:0;")}>
                <PhonePhoto src={r.image} pid={r.id} w="clamp(68px,18vw,84px)" h="clamp(90px,24vw,112px)" radius={14} />
                <span style={st("position:absolute; top:-8px; left:-8px; width:24px; height:24px; border-radius:var(--r); background:var(--card); color:var(--mut2); font-size:12px; font-weight:700; display:flex; align-items:center; justify-content:center; box-shadow:0 1px 3px rgba(var(--rgb-ink),.12), inset 0 0 0 1px rgba(var(--rgb-ink),.07);")}>{i + 2}</span>
              </span>
              <div style={st("flex:1; min-width:0; display:flex; flex-direction:column;")}>
                {/* the mark sits in a fixed column so every row's model name
                    starts at the same x -- sized by its own aspect, OPPO's
                    wordmark is three times the width of Xiaomi's and the
                    names came out on a ragged left edge (owner 2026-08-11) */}
                <span style={st("display:flex; align-items:center; gap:8px; font-size:16px; font-weight:600; color:var(--ink); min-width:0;")}>
                  {brandLogo(r.brand) && (
                    <span style={st("display:flex; align-items:center; width:58px; flex:none;")}>
                      <BrandLogo brand={r.brand} h={15} max="58px" named />
                    </span>
                  )}
                  <span style={st("white-space:nowrap; overflow:hidden; text-overflow:ellipsis;")}>{brandLogo(r.brand) ? r.model : `${r.brand} ${r.model}`}</span>
                </span>
                <div style={st("font-size:13.5px; color:var(--mut2); margin-top:2px;")}>{headlinePhrase(r.headline_axis)}{r.headline_axis && r.headline_value != null ? ` · ${axisLabel(r.headline_axis)} ${r.headline_value}` : ""}</div>
                {/* price left, verdict right — the verdict used to be a third
                    fixed column and wrapped "৳13,510 under budget" over 3 lines */}
                <div style={st("display:flex; align-items:baseline; flex-wrap:wrap; gap:4px 10px; margin-top:6px;")}>
                  <span style={st("font-size:15.5px; font-weight:600; color:var(--ink);")}>{takaRange(lo, hi)}</span>
                  <span style={st("margin-left:auto; display:flex; align-items:baseline; gap:8px; flex-shrink:0;")}>
                    <span style={st(`font-size:12.5px; font-weight:700; color:${fitColor}; white-space:nowrap;`)}>{fit}</span>
                    {r.confidence && CONF_KEY[r.confidence] && (
                      <span style={st(`font-size:11px; font-weight:700; letter-spacing:.4px; text-transform:uppercase; white-space:nowrap; color:${CONF_COLOR[r.confidence]}; opacity:.85;`)}>{t(CONF_KEY[r.confidence])}</span>
                    )}
                  </span>
                </div>
                <div style={st("display:flex; align-items:center; gap:6px; margin-top:10px; flex-wrap:wrap;")}>
                  <ChannelChips p={r} small />
                  <MarketChips regions={r.regions} small />
                  {lo != null && <PriceSource primary={r.best_price_primary} compact />}
                  <DataCautionChip dc={r.data_caution} small />
                </div>
                <SpecStrip tiles={r.spec_strip} small />
                {/* mini budget-fit bar */}
                <div style={st("position:relative; height:4px; margin-top:14px;")}>
                  <div style={st("position:absolute; left:0; right:0; bottom:0; height:4px; border-radius:var(--r); background:rgba(var(--rgb-ink),.07);")} />
                  <div style={st(`position:absolute; bottom:-2px; height:8px; width:1.5px; border-radius:var(--r); left:${pct(b)}%; transform:translateX(-50%); background:var(--faint);`)} />
                  <div style={st(`position:absolute; bottom:-2.5px; width:9px; height:9px; border-radius:var(--r); left:${pct(lo ?? b)}%; transform:translateX(-50%); background:var(--teal); box-shadow:0 0 0 2px var(--card);`)} />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* stretch — promoted: spending a little more is often the smart move */}
      {stretch && <StretchCard s={stretch} budget={b} onClick={() => onPick(`${stretch.brand}|${stretch.key}`)} />}

      <p style={st("margin:20px 2px 0; font-size:12.5px; color:var(--mut2); line-height:1.5;")}>{meta.disclaimer}</p>

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
    <div onClick={onClick} className="k-lift"
      style={st("position:relative; cursor:pointer; background:linear-gradient(165deg, rgba(var(--rgb-white),.96), rgba(var(--rgb-white),.9)); border-radius:var(--r); padding:clamp(20px,3vw,30px); box-shadow:0 1px 2px rgba(var(--rgb-ink),.05), 0 18px 44px rgba(var(--rgb-ink),.1), inset 0 0 0 1px var(--tint2); margin-top:14px; display:flex; flex-direction:column; gap:clamp(16px,2.4vw,24px); overflow:hidden;")}>
      <div style={st("position:absolute; top:-90px; right:-70px; width:240px; height:240px; border-radius:var(--r); background:radial-gradient(circle, var(--tint), transparent 70%); pointer-events:none;")} />
      {/* two columns of unequal length, so align-items:start — stretching them
          left a block of dead card under whichever column ran out first */}
      <div style={st("display:grid; grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr)); gap:clamp(18px,3vw,30px); align-items:start;")}>
      {/* LEFT: identity, price, official pitch, strengths, owner note */}
      <div style={st("min-width:0;")}>
        <div style={st("display:flex; gap:16px;")}>
          {/* the pick's own picture, given the space the jargon vacated and a
              tint to sit on so it reads as the subject of the card rather than
              a thumbnail beside a wall of chips (owner: "highlight the hero
              phone image in results") */}
          <div style={st("position:relative; flex-shrink:0; padding:6px; border-radius:var(--r); background:linear-gradient(160deg, var(--tint), transparent 75%);")}>
            <PhonePhoto src={p.image} pid={p.id} pad={1}
              w="clamp(112px,32vw,190px)" h="clamp(150px,42vw,252px)" />
          </div>
          <div style={st("flex:1; min-width:0;")}>
            <div style={st("display:flex; align-items:flex-start; justify-content:space-between; gap:8px;")}>
              <div style={st("min-width:0;")}>
                <div style={st("display:flex; align-items:center; gap:7px; font-size:13px; color:var(--mut2); font-weight:500;")}>
                  <BrandLogo brand={p.brand} h={28} max="150px" named />
                  {!brandLogo(p.brand) && p.brand}
                </div>
                <div style={st("font-size:clamp(21px,2.4vw,26px); font-weight:700; color:var(--ink); line-height:1.12; letter-spacing:-.4px;")}>{p.model}</div>
              </div>
              <span style={st(`font-size:11.5px; font-weight:700; padding:5px 11px; border-radius:var(--r); white-space:nowrap; flex-shrink:0; color:${badge.c}; background:${badge.bg};`)}>{badge.label}</span>
            </div>
            <div style={st("margin-top:7px; font-size:14.5px; color:var(--mut);")}>{headlinePhrase(p.headline_axis)}{p.headline_axis && p.headline_value != null && <> · {axisLabel(p.headline_axis)} <span style={st("color:var(--lnk); font-weight:700;")}>{p.headline_value}</span></>}</div>
            {/* price lives beside the photo — the old full-width row left this
                whole block empty under the name (owner: dead space) */}
            <div style={st("display:flex; align-items:flex-end; gap:9px; margin-top:12px; flex-wrap:wrap;")}>
              <span style={st("font-size:clamp(23px,2.6vw,30px); font-weight:400; letter-spacing:-1px; color:var(--ink); line-height:1;")}>{takaRange(lo, hi)}</span>
              <span style={st("font-size:13px; color:var(--mut2); margin-bottom:2px;")}>at {p.in_stock_shops ?? 0} shops</span>
            </div>
          </div>
        </div>

        {/* what each size costs sits UNDER the photo row, not inside the text
            column beside it. At 375px that column is about 200px wide and the
            variants stacked one per line into a tall ragged block with dead
            space beside the photo (owner 2026-08-30: "on phone view balance
            too"). Out here it has the card's full width and wraps two or three
            to a row; on desktop it is still in the left column, where it keeps
            the two sides level. */}
        <VariantLine variants={p.variants} />

        {note && (
          <div style={st("display:flex; gap:9px; margin-top:10px; padding:11px 13px; border-radius:var(--r); background:rgba(var(--rgb-amber),.09);")}>
            <span style={st("width:6px; height:6px; border-radius:var(--r); background:var(--acd); margin-top:7px; flex-shrink:0;")} />
            <span style={st("font-size:13.5px; color:var(--acd); line-height:1.5;")}>{note.text}</span>
          </div>
        )}
      </div>

      {/* RIGHT: budget fit, must-know defect, our take */}
      <div style={st("display:flex; flex-direction:column; gap:13px; min-width:0;")}>
        <div style={st("padding:15px 16px; border-radius:var(--r); background:rgba(var(--rgb-ink),.035);")}>
          <div style={st("display:flex; justify-content:space-between; font-size:13.5px; margin-bottom:10px;")}>
            <span style={st("color:var(--mut2);")}>{t("budget_fit")}</span>
            <span style={st(`font-weight:600; color:${fitColor};`)}>{fit}</span>
          </div>
          <div style={st("position:relative; height:8px;")}>
            <div style={st("position:absolute; inset:0; border-radius:var(--r); background:rgba(var(--rgb-ink),.08);")} />
            <div style={st(`position:absolute; top:-3px; height:14px; width:2px; border-radius:var(--r); left:${pct(budget)}%; transform:translateX(-50%); background:var(--faint);`)} />
            <div style={st(`position:absolute; top:-3px; width:14px; height:14px; border-radius:var(--r); left:${pct(lo ?? budget)}%; transform:translateX(-50%); background:var(--teal); box-shadow:0 1px 4px rgba(var(--rgb-ink),.14), 0 0 0 2px var(--card);`)} />
          </div>
        </div>

        {major[0] && <JustSoYouKnow text={major[0].text} />}

        {p.smart_verdict && (
          <p style={st("margin:2px 0 0; font-size:15px; color:var(--ink2); line-height:1.6; text-wrap:pretty;")}>{p.smart_verdict}</p>
        )}

        {/* The chips and the spec strip live HERE, under the verdict, not
            beside the photo (owner 2026-08-30: "move the jargon to the right
            empty space"). Two reasons it is better and not just tidier: this
            column used to end at the verdict and leave a third of the card
            empty while the left ran on, and the chips are the detail a reader
            reaches for AFTER the sentence that tells them what the phone is.
            Name, price and photo stay on the left, which is the part someone
            scanning a results page actually reads. */}
        <div style={st("display:flex; align-items:center; gap:7px; margin-top:4px; flex-wrap:wrap;")}>
          <ChannelChips p={p} />
          <MarketChips regions={p.regions} />
          <PriceSource primary={p.best_price_primary} />
          {p.data_caution && p.data_caution.level !== "low" && <DataCautionChip dc={p.data_caution} small />}
          {(p.strengths || []).map((s, i) => (
            <span key={i} style={st("font-size:12.5px; color:var(--tx); background:rgba(var(--rgb-ink),.055); padding:5px 11px; border-radius:var(--r);")}>{axisLabel(s.axis)} {s.score}</span>
          ))}
        </div>

        <SpecStrip tiles={p.spec_strip} />
        </div>
      </div>

      {/* Buyers were reading past this: it sat at the bottom of a tall card,
          after the verdict, looking like a footer (owner 2026-07-26). It is
          bigger, it says what is behind it, it carries an arrow, and the
          whole card is clickable too — nobody has to find the button. Full
          card width now: pinned inside the short right column it floated,
          leaving a gap above it and dead space beside it. */}
      <button onClick={onClick} className="k-press k-glow"
        style={st("width:100%; padding:18px 20px; border-radius:var(--r); border:none; cursor:pointer; display:flex; align-items:center; justify-content:space-between; gap:12px; text-align:left; background:var(--teal); box-shadow:0 8px 22px rgba(var(--rgb-ink),.14), inset 0 1px 0 rgba(var(--rgb-white),.3);")}>
        <span style={st("min-width:0;")}>
          <span style={st("display:block; font-size:16.5px; font-weight:700; color:var(--onp); letter-spacing:-.2px;")}>{t("see_breakdown")}</span>
          <span style={st("display:block; margin-top:2px; font-size:12.5px; font-weight:600; color:rgba(var(--rgb-white),.78);")}>{t("see_breakdown_sub")}</span>
        </span>
        <span className="k-nudge" style={st("display:inline-flex; align-items:center; justify-content:center; width:34px; height:34px; border-radius:var(--r); flex-shrink:0; background:rgba(var(--rgb-white),.2);")}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M4 12h14M12 6l6 6-6 6" stroke="var(--card)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
      </button>
    </div>
  );
}


function StretchCard({ s, budget, onClick }: { s: Stretch; budget: number; onClick: () => void }) {
  const over = Math.max(0, s.best_price - budget);
  return (
    <button onClick={onClick} className="k-press k-lift" style={st("width:100%; text-align:left; display:flex; align-items:center; flex-wrap:wrap; gap:12px 15px; padding:18px 20px; margin-top:14px; border-radius:var(--r); border:none; cursor:pointer; background:linear-gradient(110deg, var(--tint), rgba(var(--rgb-white),.7)); box-shadow:inset 0 0 0 1px var(--tint2), 0 6px 20px rgba(var(--rgb-ink),.06);")}>
      <span style={st("display:flex; align-items:center; justify-content:center; width:42px; height:42px; border-radius:var(--r); background:var(--teal); flex-shrink:0; box-shadow:0 4px 12px rgba(var(--rgb-ink),.14);")}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M5 19L19 5M9 5h10v10" stroke="var(--card)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
      <div style={st("flex:1; min-width:200px;")}>
        <div style={st("font-size:11px; font-weight:700; color:var(--lnk); letter-spacing:1.2px; text-transform:uppercase;")}>{t("worth_stretch")}</div>
        <div style={st("display:flex; align-items:center; gap:7px; font-size:17px; font-weight:700; color:var(--ink); margin-top:3px;")}>
          <BrandLogo brand={s.brand} h={18} max="92px" named />
          {brandLogo(s.brand) ? s.model : `${s.brand} ${s.model}`}
        </div>
        <div style={st("font-size:14px; color:var(--mut); margin-top:3px; line-height:1.5;")}>{s.reason || `A clear step up for ${taka(over)} more.`}</div>
      </div>
      <div style={st("text-align:right; flex-shrink:0; margin-left:auto;")}>
        <div style={st("font-size:17px; font-weight:700; color:var(--ink);")}>{taka(s.best_price)}</div>
        <div style={st("font-size:11.5px; font-weight:700; color:var(--lnk); margin-top:2px;")}>+{taka(over)}</div>
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
    <div style={st("margin-top:24px; padding:18px 20px; border-radius:var(--r); background:rgba(var(--rgb-teal),.08); border:.5px solid rgba(var(--rgb-teal),.18); display:flex; align-items:center; gap:12px;")}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <span style={st("font-size:14.5px; font-weight:600; color:var(--ink2);")}>{t("feedback_thanks")}</span>
    </div>
  );

  if (phase === "comment") return (
    <div style={st("margin-top:28px; padding:20px 22px; border-radius:var(--r); background:var(--card); box-shadow:0 1px 2px rgba(var(--rgb-ink),.05), inset 0 0 0 1px rgba(var(--rgb-ink),.06);")}>
      <div style={st("display:flex; align-items:center; gap:10px; margin-bottom:14px;")}>
        <button onClick={() => rate("up")} className="k-press"
          style={st(`font-size:20px; padding:6px 12px; border-radius:var(--r); border:none; cursor:pointer; background:${rating === "up" ? "rgba(var(--rgb-teal),.15)" : "rgba(var(--rgb-ink),.05)"}; transition:background .15s;`)}>👍</button>
        <button onClick={() => rate("down")} className="k-press"
          style={st(`font-size:20px; padding:6px 12px; border-radius:var(--r); border:none; cursor:pointer; background:${rating === "down" ? "var(--dangerL)" : "rgba(var(--rgb-ink),.05)"}; transition:background .15s;`)}>👎</button>
        <span style={st("font-size:13.5px; font-weight:600; color:var(--mut);")}>{rating === "up" ? t("feedback_comment_up") : t("feedback_comment_down")}</span>
      </div>
      <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
        placeholder={t("feedback_placeholder")}
        style={st("width:100%; box-sizing:border-box; padding:11px 13px; border-radius:var(--r); border:.5px solid rgba(var(--rgb-ink),.12); background:rgba(var(--rgb-ink),.03); font-size:14px; color:var(--ink); font-family:inherit; resize:vertical; outline:none;")} />
      <div style={st("display:flex; gap:9px; margin-top:12px; justify-content:flex-end;")}>
        <button onClick={() => setPhase("idle")} className="k-press"
          style={st("font-size:13px; font-weight:600; color:var(--mut2); background:transparent; border:none; cursor:pointer; padding:9px 14px; border-radius:var(--r);")}>{t("feedback_skip")}</button>
        <button onClick={submit} disabled={busy} className="k-press k-glow"
          style={st("font-size:13.5px; font-weight:700; color:var(--onp); background:var(--teal); box-shadow:0 4px 12px rgba(var(--rgb-ink),.14); border:none; cursor:pointer; padding:9px 20px; border-radius:var(--r); opacity:" + (busy ? ".6" : "1") + ";")}>
          {t("feedback_submit")}
        </button>
      </div>
    </div>
  );

  return (
    <div style={st("margin-top:24px; padding:18px 20px; border-radius:var(--r); background:var(--card); box-shadow:inset 0 0 0 1px rgba(var(--rgb-ink),.06); display:flex; align-items:center; gap:14px; flex-wrap:wrap;")}>
      <span style={st("flex:1; min-width:180px; font-size:14.5px; font-weight:600; color:var(--ink2);")}>{t("feedback_q")}</span>
      <div style={st("display:flex; gap:8px;")}>
        <button onClick={() => rate("up")} className="k-press"
          style={st("font-size:20px; padding:8px 16px; border-radius:var(--r); border:none; cursor:pointer; background:rgba(var(--rgb-ink),.06); transition:background .15s;")}>👍</button>
        <button onClick={() => rate("down")} className="k-press"
          style={st("font-size:20px; padding:8px 16px; border-radius:var(--r); border:none; cursor:pointer; background:rgba(var(--rgb-ink),.06); transition:background .15s;")}>👎</button>
      </div>
    </div>
  );
}

/* ---------- small shared bits ---------- */
function Centered({ children }: { children: ReactNode }) {
  return <div style={st("max-width:680px; margin:0 auto; padding:80px 0; text-align:center; color:var(--mut2); font-size:15px;")}>{children}</div>;
}
function ErrorBox({ msg, onRetry, retryLabel }: { msg: string; onRetry: () => void; retryLabel?: string }) {
  return (
    <div style={st("max-width:460px; margin:0 auto; padding:60px 0; text-align:center; animation:kpop .45s cubic-bezier(.2,.7,.2,1) both;")}>
      <div style={st("width:64px; height:64px; margin:0 auto; border-radius:var(--r); display:flex; align-items:center; justify-content:center; background:rgba(var(--rgb-amber),.12);")}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M11 4a7 7 0 100 14 7 7 0 000-14zM16 16l4.5 4.5" stroke="var(--acd)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
      <div style={st("margin-top:18px; font-size:16px; font-weight:600; color:var(--ink2); line-height:1.45;")}>{msg}</div>
      <button onClick={onRetry} className="k-press k-glow" style={st("margin-top:20px; padding:12px 24px; border-radius:var(--r); border:none; cursor:pointer; background:var(--teal); box-shadow:0 4px 14px rgba(var(--rgb-ink),.14); color:var(--onp); font-size:14px; font-weight:600;")}>{retryLabel || "Try again"}</button>
    </div>
  );
}
