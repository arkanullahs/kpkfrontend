import { useMemo, useState } from "react";
import type { Listing, ListingAxis, ListingView } from "../api";
import { st, taka } from "../theme";
import { bnNum, t } from "../i18n";

/* Who sells this phone, at what price, and in what condition.
 *
 * The picker used to hide shop names here and group by channel-then-variant,
 * while the static /phone/ page named every shop and listed them per row. Same
 * phone, two answers to "who is cheapest" (owner 2026-08-04: shops are named on
 * both surfaces now, one design). Both render `core.specfmt.listing_view`, so
 * the derivation is shared and only the markup differs.
 *
 * Since 2026-09-12 the markup barely differs either: this is the /phone/ page's
 * "Prices and stock in Bangladesh" table, brought over whole at the owner's
 * asking. A price list is read DOWN a column -- the shop, what the listing is,
 * whether it is in stock, what it costs, in the same four places on every row.
 * A grid of cards put those same four facts in a different spot on every card,
 * so comparing two of them meant reading both rather than scanning one column.
 * The table's own layout classes (.ktbl) live in pick/index.html: it restacks
 * under a media query at 640, and inline st() styles cannot carry one.
 *
 * Still no links and no commission: naming a shop is disclosure, sending it
 * traffic is a business model we do not have.
 */

const SHOWN = 6;          // listings before "show all" — the rest are one click
const CAP = 5;            // options per axis before "+N more"

const STOCK_WORD: Record<string, string> = {
  in: "stock_in", out: "stock_out", unknown: "stock_unreported",
};

function paint(hex: string[]): string | undefined {
  if (!hex.length) return undefined;
  return hex.length === 1 ? hex[0]
    : `linear-gradient(135deg,${hex[0]} 50%,${hex[1]} 50%)`;
}

/** Does this listing satisfy every selected axis except `skip`? `skip` lets an
    option ask how many listings it WOULD return if it were the one picked. */
function hit(l: Listing, sel: Record<string, string>, skip?: string): boolean {
  for (const k of Object.keys(sel)) {
    const v = sel[k];
    if (!v || k === skip) continue;
    const got = k === "stock" ? l.stock
      : k === "chan" ? l.channel
        : k === "cfg" ? l.cfg
          : k === "region" ? l.region_id
            : null;
    if (got === null ? !l.color_ids.includes(v) : got !== v) return false;
  }
  return true;
}

/** The shop's own mark, or its monogram when we hold no usable one.
    Self-hosted by the API (/simg) exactly like the phone photos — no page
    hotlinks a shop's CDN.

    A real mark gets no plate behind it: the box and its hairline read as a
    white border stuck around the logo (owner 2026-08-04). Only the monogram
    keeps a tile, because a bare two-letter string needs a shape. */
function Mark({ l, px }: { l: Listing; px: number }) {
  // WIDER than tall: half these marks are wordmarks and half are round app
  // icons, and a square slot squeezed the wordmarks into an unreadable strip
  const box = `flex:none; display:flex; align-items:center; justify-content:center;`
    + ` overflow:hidden; width:${Math.round(px * 1.35)}px; height:${px}px; border-radius:var(--r);`;
  if (!l.logo) {
    return (
      <span style={st(box + `font-size:${px > 40 ? 14 : 11}px; font-weight:700; letter-spacing:.3px;`
        + " color:var(--mut); background:var(--tone); box-shadow:inset 0 0 0 1px var(--rule);")}>
        {l.initials}
      </span>
    );
  }
  return (
    <span style={st(box)}>
      <img src={l.logo} alt={`${l.name} logo`} width={px} height={px}
        loading="lazy" decoding="async"
        style={st("width:100%; height:100%; object-fit:contain; border-radius:0;")} />
    </span>
  );
}

function Swatch({ hex, name, size = 15, dim }: { hex: string[]; name: string; size?: number; dim?: boolean }) {
  return (
    <span
      title={name}
      style={st(`width:${size}px; height:${size}px; border-radius:50%; flex:none; opacity:${dim ? .55 : 1};`
        + `background:${paint(hex) || "repeating-linear-gradient(45deg,var(--rule) 0 3px,var(--bg) 3px 6px)"};`
        + "box-shadow:inset 0 0 0 1px rgba(var(--rgb-ink),.18);")}
    />
  );
}

/* Availability, spelled out. Whether anyone actually HAS the phone outranks
   which one you would pick if they did (the /phone/ page's rule), so this axis
   stays a row of tabs while every other one folds into a menu. */
