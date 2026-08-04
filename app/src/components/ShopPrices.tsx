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

/** A shop's own colour, or the site's ink where we hold no mark for it. */
const shopRgb = (l: Listing) => l.accent || "var(--rgb-ink)";

/** The shop's own mark, or its monogram when we hold no usable one.
    Self-hosted by the API (/simg) exactly like the phone photos — no page
    hotlinks a shop's CDN.

    A real mark gets no plate behind it: the box and its hairline read as a
    white border stuck around the logo (owner 2026-08-04). Only the monogram
    keeps a tile, because a bare two-letter string needs a shape. On the dark
    band, which mark may appear at all is decided in the data — the fetcher
    measures each file against that panel, and one that would vanish into it
    (or is baked onto a white plate) falls back to the monogram. */
function Mark({ l, px, onDark }: { l: Listing; px: number; onDark?: boolean }) {
  // WIDER than tall: half these marks are wordmarks and half are round app
  // icons, and a square slot squeezed the wordmarks into an unreadable strip
  const box = `flex:none; display:flex; align-items:center; justify-content:center;`
    + ` overflow:hidden; width:${Math.round(px * 1.35)}px; height:${px}px; border-radius:var(--r);`;
  const src = onDark ? l.logo_dark : l.logo;
  if (!src) {
    return (
      <span style={st(box + `font-size:${px > 40 ? 14 : 12.5}px; font-weight:700; letter-spacing:.3px;`
        + (onDark ? " color:var(--aqua); background:var(--onpfill); box-shadow:inset 0 0 0 1px var(--onp3);"
          : " color:var(--mut); background:var(--tone); box-shadow:inset 0 0 0 1px var(--rule);"))}>
        {l.initials}
      </span>
    );
  }
  return (
    <span style={st(box)}>
      <img src={src} alt={`${l.name} logo`} width={px} height={px}
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

function Card({ l, cheapest }: { l: Listing; cheapest: Listing | null }) {
  const out = l.stock === "out";
  const best = cheapest != null && l === cheapest;
  const gap = cheapest && l.price && !best ? l.price - cheapest.price! : 0;
  const badge = l.stock === "in"
    ? "color:var(--tealD); background:var(--tealL);"
    : l.stock === "unknown"
      ? "color:var(--acd); background:rgba(var(--rgb-amber),.10);"
      : "color:var(--mut); background:var(--tone);";
  const tag = (text: string, kind?: "chan" | "warn") =>
    <span key={text} style={st("display:inline-flex; padding:3px 8px; border-radius:var(--r); font-size:11px;"
      + " font-weight:600; line-height:1.3;"
      + (kind === "warn" ? " color:var(--acd); background:rgba(var(--rgb-amber),.10);"
        : kind === "chan" && !out ? " color:var(--tealD); background:var(--tealL);"
          : " color:var(--mut); background:var(--tone);"))}>{text}</span>;
  return (
    // Neutral. The shop's colour lands on the hero band only (owner
    // 2026-08-04): a grid where every card wears its own seller's colour is a
    // chart legend, and it made the one listing that matters no easier to find.
    <article style={st("display:grid; grid-template-columns:auto minmax(0,1fr) auto; gap:7px 11px;"
      + " align-items:center; align-content:start; padding:12px 14px; min-width:0; border-radius:var(--r);"
      + (out ? " background:var(--bg); box-shadow:inset 0 0 0 1px var(--rule);"
        : " background:var(--card); box-shadow:inset 0 0 0 1px var(--rule), 0 1px 2px rgba(var(--rgb-ink),.05);"))}>
      <Mark l={l} px={38} />
      <span style={st("min-width:0; display:flex; flex-direction:column; gap:1px;")}>
        <b style={st(`font-size:14.5px; font-weight:700; letter-spacing:-.2px; white-space:nowrap;`
          + ` overflow:hidden; text-overflow:ellipsis; color:${out ? "var(--mut)" : "var(--ink)"};`)}>{l.name}</b>
        {best && (
          <i style={st("font-size:9.5px; font-weight:700; font-style:normal; letter-spacing:.5px;"
            + " text-transform:uppercase; color:var(--ac);")}>{t("cheapest_in_stock")}</i>
        )}
      </span>
      <span style={st("display:flex; flex-direction:column; align-items:flex-end; gap:1px; text-align:right;")}>
        {/* the price carries the amber — a mark on a light surface, which is
            the only place the logo ever puts it */}
        <span style={st("font-family:var(--f-display); font-size:18px; font-weight:700; line-height:1.1;"
          + " letter-spacing:-.6px; font-variant-numeric:tabular-nums; white-space:nowrap;"
          + ` color:${best ? "var(--ac)" : out || l.shown_price == null ? "var(--mut)" : "var(--ink)"};`)}>
          {taka(l.shown_price)}
        </span>
        {!!gap && (
          <span style={st("font-size:10.5px; font-weight:600; color:var(--mut2); white-space:nowrap;"
            + " font-variant-numeric:tabular-nums;")}>
            {gap > 0 ? "+" : "−"}{taka(Math.abs(gap))} {t("vs_cheapest")}
          </span>
        )}
      </span>
      <div style={st("grid-column:1/-1; display:flex; align-items:center; gap:5px; flex-wrap:wrap;")}>
        {tag(l.channel_word, l.channel === "unstated" ? undefined : "chan")}
        {[l.variant, l.sim, l.region_name].filter(Boolean).map((b) => tag(b as string))}
        {l.suspect && tag(t("price_unconfirmed"), "warn")}
        <span style={st("margin-left:auto; flex:none; display:inline-flex; align-items:center; gap:5px;"
          + " padding:3px 8px; border-radius:var(--r); font-size:11px; font-weight:700; white-space:nowrap;"
          + badge)}>
          <span style={st("width:6px; height:6px; border-radius:50%; background:currentColor; flex:none;")} />
          {t(STOCK_WORD[l.stock])}
        </span>
      </div>
      {/* colours this shop published for THIS listing, never the model's. A
          shop that named none gets no row: the intro already says so. */}
      {l.colors.length > 0 && (
        <div style={st("grid-column:1/-1; display:flex; flex-wrap:wrap; gap:5px; align-items:center;")}>
          {l.colors.map((c) => <Swatch key={c.name} hex={c.hex} name={c.name} dim={out} />)}
        </div>
      )}
    </article>
  );
}

export function ShopPrices({ view }: { view: ListingView }) {
  const [sel, setSel] = useState<Record<string, string>>(
    { stock: "", chan: "", cfg: "", color: "", region: "" });
  const [showAll, setShowAll] = useState(false);

  const vis = useMemo(() => view.listings.filter((l) => hit(l, sel)), [view, sel]);
  // cards are already cheapest-first, so the first in-stock one IS the cheapest
  // anybody can pay today
  const live = vis.filter((l) => l.stock === "in" && l.price);
  const cheapest = live[0] || null;
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

      <div style={st("display:flex; align-items:baseline; justify-content:space-between; gap:16px; flex-wrap:wrap;")}>
        <span style={st("font-size:13.5px; color:var(--tx);")}>
          <b style={st("font-weight:700; color:var(--ink);")}>{bnNum(String(vis.length))}</b>{" "}
          {t("listings_word")} {t("from_word")}{" "}
          <b style={st("font-weight:700; color:var(--ink);")}>{bnNum(String(shops))}</b> {t("sellers")}
          {nLive > 0 && <>, {bnNum(String(nLive))} {t("in_stock_at")} {bnNum(String(liveShops))} {liveShops === 1 ? t("shop_one") : t("sellers")}</>}
        </span>
        <span style={st("font-size:11px; font-weight:700; letter-spacing:.5px; text-transform:uppercase; color:var(--mut2);")}>{t("cheapest_first")}</span>
      </div>

      {/* The cheapest listing anyone can actually pay. Dark panel, white price:
          in the logo the amber mark never touches a dark field (brand SPEC).
          This is the one place the seller's own colour appears — a wash off the
          leading edge and a hairline in the same hue, dark enough to keep the
          white text legible. */}
      {cheapest && (
        <div style={st("display:flex; align-items:center; justify-content:space-between; gap:14px 22px;"
          + " flex-wrap:wrap; padding:15px 18px; border-radius:var(--r); color:var(--onp);"
          + ` background:linear-gradient(100deg,rgba(${shopRgb(cheapest)},.42),`
          + ` rgba(${shopRgb(cheapest)},.10) 42%,rgba(${shopRgb(cheapest)},0) 76%),var(--panel);`
          + ` box-shadow:inset 0 0 0 1px rgba(${shopRgb(cheapest)},.55),`
          + " inset 0 1px 0 rgba(var(--rgb-white),.9), 0 1px 2px rgba(var(--rgb-ink),.3);")}>
          <div style={st("display:flex; align-items:center; gap:12px; min-width:0; flex:1 1 200px;")}>
            <Mark l={cheapest} px={44} onDark />
            <span style={st("display:flex; flex-direction:column; gap:3px; min-width:0;")}>
              <b style={st("font-size:16.5px; font-weight:700; letter-spacing:-.2px; overflow:hidden;"
                + " text-overflow:ellipsis; white-space:nowrap;")}>{cheapest.name}</b>
              <i style={st("font-size:10px; font-weight:700; font-style:normal; letter-spacing:.6px;"
                + " text-transform:uppercase; color:var(--aqua);")}>{t("cheapest_in_stock")}</i>
            </span>
          </div>
          <div style={st("display:flex; align-items:center; justify-content:flex-end; gap:14px 22px;"
            + " flex-wrap:wrap; flex:1 1 240px;")}>
            <span style={st("flex:1 1 175px; min-width:0; font-size:12.5px; line-height:1.45;"
              + " color:var(--onp2); text-wrap:pretty;")}>{note}</span>
            <span style={st("font-family:var(--f-display); font-size:clamp(26px,4.4vw,34px); font-weight:700;"
              + " line-height:1; letter-spacing:-1px; font-variant-numeric:tabular-nums; white-space:nowrap;")}>
              {taka(cheapest.price)}
            </span>
          </div>
        </div>
      )}

      {vis.length === 0 ? (
        <div style={st("display:flex; flex-direction:column; gap:7px; align-items:center; text-align:center;"
          + " padding:42px 20px; border:1px dashed var(--rule); border-radius:var(--r);")}>
          <b style={st("font-family:var(--f-display); font-size:20px; font-weight:700; letter-spacing:-.4px; color:var(--ink);")}>{t("empty_combo")}</b>
          <span style={st("font-size:13.5px; color:var(--mut); max-width:320px; text-wrap:pretty;")}>{t("empty_combo_help")}</span>
        </div>
      ) : (
        <div style={st("display:grid; grid-template-columns:repeat(auto-fill,minmax(min(100%,320px),1fr)); gap:9px;")}>
          {shown.map((l, i) => <Card key={l.shop + i} l={l} cheapest={cheapest} />)}
        </div>
      )}

      {/* a phone with 57 listings shows six and offers the rest, or the price
          section is the whole screen (owner 2026-08-04) */}
      {vis.length > SHOWN && (
        <button type="button" onClick={() => setShowAll(!showAll)}
          style={st("width:100%; min-height:42px; font:inherit; font-size:12.5px; font-weight:700;"
            + " cursor:pointer; border-radius:var(--r); border:1px solid var(--rule);"
            + " background:var(--card); color:var(--lnk);")}>
          {showAll ? t("show_fewer") : `${t("show_all")} ${bnNum(String(vis.length))} ${t("listings_word")}`}
        </button>
      )}
    </div>
  );
}
