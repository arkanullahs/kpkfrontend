import { useEffect, useState } from "react";
import { st } from "../theme";
import { t } from "../i18n";
import { api, HttpError, type DiffResp, type DiffRow, type Pick } from "../api";

/* How the top picks differ (plan 03 W09). Compares exactly two of the first
   three picks, each as the configuration and channel its price is for. Every
   row comes from the backend's shared axis table and scorecard: this screen
   computes no winner, it shades the side a row already grades. */

type Sel = Pick & { selected_offer: NonNullable<Pick["selected_offer"]> };

/** the pairs the tabs offer: the main pick against each alternative, then the
    two alternatives -- at most three phones, never a three-way winner */
export function pairsOf(picks: Pick[]): [number, number][] {
  const n = Math.min(3, picks.filter((p) => p.selected_offer).length);
  const all: [number, number][] = [[0, 1], [0, 2], [1, 2]];
  return all.filter(([a, b]) => a < n && b < n);
}

/** differences first (the buyer's priorities, then hard requirements, then
    the rest), and every row that reads the same on both sides named once */
export function splitRows(rows: DiffRow[]): { differ: DiffRow[]; same: DiffRow[] } {
  const isSame = (r: DiffRow) =>
    r.direction === "same" || (r.direction === null && r.cells[0]?.text === r.cells[1]?.text);
  const rank = { priority: 0, hard_requirement: 1, context: 2 } as const;
  const differ = rows.filter((r) => !isSame(r))
    .map((r, i) => [r, i] as const)
    .sort((a, b) => rank[a[0].relevance] - rank[b[0].relevance] || a[1] - b[1])
    .map(([r]) => r);
  return { differ, same: rows.filter(isSame) };
}

interface State { key: string; data?: DiffResp; error?: "stale" | "failed"; }

