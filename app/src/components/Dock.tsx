import { st } from "../theme";
import { bnNum, t } from "../i18n";
import type { Screen } from "../App";

interface Props {
  screen: Screen;
  matchCount: number | null;
  loading: boolean;
  askStep: number;
  askLast: boolean;
  onAskNext: () => void;
  onAskBack: () => void;
  onSeeResults: () => void;
  onHome: () => void;
}

/* One job, one action. On the ask screen the dock is the wizard's footer: a Back
   affordance and a single primary button (Continue, or "See results" last step).
   On the results screen it offers one way home to start or tweak a search. It is
   hidden while the RAG call is loading, so the long request can't be navigated
   away from mid-flight; the detail screen carries its own back. */
export function Dock({ screen, matchCount, loading, askStep, askLast, onAskNext, onAskBack, onSeeResults, onHome }: Props) {
  // results: one clear way back to change a field or start a fresh search
  if (screen === "results") {
    if (loading) return null;
    return (
      <div style={st("position:fixed; left:0; right:0; bottom:0; z-index:80; display:flex; justify-content:center; padding:0 16px max(18px, env(safe-area-inset-bottom, 18px)); pointer-events:none;")}>
        <button onClick={onHome}
          style={st("pointer-events:auto; display:flex; align-items:center; gap:10px; height:54px; padding:0 26px; border-radius:20px; border:.5px solid rgba(255,255,255,.65); cursor:pointer; background:rgba(250,250,251,.62); backdrop-filter:blur(28px) saturate(190%); -webkit-backdrop-filter:blur(28px) saturate(190%); box-shadow:inset 0 1.5px 1.5px rgba(255,255,255,.95), 0 16px 40px rgba(20,24,32,.16), 0 4px 12px rgba(20,24,32,.1); font-size:15px; font-weight:700; color:var(--acd);")}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M11 5a6.5 6.5 0 110 13 6.5 6.5 0 010-13zM15.8 15.8L21 21" stroke="var(--acd)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {t("new_search")}
        </button>
      </div>
    );
  }

  if (screen !== "ask") return null;

  const label = askLast
    ? (matchCount != null ? `${t("see_n_matches")} ${bnNum(String(matchCount))} ${t("matches")}` : t("see_results"))
    : t("continue");

  return (
    <div style={st("position:fixed; left:0; right:0; bottom:0; z-index:80; display:flex; justify-content:center; padding:0 16px max(18px, env(safe-area-inset-bottom, 18px)); pointer-events:none;")}>
      <div style={st("pointer-events:auto; width:100%; max-width:540px; display:flex; align-items:stretch; gap:10px;")}>
        {askStep > 0 && (
          <button onClick={onAskBack} title={t("back")} aria-label={t("back")}
            style={st("flex-shrink:0; width:58px; border-radius:22px; border:.5px solid rgba(255,255,255,.6); cursor:pointer; display:flex; align-items:center; justify-content:center; background:rgba(250,250,251,.5); backdrop-filter:blur(28px) saturate(190%); -webkit-backdrop-filter:blur(28px) saturate(190%); box-shadow:inset 0 1.5px 1.5px rgba(255,255,255,.95), 0 16px 40px rgba(20,24,32,.18), 0 4px 12px rgba(20,24,32,.1);")}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="var(--acd)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        )}
        <button onClick={askLast ? onSeeResults : onAskNext}
          style={st("flex:1; height:58px; padding:0 26px; border-radius:22px; border:.5px solid rgba(255,255,255,.4); cursor:pointer; display:flex; align-items:center; justify-content:center; gap:11px; background:linear-gradient(180deg,var(--acg1),var(--acg2)); box-shadow:inset 0 1.5px 1px rgba(255,255,255,.5), inset 0 -12px 22px rgba(255,255,255,.1), 0 18px 44px var(--acglow), 0 4px 12px rgba(20,24,32,.14); color:#fff; font-size:16.5px; font-weight:700; letter-spacing:-.2px;")}>
          <span style={st("white-space:nowrap;")}>{label}</span>
          <svg width="19" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 12h15M13 6l6 6-6 6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
    </div>
  );
}
