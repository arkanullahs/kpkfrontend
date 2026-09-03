import { st } from "../theme";
import { t } from "../i18n";
import type { Screen } from "../App";

interface Props {
  screen: Screen;
  loading: boolean;
  detailReady: boolean;      // results exist to go back to from the detail screen
  onBackResults: () => void;
}

/* One job, one action, and only on the screen that has one.

   The RESULTS dock is gone. It floated "New search" at the bottom of the
   viewport, and on a screen that is result cards from edge to edge there is no
   bottom offset that clears them: at 390x844 it covered the first card's photo
   and its price range (audit PICK-05). It now sits in the results header
   beside "Edit", which is the other way to change the same search, so the two
   are together instead of one floating over the answer and one buried in it.

   The detail screen keeps its floating "back to results": it is a single long
   document rather than a list of answers, the control is the only way back
   from the bottom of it, and it is the page's own navigation rather than a
   duplicate of something already on screen. */
export function Dock({ screen, loading, detailReady, onBackResults }: Props) {
  void loading;
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

  // the ask and results screens have no dock: step 9 holds the only commit,
  // and a floating bar over a one-question screen was chrome competing with
  // the question
  return null;
}
