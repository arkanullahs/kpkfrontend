import { st } from "../theme";
import { bnNum, t } from "../i18n";
import type { BriefClause } from "../filters";
import type { Screen } from "../App";

interface Props {
  screen: Screen;
  matchCount: number | null;
  loading: boolean;
  brief: BriefClause[];      // the whole ask, restated — see filters.buildBrief
  detailReady: boolean;      // results exist to go back to from the detail screen
  onSeeResults: () => void;
  onEditJump: (id: string) => void;
  onHome: () => void;
  onBackResults: () => void;
}

/* One job, one action. On the ask screen the dock is the BRIEF BAR: it restates
   the entire ask in plain words and holds the only control that spends a
   ranking call. It used to be the wizard's footer (Back + Continue), which is
   gone with the wizard — there are no steps left to advance through.
   On the results screen it offers one way home to start or tweak a search. It is
   hidden while the RAG call is loading, so the long request can't be navigated
   away from mid-flight. The detail screen gets a floating "back to results" so
   moving back and forth between picks never needs a scroll to the top. */
export function Dock({ screen, matchCount, loading, brief, detailReady, onSeeResults, onEditJump, onHome, onBackResults }: Props) {
  // results: one clear way back to change a field or start a fresh search
  if (screen === "results") {
    if (loading) return null;
    return (
      <div style={st("position:fixed; left:0; right:0; bottom:0; z-index:80; display:flex; justify-content:center; padding:0 16px max(18px, env(safe-area-inset-bottom, 18px)); pointer-events:none;")}>
        <button onClick={onHome} className="k-press"
          style={st("pointer-events:auto; display:flex; align-items:center; gap:10px; height:54px; padding:0 26px; border-radius:var(--r); border:.5px solid rgba(var(--rgb-white),.65); cursor:pointer; background:var(--card); backdrop-filter:blur(28px) saturate(190%); -webkit-backdrop-filter:blur(28px) saturate(190%); box-shadow:inset 0 1.5px 1.5px rgba(var(--rgb-white),.95), 0 16px 40px rgba(var(--rgb-ink),.16), 0 4px 12px rgba(var(--rgb-ink),.1); font-size:15px; font-weight:700; color:var(--lnk);")}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M11 5a6.5 6.5 0 110 13 6.5 6.5 0 010-13zM15.8 15.8L21 21" stroke="var(--lnk)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {t("new_search")}
        </button>
      </div>
    );
  }

  // detail: floating way back so picks can be flipped through without scrolling
  if (screen === "detail") {
    if (!detailReady) return null;
    return (
      <div style={st("position:fixed; left:0; right:0; bottom:0; z-index:80; display:flex; justify-content:center; padding:0 16px max(18px, env(safe-area-inset-bottom, 18px)); pointer-events:none;")}>
        <button onClick={onBackResults} className="k-press"
          style={st("pointer-events:auto; display:flex; align-items:center; gap:10px; height:54px; padding:0 26px; border-radius:var(--r); border:.5px solid rgba(var(--rgb-white),.65); cursor:pointer; background:var(--card); backdrop-filter:blur(28px) saturate(190%); -webkit-backdrop-filter:blur(28px) saturate(190%); box-shadow:inset 0 1.5px 1.5px rgba(var(--rgb-white),.95), 0 16px 40px rgba(var(--rgb-ink),.16), 0 4px 12px rgba(var(--rgb-ink),.1); font-size:15px; font-weight:700; color:var(--lnk);")}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M11 6l-6 6 6 6" stroke="var(--lnk)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {t("back_to_results")}
        </button>
      </div>
    );
  }

  if (screen !== "ask") return null;
  if (loading) return null;

  const label = matchCount != null
    ? `${t("see_n_matches")} ${bnNum(String(matchCount))} ${t("matches")}`
    : t("see_results");

  return (
    <div style={st("position:fixed; left:0; right:0; bottom:0; z-index:80; display:flex; justify-content:center; padding:0 16px max(18px, env(safe-area-inset-bottom, 18px)); pointer-events:none;")}>
      <div style={st("pointer-events:auto; width:100%; max-width:640px; padding:12px 14px 13px; border-radius:var(--r); border:.5px solid rgba(var(--rgb-white),.6); background:var(--card); backdrop-filter:blur(28px) saturate(190%); -webkit-backdrop-filter:blur(28px) saturate(190%); box-shadow:inset 0 1.5px 1.5px rgba(var(--rgb-white),.95), 0 16px 40px rgba(var(--rgb-ink),.18), 0 4px 12px rgba(var(--rgb-ink),.1);")}>
        <Brief brief={brief} onEditJump={onEditJump} />
        <button onClick={onSeeResults} className="k-press k-glow"
          style={st("margin-top:11px; width:100%; height:54px; padding:0 26px; border-radius:var(--r); border:.5px solid rgba(var(--rgb-white),.4); cursor:pointer; display:flex; align-items:center; justify-content:center; gap:11px; background:var(--teal); box-shadow:inset 0 1.5px 1px rgba(var(--rgb-white),.5), inset 0 -12px 22px rgba(var(--rgb-white),.1), 0 18px 44px rgba(var(--rgb-ink),.14), 0 4px 12px rgba(var(--rgb-ink),.14); color:var(--onp); font-size:16.5px; font-weight:700; letter-spacing:-.2px;")}>
          <span style={st("white-space:nowrap;")}>{label}</span>
          <svg width="19" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6" stroke="var(--card)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
    </div>
  );
}

/* The restatement is what makes "you can still change anything" felt rather
   than merely true -- the buyer never has to remember what they told us,
   because it is on screen, and tapping any clause goes straight to it.

   An unanswered clause reads in --mut (5.04:1) with its placeholder wording
   rather than disappearing: a bar that shrank as questions went unanswered
   would look finished when it was not. */
function Brief({ brief, onEditJump }: {
  brief: BriefClause[]; onEditJump: (id: string) => void;
}) {
  return (
    <div style={st("display:flex; flex-wrap:wrap; align-items:baseline; gap:4px 8px;")}>
      {brief.map((b, i) => (
        <span key={b.id} style={st("display:inline-flex; align-items:baseline; gap:8px; min-width:0;")}>
          {i > 0 && <span aria-hidden="true" style={st("color:var(--faint); font-size:13px;")}>·</span>}
          {/* 32px, not 44. WCAG 2.5.8's minimum is 24x24, and 2.5.5's 44x44
              exempts a target that has a full-size duplicate on the same page
              -- which every clause does: the section it jumps to is on this
              same scroll. Three 44px clauses would put the bar past 200px on a
              phone, which costs more than it buys. */}
          <button onClick={() => onEditJump(b.id)} className="k-press" title={t("brief_change")}
            style={st(`min-height:32px; padding:6px 0; border:none; background:none; cursor:pointer; font-size:13.5px; line-height:1.45; text-align:left; font-family:var(--f-bn); text-decoration:underline dotted; text-underline-offset:3px; text-decoration-color:var(--faint); color:${b.set ? "var(--ink)" : "var(--mut)"}; font-weight:${b.set ? 600 : 400};`)}>
            {b.text}
          </button>
        </span>
      ))}
    </div>
  );
}
