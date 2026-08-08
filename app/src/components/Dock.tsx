import { st } from "../theme";
import { t } from "../i18n";
import type { Screen } from "../App";

interface Props {
  screen: Screen;
  loading: boolean;
  detailReady: boolean;      // results exist to go back to from the detail screen
  onHome: () => void;
  onBackResults: () => void;
}

/* One job, one action, and only on the two screens that have one.
   On the results screen it offers one way home to start or tweak a search. It is
   hidden while the RAG call is loading, so the long request can't be navigated
   away from mid-flight. The detail screen gets a floating "back to results" so
   moving back and forth between picks never needs a scroll to the top. */
export function Dock({ screen, loading, detailReady, onHome, onBackResults }: Props) {
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

  // the ask screen has no dock: step 9 holds the only commit, and a floating
  // bar over a one-question screen was chrome competing with the question
  return null;
}