function Tabs({ axis, value, count, onPick }: {
  axis: ListingAxis; value: string;
  count: (option: string) => number;
  onPick: (v: string) => void;
}) {
  const opts = [{ value: "", label: t("filter_all") }, ...axis.options];
  return (
    <div role="group" aria-label={axis.title}
      style={st("display:flex; flex-wrap:wrap; gap:0 2px; border-bottom:1px solid var(--rule); min-width:0;")}>
      {opts.map((o) => {
        const on = value === o.value;
        const n = count(o.value);
        const dead = !!o.value && n === 0;
        return (
          <button key={o.value || "all"} type="button" disabled={dead}
            aria-pressed={on}
            // clicking the active tab clears the axis, so every filter is its
            // own undo
            onClick={() => onPick(on ? "" : o.value)}
            style={st("display:inline-flex; align-items:center; gap:8px; min-height:44px;"
              + " padding:0 12px; margin-bottom:-1px; font:inherit; font-size:15px;"
              + " background:none; border:0; border-bottom:2px solid transparent;"
              + (dead ? " color:var(--faint); cursor:default;"
                : on ? " color:var(--ink); font-weight:700; border-bottom-color:var(--teal); cursor:pointer;"
                  : " color:var(--tx); font-weight:500; cursor:pointer;"))}>
            {o.label}
            <i style={st("font-style:normal; font-size:13px; font-weight:600;"
              + " font-variant-numeric:tabular-nums;"
              + ` color:${dead ? "var(--faint)" : on ? "var(--lnk)" : "var(--mut2)"};`)}>
              {bnNum(String(n))}
            </i>
          </button>
        );
      })}
    </div>
  );
}

/* Every other axis. A button per option made the panel taller than the list it
   filtered -- an iPhone carries five axes and twenty-three options -- and one
   select holds any number of them in a single 44px control. .ksel (in
   pick/index.html) draws our own chevron; the platform's cannot be styled. */
function Sel({ axis, value, count, onPick }: {
  axis: ListingAxis; value: string;
  count: (option: string) => number;
  onPick: (v: string) => void;
}) {
  return (
    <label style={st("display:flex; flex-direction:column; gap:5px; flex:0 1 190px; min-width:150px;")}>
      <span style={st("font-size:14px; color:var(--mut); white-space:nowrap;")}>
        {axis.title}
        {axis.hint && <i style={st("font-style:normal; color:var(--mut2);")}> {axis.hint}</i>}
      </span>
      <select className="ksel" value={value}
        onChange={(e) => onPick(e.target.value)}>
        <option value="">{t("filter_all")} ({bnNum(String(count("")))})</option>
        {axis.options.map((o) => {
          const n = count(o.value);
          // disabled, never removed: a menu that reshuffles under the cursor
          // is impossible to aim at
          return (
            <option key={o.value} value={o.value} disabled={n === 0}>
              {o.label} ({bnNum(String(n))})
            </option>
          );
        })}
      </select>
    </label>
  );
}

/* One listing, one row. The four cells are the /phone/ page's four columns in
   the same order, and they carry its data-labels too: below 640 the header row
   is hidden and each label is put back in front of its own line. */
