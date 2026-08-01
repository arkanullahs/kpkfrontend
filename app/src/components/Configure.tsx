import { useState } from "react";
import type { VariantChannel, VariantPrice } from "../api";
import { st, taka, takaRange } from "../theme";
import { SpecIcon } from "./Chrome";

/** Choose RAM & storage, then see the colours and the stock we actually found.
 *
 * Owner 2026-08-01: "for normal colors phones, ui should be displayed like
 * colors with ram rom choosing option revealing the exact stock we found" and
 * "keep official and unofficial prices and choices different".
 *
 * Every number here belongs to ONE SKU, not to the model. Before this the
 * screen showed a flat price-per-config line, so a buyer could not see that
 * the 8/256 is sold out in every colour but one, or that the cheapest row is
 * an eSIM import their operator cannot activate.
 *
 * Shop-anonymous like the rest of the picker: counts of shops, never names.
 */

const CHANNEL_TONE: Record<string, { fg: string; bg: string }> = {
  official: { fg: "#0a7d57", bg: "rgba(10,157,106,.11)" },
  unofficial: { fg: "#8a6414", bg: "rgba(168,118,26,.13)" },
  unstated: { fg: "#6c727a", bg: "rgba(15,25,35,.06)" },
};

function StockChip({ c }: { c: VariantChannel }) {
  if (c.in_stock)
    return (
      <span style={st("font-size:11.5px; font-weight:700; padding:3px 9px; border-radius:99px; color:#0a7d57; background:rgba(10,157,106,.11);")}>
        In stock at {c.shops} shop{c.shops > 1 ? "s" : ""}
        {/* the exact figure only where a shop publishes a count */}
        {c.units ? ` · ${c.units} units` : ""}
      </span>
    );
  if (c.in_stock === false)
    return (
      <span style={st("font-size:11.5px; font-weight:700; padding:3px 9px; border-radius:99px; color:#8a6414; background:rgba(168,118,26,.13);")}>
        Sold out
      </span>
    );
  // null is "nobody reported it", which is not the same as sold out
  return (
    <span style={st("font-size:11.5px; font-weight:600; padding:3px 9px; border-radius:99px; color:#6c727a; background:rgba(15,25,35,.06);")}>
      Stock not reported
    </span>
  );
}

function ChannelRow({ c }: { c: VariantChannel }) {
  const tone = CHANNEL_TONE[c.channel] || CHANNEL_TONE.unstated;
  return (
    <div style={st("display:flex; flex-wrap:wrap; align-items:center; gap:8px 10px; padding:9px 0; border-top:1px solid rgba(15,25,35,.07);")}>
      <span style={st(`font-size:11px; font-weight:700; letter-spacing:.3px; text-transform:uppercase; padding:3px 9px; border-radius:99px; color:${tone.fg}; background:${tone.bg};`)}>
        {c.label}
      </span>
      {c.price != null && (
        <b style={st("font-size:14.5px; font-weight:700; color:#2c3036;")}>
          {takaRange(c.price, c.price_high)}
        </b>
      )}
      <StockChip c={c} />
      {c.regions.map((r) => (
        <span key={r.code} style={st("font-size:10.5px; font-weight:700; letter-spacing:.3px; padding:2px 8px; border-radius:99px; color:var(--acd); background:rgba(38,86,214,.1);")}>
          {r.name}
        </span>
      ))}
      {c.colors.length > 0 && (
        <span style={st("display:flex; flex-wrap:wrap; gap:5px; align-items:center;")}>
          {c.colors.map((col) => (
            <span key={col} style={st("font-size:12px; font-weight:600; padding:3px 9px; border-radius:99px; background:rgba(15,25,35,.05); color:#2c3036;")}>
              {col}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

export function Configure({ variants }: { variants?: VariantPrice[] | null }) {
  const [pick, setPick] = useState<string | null>(null);
  const options = (variants || []).filter((v) => (v.channels || []).length > 0);
  // nothing to choose between: one configuration and no colours to show
  if (options.length < 2 && !options.some((v) => v.colors.length > 0)) return null;

  const shown = pick ? options.filter((v) => v.variant === pick) : options;
  const btn = (on: boolean) =>
    st(`font: inherit; cursor:pointer; font-size:12.5px; font-weight:700; padding:7px 14px; border-radius:99px; border:0;
        color:${on ? "#fff" : "#2c3036"}; background:${on ? "var(--ac)" : "rgba(15,25,35,.06)"};`);

  return (
    <div style={st("background:rgba(255,255,255,.92); border-radius:24px; padding:clamp(20px,3vw,28px); box-shadow:0 1px 2px rgba(15,25,35,.05), 0 10px 28px rgba(15,25,35,.07); margin-top:14px;")}>
      <div style={st("display:inline-flex; align-items:center; gap:7px; font-size:11.5px; font-weight:700; letter-spacing:1.4px; text-transform:uppercase; color:var(--acd);")}>
        <SpecIcon name="memory" size={14} />Choose RAM &amp; storage
      </div>
      <p style={st("margin:9px 0 0; font-size:13.5px; color:#84878f; line-height:1.5; text-wrap:pretty;")}>
        Stock and colours are what the shops themselves publish for that exact
        configuration — not the model as a whole.
      </p>

      <div style={st("display:flex; flex-wrap:wrap; gap:8px; margin-top:15px;")}>
        <button type="button" style={btn(pick === null)} onClick={() => setPick(null)}>All</button>
        {options.map((v) => (
          <button
            key={v.variant}
            type="button"
            style={btn(pick === v.variant)}
            onClick={() => setPick(pick === v.variant ? null : v.variant)}
          >
            {v.variant}
            {v.price != null && (
              <span style={st("margin-left:7px; font-weight:600; opacity:.8;")}>{taka(v.price)}</span>
            )}
          </button>
        ))}
      </div>

      <div style={st("margin-top:16px; display:flex; flex-direction:column; gap:14px;")}>
        {shown.map((v) => (
          <div key={v.variant}>
            <div style={st("font-size:15px; font-weight:700; color:#2c3036;")}>{v.variant}</div>
            {(v.channels || []).map((c) => (
              <ChannelRow key={`${c.channel}-${c.sim || ""}`} c={c} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
