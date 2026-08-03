import type { ReactNode } from "react";
import { AXES, axisLabel, classifyCaveats, fitOf, headlinePhrase, retentionCurve, st, taka, takaRange, verdictMeta } from "../theme";
import { bnNum, t } from "../i18n";
import type { Connectivity, Offer, OpinionProfile, PhoneDetail, Pick } from "../api";
import { PhonePhoto } from "./PhonePhoto";
import { JustSoYouKnow } from "./Compare";
import { ChannelChips, DataCautionChip, MarketChips, PriceSource } from "./ResultsScreen";
import { Configure } from "./Configure";
import { Fold, SpecIcon } from "./Chrome";

interface Props {
  detail: PhoneDetail | null;
  hint?: Pick | null;          // the result pick — renders the hero instantly
  loading: boolean;
  error: string | null;
  budget: number;
  onBack: () => void;
  onRetry: () => void;
}

/** distinct owner quotes — real aspect quotes first, then standout praise.
    Quotes already shown inside a caveat box are skipped. */
function ownerQuotes(op: OpinionProfile, caveatTexts: string[], max = 3): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const cavBlob = caveatTexts.join(" ").toLowerCase();
  const add = (s?: unknown) => {
    const tx = (typeof s === "string" ? s : "").trim();
    if (!tx) return;
    const norm = tx.toLowerCase();
    if (seen.has(norm)) return;
    if (norm.length >= 20 && cavBlob.includes(norm.slice(0, 60))) return;
    seen.add(norm); out.push(tx);
  };
  for (const a of Object.values(op.aspects || {})) (a.quotes || []).forEach(add);
  (op.standout_praise || []).forEach(add);
  return out.slice(0, max);
}

function domAxis(scores: Record<string, number | null | undefined>): string {
  let best = "balanced", bv = -1;
  for (const a of AXES) {
    const v = scores[a];
    if (typeof v === "number" && v > bv) { bv = v; best = a; }
  }
  return best;
}

/** The spec sheet comes from the backend now (core.specfmt), the same rows the
    /phone/ page's "At a glance" block and the /vs table render. This used to
    build its own labels and formatting, which is how the app and the SEO page
    for the same phone ended up with different sheets: the page named the panel,
    the sensor size and the brightness qualifier, this screen printed a bare
    "50MP" and a "Refresh rate" row nothing else had (owner 2026-07-26).
    Network and weight, which only this screen showed, are appended here. */
function buildSpecs(d: PhoneDetail | null | undefined): { k: string; v: string; icon: string }[] {
  if (!d) return [];
  const out = (d.spec_rows || []).map((r) => ({ k: r.label, v: r.value, icon: r.icon }));
  const s = d.specs || {};
  if (s.weight_g) out.push({ k: "Weight", v: `${s.weight_g} g`, icon: "weight" });
  if (s.net_5g != null) out.push({ k: "Network", v: s.net_5g ? "5G" : "4G", icon: "network" });
  return out;
}

/** Verified hardware presence rows (GSMArena-crawled). Hidden when the whole
    record is unverified (all three null — the no-specs case, pure noise). */
function connRows(c: Connectivity | null | undefined, tr?: Record<string, any> | null): { k: string; v: boolean | null }[] {
  const rows = c ? [
    { k: "conn_jack", v: c.has_headphone_jack },
    { k: "conn_ir", v: c.has_ir_blaster },
    { k: "conn_fm", v: c.has_fm_radio },
  ] : [];
  const base = rows.some((r) => r.v != null) ? rows : [];
  // positive-only signal: show the chip only when we KNOW there is a build
  if (tr?.custom_rom) base.push({ k: "conn_rom", v: true });
  return base;
}

function buildTraits(tr: Record<string, any> | undefined): string[] {
  if (!tr) return [];
  const out: string[] = [];
  if (tr.ip_rating) out.push(String(tr.ip_rating).toUpperCase());
  else if (tr.water_resistant) out.push("Water-resistant");
  if (tr.peak_nits) out.push(`${tr.peak_nits} nits`);
  out.push(tr.glass_back ? "Glass back" : "Plastic back");
  if (tr.stereo_speakers) out.push("Stereo");
  if (tr.headphone_jack) out.push("3.5mm jack");
  if (tr.main_video_4k) out.push("4K video");
  return out.slice(0, 5);
}

