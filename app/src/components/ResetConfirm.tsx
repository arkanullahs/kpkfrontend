import { useEffect } from "react";
import { createPortal } from "react-dom";
import { st } from "../theme";
import { t } from "../i18n";

/* "Start over" asks first.

   Every other control in the walk is undoable by pressing Back; this one
   throws away up to nine answers and the URL that carried them, and a buyer
   reaching for it is usually mid-scroll on a wrapping chip row. It is the only
   destructive control in the picker, so it is the only one that gets a
   confirm.

   Portalled to body for the same reason MorePopup and Confirm are: `.k-step`
   animates a transform, which makes it the containing block for any fixed
   descendant, and a "full-screen" scrim rendered inside it covers the step
   instead of the viewport. */
export function ResetConfirm({ onYes, onNo }: { onYes: () => void; onNo: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onNo(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onNo]);

  return createPortal(
    <div onClick={onNo} role="dialog" aria-modal="true" aria-label={t("s_reset_t")} className="k-scrim"
      style={st("position:fixed; inset:0; z-index:1100; display:flex; align-items:center; justify-content:center; padding:20px; background:rgba(var(--rgb-ink),.5); animation:kfade .24s ease both;")}>
      <div onClick={(e) => e.stopPropagation()}
        style={st("width:100%; max-width:420px; background:var(--card); border-radius:16px; padding:24px 22px; box-shadow:0 30px 60px -28px rgba(var(--rgb-ink),.6);")}>
        <div style={st("font-size:21px; font-weight:700; color:var(--ink); font-family:var(--f-bn); line-height:1.3;")}>
          {t("s_reset_t")}
        </div>
        <p style={st("margin:10px 0 0; font-size:16px; color:var(--tx); line-height:1.55; font-family:var(--f-bn);")}>
          {t("s_reset_body")}
        </p>
        <div style={st("display:flex; gap:10px; margin-top:20px;")}>
          {/* keep-what-I-have is the default and the safe side, so it holds
              the filled button; the destructive one is outlined */}
          <button onClick={onYes} className="k-press"
            style={st("flex:1; min-height:52px; border-radius:var(--r); border:1.5px solid var(--rule); background:var(--card); cursor:pointer; font-size:16px; font-weight:700; color:var(--danger); font-family:var(--f-bn);")}>
            {t("s_reset_yes")}
          </button>
          <button onClick={onNo} className="k-press"
            style={st("flex:1; min-height:52px; border-radius:var(--r); border:none; background:var(--teal); cursor:pointer; font-size:16px; font-weight:700; color:var(--onp); font-family:var(--f-bn);")}>
            {t("s_reset_no")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
