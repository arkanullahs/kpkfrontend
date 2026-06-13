import { st } from "../theme";
import { t } from "../i18n";
import type { Screen } from "../App";

const DEFS: { key: Screen; labelKey: string; path: string }[] = [
  { key: "ask", labelKey: "nav_ask", path: "M4 8h8M17 8h3M4 16h3M12 16h8M14.5 5.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5M7.5 13.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5" },
  { key: "results", labelKey: "nav_results", path: "M4 6h2M4 12h2M4 18h2M10 6h10M10 12h10M10 18h10" },
  { key: "detail", labelKey: "nav_detail", path: "M8.5 3.5h7a1.5 1.5 0 011.5 1.5v14a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 017 19V5a1.5 1.5 0 011.5-1.5zM10.5 17.5h3" },
];

interface Props {
  screen: Screen;
  onScreen: (s: Screen) => void;
  onAsk: () => void;
  onSeeResults: () => void;
  matchCount: number | null;
}

export function Dock({ screen, onScreen, onAsk, onSeeResults, matchCount }: Props) {
  return (
    <div style={st("position:fixed; left:0; right:0; bottom:0; z-index:80; display:flex; justify-content:center; align-items:stretch; gap:12px; padding:0 16px max(20px, env(safe-area-inset-bottom, 20px)); pointer-events:none;")}>
      <div style={st("pointer-events:auto; display:flex; align-items:center; gap:3px; padding:7px; border-radius:99px; background:rgba(250,250,251,.36); backdrop-filter:blur(28px) saturate(190%); -webkit-backdrop-filter:blur(28px) saturate(190%); border:.5px solid rgba(255,255,255,.6); box-shadow:inset 0 1.5px 1.5px rgba(255,255,255,.95), inset 0 -1px 1px rgba(255,255,255,.25), inset 1.5px 0 2px rgba(255,255,255,.4), inset -1.5px 0 2px rgba(255,255,255,.4), 0 24px 55px rgba(20,24,32,.22), 0 4px 12px rgba(20,24,32,.1);")}>
        {DEFS.map((it) => {
          const active = it.key === screen;
          return (
            <button key={it.key} onClick={() => onScreen(it.key)}
              style={st(`display:flex; flex-direction:column; align-items:center; gap:3px; padding:9px 18px 7px; border-radius:99px; border:none; cursor:pointer; transition:all .22s cubic-bezier(.2,.7,.2,1); background:${active ? "rgba(255,255,255,.85)" : "transparent"}; color:${active ? "var(--acd)" : "#565b63"}; box-shadow:${active ? "inset 0 1px 1px rgba(255,255,255,1), 0 2px 8px rgba(20,24,32,.12)" : "none"};`)}>
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
                <path d={it.path} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={st("font-size:11px; font-weight:600; letter-spacing:.3px;")}>{t(it.labelKey)}</span>
            </button>
          );
        })}
      </div>

      {screen === "ask" ? (
        <button onClick={onSeeResults}
          style={st("pointer-events:auto; display:flex; align-items:center; gap:12px; padding:0 24px; border-radius:99px; border:.5px solid rgba(255,255,255,.45); cursor:pointer; background:linear-gradient(180deg,var(--acg1),var(--acg2)); box-shadow:inset 0 1.5px 1px rgba(255,255,255,.55), inset 0 -10px 18px rgba(255,255,255,.14), 0 20px 45px var(--acglow), 0 4px 10px rgba(20,24,32,.12); color:#fff;")}>
          <span style={st("display:flex; flex-direction:column; align-items:flex-start; line-height:1.2;")}>
            <span style={st("font-size:11px; font-weight:500; opacity:.85;")}>{matchCount != null ? `${matchCount} ${t("matches")}` : t("live_picks")}</span>
            <span style={st("font-size:15px; font-weight:700;")}>{t("see_results")}</span>
          </span>
          <svg width="17" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 12h15M13 6l6 6-6 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      ) : (
        <button onClick={onAsk} title={t("new_search")}
          style={st("pointer-events:auto; width:66px; border-radius:50%; border:.5px solid rgba(255,255,255,.6); cursor:pointer; display:flex; align-items:center; justify-content:center; background:rgba(250,250,251,.36); backdrop-filter:blur(28px) saturate(190%); -webkit-backdrop-filter:blur(28px) saturate(190%); box-shadow:inset 0 1.5px 1.5px rgba(255,255,255,.95), inset 0 -1px 1px rgba(255,255,255,.25), 0 24px 55px rgba(20,24,32,.22), 0 4px 12px rgba(20,24,32,.1);")}>
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none"><path d="M11 5a6.5 6.5 0 110 13 6.5 6.5 0 010-13zM15.8 15.8L21 21" stroke="var(--acd)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      )}
    </div>
  );
}
