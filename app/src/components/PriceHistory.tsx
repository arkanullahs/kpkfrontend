import { st, taka } from "../theme";
import type { PhoneDetail } from "../api";

/* What this phone has cost, per channel.

   The app has typed `price_history` since the detail screen existed and never
   drew it -- 49 nightly reads sitting in the payload with nothing to show them
   (owner 2026-08-30: "why price graphs missing from the picker").

   ONE CHART PER CHANNEL, each on its own scale. That is the sitewide rule the
   /phone/ pages moved to the same day, and it exists because a shared y-axis
   is a shared ruler: on the iPhone 17 Pro Max the official line spans 35,000
   taka and the unofficial one 12,000, so drawn together the smaller market
   renders as a flat stroke along the bottom with every move in it invisible.
   Two markets, two pictures, and the comparison between them printed in words
   because that is the form anyone would quote it in.

   A channel that never moved is drawn down the middle and labelled, not
   dropped: leaving it out would make a two-market phone look like a
   one-market one. */

type Row = NonNullable<PhoneDetail["price_history"]>[number];
type Pt = { date: string; v: number };

const MIN_POINTS = 3;          // a two-point "trend" is noise
const INK: Record<string, string> = {
  official: "var(--tealD)",
  unofficial: "var(--ac)",
};
const WORD: Record<string, string> = {
  official: "Official",
  unofficial: "Unofficial",
};

function series(history: Row[]): Record<string, Pt[]> {
  const out: Record<string, Pt[]> = { official: [], unofficial: [] };
  for (const h of history) {
    if (h.official != null) out.official.push({ date: h.date, v: h.official });
    if (h.unofficial != null) out.unofficial.push({ date: h.date, v: h.unofficial });
  }
  // No per-channel column ever recorded -- older rows. best_price is all
  // there is, and it is only safe to plot as one unlabelled line.
  if (!out.official.length && !out.unofficial.length) {
    const legacy = history
      .filter((h) => h.best_price != null)
      .map((h) => ({ date: h.date, v: h.best_price }));
    if (legacy.length >= MIN_POINTS) return { official: legacy };
    return {};
  }
  const kept: Record<string, Pt[]> = {};
  for (const [k, pts] of Object.entries(out)) {
    if (pts.length >= MIN_POINTS) kept[k] = pts.slice(-180);
  }
  return kept;
}