function Row({ l, low }: { l: Listing; low: number | null }) {
  const out = l.stock === "out";
  // every listing at the lowest in-stock price is marked, not just the first:
  // two equal offers are not ranked by sort order
  const atLow = l.stock === "in" && l.price != null && l.price === low;
  const gap = low != null && l.price != null && !atLow ? l.price - low : 0;
  const what = [l.channel_word, l.variant, l.sim].filter(Boolean).join(" · ");
  return (
    <tr>
      <td className="ksh">
        <span style={st("display:flex; align-items:center; gap:9px; min-width:0;")}>
          <Mark l={l} px={24} />
          <b style={st("min-width:0; font-size:16px; font-weight:600; line-height:1.35;"
            + " letter-spacing:-.2px; overflow:hidden; text-overflow:ellipsis;"
            + ` color:${out ? "var(--mut)" : "var(--ink)"};`)}>{l.name}</b>
        </span>
      </td>
      <td className="kvar" data-label={t("col_variant")}>
        <span style={st("display:block; font-size:15px; line-height:1.45;"
          + ` color:${out ? "var(--mut)" : "var(--ink2)"};`)}>{what}</span>
        {l.region_name && (
          <span style={st("display:block; font-size:14px; color:var(--mut);")}>{l.region_name}</span>
        )}
        {/* colours this shop published for THIS listing, never the model's. A
            shop that named none gets no line. */}
        {l.colors.length > 0 && (
          <span style={st("display:flex; flex-wrap:wrap; gap:2px 12px; margin-top:5px;"
            + " font-size:14px; color:var(--mut);")}>
            {l.colors.map((c) => (
              <span key={c.name} style={st("display:inline-flex; align-items:center; gap:6px;")}>
                <Swatch hex={c.hex} name={c.name} size={11} dim={out} />{c.name}
              </span>
            ))}
          </span>
        )}
        {l.suspect && (
          <span style={st("display:block; margin-top:3px; font-size:13px; font-weight:600;"
            + " color:var(--acd);")}>{t("price_unconfirmed")}</span>
        )}
      </td>
      <td className="kst" data-label={t("col_stock")}>
        <span style={st("display:inline-flex; align-items:center; gap:8px; font-size:15px;"
          + ` line-height:1.45; white-space:nowrap; color:${out ? "var(--mut)" : "var(--ink2)"};`)}>
          <i style={st("width:9px; height:9px; border-radius:50%; flex:none;"
            + (l.stock === "in" ? " background:var(--teal);"
              : l.stock === "unknown" ? " background:var(--ac);"
                : " box-shadow:inset 0 0 0 1.5px var(--mut2);"))} />
          {t(STOCK_WORD[l.stock])}
        </span>
      </td>
      <td className="kpc">
        <span style={st("display:block; font-family:var(--f-display); font-size:21px;"
          + " font-weight:700; line-height:1.15; letter-spacing:-.3px;"
          + " font-variant-numeric:tabular-nums; white-space:nowrap;"
          + ` color:${atLow ? "var(--ac)" : out || l.shown_price == null ? "var(--mut)" : "var(--ink)"};`)}>
          {taka(l.shown_price)}
        </span>
        {atLow ? (
          <span style={st("display:block; margin-top:3px; font-size:13.5px; font-weight:700;"
            + " color:var(--tealD); white-space:nowrap;")}>{t("lowest_in_stock")}</span>
        ) : !!gap && (
          <span style={st("display:block; margin-top:3px; font-size:14px; color:var(--mut);"
            + " white-space:nowrap; font-variant-numeric:tabular-nums;")}>
            {gap > 0 ? "+" : "−"}{taka(Math.abs(gap))}
          </span>
        )}
      </td>
    </tr>
  );
}

