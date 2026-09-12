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

function Axis({ axis, value, count, onPick }: {
  axis: ListingAxis; value: string;
  count: (option: string) => number;
  onPick: (v: string) => void;
}) {
  // a long axis is capped rather than run across three lines: an iPhone lists
  // seven import markets
  const [open, setOpen] = useState(false);
  const opts = open ? axis.options : axis.options.slice(0, CAP);
  const over = axis.options.length - CAP;
  const btn = (v: string, label: string, hex?: string[]) => {
    const on = value === v;
    const n = count(v);
    return (
      <button
        key={v || "all"}
        type="button"
        disabled={!!v && n === 0}
        // clicking the active option clears the axis, so every filter is its
        // own undo and nobody has to hunt back to All
        onClick={() => onPick(on ? "" : v)}
        style={st("display:inline-flex; align-items:center; gap:8px; min-height:34px; font:inherit;"
          + " font-size:12.5px; font-weight:600; padding:6px 12px; border-radius:var(--r);"
          + " white-space:nowrap; transition:color .14s, background .14s, border-color .14s;"
          + (!v || n > 0
            ? `cursor:pointer; border:1px solid ${on ? "var(--teal)" : "var(--rule)"};`
              + ` background:${on ? "var(--tealL)" : "var(--card)"};`
              + ` color:${on ? "var(--tealD)" : "var(--tx)"};`
            : "cursor:default; border:1px solid transparent; background:var(--tone);"
              + " color:var(--faint);"))}
      >
        {hex !== undefined && <Swatch hex={hex} name={label} size={14} />}
        <span style={st("min-width:0; overflow:hidden; text-overflow:ellipsis;")}>{label}</span>
        <span style={st("flex:none; font-size:10.5px; font-weight:600; font-variant-numeric:tabular-nums;"
          + ` color:${!v || n > 0 ? (on ? "var(--lnk)" : "var(--mut2)") : "var(--faint)"};`)}>
          {bnNum(String(n))}
        </span>
      </button>
    );
  };
  return (
    <div style={st("display:flex; flex-direction:column; gap:6px; min-width:0;")}>
      <div style={st("display:flex; align-items:baseline; gap:7px;")}>
        <span style={st("font-size:10.5px; font-weight:700; letter-spacing:.5px; text-transform:uppercase; color:var(--mut);")}>{axis.title}</span>
        {axis.hint && <span style={st("font-size:10.5px; color:var(--mut2);")}>{axis.hint}</span>}
      </div>
      <div style={st("display:flex; flex-wrap:wrap; gap:5px; min-width:0;")}>
        {btn("", t("filter_all"))}
        {opts.map((o) => btn(o.value, o.label, axis.key === "color" ? (o.hex || []) : undefined))}
      </div>
      {over > 0 && !open && (
        <button type="button" onClick={() => setOpen(true)}
          style={st("align-self:flex-start; font:inherit; font-size:11.5px; font-weight:700; color:var(--lnk);"
            + " background:none; border:0; padding:2px; cursor:pointer; text-decoration:underline;"
            + " text-underline-offset:3px;")}>
          +{bnNum(String(over))} {t("filter_more")}
        </button>
      )}
    </div>
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
            + " color:var(--tealD); white-space:nowrap;")}>{t("cheapest_in_stock")}</span>
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

export function ShopPrices({ view }: { view: ListingView }) {
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
      {view.axes.length > 0 && (
        <div style={st("display:flex; flex-wrap:wrap; align-items:flex-start; gap:13px 24px;"
          + " padding:14px 16px; border-radius:var(--r); background:var(--card);"
          + " box-shadow:inset 0 0 0 1px var(--rule);")}>
          {view.axes.map((a) => (
            <Axis key={a.key} axis={a} value={sel[a.key] || ""}
              // an option that would return nothing is dimmed, never removed: a
              // panel that reshuffles under the cursor is impossible to aim at
              count={(v) => view.listings.filter((l) =>
                hit(l, sel, a.key) && (!v || hit(l, { [a.key]: v }))).length}
              onPick={(v) => { setSel({ ...sel, [a.key]: v }); setShowAll(false); }} />
          ))}
          <button type="button" onClick={() => setSel({ stock: "", chan: "", cfg: "", color: "", region: "" })}
            style={st("margin-left:auto; align-self:center; font:inherit; font-size:12px; font-weight:600;"
              + " color:var(--mut); background:none; border:0; padding:4px 2px; cursor:pointer;"
              + " text-decoration:underline; text-underline-offset:3px;")}>
            {t("clear_filters")}
          </button>
        </div>
      )}

      <div style={st("display:flex; align-items:baseline; justify-content:space-between; gap:4px 16px; flex-wrap:wrap;")}>
        <span style={st("font-size:15px; color:var(--tx);")}>
          <b style={st("font-weight:700; color:var(--ink);")}>{bnNum(String(vis.length))}</b>{" "}
          {t("listings_word")} {t("from_word")}{" "}
          <b style={st("font-weight:700; color:var(--ink);")}>{bnNum(String(shops))}</b> {t("sellers")}
          {nLive > 0 && <>, {bnNum(String(nLive))} {t("in_stock_at")} {bnNum(String(liveShops))} {liveShops === 1 ? t("shop_one") : t("sellers")}</>}
        </span>
        <span style={st("font-size:14px; color:var(--mut);")}>{t("cheapest_first")}</span>
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
