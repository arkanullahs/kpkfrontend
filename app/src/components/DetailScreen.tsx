import type { ReactNode } from "react";
import { AXES, axisLabel, fitOf, headlinePhrase, MAYBE_OFFICIAL_STYLE, retentionCurve, sevColor, st, taka, verdictMeta } from "../theme";
import { t } from "../i18n";
import type { Offer, OpinionProfile, PhoneDetail, Pick } from "../api";
import { PhonePhoto } from "./PhonePhoto";
import { CompareCard } from "./Compare";

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

function buildSpecs(s: Record<string, any> | undefined): { k: string; v: string }[] {
  if (!s) return [];
  const out: { k: string; v: string }[] = [];
  const push = (k: string, v: any, suffix = "") => { if (v != null && v !== "") out.push({ k, v: String(v) + suffix }); };
  push("Chipset", s.chipset);
  push("Battery", s.battery_mah, " mAh");
  push("Charging", s.charging_w, "W");
  if (s.display_inch) out.push({ k: "Display", v: `${s.display_inch}″${s.display_type ? " " + String(s.display_type).split(",")[0] : ""}` });
  push("Refresh rate", s.refresh_hz, "Hz");
  if (s.main_camera_mp) out.push({ k: "Camera", v: `${s.main_camera_mp}MP${s.has_tele ? " + tele" : ""}${s.has_ultrawide ? " + ultrawide" : ""}` });
  push("OIS", s.has_ois ? "Yes" : s.has_ois === false ? "No" : null);
  push("Weight", s.weight_g, " g");
  push("Software", s.os);
  push("Network", s.net_5g ? "5G" : "4G");
  return out;
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
  if (error) return <Wrap onBack={onBack}><div style={st("padding:60px 0; text-align:center; color:#c4503c;")}>{error}<br /><button onClick={onRetry} style={st("margin-top:16px; padding:10px 20px; border-radius:99px; border:none; cursor:pointer; background:var(--ac); color:#fff; font-weight:600;")}>Retry</button></div></Wrap>;

  const d = detail;
  const h = hint || null;
  const any = d || h;
  if (!any) {
    if (loading) return <Wrap onBack={onBack}><LoadingDetail /></Wrap>;
    return <Wrap onBack={onBack}><div style={st("padding:60px 0; text-align:center; color:#80868f;")}>Pick a phone from the results to see its full breakdown.</div></Wrap>;
  }

  // merged hero view-model: prefer full detail, fall back to the result pick
  const brand = d?.brand ?? h?.brand ?? "";
  const model = d?.model ?? h?.model ?? "";
  const image = d?.image ?? h?.image ?? null;
  const pid = d?.id ?? h?.id ?? null;
  const upgrade = h?.upgrade ?? null;   // comes from the result pick (when current phone set)
  const scores = (d?.blended_scores && Object.keys(d.blended_scores).length ? d.blended_scores : null)
    || (h?.blended_scores && Object.keys(h.blended_scores).length ? h.blended_scores : null)
    || d?.scores || {};
  const dom = h?.headline_axis || domAxis(scores);
  const price = d?.best_price ?? h?.best_price ?? null;
  const officialRef = d?.official_ref ?? h?.official_ref ?? null;
  const rec = d?.ai_verdict?.recommendation ?? h?.verdict?.recommendation;
  const vm = verdictMeta(rec);
  const { fit, fitColor } = fitOf(price ?? budget, budget);
  const traits = buildTraits(d?.traits);
  const ourTake = h?.smart_verdict || d?.ai_verdict?.verdict || null;
  const inStock = d?.in_stock_shops ?? h?.in_stock_shops ?? 0;

  // sections that require the full DB record
  const op = d?.opinion_profile || {};
  const caveats = d?.caveats ?? h?.caveats ?? [];
  const quotes = ownerQuotes(op, caveats.map((c) => c.text));
  const bestFor = (op.best_for?.length ? op.best_for : d?.ai_verdict?.best_for) || [];
  const avoidIf = op.avoid_if || [];
  const specs = buildSpecs(d?.specs);
  const bs = d?.brand_summary;
  const offers = [...(d?.offers || [])].sort((a, b) => a.price - b.price);
  const bestOfferPrice = offers.length ? offers[0].price : null;

  return (
    <Wrap onBack={onBack}>
      {/* hero (renders instantly from the pick hint) */}
      <div style={st("background:rgba(255,255,255,.92); border-radius:26px; padding:clamp(20px,3vw,32px); box-shadow:0 1px 2px rgba(15,25,35,.05), 0 16px 40px rgba(15,25,35,.09); margin-top:16px; display:grid; grid-template-columns:repeat(auto-fit,minmax(290px,1fr)); gap:clamp(20px,3vw,32px);")}>
        <div style={st("display:flex; gap:18px;")}>
          <PhonePhoto src={image} pid={pid} w="clamp(100px,11vw,124px)" h="clamp(134px,15vw,166px)" radius={18} />
          <div style={st("min-width:0;")}>
            <div style={st("display:flex; align-items:center; gap:9px; flex-wrap:wrap;")}>
              <span style={st("font-size:13px; color:#8a8e96; font-weight:500;")}>{brand}</span>
              {/* only a confident "Top pick" or an honest "Has trade-offs" — never a lukewarm "Worth a look" on a phone the buyer is already looking at */}
              {(rec === "buy" || rec === "avoid") && <span style={st(`font-size:11.5px; font-weight:700; padding:4px 11px; border-radius:99px; color:${vm.c}; background:${vm.bg};`)}>{vm.label}</span>}
            </div>
            <h1 style={st("margin:4px 0 0; font-size:clamp(26px,3.6vw,38px); font-weight:700; letter-spacing:-1.2px; line-height:1.1;")}>{model}</h1>
            <div style={st("margin-top:8px; font-size:14px; color:#5c626a;")}>{headlinePhrase(dom)}{scores[dom] != null && <> · {axisLabel(dom)} <span style={st("color:var(--acd); font-weight:700;")}>{scores[dom]}</span></>}</div>
            {traits.length > 0 && (
              <div style={st("display:flex; flex-wrap:wrap; gap:6px; margin-top:13px;")}>
                {traits.map((tx, i) => (
                  <span key={i} style={st("font-size:11.5px; font-weight:600; color:#565b63; background:rgba(15,25,35,.05); padding:5px 11px; border-radius:99px;")}>{tx}</span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div style={st("display:flex; flex-direction:column; justify-content:center;")}>
          <div style={st("display:flex; align-items:flex-end; gap:11px; flex-wrap:wrap;")}>
            <span style={st("font-size:clamp(36px,4.2vw,48px); font-weight:300; letter-spacing:-2.5px; line-height:1;")}>{taka(price)}</span>
            {officialRef && (
              <span style={st(`font-size:11px; font-weight:700; padding:4px 10px; border-radius:99px; margin-bottom:5px; display:inline-flex; align-items:center; gap:5px; ${MAYBE_OFFICIAL_STYLE}`)}>
                <span style={st("width:5px; height:5px; border-radius:50%; background:currentColor;")} />{t("maybe_official")} · {taka(officialRef.price)}
              </span>
            )}
          </div>
          <div style={st("margin-top:12px; font-size:13px; color:#80868f; line-height:1.7;")}>
            Cheapest of {inStock} shops · <span style={st(`color:${fitColor}; font-weight:600;`)}>{fit}</span>
            {officialRef && (
              <><br /><span style={st("font-size:12px; color:#5c626a;")}>{t("gng_note")}</span></>
            )}
            {d?.price_trend && (d.price_trend.trend === "down" || d.price_trend.trend === "up") && (
              <><br /><span style={st(`font-size:12px; font-weight:600; color:${d.price_trend.trend === "down" ? "#0a7d57" : "#a8761a"};`)}>
                Price {d.price_trend.trend === "down" ? "dropped" : "rose"} {taka(Math.abs(d.price_trend.delta))} recently
              </span></>
            )}
          </div>
        </div>
      </div>

      {/* our take — the RAG verdict, grounded in real evidence */}
      {ourTake && (
        <div style={st("background:var(--acsoft); border-radius:20px; padding:clamp(16px,2.5vw,22px); margin-top:14px; display:flex; gap:12px;")}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={st("flex-shrink:0; margin-top:2px;")}><path d="M9 1.5l2 4.5 4.9.4-3.7 3.2 1.1 4.8L9 11.8 4.7 14.4l1.1-4.8L2.1 6.4 7 6 9 1.5z" fill="var(--ac)" /></svg>
          <div>
            <div style={st("font-size:11.5px; font-weight:700; letter-spacing:1.4px; text-transform:uppercase; color:var(--acd); margin-bottom:5px;")}>{t("our_take")}</div>
            <p style={st("margin:0; font-size:14.5px; color:#2c3036; line-height:1.6; text-wrap:pretty;")}>{ourTake}</p>
          </div>
        </div>
      )}

      {/* upgrade vs the buyer's current phone */}
      {upgrade && <CompareCard up={upgrade} pickName={model} />}

      {/* axes */}
      {Object.values(scores).some((v) => v != null) && (
        <div style={st("background:rgba(255,255,255,.92); border-radius:24px; padding:clamp(20px,3vw,28px); box-shadow:0 1px 2px rgba(15,25,35,.05), 0 10px 28px rgba(15,25,35,.07); margin-top:14px;")}>
          <SectionLabel>{t("scores")}</SectionLabel>
          <div style={st("display:flex; flex-direction:column; gap:17px; margin-top:18px;")}>
            {AXES.map((k) => {
              const v = scores[k];
              if (v == null) return null;
              const reason = (d?.score_reasons?.[k] || []).join("; ");
              return (
                <div key={k}>
                  <div style={st("display:flex; justify-content:space-between; align-items:baseline; gap:12px;")}>
                    <span style={st("font-size:14.5px; font-weight:600; color:#2c3036;")}>{axisLabel(k)}</span>
                    <span style={st("font-size:14px; font-weight:700; color:var(--acd);")}>{v.toFixed(1)} / 10</span>
                  </div>
                  <div style={st("position:relative; height:6px; border-radius:99px; background:rgba(15,25,35,.06); margin-top:8px; overflow:hidden;")}>
                    <div style={st(`position:absolute; top:0; bottom:0; left:0; width:${v * 10}%; border-radius:99px; background:linear-gradient(90deg,var(--acsoft2),var(--ac));`)} />
                  </div>
                  {reason && <div style={st("font-size:12.5px; color:#84878f; margin-top:7px; line-height:1.5;")}>{reason}</div>}
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

      <div className="k-stagger" style={st("display:grid; grid-template-columns:repeat(auto-fit,minmax(330px,1fr)); gap:14px; margin-top:14px;")}>
        {/* specs */}
        <Card>
          <SectionLabel>{t("specs")}</SectionLabel>
          <div style={st("display:grid; grid-template-columns:repeat(auto-fit,minmax(135px,1fr)); gap:15px 18px; margin-top:18px;")}>
            {specs.map((sp, i) => (
              <div key={i}>
                <div style={st("font-size:11.5px; color:#9a9da4;")}>{sp.k}</div>
                <div style={st("font-size:13.5px; font-weight:600; color:#2c3036; margin-top:3px; line-height:1.35;")}>{sp.v}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* value retention (estimated from brand resale reputation) */}
        {bs?.resale != null && (
          <Card><ValueRetention brand={brand} resale={bs.resale} updateRecord={bs.update_record ?? null} ageYears={d?.age_years ?? h?.age_years ?? null} /></Card>
        )}

        {/* opinion */}
        {(op.llm_summary || quotes.length || op.praise_flags?.length || op.complaint_flags?.length) && (
          <Card>
            <SectionLabel>{t("owner_voices")}</SectionLabel>
            {op.llm_summary && <p style={st("margin:15px 0 0; font-size:14px; color:#41464d; line-height:1.6; text-wrap:pretty;")}>{op.llm_summary}</p>}
            {quotes.length > 0 && (
              <div style={st("display:flex; flex-direction:column; gap:9px; margin-top:15px;")}>
                {quotes.map((q, i) => (
                  <div key={i} style={st("padding:13px 16px; border-radius:15px; background:var(--acsoft); font-family:var(--f-serif); font-style:italic; font-size:16px; color:#2c3036; line-height:1.5;")}>“{q}”</div>
                ))}
              </div>
            )}
            <div style={st("display:flex; flex-wrap:wrap; gap:7px; margin-top:15px;")}>
              {(op.praise_flags || []).map((tx, i) => (
                <span key={"p" + i} style={st("font-size:12px; font-weight:600; color:#0a7d57; background:rgba(10,157,106,.1); padding:6px 12px; border-radius:99px;")}>+ {tx}</span>
              ))}
              {(op.complaint_flags || []).map((tx, i) => (
                <span key={"c" + i} style={st("font-size:12px; font-weight:600; color:#a8761a; background:rgba(192,137,42,.12); padding:6px 12px; border-radius:99px;")}>− {tx}</span>
              ))}
            </div>
          </Card>
        )}

        {/* where to buy — last, and clearly flagged as unconfirmed prices */}
        {offers.length > 0 && (
          <Card>
            <SectionLabel>{t("where_to_buy")}</SectionLabel>
            <div style={st("display:flex; gap:9px; margin-top:14px; padding:12px 14px; border-radius:14px; background:rgba(192,137,42,.1);")}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" style={st("flex-shrink:0; margin-top:1px;")}><path d="M12 3L2 21h20L12 3zM12 9v5M12 17.5v.5" stroke="#a8761a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span style={st("font-size:12.5px; color:#7a6a40; line-height:1.55;")}>{t("price_warning")}</span>
            </div>
            <div style={st("display:flex; flex-direction:column; gap:8px; margin-top:12px;")}>
              {offers.map((o, i) => <OfferRow key={i} o={o} best={o.price === bestOfferPrice} />)}
            </div>
          </Card>
        )}
      </div>
      </>
      )}
    </Wrap>
  );
}

/* ---------- who it's for — two-sided, scannable ---------- */
function WhoFor({ bestFor, avoidIf, caveats }: {
  bestFor: string[]; avoidIf: string[]; caveats: { text: string; sev?: string }[];
}) {
  return (
    <div style={st("background:rgba(255,255,255,.92); border-radius:24px; padding:clamp(20px,3vw,28px); box-shadow:0 1px 2px rgba(15,25,35,.05), 0 10px 28px rgba(15,25,35,.07); margin-top:14px;")}>
      <SectionLabel>{t("who_its_for")}</SectionLabel>
      <div style={st("display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:14px; margin-top:18px;")}>
        {bestFor.length > 0 && (
          <div style={st("border-radius:18px; padding:16px 17px; background:rgba(10,157,106,.07); border:.5px solid rgba(10,157,106,.16);")}>
            <div style={st("display:flex; align-items:center; gap:8px; font-size:13px; font-weight:700; color:#0a7d57;")}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9.5" stroke="#0a9d6a" strokeWidth="1.8" /><path d="M8 12.5l2.5 2.5L16 9" stroke="#0a9d6a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {t("great_for")}
            </div>
            <div style={st("display:flex; flex-direction:column; gap:8px; margin-top:13px;")}>
              {bestFor.map((tx, i) => (
                <div key={i} style={st("display:flex; gap:9px; align-items:flex-start;")}>
                  <span style={st("color:#0a9d6a; font-weight:700; line-height:1.4;")}>✓</span>
                  <span style={st("font-size:13.5px; color:#2c3036; line-height:1.4; text-transform:capitalize;")}>{tx}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {avoidIf.length > 0 && (
          <div style={st("border-radius:18px; padding:16px 17px; background:rgba(192,137,42,.07); border:.5px solid rgba(192,137,42,.18);")}>
            <div style={st("display:flex; align-items:center; gap:8px; font-size:13px; font-weight:700; color:#a8761a;")}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9.5" stroke="#c47a1e" strokeWidth="1.8" /><path d="M12 7.5v5.5M12 16v.5" stroke="#c47a1e" strokeWidth="2" strokeLinecap="round" /></svg>
              {t("think_twice")}
            </div>
            <div style={st("display:flex; flex-direction:column; gap:8px; margin-top:13px;")}>
              {avoidIf.map((tx, i) => (
                <div key={i} style={st("display:flex; gap:9px; align-items:flex-start;")}>
                  <span style={st("color:#c47a1e; font-weight:700; line-height:1.3;")}>—</span>
                  <span style={st("font-size:13.5px; color:#5c626a; line-height:1.4;")}>{tx}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {caveats.length > 0 && (
        <>
          <div style={st("font-size:11.5px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase; color:#a8761a; margin:20px 0 0;")}>{t("owners_flag")}</div>
          <div style={st("display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:9px; margin-top:11px;")}>
            {caveats.map((cv, i) => (
              <div key={i} style={st("display:flex; gap:10px; padding:12px 14px; border-radius:14px; background:rgba(192,137,42,.08);")}>
                <span style={st(`width:7px; height:7px; border-radius:50%; background:${sevColor(cv.sev)}; margin-top:6px; flex-shrink:0;`)} />
                <span style={st("font-size:12.5px; color:#6f5f38; line-height:1.5;")}>{cv.text}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- value retention — estimated depreciation vs a typical phone ---------- */
function ValueRetention({ brand, resale, updateRecord, ageYears }: {
  brand: string; resale: number; updateRecord: number | null; ageYears: number | null;
}) {
  const mine = retentionCurve(resale);
  const market = retentionCurve(5);
  const W = 300, H = 140, padL = 30, padR = 12, padT = 12, padB = 24;
  const x = (yr: number) => padL + (yr / 3) * (W - padL - padR);
  const y = (pctv: number) => padT + (1 - pctv / 100) * (H - padT - padB);
  const path = (arr: number[]) => arr.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p).toFixed(1)}`).join(" ");
  const yr3 = mine[3] - market[3];
  const verdict = yr3 >= 6 ? t("holds_better") : yr3 <= -6 ? t("holds_worse") : t("holds_typical");
  const verdictColor = yr3 >= 6 ? "#0a7d57" : yr3 <= -6 ? "#a8761a" : "#5c626a";
  const ageMark = ageYears != null && ageYears > 0 && ageYears <= 3 ? ageYears : null;

  return (
    <>
      <SectionLabel>{t("value_retention")}</SectionLabel>
      <div style={st(`font-size:14px; font-weight:700; color:${verdictColor}; margin-top:12px;`)}>{verdict}</div>
      <div style={st("font-size:12.5px; color:#80868f; margin-top:3px; line-height:1.5;")}>{t("est_resale_left")} <span style={st("font-weight:700; color:#2c3036;")}>~{mine[3]}%</span> {t("after_3y")}.</div>

      <svg viewBox={`0 0 ${W} ${H}`} style={st("width:100%; margin-top:14px; overflow:visible;")}>
        {[100, 75, 50, 25].map((g) => (
          <g key={g}>
            <line x1={padL} y1={y(g)} x2={W - padR} y2={y(g)} stroke="rgba(15,25,35,.07)" strokeWidth="1" />
            <text x={padL - 6} y={y(g) + 3} textAnchor="end" style={st("font-size:8px; fill:#b6bcc4;")}>{g}%</text>
          </g>
        ))}
        {[0, 1, 2, 3].map((yr) => (
          <text key={yr} x={x(yr)} y={H - 6} textAnchor="middle" style={st("font-size:8px; fill:#b6bcc4;")}>{yr === 0 ? "now" : `${yr}y`}</text>
        ))}
        {/* market typical (dashed gray) */}
        <path d={path(market)} fill="none" stroke="#c2c6cd" strokeWidth="1.6" strokeDasharray="3 3" strokeLinecap="round" strokeLinejoin="round" />
        {/* this phone (accent) */}
        <path d={path(mine)} fill="none" stroke="var(--ac)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        {mine.map((p, i) => <circle key={i} cx={x(i)} cy={y(p)} r="2.6" fill="var(--ac)" />)}
        {ageMark != null && (
          <line x1={x(ageMark)} y1={padT} x2={x(ageMark)} y2={H - padB} stroke="#a8761a" strokeWidth="1.2" strokeDasharray="2 2" />
        )}
      </svg>

      <div style={st("display:flex; align-items:center; gap:14px; margin-top:8px; flex-wrap:wrap;")}>
        <span style={st("display:flex; align-items:center; gap:6px; font-size:11.5px; color:#5c626a; font-weight:600;")}><span style={st("width:14px; height:2.5px; border-radius:2px; background:var(--ac);")} />{brand}</span>
        <span style={st("display:flex; align-items:center; gap:6px; font-size:11.5px; color:#80868f;")}><span style={st("width:14px; height:0; border-top:2px dashed #c2c6cd;")} />{t("typical_phone")}</span>
        {updateRecord != null && (
          <span style={st("font-size:11.5px; color:#80868f; margin-left:auto;")}>{t("updates")} <span style={st("font-weight:700; color:#2c3036;")}>{updateRecord}/10</span></span>
        )}
      </div>
      <p style={st("margin:13px 0 0; font-size:11px; color:#9a9da4; line-height:1.5;")}>{t("retention_disclaimer")}</p>
    </>
  );
}

function OfferRow({ o, best }: { o: Offer; best: boolean }) {
  const maybeOfficial = o.shop === "GadgetAndGear";
  const row = (
    <>
      <div style={st("flex:1; min-width:0;")}>
        <div style={st("font-size:14px; font-weight:600; color:#2c3036; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;")}>{o.shop}{o.variant ? <span style={st("font-weight:500; color:#8a8e96;")}> · {o.variant}</span> : null}</div>
        {maybeOfficial && <span style={st(`font-size:10px; font-weight:700; padding:2px 8px; border-radius:99px; ${MAYBE_OFFICIAL_STYLE}`)}>{t("maybe_official")}</span>}
      </div>
      <span style={st("font-size:15px; font-weight:600; color:#17191d;")}>{taka(o.price)}</span>
      {best && <span style={st("font-size:10px; font-weight:700; color:var(--acd); background:rgba(255,255,255,.85); padding:3px 9px; border-radius:99px;")}>{t("best_price")}</span>}
    </>
  );
  const style = st(`display:flex; align-items:center; gap:11px; padding:12px 14px; border-radius:14px; text-decoration:none; background:${best ? "var(--acsoft)" : "rgba(15,25,35,.035)"};`);
  return o.url
    ? <a href={o.url} target="_blank" rel="noopener noreferrer" className="k-press" style={style}>{row}</a>
    : <div style={style}>{row}</div>;
}

/* ---------- loading ---------- */
function LoadingDetail({ compact }: { compact?: boolean }) {
  const block = (w: string, h = "13px") =>
    st(`width:${w}; height:${h}; border-radius:7px; background:rgba(15,25,35,.07); animation:kpulse 1.4s ease-in-out infinite;`);
  return (
    <div style={st(`margin-top:14px;`)}>
      <style>{`@keyframes kpulse{0%,100%{opacity:.5}50%{opacity:1}}`}</style>
      {!compact && (
        <div style={st("display:flex; align-items:center; gap:13px; padding:17px 20px; border-radius:18px; background:var(--acsoft); margin-bottom:14px;")}>
          <span style={st("width:20px; height:20px; border-radius:50%; border:2.5px solid var(--acsoft2); border-top-color:var(--ac); animation:kspin .8s linear infinite; flex-shrink:0;")} />
          <span style={st("font-size:14px; font-weight:600; color:#2c3036;")}>{t("loading_detail")}</span>
          <style>{`@keyframes kspin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}
      <div style={st("display:grid; grid-template-columns:repeat(auto-fit,minmax(330px,1fr)); gap:14px;")}>
        {[0, 1].map((c) => (
          <div key={c} style={st("background:rgba(255,255,255,.8); border-radius:24px; padding:24px; display:flex; flex-direction:column; gap:12px;")}>
            <div style={block("40%")} /><div style={block("90%")} /><div style={block("80%")} /><div style={block("60%")} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- layout helpers ---------- */
function Wrap({ children, onBack }: { children: ReactNode; onBack: () => void }) {
  return (
    <div style={st("max-width:880px; margin:0 auto; animation:kfade .45s cubic-bezier(.2,.7,.2,1) both;")}>
      <button onClick={onBack} className="k-press" style={st("display:flex; align-items:center; gap:9px; margin-top:clamp(10px,2.5vh,28px); padding:9px 16px 9px 12px; border-radius:99px; border:none; cursor:pointer; background:rgba(255,255,255,.7); box-shadow:inset 0 0 0 1px rgba(15,25,35,.06); font-size:13px; font-weight:600; color:#41464d;")}>
        <svg width="8" height="13" viewBox="0 0 9 15" fill="none"><path d="M7.5 1.5l-6 6 6 6" stroke="#41464d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        {t("back_to_results")}
      </button>
      {children}
    </div>
  );
}
function Card({ children }: { children: ReactNode }) {
  return <div style={st("background:rgba(255,255,255,.92); border-radius:24px; padding:clamp(20px,3vw,28px); box-shadow:0 1px 2px rgba(15,25,35,.05), 0 10px 28px rgba(15,25,35,.07);")}>{children}</div>;
}
function SectionLabel({ children }: { children: ReactNode }) {
  return <div style={st("font-size:12px; font-weight:700; letter-spacing:1.8px; text-transform:uppercase; color:#9a9da4;")}>{children}</div>;
}
