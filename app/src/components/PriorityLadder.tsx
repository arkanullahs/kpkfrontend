import { st } from "../theme";
import { bnNum, t } from "../i18n";
import { weightAt } from "../need";

/* The geometric ladder, drawn.

   Each priority the buyer has picked is a bar whose width is its share of the
   top pick -- 100%, 33%, 11%, 4% -- so the fourth is visibly a sliver. The
   share caption on every bar past the first is the "warning" the owner asked
   for, shown as a true number rather than a scold: an unbounded list is safe
   precisely because it looks like this.

   Owner 2026-08-09: "letting people know what their choice weights". It is not
   enough to draw this on the one screen that builds it -- the buyer decides
   whether to add another priority IN THE POPUP, and decides whether to commit
   ON THE LAST SCREEN, and both of those were showing nothing. Same component,
   three places, so the number can never differ between them.

   `compact` drops the caption column, which does not fit beside a dialog's
   text at 375px. */
export function PriorityLadder({ picks, compact = false }: {
  picks: string[]; compact?: boolean;
}) {
  const known = picks.filter((k) => t("qs_" + k) !== "qs_" + k);
  if (!known.length) return null;
  const top = weightAt(0);
  return (
    <div style={st(`padding:${compact ? "12px 14px" : "14px 16px"}; border-radius:var(--r); background:var(--tint); border:1px solid var(--tint2);`)}>
      <div style={st("font-size:12.5px; font-weight:700; color:var(--mut); letter-spacing:.3px; text-transform:uppercase; margin-bottom:10px;")}>
        {t("s_prio_ladder_t")}
      </div>
      {known.map((k, i) => {
        const pct = Math.round((weightAt(i) / top) * 100);
        return (
          <div key={k} style={st("display:flex; align-items:center; gap:10px; margin-top:" + (i ? "9px" : "0") + ";")}>
            <div style={st(`flex-shrink:0; width:${compact ? 82 : 96}px; font-size:14px; font-weight:700; color:var(--ink); font-family:var(--f-bn);`)}>
              {t("qs_" + k)}
            </div>
            <div style={st("flex:1; height:9px; border-radius:var(--r); background:var(--card); overflow:hidden;")}>
              <div style={st(`height:100%; width:${pct}%; background:var(--teal); border-radius:var(--r); transition:width .35s ease;`)} />
            </div>
            {/* the share, always -- including on the first bar, where "100% of
                the weight" is the fact that makes the others readable. The
                first bar used to be bare, so the buyer had nothing to read the
                33% against. */}
            <div style={st(`flex-shrink:0; ${compact ? "width:38px; text-align:right;" : ""} font-size:12px; font-weight:600; color:${i ? "var(--mut)" : "var(--lnk)"}; font-family:var(--f-bn); white-space:nowrap;`)}>
              {compact || i === 0
                ? `${bnNum(String(pct))}%`
                : t("s_prio_share").replace("{pct}", bnNum(String(pct)))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