function Chart({ chan, pts }: { chan: string; pts: Pt[] }) {
  const vals = pts.map((p) => p.v);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const flat = hi === lo;
  const W = 1000;
  const H = 300;
  const PAD = 20;
  const span = Math.max(1, pts.length - 1);
  const y = (v: number) =>
    flat ? H / 2 : H - PAD - ((v - lo) / (hi - lo)) * (H - PAD * 2);
  const x = (i: number) => (i * W) / span;

  const mid = Math.round((lo + hi) / 2);
  const refs = flat ? [lo] : [...new Set([hi, mid, lo])];
  const line = pts.map((p, i) => `${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const area = `${x(0).toFixed(1)},${H - PAD} ${line} ${x(pts.length - 1).toFixed(1)},${H - PAD}`;
  const ink = INK[chan] || "var(--ac)";
  const gid = `pg-${chan}`;
  const last = pts[pts.length - 1];

  return (
    <figure style={st("margin:0; min-width:0;")}>
      <figcaption style={st("display:flex; align-items:center; gap:8px; font-size:13.5px; font-weight:700; color:var(--ink); margin-bottom:8px;")}>
        <span style={st(`display:inline-block; width:16px; height:3px; border-radius:2px; background:${ink};`)} />
        {WORD[chan] || chan} {taka(last.v)}
      </figcaption>

      <div style={st("display:flex; flex-wrap:wrap; gap:7px; margin-bottom:10px;")}>
        {flat ? (
          <Stat big={taka(lo)} small="never moved" />
        ) : (
          <>
            <Stat big={taka(lo)} small={`lowest ${(WORD[chan] || chan).toLowerCase()}`} teal />
            <Stat big={taka(hi)} small={`highest ${(WORD[chan] || chan).toLowerCase()}`} />
          </>
        )}
      </div>

      <div style={st("display:flex; gap:10px; align-items:stretch;")}>
        <div style={st("position:relative; flex:1 1 auto; min-width:0; height:132px;")}>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img"
            aria-label={`${WORD[chan] || chan} price, ${taka(lo)} to ${taka(hi)}`}
            style={st("width:100%; height:100%; display:block; overflow:visible;")}>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={ink} stopOpacity=".22" />
                <stop offset="1" stopColor={ink} stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* no fill under a FLAT line: the area runs from mid-height to the
                baseline and reads as a solid slab, which looks like a value
                rather than a price that simply never moved */}
            {!flat && <polygon fill={`url(#${gid})`} points={area} />}
            {refs.map((v) => (
              <line key={v} x1="0" y1={y(v)} x2={W} y2={y(v)}
                stroke="rgba(var(--rgb-ink),.09)" strokeWidth="1"
                vectorEffect="non-scaling-stroke" />
            ))}
            <polyline fill="none" stroke={ink} strokeWidth="2.5"
              vectorEffect="non-scaling-stroke" strokeLinejoin="round"
              strokeLinecap="round" points={line} />
          </svg>
          {/* today's dot, positioned in percentages so the stretched viewBox
              cannot squash it into an ellipse */}
          <b style={st(`position:absolute; left:${((x(pts.length - 1) / W) * 100).toFixed(2)}%; top:${((y(last.v) / H) * 100).toFixed(2)}%; width:9px; height:9px; margin:-4.5px 0 0 -4.5px; border-radius:50%; background:${ink}; box-shadow:0 0 0 3px var(--card);`)} />
        </div>
        {/* the labels sit against their own gridlines: three of them spread
            top/middle/bottom, but a flat series has ONE line drawn down the
            middle, and space-between would pin its price to the top where
            there is nothing to read it against */}
        <div style={st(`flex:none; display:flex; flex-direction:column; justify-content:${flat ? "center" : "space-between"}; font-size:11.5px; font-variant-numeric:tabular-nums; color:var(--mut2); height:132px;`)}>
          {refs.map((v) => <span key={v}>{taka(v)}</span>)}
        </div>
      </div>

      <div style={st("display:flex; justify-content:space-between; font-size:11.5px; color:var(--mut2); margin-top:6px;")}>
        <span>{pts[0].date}</span>
        <span style={st("opacity:.75;")}>{pts.length} nightly reads</span>
        <span>{last.date}</span>
      </div>
    </figure>
  );
}

function Stat({ big, small, teal }: { big: string; small: string; teal?: boolean }) {
  return (
    <span style={st(`display:flex; flex-direction:column; gap:1px; padding:7px 11px; border-radius:var(--r-sm, 10px); font-size:10px; font-weight:700; letter-spacing:.6px; text-transform:uppercase; ${teal ? "background:var(--tealL); color:var(--tealD);" : "background:rgba(var(--rgb-ink),.045); color:var(--mut2);"}`)}>
      <b style={st(`font-family:var(--f-price); font-variant-numeric:tabular-nums; font-size:15px; font-weight:700; letter-spacing:-.2px; text-transform:none; ${teal ? "color:var(--tealD);" : "color:var(--ink2);"}`)}>{big}</b>
      {small}
    </span>
  );
}

export function PriceHistory({ history }: { history: Row[] }) {
  const s = series(history || []);
  const chans = ["official", "unofficial"].filter((c) => s[c]?.length);
  if (!chans.length) return null;

  let gap = "";
  if (chans.length === 2) {
    const o = s.official[s.official.length - 1].v;
    const u = s.unofficial[s.unofficial.length - 1].v;
    gap = `The warranty costs ${taka(Math.abs(o - u))} today: ${taka(o)} official against ${taka(u)} unofficial.`;
  }

  return (
    <>
      {gap && (
        <p style={st("margin:0 0 14px; font-size:14px; line-height:1.5; color:var(--ink);")}>{gap}</p>
      )}
      <div style={st("display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:24px;")}>
        {chans.map((c) => <Chart key={c} chan={c} pts={s[c]} />)}
      </div>
    </>
  );
}