export function DetailScreen({ detail, hint, loading, error, budget, onBack, onRetry }: Props) {
  if (error) return <Wrap onBack={onBack}><div style={st("padding:60px 0; text-align:center; color:var(--danger);")}>{error}<br /><button onClick={onRetry} style={st("margin-top:16px; padding:10px 20px; border-radius:var(--r); border:none; cursor:pointer; background:var(--teal); color:var(--onp); font-weight:600;")}>Retry</button></div></Wrap>;

  const d = detail;
  const h = hint || null;
  const any = d || h;
  if (!any) {
    if (loading) return <Wrap onBack={onBack}><LoadingDetail /></Wrap>;
    return <Wrap onBack={onBack}><div style={st("padding:60px 0; text-align:center; color:var(--mut2);")}>Pick a phone from the results to see its full breakdown.</div></Wrap>;
  }

  // merged hero view-model: prefer full detail, fall back to the result pick
  const brand = d?.brand ?? h?.brand ?? "";
  const model = d?.model ?? h?.model ?? "";
  const image = d?.image ?? h?.image ?? null;
  const pid = d?.id ?? h?.id ?? null;
  const scores = (d?.blended_scores && Object.keys(d.blended_scores).length ? d.blended_scores : null)
    || (h?.blended_scores && Object.keys(h.blended_scores).length ? h.blended_scores : null)
    || d?.scores || {};
  const dom = h?.headline_axis || domAxis(scores);
  const price = d?.best_price ?? h?.best_price ?? null;
  // SP1 price rules: a RANGE (low anchors budget fit), channel chips follow
  // the SHOWN price's own channel — shops stay anonymous. Range comes from
  // the per-channel summary so card and listings share one set of numbers.
  const isOff = d?.best_price_official ?? h?.best_price_official ?? false;
  const chans = d?.channels ?? h?.channels ?? null;
  const shownSide = isOff ? chans?.official : chans?.unofficial;
  const priceLo = shownSide?.lo ?? d?.price_low ?? h?.price_low ?? price;
  const priceHi = shownSide?.hi ?? d?.price_high ?? h?.price_high ?? null;
  const offPrice = d?.best_official_price ?? h?.best_official_price ?? null;
  const rec = d?.ai_verdict?.recommendation ?? h?.verdict?.recommendation;
  const vm = verdictMeta(rec);
  const { fit, fitColor } = fitOf(priceLo ?? budget, budget);
  const traits = buildTraits(d?.traits);
  const ourTake = h?.smart_verdict || d?.ai_verdict?.verdict || null;
  const inStock = d?.in_stock_shops ?? h?.in_stock_shops ?? 0;
  const dataCaution = d?.data_caution ?? h?.data_caution ?? null;
  const bestPrimary = d?.best_price_primary ?? h?.best_price_primary;

  // sections that require the full DB record
  const op = d?.opinion_profile || {};
  const caveats = d?.caveats ?? h?.caveats ?? [];
  const quotes = ownerQuotes(op, caveats.map((c) => c.text));
  const bestFor = (op.best_for?.length ? op.best_for : d?.ai_verdict?.best_for) || [];
  const avoidIf = op.avoid_if || [];
  const specs = buildSpecs(d);
  const conn = connRows(d?.connectivity, d?.traits);
  const bs = d?.brand_summary;
  // only real, priced listings — a price-less offer must never sort to the top
  const offers = (d?.offers || []).filter((o) => o.price && o.price > 0).sort((a, b) => a.price - b.price);
  // badge the RECOMMENDED price (A3: cheapest kept-current in-stock offer), not
  // the raw cheapest — else "Best price" lands on an out-of-stock/stale row and
  // contradicts the hero. Fall back to raw cheapest when no authority price.
  const bestOfferPrice = price ?? (offers.length ? offers[0].price : null);

  return (
    <Wrap onBack={onBack}>
      {/* hero (renders instantly from the pick hint) */}
      <div style={st("background:var(--card); border-radius:var(--r); padding:clamp(20px,3vw,32px); box-shadow:0 1px 2px rgba(var(--rgb-ink),.05), 0 16px 40px rgba(var(--rgb-ink),.09); margin-top:16px; display:grid; grid-template-columns:repeat(auto-fit,minmax(290px,1fr)); gap:clamp(20px,3vw,32px);")}>
        <div style={st("display:flex; gap:18px;")}>
          <PhonePhoto src={image} pid={pid} w="clamp(100px,11vw,124px)" h="clamp(134px,15vw,166px)" radius={18} />
          <div style={st("min-width:0;")}>
            <div style={st("display:flex; align-items:center; gap:9px; flex-wrap:wrap;")}>
              <span style={st("font-size:13px; color:var(--mut2); font-weight:500;")}>{brand}</span>
              {/* only a confident "Top pick" or an honest "Has trade-offs" — never a lukewarm "Worth a look" on a phone the buyer is already looking at */}
              {(rec === "buy" || rec === "avoid") && <span style={st(`font-size:11.5px; font-weight:700; padding:4px 11px; border-radius:var(--r); color:${vm.c}; background:${vm.bg};`)}>{vm.label}</span>}
            </div>
            <h1 style={st("margin:4px 0 0; font-size:clamp(26px,3.6vw,38px); font-weight:700; letter-spacing:-1.2px; line-height:1.1;")}>{model}</h1>
            <div style={st("margin-top:8px; font-size:14px; color:var(--mut);")}>{headlinePhrase(dom)}{scores[dom] != null && <> · {axisLabel(dom)} <span style={st("color:var(--lnk); font-weight:700;")}>{scores[dom]}</span></>}</div>
            {traits.length > 0 && (
              <div style={st("display:flex; flex-wrap:wrap; gap:6px; margin-top:13px;")}>
                {traits.map((tx, i) => (
                  <span key={i} style={st("font-size:11.5px; font-weight:600; color:var(--mut); background:rgba(var(--rgb-ink),.05); padding:5px 11px; border-radius:var(--r);")}>{tx}</span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div style={st("display:flex; flex-direction:column; justify-content:center;")}>
          <div style={st("display:flex; align-items:flex-end; gap:11px; flex-wrap:wrap;")}>
            <span style={st("font-size:clamp(28px,3.4vw,38px); font-weight:300; letter-spacing:-1.4px; line-height:1;")}>{takaRange(priceLo, priceHi)}</span>
          </div>
          <div style={st("display:flex; align-items:center; gap:7px; margin-top:10px; flex-wrap:wrap;")}>
            <ChannelChips p={{ best_price_official: isOff, best_official_price: offPrice, channels: chans }} />
            {/* which import market the money buys — same chips as the /phone/
                page hero and the guide cards */}
            <MarketChips regions={d?.regions} />
          </div>
          <div style={st("margin-top:12px; font-size:14px; color:var(--mut2); line-height:1.7;")}>
            At {inStock} shops · <span style={st(`color:${fitColor}; font-weight:600;`)}>{fit}</span>
            {priceLo != null && bestPrimary === false && (
              <><br /><span style={st("display:inline-block; margin-top:6px;")}><PriceSource primary={bestPrimary} /></span></>
            )}
            {dataCaution && dataCaution.level !== "low" && (
              <><br /><span style={st("display:inline-block; margin-top:6px;")}><DataCautionChip dc={dataCaution} /></span></>
            )}
            {d?.price_trend && (d.price_trend.trend === "down" || d.price_trend.trend === "up") && (
              <><br /><span style={st(`font-size:12px; font-weight:600; color:${d.price_trend.trend === "down" ? "var(--tealD)" : "var(--acd)"};`)}>
                Price {d.price_trend.trend === "down" ? "dropped" : "rose"} {taka(Math.abs(d.price_trend.delta))} recently
              </span></>
            )}
          </div>
        </div>
      </div>

      {(() => { const m = classifyCaveats(caveats).major[0]; return m ? <div style={st("margin-top:14px;")}><JustSoYouKnow text={m.text} /></div> : null; })()}

      {/* which exact unit the money buys: config, channel, SIM tray, colours
          and the stock the shops published for that SKU */}
      <Configure variants={d?.variants} />

      {/* our take — the RAG verdict, grounded in real evidence */}
      {ourTake && (
        <div style={st("background:var(--tint); border-radius:var(--r); padding:clamp(16px,2.5vw,22px); margin-top:14px; display:flex; gap:12px;")}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={st("flex-shrink:0; margin-top:2px;")}><path d="M9 1.5l2 4.5 4.9.4-3.7 3.2 1.1 4.8L9 11.8 4.7 14.4l1.1-4.8L2.1 6.4 7 6 9 1.5z" fill="var(--teal)" /></svg>
          <div>
            <div style={st("font-size:11.5px; font-weight:700; letter-spacing:1.4px; text-transform:uppercase; color:var(--lnk); margin-bottom:5px;")}>{t("our_take")}</div>
            <p style={st("margin:0; font-size:14.5px; color:var(--ink2); line-height:1.6; text-wrap:pretty;")}>{ourTake}</p>
          </div>
        </div>
      )}

      {/* axes */}
      {Object.values(scores).some((v) => v != null) && (
        <div style={st("background:var(--card); border-radius:var(--r); padding:clamp(20px,3vw,28px); box-shadow:0 1px 2px rgba(var(--rgb-ink),.05), 0 10px 28px rgba(var(--rgb-ink),.07); margin-top:14px;")}>
          <SectionLabel>{t("scores")}</SectionLabel>
          <p style={st("margin:9px 0 0; font-size:13.5px; color:var(--mut2); line-height:1.5; text-wrap:pretty;")}>{t("scores_help")}</p>
          <div style={st("display:flex; flex-direction:column; gap:17px; margin-top:16px;")}>
            {AXES.map((k) => {
              const v = scores[k];
              if (v == null) return null;
              const reason = (d?.score_reasons?.[k] || []).join("; ");
              return (
                <div key={k}>
                  <div style={st("display:flex; justify-content:space-between; align-items:baseline; gap:12px;")}>
                    <span style={st("font-size:15.5px; font-weight:600; color:var(--ink2);")}>{axisLabel(k)}</span>
                    <span style={st("font-size:15px; font-weight:700; color:var(--lnk);")}>{v.toFixed(1)} / 10</span>
                  </div>
                  <div style={st("position:relative; height:7px; border-radius:var(--r); background:rgba(var(--rgb-ink),.06); margin-top:8px; overflow:hidden;")}>
                    <div style={st(`position:absolute; top:0; bottom:0; left:0; width:${v * 10}%; border-radius:var(--r); background:var(--teal);`)} />
                  </div>
                  {reason && <div style={st("font-size:13.5px; color:var(--mut2); margin-top:7px; line-height:1.5;")}>{reason}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* full-record sections, or a skeleton while they load */}
      {!d ? <LoadingDetail compact /> : (
      <>
      {/* who it's for — visual, info-first */}
      {(bestFor.length > 0 || avoidIf.length > 0 || caveats.length > 0) && (
        <WhoFor bestFor={bestFor} avoidIf={avoidIf} caveats={caveats} />
      )}

      {/* align-items:start, or every card in a row stretches to the tallest
          one — the specs card grew icon rows and left a half-empty white slab
          under the resale graph beside it (owner 2026-07-26). */}
      <div className="k-stagger" style={st("columns:330px 2; column-gap:14px; margin-top:14px;")}>
        {/* specs */}
        <Card>
          <SectionLabel>{t("specs")}</SectionLabel>
          {/* icon-led rows with room to breathe, the same shape the /phone/
              page's "At a glance" table uses (owner 2026-07-26). The old
              two-line grid at 15px gaps ran the labels into the values. */}
          <div style={st("display:grid; grid-template-columns:repeat(auto-fit,minmax(210px,1fr)); gap:4px 22px; margin-top:14px;")}>
            {specs.map((sp, i) => (
              <div key={i} style={st("display:flex; align-items:flex-start; gap:11px; padding:11px 2px; border-bottom:1px solid rgba(var(--rgb-ink),.055);")}>
                <span style={st("display:flex; align-items:center; justify-content:center; width:30px; height:30px; border-radius:var(--r); flex-shrink:0; background:rgba(var(--rgb-ink),.045); margin-top:1px;")}>
                  <SpecIcon name={sp.icon} size={16} color="var(--mut)" />
                </span>
                <div style={st("min-width:0;")}>
                  <div style={st("font-size:12px; font-weight:600; letter-spacing:.3px; color:var(--mut2);")}>{sp.k}</div>
                  <div style={st("font-size:14.5px; font-weight:600; color:var(--ink2); margin-top:3px; line-height:1.45; overflow-wrap:anywhere;")}>{sp.v}</div>
                </div>
              </div>
            ))}
          </div>

          {/* the whole GSMArena sheet, folded exactly as /phone/* folds it —
              the app was the only surface with no way to open it */}
          {!!d?.spec_sheet?.length && (
            <Fold label={t("full_spec_sheet")}>
              <div style={st("display:flex; flex-direction:column; gap:14px;")}>
                {d.spec_sheet.map((g) => (
                  <section key={g.title} style={st("padding:14px 16px 4px; border-radius:var(--r); background:var(--card); box-shadow:0 1px 2px rgba(var(--rgb-ink),.05), inset 0 0 0 1px rgba(var(--rgb-ink),.05);")}>
                    <h3 style={st("font-size:11px; text-transform:uppercase; letter-spacing:.8px; color:var(--mut2); font-weight:700; margin:0 0 4px;")}>{g.title}</h3>
                    {g.rows.map((r) => (
                      <div key={r.label} style={st("display:flex; gap:12px; flex-wrap:wrap; padding:9px 0; border-bottom:1px solid rgba(var(--rgb-ink),.05); font-size:13.5px;")}>
                        <span style={st("flex:0 0 128px; font-weight:600; color:var(--ink2);")}>{r.label}</span>
                        <span style={st("flex:1 1 160px; color:var(--tx); line-height:1.55; overflow-wrap:anywhere;")}>{r.value}</span>
                      </div>
                    ))}
                  </section>
                ))}
                <p style={st("font-size:12px; color:var(--mut2); line-height:1.6; margin:0 2px;")}>
                  {d.spec_source
                    ? <>Specifications from <a href={d.spec_source} rel="nofollow noopener" target="_blank" style={st("color:var(--lnk); font-weight:600;")}>GSMArena</a>. Prices and stock are ours, checked nightly against Bangladeshi shops.</>
                    : t("spec_credit")}
                </p>
              </div>
            </Fold>
          )}
          {conn.length > 0 && (
            <>
              <div style={st("font-size:12.5px; color:var(--mut2); margin-top:20px;")}>{t("conn_title")}</div>
              <div style={st("display:flex; flex-wrap:wrap; gap:7px; margin-top:9px;")}>
                {conn.map((c) => (
                  <span key={c.k} style={st(`display:inline-flex; align-items:center; gap:6px; font-size:12.5px; font-weight:600; padding:6px 12px; border-radius:var(--r); ${c.v == null ? "color:var(--mut2); background:rgba(var(--rgb-ink),.045);" : c.v ? "color:var(--tealD); background:rgba(var(--rgb-teal),.1);" : "color:var(--mut2); background:rgba(var(--rgb-ink),.055);"}`)}>
                    {c.v != null && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        {c.v ? <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                             : <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />}
                      </svg>
                    )}
                    {t(c.k)}{c.v == null ? ` · ${t("conn_unknown")}` : ""}
                  </span>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* value retention (estimated from brand resale reputation) */}
        {bs?.resale != null && (
          <Card><ValueRetention brand={brand} resale={bs.resale} updateRecord={bs.update_record ?? null} ageYears={d?.age_years ?? h?.age_years ?? null} price={price} /></Card>
        )}

        {/* opinion */}
        {(op.llm_summary || quotes.length || op.praise_flags?.length || op.complaint_flags?.length) && (
          <Card>
            <SectionLabel>{t("owner_voices")}</SectionLabel>
            {op.llm_summary && <p style={st("margin:15px 0 0; font-size:14px; color:var(--tx); line-height:1.6; text-wrap:pretty;")}>{op.llm_summary}</p>}
            {quotes.length > 0 && (
              <div style={st("display:flex; flex-direction:column; gap:9px; margin-top:15px;")}>
                {quotes.map((q, i) => (
                  <div key={i} style={st("padding:13px 16px; border-radius:var(--r); background:var(--tint); font-family:var(--f-serif); font-style:italic; font-size:16px; color:var(--ink2); line-height:1.5;")}>“{q}”</div>
                ))}
              </div>
            )}
            <div style={st("display:flex; flex-wrap:wrap; gap:7px; margin-top:15px;")}>
              {(op.praise_flags || []).map((tx, i) => (
                <span key={"p" + i} style={st("font-size:13px; font-weight:600; color:var(--tealD); background:rgba(var(--rgb-teal),.1); padding:6px 12px; border-radius:var(--r);")}>+ {tx}</span>
              ))}
              {(op.complaint_flags || []).map((tx, i) => (
                <span key={"c" + i} style={st("font-size:13px; font-weight:600; color:var(--acd); background:rgba(var(--rgb-amber),.12); padding:6px 12px; border-radius:var(--r);")}>− {tx}</span>
              ))}
            </div>
          </Card>
        )}

        {/* where to buy — last, and clearly flagged as unconfirmed prices */}
        {offers.length > 0 && (
          <Card>
            <SectionLabel>{t("where_to_buy")}</SectionLabel>
            {/* trust signal: we checked N sellers, and this is the spread.
                Shops stay anonymous — the note says why. */}
            {/* the SAME range the hero shows (combine.price_low/high: in-stock
                sellers in the shown channel, variant outliers trimmed) — never
                a second number computed differently (owner: consistency) */}
            <div style={st("margin-top:8px; font-size:14px; color:var(--mut);")}>
              <b style={st("color:var(--ink2);")}>{bnNum(String(offers.length))} {t("sellers")}</b>
              {" · "}{takaRange(priceLo, priceHi)}
            </div>
            <p style={st("margin:9px 0 0; font-size:13px; color:var(--mut2); line-height:1.55; text-wrap:pretty;")}>{t("why_anon")}</p>
            <div style={st("display:flex; gap:9px; margin-top:12px; padding:12px 14px; border-radius:var(--r); background:rgba(var(--rgb-amber),.1);")}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" style={st("flex-shrink:0; margin-top:1px;")}><path d="M12 3L2 21h20L12 3zM12 9v5M12 17.5v.5" stroke="var(--acd)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span style={st("font-size:13.5px; color:var(--acd); line-height:1.55;")}>{t("price_warning")}</span>
            </div>
            {/* one block per CHANNEL (owner 2026-07-19): header carries the
                channel's seller count + in-stock range from the same summary
                the hero shows; variant groups break down the spread inside */}
            {(["official", "unofficial"] as const).map((ch) => {
              const chOffers = offers.filter((o) => (ch === "official") === offGrade(o));
              const chip = ch === "official"
                ? <span style={st("display:inline-flex; font-size:11px; font-weight:700; padding:3px 10px; border-radius:var(--r); color:var(--tealD); background:rgba(var(--rgb-teal),.1);")}>{t("official_bd")}</span>
                : <span style={st("display:inline-flex; font-size:11px; font-weight:700; padding:3px 10px; border-radius:var(--r); color:var(--mut); background:rgba(var(--rgb-ink),.055);")}>{t("unofficial_import")}</span>;
              // both channels always show; an empty one says so (owner 2026-07-19)
              if (!chOffers.length) {
                return (
                  <div key={ch} style={st("display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:16px;")}>
                    {chip}
                    <span style={st("font-size:12.5px; color:var(--mut2);")}>{ch === "official" ? t("no_official_found") : t("no_unofficial_found")}</span>
                  </div>
                );
              }
              const side = chans?.[ch];
              const inStock = side?.in_stock ?? chOffers.filter((o) => o.in_stock === true).length;
              // Best-price badge only competes in the shown price's channel
              const gs = groupOffers(chOffers, (ch === "official") === isOff ? bestOfferPrice : null);
              return (
                <div key={ch} style={st("margin-top:16px;")}>
                  <div style={st("display:flex; align-items:center; gap:8px; flex-wrap:wrap;")}>
                    {chip}
                    <span style={st("font-size:13px; color:var(--mut);")}>
                      <b style={st("color:var(--ink2);")}>{inStock > 0
                        ? <>{bnNum(String(inStock))} {t("shops_in_stock")}</>
                        : <>{bnNum(String(side?.sellers ?? chOffers.length))} {t("sellers")}</>}</b>
                      {side ? <> · {takaRange(side.lo, side.hi)}</> : null}
                    </span>
                  </div>
                  <div style={st("display:flex; flex-direction:column; gap:8px; margin-top:9px;")}>
                    {gs.map((g, i) => <VariantGroupRow key={i} g={g} lone={gs.length === 1} />)}
                  </div>
                </div>
              );
            })}
            {/* monetization invite — shops can pay to appear named (owner 2026-07-19) */}
            <p style={st("margin:18px 0 0; padding-top:14px; border-top:1px solid rgba(var(--rgb-ink),.06); font-size:12px; color:var(--faint); line-height:1.55; text-wrap:pretty;")}>
              {t("shop_own")}{" "}
              <a href="/support" style={st("color:var(--lnk); font-weight:600;")}>{t("shop_contact")}</a>
            </p>
          </Card>
        )}
      </div>
      </>
      )}
    </Wrap>
  );
}

/* ---------- who it's for — persona chips + classified caveats ---------- */
const PERSONA_ICON: { re: RegExp; d: string }[] = [
  { re: /game|gaming/, d: "M6 11h12a3 3 0 110 6H6a3 3 0 110-6zM7.5 13v2.2M6.4 14.1h2.2M16 13.4h.01M17.6 15h.01" },
  { re: /camera|photo|shoot|picture/, d: "M4 8h3l1.5-2h7L17 8h3v10H4V8zM12 11a3 3 0 100 6 3 3 0 000-6z" },
  { re: /video|vlog|creat|film/, d: "M3 7h11v10H3V7zM14 10.5l7-3v9l-7-3" },
  { re: /student|study|school|exam/, d: "M12 4l10 5-10 5L2 9l10-5zM6 11v5c0 1.4 3 3 6 3s6-1.6 6-3v-5" },
  { re: /senior|parent|elder|simple|easy|read/, d: "M12 20s-7-4.3-7-9a4 4 0 017-2.6A4 4 0 0119 11c0 4.7-7 9-7 9z" },
  { re: /value|budget|money|afford|cheap/, d: "M20.5 11.5L12.5 3.5H4v8.5l8 8 8.5-8.5zM7.5 7.5h.01" },
  { re: /work|professional|office|business|productiv/, d: "M4 8h16v11H4V8zM9 8V6h6v2" },
  { re: /ride|driv|deliver|battery|all-?day|endur|travel/, d: "M4 8h13v8H4zM17 11h2v2h-2M7.5 10.5v3" },
  { re: /daily|everyday|general|balanc|reliab/, d: "M12 3v2M12 19v2M5 12H3M21 12h-2M6 6l1.4 1.4M16.6 16.6L18 18M6 18l1.4-1.4M16.6 7.4L18 6M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z" },
];
function personaIcon(label: string): string {
  const l = label.toLowerCase();
  return (PERSONA_ICON.find((p) => p.re.test(l)) || { d: "M12 8v5M12 16v.01M12 3a9 9 0 100 18 9 9 0 000-18z" }).d;
}

function WhoFor({ bestFor, avoidIf, caveats }: {
  bestFor: string[]; avoidIf: string[]; caveats: { text: string; sev?: string }[];
}) {
  const { major, notes } = classifyCaveats(caveats);
  return (
    <div style={st("background:var(--card); border-radius:var(--r); padding:clamp(20px,3vw,28px); box-shadow:0 1px 2px rgba(var(--rgb-ink),.05), 0 10px 28px rgba(var(--rgb-ink),.07); margin-top:14px;")}>
      <SectionLabel>{t("who_its_for")}</SectionLabel>
      <div style={st("display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:14px; margin-top:18px;")}>
        {bestFor.length > 0 && (
          <div style={st("border-radius:var(--r); padding:17px 18px; background:linear-gradient(160deg, rgba(var(--rgb-teal),.1), rgba(var(--rgb-teal),.04)); border:.5px solid rgba(var(--rgb-teal),.16);")}>
            <div style={st("display:flex; align-items:center; gap:8px; font-size:13px; font-weight:700; color:var(--tealD);")}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9.5" stroke="var(--teal)" strokeWidth="1.8" /><path d="M8 12.5l2.5 2.5L16 9" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {t("great_for")}
            </div>
            <div style={st("display:flex; flex-wrap:wrap; gap:8px; margin-top:14px;")}>
              {bestFor.map((tx, i) => (
                <span key={i} style={st("display:inline-flex; align-items:center; gap:7px; padding:8px 13px 8px 10px; border-radius:var(--r); background:var(--card); box-shadow:inset 0 0 0 1px rgba(var(--rgb-teal),.18);")}>
                  <span style={st("display:flex; align-items:center; justify-content:center; width:24px; height:24px; border-radius:var(--r); background:rgba(var(--rgb-teal),.14); color:var(--tealD); flex-shrink:0;")}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d={personaIcon(tx)} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                  <span style={st("font-size:13.5px; font-weight:600; color:var(--tealD); line-height:1.2; text-transform:capitalize;")}>{tx}</span>
                </span>
              ))}
            </div>
          </div>
        )}
        {avoidIf.length > 0 && (
          <div style={st("border-radius:var(--r); padding:17px 18px; background:linear-gradient(160deg, rgba(var(--rgb-amber),.1), rgba(var(--rgb-amber),.03)); border:.5px solid rgba(var(--rgb-amber),.18);")}>
            <div style={st("display:flex; align-items:center; gap:8px; font-size:13px; font-weight:700; color:var(--acd);")}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9.5" stroke="var(--acd)" strokeWidth="1.8" /><path d="M12 7.5v5.5M12 16v.5" stroke="var(--acd)" strokeWidth="2" strokeLinecap="round" /></svg>
              {t("think_twice")}
            </div>
            <div style={st("display:flex; flex-direction:column; gap:9px; margin-top:14px;")}>
              {avoidIf.map((tx, i) => (
                <div key={i} style={st("display:flex; gap:9px; align-items:flex-start;")}>
                  <span style={st("display:flex; align-items:center; justify-content:center; width:20px; height:20px; border-radius:var(--r); background:rgba(var(--rgb-amber),.14); color:var(--acd); flex-shrink:0; margin-top:1px;")}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
                  </span>
                  <span style={st("font-size:13.5px; color:var(--mut); line-height:1.45;")}>{tx}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {major.length > 0 && (
        <div style={st("display:flex; flex-direction:column; gap:9px; margin-top:14px;")}>
          {major.map((cv, i) => <JustSoYouKnow key={i} text={cv.text} />)}
        </div>
      )}
      {notes.length > 0 && (
        <>
          <div style={st("font-size:11.5px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase; color:var(--acd); margin:20px 0 0;")}>{t("owners_flag")}</div>
          <div style={st("display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:9px; margin-top:11px;")}>
            {notes.map((cv, i) => (
              <div key={i} style={st("display:flex; gap:10px; padding:12px 14px; border-radius:var(--r); background:rgba(var(--rgb-amber),.08);")}>
                <span style={st("width:7px; height:7px; border-radius:var(--r); background:var(--acd); margin-top:6px; flex-shrink:0;")} />
                <span style={st("font-size:13.5px; color:var(--acd); line-height:1.5;")}>{cv.text}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- value retention — estimated depreciation + resale ৳ vs typical ---------- */
function ValueRetention({ brand, resale, updateRecord, ageYears, price }: {
  brand: string; resale: number; updateRecord: number | null; ageYears: number | null; price: number | null;
}) {
  const mine = retentionCurve(resale);
  const market = retentionCurve(5);
  const taTaka = (pctv: number) => price ? taka(Math.round(price * pctv / 100)) : null;
  const W = 300, H = 150, padL = 30, padR = 14, padT = 16, padB = 24;
  const x = (yr: number) => padL + (yr / 3) * (W - padL - padR);
  const y = (pctv: number) => padT + (1 - pctv / 100) * (H - padT - padB);
  const path = (arr: number[]) => arr.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p).toFixed(1)}`).join(" ");
  const area = `${path(mine)} L${x(3).toFixed(1)} ${y(0).toFixed(1)} L${x(0).toFixed(1)} ${y(0).toFixed(1)} Z`;
  const yr3 = mine[3] - market[3];
  const verdict = yr3 >= 6 ? t("holds_better") : yr3 <= -6 ? t("holds_worse") : t("holds_typical");
  const verdictColor = yr3 >= 6 ? "var(--tealD)" : yr3 <= -6 ? "var(--acd)" : "var(--mut)";
  const ageMark = ageYears != null && ageYears > 0 && ageYears <= 3 ? ageYears : null;

  return (
    <>
      <SectionLabel>{t("value_retention")}</SectionLabel>
      <div style={st(`font-size:14px; font-weight:700; color:${verdictColor}; margin-top:12px;`)}>{verdict}</div>
      <div style={st("font-size:12.5px; color:var(--mut2); margin-top:3px; line-height:1.5;")}>
        {t("est_resale_left")} <span style={st("font-weight:700; color:var(--ink2);")}>~{mine[3]}%</span>
        {taTaka(mine[3]) && <> (<span style={st("font-weight:700; color:var(--lnk);")}>≈ {taTaka(mine[3])}</span>)</>} {t("after_3y")}.
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={st("width:100%; margin-top:14px; overflow:visible;")}>
        <defs>
          <linearGradient id="vrfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--teal)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--teal)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[100, 75, 50, 25].map((g) => (
          <g key={g}>
            <line x1={padL} y1={y(g)} x2={W - padR} y2={y(g)} stroke="rgba(var(--rgb-ink),.07)" strokeWidth="1" />
            <text x={padL - 6} y={y(g) + 3} textAnchor="end" style={st("font-size:8px; fill:var(--faint);")}>{g}%</text>
          </g>
        ))}
        {[0, 1, 2, 3].map((yr) => (
          <text key={yr} x={x(yr)} y={H - 6} textAnchor="middle" style={st("font-size:8px; fill:var(--faint);")}>{yr === 0 ? "now" : `${yr}y`}</text>
        ))}
        <path d={area} fill="url(#vrfill)" />
        <path d={path(market)} fill="none" stroke="var(--faint)" strokeWidth="1.6" strokeDasharray="3 3" strokeLinecap="round" strokeLinejoin="round" />
        <path d={path(mine)} fill="none" stroke="var(--teal)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        {/* ৳ value labels at year 1/2/3 */}
        {[1, 2, 3].map((yr) => (
          <g key={yr}>
            <circle cx={x(yr)} cy={y(mine[yr])} r="2.8" fill="var(--teal)" />
            {taTaka(mine[yr]) && <text x={x(yr)} y={y(mine[yr]) - 7} textAnchor="middle" style={st("font-size:7.5px; font-weight:700; fill:var(--lnk);")}>{taTaka(mine[yr])}</text>}
          </g>
        ))}
        <circle cx={x(0)} cy={y(mine[0])} r="2.8" fill="var(--teal)" />
        {ageMark != null && (
          <line x1={x(ageMark)} y1={padT} x2={x(ageMark)} y2={H - padB} stroke="var(--acd)" strokeWidth="1.2" strokeDasharray="2 2" />
        )}
      </svg>

      <div style={st("display:flex; align-items:center; gap:14px; margin-top:8px; flex-wrap:wrap;")}>
        <span style={st("display:flex; align-items:center; gap:6px; font-size:11.5px; color:var(--mut); font-weight:600;")}><span style={st("width:14px; height:2.5px; border-radius:var(--r); background:var(--teal);")} />{brand}</span>
        <span style={st("display:flex; align-items:center; gap:6px; font-size:11.5px; color:var(--mut2);")}><span style={st("width:14px; height:0; border-top:2px dashed var(--faint);")} />{t("typical_phone")}</span>
        {updateRecord != null && (
          <span style={st("font-size:11.5px; color:var(--mut2); margin-left:auto;")}>{t("updates")} <span style={st("font-weight:700; color:var(--ink2);")}>{updateRecord}/10</span></span>
        )}
      </div>
      <p style={st("margin:13px 0 0; font-size:11px; color:var(--mut2); line-height:1.5;")}>{t("retention_disclaimer")}</p>
    </>
  );
}

// Mirror of engine.off_grade: official-grade ONLY when an authority shop
// tagged the row official — confident, never "maybe" (owner 2026-07-18: we
// know official for sure, SP1 model). The shop key grades the row; it is
// NEVER rendered (shops are anonymous infrastructure).
const OFFICIAL_AUTHORITY = new Set(["GadgetAndGear", "Pickaboo", "SumashTech", "RioInternational"]);
function offGrade(o: Offer): boolean {
  return OFFICIAL_AUTHORITY.has(o.shop) && o.official === "official";
}

// One row per VARIANT, not per anonymous seller: with names scrubbed a
// per-seller list is a wall of identical fillers ("Shop 1..11" / "A listing"),
// while the variant is the thing that actually moves the price. Each group
// carries its own price range + seller/stock/market chips (channel lives on
// the section header, callers pass one channel's offers at a time).
interface OfferGroup {
  variant: string; lo: number; hi: number; n: number;
  inStock: number; knownOut: boolean;
  regions: string[]; hasBest: boolean;
}

function groupOffers(offers: Offer[], bestPrice: number | null): OfferGroup[] {
  const m = new Map<string, Offer[]>();
  for (const o of offers) {
    const k = o.variant || "";
    const arr = m.get(k);
    if (arr) arr.push(o); else m.set(k, [o]);
  }
  const gs = [...m.entries()].map(([variant, os]) => ({
    variant,
    lo: Math.min(...os.map((o) => o.price)),
    hi: Math.max(...os.map((o) => o.price)),
    n: os.length,
    inStock: os.filter((o) => o.in_stock === true).length,
    knownOut: os.every((o) => o.in_stock === false),
    regions: [...new Set(os.map((o) => o.region).filter((r): r is string => !!r))],
    hasBest: bestPrice != null && os.some((o) => o.price === bestPrice),
  })).sort((a, b) => a.lo - b.lo);
  // the badge marks ONE group — the same price can appear in several variants
  let seen = false;
  for (const g of gs) {
    if (g.hasBest && seen) g.hasBest = false;
    seen = seen || g.hasBest;
  }
  return gs;
}

function VariantGroupRow({ g, lone }: { g: OfferGroup; lone: boolean }) {
  // lone unnamed group = every seller, so say that instead of "not stated"
  const title = g.variant || (lone ? t("all_sellers") : t("variant_unknown"));
  return (
    <div style={st(`display:flex; align-items:center; gap:11px; padding:12px 14px; border-radius:var(--r); background:${g.hasBest ? "var(--tint)" : "rgba(var(--rgb-ink),.035)"};`)}>
      <div style={st("flex:1; min-width:0;")}>
        <div style={st(`font-size:14px; font-weight:600; color:${g.variant ? "var(--ink2)" : "var(--mut2)"}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;`)}>{title}</div>
        <div style={st("display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin-top:5px;")}>
          {g.regions.map((r) => (
            <span key={r} style={st("font-size:10px; font-weight:700; padding:2px 8px; border-radius:var(--r); background:rgba(var(--rgb-ink),.06); color:var(--mut);")}>{r}</span>
          ))}
          {g.inStock > 0 ? (
            <span style={st("display:inline-flex; align-items:center; gap:5px; font-size:10px; font-weight:700; padding:2px 8px; border-radius:var(--r); color:var(--tealD); background:rgba(var(--rgb-teal),.1);")}>
              <span style={st("width:5px; height:5px; border-radius:var(--r); background:currentColor;")} />
              {/* "4 in stock" read as four UNITS sitting in a warehouse. It is
                  a count of SHOPS, which is what every other surface says. */}
              {t("in_stock_at")} {bnNum(String(g.inStock))} {g.inStock === 1 ? t("shop_one") : t("sellers")}
            </span>
          ) : g.knownOut ? (
            <span style={st("display:inline-flex; align-items:center; gap:5px; font-size:10px; font-weight:700; padding:2px 8px; border-radius:var(--r); color:var(--mut2); background:rgba(var(--rgb-ink),.055);")}>
              <span style={st("width:5px; height:5px; border-radius:var(--r); background:currentColor;")} />
              {t("stock_out")}
            </span>
          ) : null}
          {g.n > 1 && (
            <span style={st("font-size:10px; font-weight:700; padding:2px 8px; border-radius:var(--r); background:rgba(var(--rgb-ink),.06); color:var(--mut);")}>{bnNum(String(g.n))} {t("sellers")}</span>
          )}
        </div>
      </div>
      <span style={st("font-size:15px; font-weight:600; color:var(--ink); text-align:right;")}>{takaRange(g.lo, g.hi)}</span>
      {g.hasBest && <span style={st("font-size:10px; font-weight:700; color:var(--lnk); background:var(--card); padding:3px 9px; border-radius:var(--r);")}>{t("best_price")}</span>}
    </div>
  );
}

/* ---------- loading ---------- */
function LoadingDetail({ compact }: { compact?: boolean }) {
  const block = (w: string, h = "13px") =>
    st(`width:${w}; height:${h}; border-radius:var(--r); background:rgba(var(--rgb-ink),.07); animation:kpulse 1.4s ease-in-out infinite;`);
  return (
    <div style={st(`margin-top:14px;`)}>
      <style>{`@keyframes kpulse{0%,100%{opacity:.5}50%{opacity:1}}`}</style>
      {!compact && (
        <div style={st("display:flex; align-items:center; gap:13px; padding:17px 20px; border-radius:var(--r); background:var(--tint); margin-bottom:14px;")}>
          <span style={st("width:20px; height:20px; border-radius:var(--r); border:2.5px solid var(--tint2); border-top-color:var(--teal); animation:kspin .8s linear infinite; flex-shrink:0;")} />
          <span style={st("font-size:14px; font-weight:600; color:var(--ink2);")}>{t("loading_detail")}</span>
          <style>{`@keyframes kspin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}
      <div style={st("display:grid; grid-template-columns:repeat(auto-fit,minmax(330px,1fr)); gap:14px;")}>
        {[0, 1].map((c) => (
          <div key={c} style={st("background:var(--card); border-radius:var(--r); padding:24px; display:flex; flex-direction:column; gap:12px;")}>
            <div style={block("40%")} /><div style={block("90%")} /><div style={block("80%")} /><div style={block("60%")} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- layout helpers ---------- */
function Wrap({ children }: { children: ReactNode; onBack?: () => void }) {
  // No back button here any more. This screen was offering three of them at
  // once — breadcrumb, this pill, and the floating dock (owner 2026-07-26).
  // The breadcrumb is the one every other page on the site uses; the dock
  // catches you at the bottom of a long page.
  return (
    <div style={st("max-width:880px; margin:0 auto; animation:kfade .45s cubic-bezier(.2,.7,.2,1) both;")}>
      {children}
    </div>
  );
}
function Card({ children }: { children: ReactNode }) {
  return <div style={st("background:var(--card); border-radius:var(--r); padding:clamp(20px,3vw,28px); box-shadow:0 1px 2px rgba(var(--rgb-ink),.05), 0 10px 28px rgba(var(--rgb-ink),.07); break-inside:avoid; margin-bottom:14px;")}>{children}</div>;
}
function SectionLabel({ children }: { children: ReactNode }) {
  return <div style={st("font-size:12px; font-weight:700; letter-spacing:1.8px; text-transform:uppercase; color:var(--mut2);")}>{children}</div>;
}
