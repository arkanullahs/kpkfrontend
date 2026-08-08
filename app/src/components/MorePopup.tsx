import { useEffect } from "react";
import { createPortal } from "react-dom";
import { st } from "../theme";
import { t } from "../i18n";
import { PriorityLadder } from "./PriorityLadder";

/* The "add another priority?" popup (spec 2026-08-08 §5, owner edge -1 -> -42,
   labelled "popup"). It sits over the priority screen the buyer just answered
   and routes the flow: yes -> another needN pick, no -> on to brands.

   It shows the ladder as it stands. The body text CLAIMS "each one counts less
   than the one before"; the ladder is the buyer seeing it, at the one moment
   the claim is load-bearing -- they are deciding whether another pick is worth
   making (owner 2026-08-09, "letting people know what their choice weights").

   Same portal-to-body material as StepBody's Confirm dialog -- a transformed
   `.k-step` ancestor would otherwise be the containing block for a fixed child
   and the scrim would miss the viewport. */
export function MorePopup({ picks, onYes, onNo }: {
  picks: string[]; onYes: () => void; onNo: () => void;
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onNo(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onNo]);

  return createPortal(
    <div onClick={onNo} role="dialog" aria-modal="true" aria-label={t("s_more_t")} className="k-scrim"
      style={st("position:fixed; inset:0; z-index:1100; display:flex; align-items:center; justify-content:center; padding:20px; background:rgba(var(--rgb-ink),.5); animation:kfade .24s ease both;")}>
      <div onClick={(e) => e.stopPropagation()}
        style={st("width:100%; max-width:420px; background:var(--card); border-radius:16px; padding:24px 22px; box-shadow:0 30px 60px -28px rgba(var(--rgb-ink),.6);")}>
        <div style={st("font-size:21px; font-weight:700; color:var(--ink); font-family:var(--f-bn); line-height:1.3;")}>
          {t("s_more_t")}
        </div>
        <p style={st("margin:10px 0 0; font-size:16px; color:var(--tx); line-height:1.55; font-family:var(--f-bn);")}>
          {t("s_more_body")}
        </p>
        <div style={st("margin-top:16px;")}><PriorityLadder picks={picks} compact /></div>
        <div style={st("display:flex; gap:10px; margin-top:20px;")}>
          <button onClick={onNo} className="k-press"
            style={st("flex:1; min-height:52px; border-radius:var(--r); border:1.5px solid var(--rule); background:var(--card); cursor:pointer; font-size:16px; font-weight:700; color:var(--ink); font-family:var(--f-bn);")}>
            {t("s_more_no")}
          </button>
          <button onClick={onYes} className="k-press"
            style={st("flex:1; min-height:52px; border-radius:var(--r); border:none; background:var(--teal); cursor:pointer; font-size:16px; font-weight:700; color:var(--onp); font-family:var(--f-bn);")}>
            {t("s_more_yes")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