export function DecisionDiff({ picks, version, priorities, minRam, minStorage }: {
  picks: Pick[]; version?: string; priorities: string[]; minRam: number; minStorage: number;
}) {
  const sels = picks.filter((p): p is Sel => !!p.selected_offer).slice(0, 3);
  const pairs = pairsOf(picks);
  const [pi, setPi] = useState(0);
  const [a, b] = pairs[Math.min(pi, pairs.length - 1)] ?? [0, 1];
  const key = sels.length > 1 ? `${sels[a].selected_offer.configuration_id}/${sels[b].selected_offer.configuration_id}` : "";
  const [state, setState] = useState<State>({ key: "" });

  useEffect(() => {
    if (!key || !version) return;
    const ctl = new AbortController();
    const ref = (p: Sel) => ({ model_id: p.selected_offer.model_id, channel: p.selected_offer.channel,
                               configuration_id: p.selected_offer.configuration_id });
    api.differences({
      requirements: { priorities: priorities.slice(0, 6), min_ram: minRam, min_storage: minStorage },
      selections: [ref(sels[a]), ref(sels[b])],
      catalogue_version: version, evidence_version: version,
    }, ctl.signal)
      .then((data) => setState({ key, data }))
      .catch((e) => {
        if (ctl.signal.aborted) return;
        setState({ key, error: e instanceof HttpError && e.status === 409 ? "stale" : "failed" });
      });
    return () => ctl.abort();
    // the key names the pair; the rest is fixed for one result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, version]);

  if (pairs.length === 0 || !version) return null;
  // a response for another pair is never drawn under this one's tabs
  const cur = state.key === key ? state : { key };
  const name = (p: Pick) => p.model;
  const rk = (ix: number) => picks.indexOf(sels[ix]) + 1;   // the rank the cards show
  const { differ, same } = cur.data ? splitRows(cur.data.differences) : { differ: [], same: [] };
  const lost = cur.data?.issues.filter((i) => i.selection_index !== null) ?? [];
  const noEvidence = cur.data?.issues.some((i) => i.code === "evidence_unavailable");

  return (
    <section aria-labelledby="diff-h" style={st("margin-top:22px; padding:18px; border-radius:var(--r); background:var(--card); box-shadow:inset 0 0 0 1px rgba(var(--rgb-ink),.06);")}>
      <h2 id="diff-h" style={st("margin:0; font-size:17px; font-weight:700; color:var(--ink);")}>{t("diff_title")}</h2>
      {pairs.length > 1 && (
        <div role="tablist" aria-label={t("diff_title")} style={st("display:flex; gap:6px; flex-wrap:wrap; margin-top:12px;")}>
          {pairs.map(([x, y], i) => (
            <button key={i} role="tab" aria-selected={i === pi} onClick={() => setPi(i)} className="k-press"
              style={st(`font-size:12.5px; font-weight:700; padding:6px 12px; border-radius:var(--r); border:none; cursor:pointer; ${i === pi ? "color:var(--onp); background:var(--teal);" : "color:var(--lnk); background:var(--tint);"}`)}>
              #{rk(x)} vs #{rk(y)}
            </button>
          ))}
        </div>
      )}

      {!cur.data && !cur.error && <p role="status" style={st("margin:14px 0 0; font-size:13.5px; color:var(--mut2);")}>{t("diff_loading")}</p>}
      {cur.error && (
        <p role="status" style={st("margin:14px 0 0; font-size:13.5px; color:var(--acd);")}>{t(cur.error === "stale" ? "diff_stale" : "diff_error")}</p>
      )}

      {cur.data && (
        <>
          <div role="table" style={st("display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(0,1fr); gap:0; margin-top:14px; font-size:13.5px;")}>
            <div role="row" style={st("display:contents;")}>
              <span role="columnheader" />
              {[a, b].map((ix) => (
                <span key={ix} role="columnheader" style={st("padding:0 8px 8px; font-weight:700; color:var(--ink2); overflow-wrap:anywhere;")}>#{rk(ix)} {name(sels[ix])}</span>
              ))}
            </div>
            {differ.map((r) => (
              <div key={r.key} role="row" style={st("display:contents;")}>
                <span role="rowheader" style={st("padding:9px 8px 9px 0; border-top:1px solid rgba(var(--rgb-ink),.07); color:var(--mut); overflow-wrap:anywhere;")}>
                  {r.label}
                  {r.relevance === "priority" && <span style={st("display:block; font-size:11px; font-weight:700; color:var(--tealD);")}>{t("diff_prio")}</span>}
                </span>
                {r.cells.map((c, j) => {
                  const better = (r.direction === "left" && j === 0) || (r.direction === "right" && j === 1);
                  return (
                    <span key={j} role="cell" style={st(`padding:9px 8px; border-top:1px solid rgba(var(--rgb-ink),.07); overflow-wrap:anywhere; ${better ? "font-weight:700; color:var(--tealD); background:rgba(var(--rgb-teal),.08);" : "color:var(--ink2);"}`)}>
                      {c.text}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
          {same.length > 0 && (
            <p style={st("margin:12px 0 0; font-size:13px; color:var(--mut); line-height:1.5;")}>
              {/* the value rides along: "Camera" alone would read as "the cameras
                  are equally good" beside a camera score that differs */}
              <b>{t("diff_same")}:</b> {same.map((r) => `${r.label} (${
                r.cells[0].text === r.cells[1].text ? r.cells[0].text : `${r.cells[0].text} / ${r.cells[1].text}`})`).join(", ")}
            </p>
          )}
          {lost.map((i) => (
            <p key={i.selection_index} role="status" style={st("margin:10px 0 0; font-size:13px; color:var(--acd);")}>
              #{rk(i.selection_index === 0 ? a : b)} {name(sels[i.selection_index === 0 ? a : b])} {t("diff_unresolved")}
            </p>
          ))}
          <p style={st("margin:12px 0 0; font-size:12px; color:var(--mut2); line-height:1.5;")}>
            {t("diff_note")} {noEvidence && t("diff_noevidence")}{" "}
            <a href="/compare" style={st("color:var(--lnk); font-weight:600;")}>{t("footer_compare")} →</a>
          </p>
        </>
      )}
    </section>
  );
}