export function ShopPrices({ view, checked }: { view: ListingView; checked?: string }) {
  const [sel, setSel] = useState<Record<string, string>>(
    { stock: "", chan: "", cfg: "", color: "", region: "" });
  const [showAll, setShowAll] = useState(false);

  const vis = useMemo(() => view.listings.filter((l) => hit(l, sel)), [view, sel]);
  // rows are already cheapest-first, so the first in-stock one IS the cheapest
  // anybody can pay today
  const live = vis.filter((l) => l.stock === "in" && l.price);
  const cheapest = live[0] || null;
  const low = cheapest?.price ?? null;
  const shops = new Set(vis.map((l) => l.shop)).size;
  const liveShops = new Set(vis.filter((l) => l.stock === "in").map((l) => l.shop)).size;
  const nLive = vis.filter((l) => l.stock === "in").length;

  // what the cheapest price beats — or, more useful, the cheaper thing that is
  // sold out, which reordering the list around it used to hide rather than say
  const note = (() => {
    if (!cheapest) return "";
    const under = vis.filter((l) => l.stock !== "in" && l.price && l.price < cheapest.price!)[0];
    if (under) return t("note_cheaper_out").replace("{p}", taka(under.price)).replace("{s}", under.name);
    const tied = live.slice(1).filter((l) => l.price === cheapest.price).length;
    if (tied) return t(tied === 1 ? "note_tied_one" : "note_tied").replace("{n}", bnNum(String(tied)));
    if (live.length > 1) return t("note_below_next").replace("{p}", taka(live[1].price! - cheapest.price!));
    return t("note_only_shop");
  })();

  const shown = showAll ? vis : vis.slice(0, SHOWN);
  return (
    <div style={st("display:flex; flex-direction:column; gap:13px; margin-top:14px;")}>
      {view.axes.length > 0 && (() => {
        const count = (a: ListingAxis) => (v: string) => view.listings.filter(
          (l) => hit(l, sel, a.key) && (!v || hit(l, { [a.key]: v }))).length;
        const pick = (a: ListingAxis) => (v: string) => {
          setSel({ ...sel, [a.key]: v }); setShowAll(false);
        };
        const stock = view.axes.find((a) => a.key === "stock");
        const rest = view.axes.filter((a) => a.key !== "stock");
        return (
          <div style={st("display:flex; flex-direction:column; gap:14px; min-width:0;")}>
            {stock && (
              <Tabs axis={stock} value={sel[stock.key] || ""}
                count={count(stock)} onPick={pick(stock)} />
            )}
            {rest.length > 0 && (
              <div style={st("display:flex; flex-wrap:wrap; align-items:flex-end; gap:12px 16px;")}>
                {rest.map((a) => (
                  <Sel key={a.key} axis={a} value={sel[a.key] || ""}
                    count={count(a)} onPick={pick(a)} />
                ))}
                <button type="button"
                  onClick={() => setSel({ stock: "", chan: "", cfg: "", color: "", region: "" })}
                  style={st("margin-left:auto; min-height:44px; padding:0 2px; font:inherit;"
                    + " font-size:15px; font-weight:600; color:var(--lnk); background:none;"
                    + " border:0; cursor:pointer; text-decoration:underline;"
                    + " text-underline-offset:3px;")}>
                  {t("clear_filters")}
                </button>
              </div>
            )}
          </div>
        );
      })()}

      <div style={st("display:flex; align-items:baseline; justify-content:space-between; gap:4px 16px; flex-wrap:wrap;")}>
        <span style={st("font-size:15px; color:var(--tx);")}>
          <b style={st("font-weight:700; color:var(--ink);")}>{bnNum(String(vis.length))}</b>{" "}
          {t("listings_word")} {t("from_word")}{" "}
          <b style={st("font-weight:700; color:var(--ink);")}>{bnNum(String(shops))}</b> {t("sellers")}
          {nLive > 0 && <>, {bnNum(String(nLive))} {t("in_stock_at")} {bnNum(String(liveShops))} {liveShops === 1 ? t("shop_one") : t("sellers")}</>}
        </span>
        <span style={st("font-size:14px; color:var(--mut);")}>
          {t("cheapest_first")}{checked ? ` \u00b7 ${t("last_checked")} ${checked}` : ""}
        </span>
      </div>

      {note && (
        <p style={st("margin:0; font-size:15px; line-height:1.5; color:var(--ink2);")}>{note}</p>
      )}

      {vis.length === 0 ? (
        <div style={st("display:flex; flex-direction:column; gap:7px; align-items:center; text-align:center;"
          + " padding:42px 20px; border:1px dashed var(--rule); border-radius:var(--r);")}>
          <b style={st("font-family:var(--f-display); font-size:20px; font-weight:700; letter-spacing:-.4px; color:var(--ink);")}>{t("empty_combo")}</b>
          <span style={st("font-size:13.5px; color:var(--mut); max-width:320px; text-wrap:pretty;")}>{t("empty_combo_help")}</span>
        </div>
      ) : (
        <table className="ktbl">
          <thead>
            <tr>
              <th scope="col" className="ksh">{t("col_shop")}</th>
              <th scope="col">{t("col_variant")}</th>
              <th scope="col">{t("col_stock")}</th>
              <th scope="col" className="kpc">{t("col_price")}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((l, i) => <Row key={l.shop + i} l={l} low={low} />)}
          </tbody>
        </table>
      )}

      {/* a phone with 57 listings shows six and offers the rest, or the price
          section is the whole screen (owner 2026-08-04) */}
      {vis.length > SHOWN && (
        <button type="button" onClick={() => setShowAll(!showAll)}
          style={st("width:100%; min-height:44px; font:inherit; font-size:15px; font-weight:600;"
            + " cursor:pointer; border:0; border-bottom:1px solid var(--rule);"
            + " background:none; color:var(--lnk); margin-top:-14px;")}>
          {showAll ? t("show_fewer") : `${t("show_all")} ${bnNum(String(vis.length))} ${t("listings_word")}`}
        </button>
      )}

      <p style={st("margin:2px 0 0; font-size:14px; line-height:1.6; color:var(--mut); max-width:74ch;")}>
        {t("offers_foot")}
      </p>
    </div>
  );
}
