import type { ReactNode } from "react";
import { AXES, axisLabel, classifyCaveats, fitOf, headlinePhrase, retentionCurve, st, taka, takaRange, verdictMeta } from "../theme";
import { bnNum, t } from "../i18n";
import type { Connectivity, OpinionProfile, PhoneDetail, Pick } from "../api";
import { BrandLogo, brandLogo } from "./BrandLogo";
import { PhonePhoto } from "./PhonePhoto";
import { JustSoYouKnow } from "./Compare";
import { ChannelChips, DataCautionChip, MarketChips, PriceSource } from "./ResultsScreen";
import { ShopPrices } from "./ShopPrices";
import { Fold, SpecIcon } from "./Chrome";
import { YoutubeSection } from "./YoutubeSection";
import { PriceHistory } from "./PriceHistory";

interface Props {
  detail: PhoneDetail | null;
  hint?: Pick | null;          // the result pick — renders the hero instantly
  loading: boolean;
  error: string | null;
  budget: number;
  /** the day we last read every BD shop, for the price table's header */
  checked?: string;
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

export function DetailScreen({ detail, hint, loading, error, budget, checked, onBack, onRetry }: Props) {
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
  const praiseFlags = op.praise_flags || [];
  const blameFlags = op.complaint_flags || [];
  const specs = buildSpecs(d);
  const conn = connRows(d?.connectivity, d?.traits);
  const bs = d?.brand_summary;
  // every shop listing, named, cheapest first, with the axes to narrow them by
  // — derived by the backend so this screen and the /phone/ page cannot
  // disagree about who is cheapest (core.specfmt.listing_view)
  const listings = d?.listings || null;

  /* The shop list, split into one view per channel. `unstated` rides with
     unofficial: it is a listing whose warranty nobody would call official, and
     a third card for "we could not tell" would be a bucket, not a market.
     One channel present = one card under the plain heading, because a split
     with nothing on the other side is just a label. */
  const shopCards = (() => {
    if (!listings || !listings.listings.length) return [];
    const axes = listings.axes.filter((a) => a.key !== "chan");
    const official = listings.listings.filter((l) => l.channel === "official");
    const other = listings.listings.filter((l) => l.channel !== "official");
    if (!official.length || !other.length) {
      return [{ key: "all", chan: null, title: t("where_to_buy"), view: listings }];
    }
    return [
      { key: "official", chan: "official", title: t("where_to_buy"),
        view: { ...listings, listings: official, axes } },
      { key: "unofficial", chan: "unofficial", title: t("where_to_buy"),
        view: { ...listings, listings: other, axes } },
    ];
  })();

  const traitChips = (cls: string) =>
    traits.length > 0 ? (
      <div className={cls} style={st("display:flex; flex-wrap:wrap; gap:6px; margin-top:13px;")}>
        {traits.map((tx, i) => (
          <span key={i} style={st("font-size:11.5px; font-weight:600; white-space:nowrap; color:var(--mut); background:rgba(var(--rgb-ink),.05); padding:5px 11px; border-radius:var(--r);")}>{tx}</span>
        ))}
      </div>
    ) : null;

  return (
    <Wrap onBack={onBack}>
      {/* hero (renders instantly from the pick hint) */}
      {/* .dhero owns the COLUMNS and the photo size (pick/index.html): both
          need media queries, which an inline style attribute cannot carry */}
      <div className="dhero" style={st("background:var(--card); border-radius:var(--r); padding:clamp(20px,3vw,32px); box-shadow:0 1px 2px rgba(var(--rgb-ink),.05), 0 16px 40px rgba(var(--rgb-ink),.09); margin-top:16px;")}>
        <div className="dphoto">
          <PhonePhoto src={image} pid={pid} w="var(--ph-w)" h="var(--ph-h)" radius={18} pad={2} bg="transparent" />
        </div>
        <div className="dident" style={st("min-width:0;")}>
            <div style={st("display:flex; align-items:center; gap:9px; flex-wrap:wrap;")}>
              <span style={st("display:flex; align-items:center; gap:7px; font-size:13px; color:var(--mut2); font-weight:500;")}>
                <BrandLogo brand={brand} h={22} max="120px" named />
                {!brandLogo(brand) && brand}
              </span>
              {/* only a confident "Top pick" or an honest "Has trade-offs" — never a lukewarm "Worth a look" on a phone the buyer is already looking at */}
              {(rec === "buy" || rec === "avoid") && <span style={st(`font-size:11.5px; font-weight:700; padding:4px 11px; border-radius:var(--r); color:${vm.c}; background:${vm.bg};`)}>{vm.label}</span>}
            </div>
            <h1 style={st("margin:4px 0 0; font-size:clamp(26px,3.6vw,38px); font-weight:700; letter-spacing:-1.2px; line-height:1.1;")}>{model}</h1>
            <div style={st("margin-top:8px; font-size:14px; color:var(--mut);")}>{headlinePhrase(dom)}{scores[dom] != null && <> · {axisLabel(dom)} <span style={st("color:var(--lnk); font-weight:700;")}>{scores[dom]}</span></>}</div>
            {traitChips("dtraits")}
        </div>
        <div className="dprice">
          <div className="dpmain">
          <div style={st("display:flex; align-items:flex-end; gap:11px; flex-wrap:wrap;")}>
            {/* the lowest price is the number; the top of the range is its
                footnote, so the pair never breaks at the dash (owner
                2026-09-12: the hero's price ran over two lines) */}
            <span style={st("font-size:clamp(28px,3.4vw,38px); font-weight:300; letter-spacing:-1.4px; line-height:1;")}>{priceLo && priceHi && priceHi > priceLo ? taka(priceLo) : takaRange(priceLo, priceHi)}</span>
            {priceLo && priceHi && priceHi > priceLo ? (
              <span style={st("font-size:15px; font-weight:500; color:var(--mut); white-space:nowrap; margin-bottom:2px;")}>– {taka(priceHi)}</span>
            ) : null}
          </div>
          <div style={st("display:flex; align-items:center; gap:7px; margin-top:10px; flex-wrap:wrap;")}>
            <ChannelChips p={{ best_price_official: isOff, best_official_price: offPrice, channels: chans }} />
            {/* which import market the money buys — same chips as the /phone/
                page hero and the guide cards */}
            <MarketChips regions={d?.regions} max={3} />
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
      </div>

      {(() => { const m = classifyCaveats(caveats).major[0]; return m ? <div style={st("margin-top:14px;")}><JustSoYouKnow text={m.text} /></div> : null; })()}

      {/* The "Choose RAM & storage" card used to sit here. It was the
          shop-ANONYMOUS summary of exactly what the shop board below now
          shows per named shop -- variant, channel, stock count, market,
          colours, price range -- so the screen asked the buyer to pick a
          configuration twice, once from a bucket and once from real listings
          (owner 2026-08-04). The board's Memory axis is the config chooser
          now, and the price it lands on belongs to a listing that exists. */}

      {/* the verdict, laid out as the /phone/ page lays it (verdict v6):
          the answer in a rail, the evidence and the argument beside it */}
      {(ourTake || bestFor.length > 0 || avoidIf.length > 0 || praiseFlags.length > 0 || blameFlags.length > 0) && (
        <Verdict model={model} take={ourTake} bestFor={bestFor} avoidIf={avoidIf}
          works={praiseFlags} tradeoffs={blameFlags} sources={!!d?.youtube?.videos?.length} />
      )}

      {/* How this phone rates — the /phone/ page's two columns. */}
      {(() => {
        const card = d?.ratings_card || null;
        const mined = d?.opinion_profile?.ratings || null;
        const keys = mined
          ? Object.keys(mined).filter((k) => typeof mined[k] === "number")
            .sort((a, b) => mined[b] - mined[a])
          : [];
        if (!card && keys.length === 0) return null;
        const avg = keys.length
          ? keys.reduce((s, k) => s + mined![k], 0) / keys.length : null;
        const basis = (d?.opinion_profile?.rating_basis || "").trim();
        const conf = (d?.opinion_profile?.rating_confidence || "").toLowerCase();
        // said every time, not only where the miner left a basis line: the
        // scale is someone else's reading and the card says so
        const note = [
          basis ? (/[.!?]$/.test(basis) ? basis : basis + ".") : "",
          t("v_basis_note"),
          conf === "low" ? t("v_hedge_low") : conf && conf !== "high" ? t("v_hedge_mid") : "",
        ].filter(Boolean).join(" ");
        return (
          <div style={st("background:var(--card); border-radius:var(--r); padding:clamp(20px,3vw,28px); box-shadow:0 1px 2px rgba(var(--rgb-ink),.05), 0 10px 28px rgba(var(--rgb-ink),.07); margin-top:14px;")}>
            <SectionLabel>{t("v_rates_title")}</SectionLabel>
            <div style={st("display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr)); gap:26px 50px; margin-top:16px;")}>
              {card && (
                <div style={st("min-width:0;")}>
                  <ColHead title={t("v_col_catalogue")} scale={t("v_scale_100")} />
                  <div style={st("display:flex; align-items:center; gap:18px; margin:4px 0 12px;")}>
                    <Ring v={card.overall} />
                    <p style={st("margin:0; font-size:15px; line-height:1.5; color:var(--tx); max-width:26ch; text-wrap:balance;")}>
                      {t("v_ahead").replace("{p}", bnNum(String(card.overall)))
                        .replace("{n}", bnNum(String(card.n)))}
                    </p>
                  </div>
                  {CAP_ORDER.map((k) => {
                    const v = card[k];
                    return v == null ? null : (
                      <RateRow key={k} label={axisLabel(k)} pct={v}
                        out={bnNum(String(v))} lvl={band100(v)} />
                    );
                  })}
                </div>
              )}
              {keys.length > 0 && (
                <div style={st("min-width:0;")}>
                  <ColHead title={t("v_col_owners")} scale={t("v_scale_10")} />
                  {avg != null && (
                    <p style={st("display:flex; align-items:baseline; gap:10px; margin:0 0 8px;")}>
                      <b style={st("font-family:var(--f-display); font-size:36px; font-weight:700; letter-spacing:-1px; line-height:1.1; color:var(--tealD); font-variant-numeric:tabular-nums;")}>{bnNum(avg.toFixed(1))}</b>
                      <span style={st("font-size:14px; color:var(--mut);")}>{t("v_avg").replace("{n}", bnNum(String(keys.length)))}</span>
                    </p>
                  )}
                  {keys.map((k) => (
                    <RateRow key={k} label={axisLabel(k)} pct={Math.min(100, mined![k] * 10)}
                      out={bnNum(String(mined![k]))} lvl={band10(mined![k])} />
                  ))}
                  <p style={st("margin:14px 0 0; font-size:14px; line-height:1.6; color:var(--mut); max-width:62ch;")}>{note}</p>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* full-record sections, or a skeleton while they load */}
      {!d ? <LoadingDetail compact /> : (
      <>
      {/* what owners flag -- best-for and avoid-if are the verdict's two
          "choose it if / consider alternatives if" lines now */}
      {caveats.length > 0 && <OwnerFlags caveats={caveats} />}

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

        {/* Price history, in the column the specs card leaves empty.
            Two things at once (owner 2026-08-30): the app typed
            `price_history` and drew nothing -- "why price graphs missing from
            the picker" -- and this masonry stood half empty beside a specs
            card that never fills it, which is the "vertical layout free
            space" the same message pointed at. One chart per channel, each on
            its own scale, the sitewide rule the /phone/ pages moved to that
            day. */}
        {(d?.price_history?.length ?? 0) >= 3 && (
          <Card>
            <SectionLabel>{t("price_history")}</SectionLabel>
            <div style={st("margin-top:14px;")}>
              <PriceHistory history={d!.price_history!} />
            </div>
          </Card>
        )}

        {/* What reviewers said, IN the masonry (owner 2026-08-30: "couldnt u
            move the yt reviews in the blank space ... so no invisible space").
            This block used to sit full width in a row of its own, on the
            argument that a 330px column turns every review into a single
            stacked row. It does -- and a stacked row with the still on the
            left is the same shape the /phone/ page uses on a narrow screen,
            which reads fine. What does not read fine is the hole: the specs
            card is tall, the price charts are short, and the column beside
            them ended in a third of a screen of nothing. Filling that beats
            three-across. */}
        {d?.youtube && (d.youtube.videos?.length || d.youtube.points?.length || d.youtube.verdict) && (
          <Card><YoutubeSection yt={d.youtube} /></Card>
        )}

        {/* value retention (estimated from brand resale reputation) */}
        {bs?.resale != null && (
          <Card><ValueRetention brand={brand} resale={bs.resale} updateRecord={bs.update_record ?? null} ageYears={d?.age_years ?? h?.age_years ?? null} price={price} /></Card>
        )}

        {/* opinion */}
        {(op.llm_summary || quotes.length > 0) && (
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
          </Card>
        )}
      </div>

      {/* Who sells it, at what price — last, and clearly flagged as prices
            we read off shop websites rather than confirmed at a counter.

            Shops are NAMED here now (owner 2026-08-04). This screen used to
            scrub them and group by channel-then-variant while the static
            /phone/ page named every one, so the same phone had two answers to
            "who is cheapest". Both render core.specfmt.listing_view now.
            Still no outbound links: naming a shop is disclosure, sending it
            traffic is a business model we do not have. */}
        {/* ONE CARD PER CHANNEL (owner 2026-08-30: "split the shop list into
            two cards, OFFICIAL AND UNOFFICIAL"). Same split the price charts,
            the daily posts and the /phone/ pages all moved to: official and
            unofficial are separate markets, and a single list interleaved them
            so the cheapest row was whichever channel happened to undercut,
            with the warranty question left to the reader.

            These cards sit OUTSIDE the two-column flow above. They used to be
            in it, and once the listings became a TABLE that stopped working:
            the table wants ~513px, a 330px column gives it 407, and unlike
            the listing cards it replaced a table cannot shrink to fit — it
            spilled 106px past the card's edge (owner 2026-09-12). Full width
            is also the shape the /phone/ page gives this section.

            The `chan` axis is dropped inside each card: filtering a channel
            list by channel is a control that can only ever remove everything.
            A phone that sells on one channel only renders one card, under the
            plain heading, because "official" on its own is not a split. */}
        {shopCards.map((c, i) => {
          const ch = c.chan ? CHAN_CARD[c.chan] : null;
          return (
          <Card key={c.key} accent={ch?.ink}>
            <div style={st("display:flex; align-items:center; gap:10px; flex-wrap:wrap;")}>
              <SectionLabel>{c.title}</SectionLabel>
              {ch && (
                <span style={st(`display:inline-flex; align-items:center; font-size:12px; font-weight:700; padding:5px 12px; border-radius:var(--r); color:${ch.ink}; background:${ch.bg};`)}>{t(ch.pill)}</span>
              )}
            </div>
            {ch && (
              <p style={st("margin:8px 0 0; font-size:13px; line-height:1.55; color:var(--mut2);")}>{t(ch.note)}</p>
            )}
            {i === 0 && (
              <p style={st("margin:9px 0 0; font-size:13.5px; line-height:1.6; color:var(--mut2); max-width:70ch; text-wrap:pretty;")}>{t("prices_sub")}</p>
            )}
            {i === 0 && (
              <>
                <div style={st("display:flex; gap:9px; margin-top:12px; padding:12px 14px; border-radius:var(--r); background:rgba(var(--rgb-amber),.1);")}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" style={st("flex-shrink:0; margin-top:1px;")}><path d="M12 3L2 21h20L12 3zM12 9v5M12 17.5v.5" stroke="var(--acd)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  <span style={st("font-size:13.5px; color:var(--acd); line-height:1.55;")}>{t("price_warning")}</span>
                </div>
                {/* the warranty premium, subtracted for the reader and told
                    once — only on a configuration where BOTH channels are
                    really on sale, or it is two different phones being
                    subtracted */}
                {listings!.premium && (
                  <p style={st("margin:14px 0 0; font-size:13.5px; line-height:1.55; color:var(--mut);")}>
                    {t("warranty_premium")
                      .replace("{v}", listings!.premium.variant)
                      .replace("{p}", taka(listings!.premium.diff))}
                  </p>
                )}
              </>
            )}
            <ShopPrices view={c.view} checked={checked} />
            {i === shopCards.length - 1 && (
              <p style={st("margin:18px 0 0; padding-top:14px; border-top:1px solid rgba(var(--rgb-ink),.06); font-size:12px; color:var(--faint); line-height:1.55; text-wrap:pretty;")}>
                {t("shop_names_note")}
              </p>
            )}
          </Card>
          );
        })}
      </>
      )}
    </Wrap>
  );
}

/* ---------- how this phone rates (2026-09-12) ----------
   The /phone/ page's two-column block, brought over whole. Two columns
   because there are two questions: where this phone ranks against everything
   we publish, and what owners and reviewers actually said. They are on
   different scales and each column is headed by its own, which is what stops
   a 0-100 percentile reading as a second opinion score. */

/* Band colours, the static pages' own: a flat bar makes a 6.0 look like a
   9.5, which is exactly the judgement a buyer needs to see. */
const BAND_BAR = ["var(--ac)", "var(--aqua)", "var(--teal)", "var(--tealD)"];
const BAND_INK = ["var(--lnk)", "var(--mut)", "var(--teal)", "var(--tealD)"];
const band100 = (v: number) => (v >= 80 ? 3 : v >= 62 ? 2 : v >= 42 ? 1 : 0);
const band10 = (v: number) => (v >= 8 ? 3 : v >= 6.5 ? 2 : v >= 5 ? 1 : 0);
/* the catalogue card's rows, in the order the /phone/ page prints them */
const CAP_ORDER = ["performance", "camera", "battery", "display", "software", "value"] as const;

function ColHead({ title, scale }: { title: string; scale: string }) {
  return (
    <div style={st("display:flex; align-items:baseline; justify-content:space-between; gap:12px; padding-bottom:10px; margin-bottom:12px; border-bottom:1px solid rgba(var(--rgb-ink),.10);")}>
      <h3 style={st("margin:0; font-size:17px; font-weight:700; letter-spacing:-.2px; color:var(--ink);")}>{title}</h3>
      <span style={st("font-size:13px; color:var(--mut); white-space:nowrap;")}>{scale}</span>
    </div>
  );
}

/* label, bar, number -- the same three columns on both sides, so the eye can
   run down one and across to the other. The label track flexes instead of
   taking a media query: at 360 a fixed 132px left nothing for the bar. */
function RateRow({ label, pct, out, lvl }: {
  label: string; pct: number; out: string; lvl: number;
}) {
  return (
    <div style={st("display:grid; grid-template-columns:minmax(88px,132px) minmax(0,1fr) 38px; gap:8px 14px; align-items:center; padding:6px 0; font-size:15px; color:var(--tx);")}>
      <span>{label}</span>
      <span style={st("height:8px; border-radius:var(--r); background:rgba(var(--rgb-ink),.08); overflow:hidden;")}>
        <i style={st(`display:block; height:100%; border-radius:var(--r); width:${pct}%; background:${BAND_BAR[lvl]};`)} />
      </span>
      <b style={st(`font-weight:700; text-align:right; font-variant-numeric:tabular-nums; color:${BAND_INK[lvl]};`)}>{out}</b>
    </div>
  );
}

function Ring({ v }: { v: number }) {
  const r = 39, c = 2 * Math.PI * r, lvl = band100(v);
  return (
    <span style={st("position:relative; flex:none; display:inline-flex; align-items:center; justify-content:center; width:88px; height:88px;")}>
      <svg viewBox="0 0 88 88" aria-hidden="true" style={st("width:100%; height:100%; transform:rotate(-90deg);")}>
        <circle cx="44" cy="44" r={r} fill="none" strokeWidth="6" stroke="rgba(var(--rgb-ink),.09)" />
        <circle cx="44" cy="44" r={r} fill="none" strokeWidth="6" strokeLinecap="round"
          stroke={BAND_BAR[lvl]} strokeDasharray={`${(c * v / 100).toFixed(1)} ${c.toFixed(1)}`} />
      </svg>
      <b style={st(`position:absolute; font-family:var(--f-display); font-weight:700; font-size:30px; letter-spacing:-.5px; color:${BAND_INK[lvl]};`)}>{bnNum(String(v))}</b>
    </span>
  );
}

/* ---------- the verdict (verdict v6, 2026-09-11) ----------
   The /phone/ page's shape: the answer in a rail on the left, the evidence
   and the argument beside it, one column on a phone. It is a synthesis of
   published reviews and owner reports, never our own testing, and it says
   so. */
/* An opinion key as words -- "performance_gaming" is "Gaming performance".
   A key we have no label for still reads as words, never as a slug. */
function opinionWord(prefix: string, key: string): string {
  const s = t(prefix + key);
  return s && s !== prefix + key ? s : key.replace(/_/g, " ");
}

function Verdict({ model, take, bestFor, avoidIf, works, tradeoffs, sources }: {
  model: string; take: string | null; bestFor: string[]; avoidIf: string[];
  works: string[]; tradeoffs: string[]; sources: boolean;
}) {
  const text = (take || "").trim();
  // the opening sentence is the answer; the rest is the argument for it
  const m = text.match(/^(.+?[.!?])\s+([\s\S]+)$/);
  const lead = m ? m[1] : text;
  const rest = m ? m[2] : "";
  // each column flows on its own; with nothing for the right one the
  // rail takes the width instead of leaving a half empty
  const right = works.length > 0 || tradeoffs.length > 0 || !!rest;
  const RULE = "1px solid rgba(var(--rgb-ink),.08)";
  const H3 = st("margin:0 0 4px; font-size:18px; font-weight:800; letter-spacing:-.3px; color:var(--ink);");
  const DT = st("font-size:14.5px; font-weight:700; color:var(--ink);");
  const DD = st("margin:4px 0 0; font-size:14.5px; line-height:1.55; color:var(--ink2);");
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return (
    <section className={right ? "kverd" : "kverd solo"} style={st("margin-top:14px; background:var(--card); border-radius:var(--r); padding:clamp(20px,3vw,30px); box-shadow:0 1px 2px rgba(var(--rgb-ink),.05), 0 10px 28px rgba(var(--rgb-ink),.07);")}>
      <div className="kv-l">
        <div className="kv-hd">
          <div style={st("font-size:12px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:var(--acd);")}>{t("v_eyebrow")}</div>
          <h2 style={st("margin:8px 0 0; font-size:clamp(24px,3vw,32px); font-weight:800; line-height:1.05; letter-spacing:-.8px; color:var(--ink); text-wrap:balance;")}>{model}</h2>
          <div style={st("margin-top:6px; font-size:17px; color:var(--mut);")}>{t("v_question")}</div>
          {lead && (
            <>
              <span aria-hidden="true" style={st("display:block; width:48px; height:2px; margin-top:18px; background:var(--acd);")} />
              <p style={st("margin:16px 0 0; font-size:19px; font-weight:700; line-height:1.3; letter-spacing:-.2px; color:var(--tealD); text-wrap:pretty;")}>{lead}</p>
            </>
          )}
          {/* the balance before a word is read -- and only when there IS a
              balance: a bar of one colour says nothing the heading has not
              (owner 2026-09-12, "glancing it once ... should let users know
              whats the thing with the phones") */}
          {works.length > 0 && tradeoffs.length > 0 && (
            <div role="img"
              aria-label={`${works.length} ${t("v_bal_good")}, ${tradeoffs.length} ${t("v_bal_bad")}`}
              style={st("display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin:18px 0 0; font-size:13px;")}>
              <span aria-hidden="true" style={st("display:flex; gap:3px; width:clamp(96px,32vw,150px); height:8px;")}>
                <i style={st(`flex:${works.length}; border-radius:99px; background:var(--teal);`)} />
                <i style={st(`flex:${tradeoffs.length}; border-radius:99px; background:var(--ac);`)} />
              </span>
              <span aria-hidden="true">
                <b style={st("font-weight:700; color:var(--tealD);")}>{bnNum(String(works.length))} {t("v_bal_good")}</b>
                <span style={st("color:var(--mut2);")}> · </span>
                <b style={st("font-weight:700; color:var(--acd);")}>{bnNum(String(tradeoffs.length))} {t("v_bal_bad")}</b>
              </span>
            </div>
          )}
        </div>
        {(bestFor.length > 0 || avoidIf.length > 0) && (
          <dl className="kv-fit" style={st("margin:22px 0 0;")}>
            {/* best_for is a list of use cases, so it reads under "Best for";
                "Choose it if" belongs to a sentence, which this is not */}
            {bestFor.length > 0 && <><dt style={DT}>{t("yt_best_for")}</dt><dd style={DD}>{cap(bestFor.map((k) => opinionWord("bf_", k)).join(", "))}</dd></>}
            {avoidIf.length > 0 && (
              <>
                <dt style={{ ...DT, marginTop: bestFor.length ? 16 : 0 }}>{t("v_consider")}</dt>
                {avoidIf.map((x, i) => <dd key={i} style={DD}>{cap(x)}</dd>)}
              </>
            )}
          </dl>
        )}
        <div className="kv-src" style={st(`margin-top:22px; padding-top:12px; border-top:${RULE};`)}>
          <div style={st("font-size:12.5px; line-height:1.5; color:var(--mut2);")}>{t("v_basis")}</div>
          {sources && (
            <button type="button" className="kytall"
              onClick={() => document.getElementById("k-yt")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              style={st("display:inline-flex; align-items:center; gap:7px; min-height:44px; padding:0; border:0; background:none; cursor:pointer; font:inherit; font-size:14px; font-weight:600; color:var(--ink); text-decoration:underline; text-underline-offset:4px;")}>
              {t("v_sources")} <span aria-hidden="true">↓</span>
            </button>
          )}
        </div>
      </div>
      {right && (
        <div className="kv-r">
          {(works.length > 0 || tradeoffs.length > 0) && (
            <div className="kv-cols" style={st("display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr)); gap:18px 28px; align-content:start;")}>
              {/* Tinted, so which list is which is answered by colour
                  before it is answered by reading. Same pairing as the
                  /phone/ page: teal for what works, amber for what does
                  not. */}
              {([[works, t("v_works"), "var(--tealD)", "rgba(var(--rgb-teal),.07)"],
                 [tradeoffs, t("v_tradeoffs"), "var(--acd)", "rgba(var(--rgb-amber),.10)"]] as const)
                .map(([xs, label, ink, fill]) => xs.length === 0 ? null : (
                <div key={label} style={st(`min-width:0; padding:16px 18px 8px; border-radius:var(--r); background:${fill};`)}>
                  <h3 style={st(`display:flex; align-items:center; gap:9px; margin:0 0 4px; font-size:17px; font-weight:800; letter-spacing:-.3px; color:${ink};`)}>
                    {label}
                    <span style={st("margin-left:auto; min-width:26px; padding:2px 8px; border-radius:var(--r-pill); background:var(--card); font-size:12px; font-weight:700; text-align:center; color:var(--ink);")}>{bnNum(String(xs.length))}</span>
                  </h3>
                  {xs.map((x, i) => (
                    <div key={i} style={st(`padding:11px 0; font-size:15px; font-weight:600; line-height:1.45; color:var(--ink2);${i < xs.length - 1 ? ` border-bottom:${RULE};` : ""}`)}>{cap(opinionWord("asp_", x))}</div>
                  ))}
                </div>
              ))}
            </div>
          )}
          {rest && (
            <div className="kv-why" style={st(`margin-top:22px; padding-top:18px; border-top:${RULE};`)}>
              <h3 style={H3}>{t("v_why")}</h3>
              <p style={st("margin:8px 0 0; max-width:75ch; font-size:15px; line-height:1.65; color:var(--ink2); text-wrap:pretty;")}>{rest}</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/* ---------- what owners flag ----------
   Best-for and avoid-if read as the verdict's "choose it if / consider
   alternatives if" now, so this card is the caveats alone. */
function OwnerFlags({ caveats }: { caveats: { text: string; sev?: string }[] }) {
  const { major, notes } = classifyCaveats(caveats);
  if (!major.length && !notes.length) return null;
  return (
    <div style={st("background:var(--card); border-radius:var(--r); padding:clamp(20px,3vw,28px); box-shadow:0 1px 2px rgba(var(--rgb-ink),.05), 0 10px 28px rgba(var(--rgb-ink),.07); margin-top:14px;")}>
      <SectionLabel>{t("owners_flag")}</SectionLabel>
      {major.length > 0 && (
        <div style={st("display:flex; flex-direction:column; gap:9px; margin-top:14px;")}>
          {major.map((cv, i) => <JustSoYouKnow key={i} text={cv.text} />)}
        </div>
      )}
      {notes.length > 0 && (
        <div style={st("display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr)); gap:9px; margin-top:14px;")}>
          {notes.map((cv, i) => (
            <div key={i} style={st("display:flex; gap:10px; padding:12px 14px; border-radius:var(--r); background:rgba(var(--rgb-amber),.08);")}>
              <span style={st("width:7px; height:7px; border-radius:var(--r); background:var(--acd); margin-top:6px; flex-shrink:0;")} />
              <span style={st("font-size:13.5px; color:var(--acd); line-height:1.5;")}>{cv.text}</span>
            </div>
          ))}
        </div>
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
    <div style={st("max-width:940px; margin:0 auto; animation:kfade .45s cubic-bezier(.2,.7,.2,1) both;")}>
      {children}
    </div>
  );
}
function Card({ children, accent }: { children: ReactNode; accent?: string }) {
  return <div style={st(`background:var(--card); border-radius:var(--r); padding:clamp(20px,3vw,28px); box-shadow:0 1px 2px rgba(var(--rgb-ink),.05), 0 10px 28px rgba(var(--rgb-ink),.07); break-inside:avoid; margin-bottom:14px;${accent ? ` border-top:3px solid ${accent};` : ""}`)}>{children}</div>;
}

/* The two shop cards carry the SAME shops, the same variant chips and prices
   in the same order -- the only thing that differed was a "· Official" suffix
   on a 12px grey label, so at a glance the buyer could not tell which market
   they were reading (owner 2026-08-30: "the both price variant picking thing
   looks almost identical"). Each card now states its channel in its own colour
   and says what that channel means for the warranty. Strings are the ones the
   quiz and the hero chips already use, so the wording matches everywhere. */
const CHAN_CARD: Record<string, { pill: string; note: string; ink: string; bg: string }> = {
  official: { pill: "official_bd", note: "s_warranty_why",
    ink: "var(--tealD)", bg: "rgba(var(--rgb-teal),.12)" },
  unofficial: { pill: "unofficial_import", note: "q_channel_s",
    ink: "var(--acd)", bg: "rgba(var(--rgb-amber),.13)" },
};
function SectionLabel({ children }: { children: ReactNode }) {
  return <div style={st("font-size:12px; font-weight:700; letter-spacing:1.8px; text-transform:uppercase; color:var(--mut2);")}>{children}</div>;
}
