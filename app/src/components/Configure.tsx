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
  official: { fg: "var(--tealD)", bg: "rgba(var(--rgb-teal),.1)" },
  unofficial: { fg: "var(--acd)", bg: "rgba(var(--rgb-amber),.12)" },
  unstated: { fg: "var(--mut2)", bg: "rgba(var(--rgb-ink),.05)" },
};

function stockLine(c: VariantChannel): { text: string; color: string } {
  if (c.in_stock)
    return {
      text: `In stock at ${c.shops} shop${c.shops > 1 ? "s" : ""}`
        // the exact figure only where a shop publishes a count
        + (c.units ? ` · ${c.units} units` : ""),
      color: "var(--tealD)",
    };
  if (c.in_stock === false) return { text: "Sold out", color: "var(--acd)" };
  // null is "nobody reported it", which is not the same as sold out
  return { text: "Stock not reported", color: "var(--mut2)" };
}

function ChannelRow({ c }: { c: VariantChannel }) {
  const tone = TONE[c.channel] || TONE.unstated;
  const stock = stockLine(c);
  const colours = c.colors.join(" · ");
  return (
    <div style={st("display:flex; align-items:baseline; gap:12px; padding:13px 0; border-top:1px solid rgba(var(--rgb-ink),.06);")}>
      <span style={st(`flex:0 0 auto; width:8px; height:8px; margin-top:5px; border-radius:var(--r); background:${tone.fg};`)} />
      <div style={st("flex:1 1 auto; min-width:0;")}>
        <div style={st("display:flex; align-items:baseline; justify-content:space-between; gap:12px; flex-wrap:wrap;")}>
          <span style={st(`font-size:13.5px; font-weight:700; color:${tone.fg};`)}>
            {c.label}
          </span>
          {c.price != null && (
            <span style={st("font-size:16px; font-weight:600; letter-spacing:-.3px; color:var(--ink2); white-space:nowrap;")}>
              {takaRange(c.price, c.price_high)}
            </span>
          )}
        </div>
        <div style={st("display:flex; align-items:baseline; gap:8px; flex-wrap:wrap; margin-top:5px; font-size:12.5px; line-height:1.5;")}>
          <span style={st(`font-weight:600; color:${stock.color};`)}>{stock.text}</span>
          {c.regions.map((r) => (
            <span key={r.code} style={st("font-size:10.5px; font-weight:700; letter-spacing:.3px; padding:2px 8px; border-radius:var(--r); color:var(--lnk); background:var(--tealL);")}>
              {r.name}
            </span>
          ))}
        </div>
        {colours && (
          <div style={st("margin-top:4px; font-size:12.5px; color:var(--mut2); line-height:1.5; text-wrap:pretty;")}>
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
    <div style={st("background:var(--card); border-radius:var(--r); padding:clamp(20px,3vw,28px); box-shadow:0 1px 2px rgba(var(--rgb-ink),.05), 0 10px 28px rgba(var(--rgb-ink),.07); margin-top:14px;")}>
      <div style={st("font-size:12px; font-weight:700; letter-spacing:1.8px; text-transform:uppercase; color:var(--mut2);")}>
        Choose RAM &amp; storage
      </div>
      <p style={st("margin:9px 0 0; font-size:13.5px; color:var(--mut2); line-height:1.5; text-wrap:pretty;")}>
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
              style={st(`font:inherit; cursor:pointer; text-align:left; border:0; border-radius:var(--r); padding:9px 15px;
                 color:${on ? "var(--card)" : "var(--ink2)"};
                 background:${on ? "var(--teal)" : "rgba(var(--rgb-ink),.045)"};`)}
            >
              <span style={st("display:block; font-size:13.5px; font-weight:700; letter-spacing:-.1px;")}>
                {v.variant}
              </span>
              {v.price != null && (
                <span style={st(`display:block; margin-top:2px; font-size:12px; font-weight:600; color:${on ? "rgba(var(--rgb-white),.82)" : "var(--mut2)"};`)}>
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
