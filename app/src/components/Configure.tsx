import { useState } from "react";
import type { VariantChannel, VariantPrice } from "../api";
import { st, taka, takaRange } from "../theme";

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
 * One configuration at a time, because showing all of them at once was a wall
 * of pills (owner saw the first cut and was right about it). Colours are a
 * quiet line under the price, not a second row of chips competing with it.
 *
 * Shop-anonymous like the rest of the picker: counts of shops, never names.
 */

const TONE: Record<string, { fg: string; bg: string }> = {
  official: { fg: "#0a7d57", bg: "rgba(10,157,106,.1)" },
  unofficial: { fg: "#8a6414", bg: "rgba(168,118,26,.12)" },
  unstated: { fg: "#82868e", bg: "rgba(15,25,35,.05)" },
};

function stockLine(c: VariantChannel): { text: string; color: string } {
  if (c.in_stock)
    return {
      text: `In stock at ${c.shops} shop${c.shops > 1 ? "s" : ""}`
        // the exact figure only where a shop publishes a count
        + (c.units ? ` · ${c.units} units` : ""),
      color: "#0a7d57",
    };
  if (c.in_stock === false) return { text: "Sold out", color: "#8a6414" };
  // null is "nobody reported it", which is not the same as sold out
  return { text: "Stock not reported", color: "#9a9da4" };
}

function ChannelRow({ c }: { c: VariantChannel }) {
  const tone = TONE[c.channel] || TONE.unstated;
  const stock = stockLine(c);
  const colours = c.colors.join(" · ");
  return (
    <div style={st("display:flex; align-items:baseline; gap:12px; padding:13px 0; border-top:1px solid rgba(15,25,35,.06);")}>
      <span style={st(`flex:0 0 auto; width:8px; height:8px; margin-top:5px; border-radius:99px; background:${tone.fg};`)} />
      <div style={st("flex:1 1 auto; min-width:0;")}>
        <div style={st("display:flex; align-items:baseline; justify-content:space-between; gap:12px; flex-wrap:wrap;")}>
          <span style={st(`font-size:13.5px; font-weight:700; color:${tone.fg};`)}>
            {c.label}
          </span>
          {c.price != null && (
            <span style={st("font-size:16px; font-weight:600; letter-spacing:-.3px; color:#2c3036; white-space:nowrap;")}>
              {takaRange(c.price, c.price_high)}
            </span>
          )}
        </div>
        <div style={st("display:flex; align-items:baseline; gap:8px; flex-wrap:wrap; margin-top:5px; font-size:12.5px; line-height:1.5;")}>
          <span style={st(`font-weight:600; color:${stock.color};`)}>{stock.text}</span>
          {c.regions.map((r) => (
            <span key={r.code} style={st("font-size:10.5px; font-weight:700; letter-spacing:.3px; padding:2px 8px; border-radius:99px; color:var(--acd); background:rgba(38,86,214,.09);")}>
              {r.name}
            </span>
          ))}
        </div>
        {colours && (
          <div style={st("margin-top:4px; font-size:12.5px; color:#9a9da4; line-height:1.5; text-wrap:pretty;")}>
            {colours}
          </div>
        )}
      </div>
    </div>
  );
}

export function Configure({ variants }: { variants?: VariantPrice[] | null }) {
  const options = (variants || []).filter((v) => (v.channels || []).length > 0);
  // cheapest configuration leads, the same order the backend sorted them in
  const [pick, setPick] = useState(0);
  // nothing to choose between: one configuration and no colours to show
  if (options.length < 2 && !options.some((v) => v.colors.length > 0)) return null;
  const shown = options[Math.min(pick, options.length - 1)];

  return (
    <div style={st("background:rgba(255,255,255,.92); border-radius:24px; padding:clamp(20px,3vw,28px); box-shadow:0 1px 2px rgba(15,25,35,.05), 0 10px 28px rgba(15,25,35,.07); margin-top:14px;")}>
      <div style={st("font-size:12px; font-weight:700; letter-spacing:1.8px; text-transform:uppercase; color:#9a9da4;")}>
        Choose RAM &amp; storage
      </div>
      <p style={st("margin:9px 0 0; font-size:13.5px; color:#84878f; line-height:1.5; text-wrap:pretty;")}>
        Stock and colours are what the shops publish for that exact
        configuration — not for the model as a whole.
      </p>

      <div style={st("display:flex; flex-wrap:wrap; gap:8px; margin-top:16px;")}>
        {options.map((v, i) => {
          const on = i === Math.min(pick, options.length - 1);
          return (
            <button
              key={v.variant}
              type="button"
              onClick={() => setPick(i)}
              style={st(`font:inherit; cursor:pointer; text-align:left; border:0; border-radius:16px; padding:9px 15px;
                 color:${on ? "#fff" : "#2c3036"};
                 background:${on ? "var(--ac)" : "rgba(15,25,35,.045)"};`)}
            >
              <span style={st("display:block; font-size:13.5px; font-weight:700; letter-spacing:-.1px;")}>
                {v.variant}
              </span>
              {v.price != null && (
                <span style={st(`display:block; margin-top:2px; font-size:12px; font-weight:600; color:${on ? "rgba(255,255,255,.82)" : "#9a9da4"};`)}>
                  {/* a floor, not the price: the cheapest offer for this
                      configuration, whatever channel it comes from */}
                  from {taka(v.price)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div style={st("margin-top:6px;")}>
        {(shown.channels || []).map((c) => (
          <ChannelRow key={`${c.channel}-${c.sim || ""}`} c={c} />
        ))}
      </div>
    </div>
  );
}
