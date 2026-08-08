import { useEffect } from "react";
import { st } from "../theme";
import { t } from "../i18n";
import { GROUPS } from "../filters";

/* Fires once, when a buyer commits without having set a single filter.

   This interrupts someone at the moment they have decided to act, which is a
   real cost -- so "No" is a full-strength equal-width button and not a grey
   afterthought, and three separate gestures dismiss it: the grab handle, the
   scrim, and Escape.

   The affirmative button does NOT rank. It opens the filters. Only the brief
   bar spends a ranking call, and that rule has no exceptions.

   The scrim is the second and last glass in the app. The existing doctrine --
   "the header is the only glass: real content scrolls under it. Over flat
   paper, glass is dirty translucency rather than material" -- is the reason
   this qualifies: a scrim has live content behind it, so blur is material.
   It uses .k-scrim rather than .k-glass because that rule's reduced-transparency
   fallback is `background: var(--card)`, which full-screen would paint an
   opaque white viewport with this (also white) sheet invisible on top of it. */
export function NarrowSheet({ matchCount, onDismiss, onShowNow, onNarrow }: {
  matchCount: number | null;
  /** the scrim, the handle, Escape — back to where you were, nothing spent */
  onDismiss: () => void;
  /** the labelled "No, show them now" button, which has to do what it says.
      It was wired to onDismiss: the sheet closed and the buyer was returned to
      the screen they had just committed from, with no results and no reason
      given. */
  onShowNow: () => void;
  onNarrow: () => void;
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onDismiss(); };
    window.addEventListener("keydown", esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", esc); document.body.style.overflow = prev; };
  }, [onDismiss]);

  return (
    <div onClick={onDismiss} role="dialog" aria-modal="true" aria-label={t("ns_title")}
      className="k-scrim"
      style={st("position:fixed; inset:0; z-index:1000; display:flex; align-items:flex-end; justify-content:center; background:rgba(var(--rgb-ink),.42); animation:kfade .28s ease both;")}>
      <div onClick={(e) => e.stopPropagation()}
        style={st("width:100%; max-width:640px; background:var(--card); border-radius:14px 14px 0 0; padding:22px 20px calc(20px + env(safe-area-inset-bottom)); box-shadow:0 -22px 40px -24px rgba(var(--rgb-ink),.45); animation:kslide .34s cubic-bezier(.2,.7,.2,1) both;")}>
        <style>{`@keyframes kslide{from{transform:translateY(26px);opacity:0}to{transform:none;opacity:1}}`}</style>

        {/* --faint reads as a grab handle but is 1.96:1 on card, and this one is
            a real button with a label, so WCAG 1.4.11's 3:1 applies. --mut is
            5.04:1 -- heavier than the iOS handle it imitates, but honest. */}
        <button onClick={onDismiss} aria-label={t("ns_dismiss")}
          style={st("display:block; width:44px; height:5px; background:var(--mut); border:none; border-radius:3px; margin:0 auto 18px; cursor:pointer; padding:0;")} />

        <div style={st("font-size:21px; font-weight:600; color:var(--ink); line-height:1.3; font-family:var(--f-bn);")}>{t("ns_title")}</div>
        <p style={st("margin:6px 0 0; font-size:15px; color:var(--tx); line-height:1.55;")}>
          {t("ns_body").replace("{n}", String(matchCount ?? "—"))}
        </p>

        <div className="k-stagger" style={st("margin-top:18px; display:flex; flex-direction:column; gap:9px;")}>
          {GROUPS.filter((g) => g.tier === 1).map((g) => (
            <div key={g.id} style={st("display:flex; align-items:center; gap:13px; padding:14px; border-radius:var(--r); border:1.5px solid var(--rule);")}>
              <svg width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={st("flex-shrink:0;")}>
                <path d={g.icon} stroke="var(--lnk)" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={st("font-size:16px; font-weight:500; color:var(--ink);")}>{t(g.labelKey)}</span>
            </div>
          ))}
        </div>

        <div style={st("display:flex; gap:10px; margin-top:20px;")}>
          <button onClick={onShowNow} className="k-press"
            style={st("flex:1; padding:15px 10px; border-radius:var(--r); border:1.5px solid var(--mut); background:var(--card); cursor:pointer; font-size:15px; font-weight:600; color:var(--ink); font-family:var(--f-bn);")}>
            {t("ns_no")}
          </button>
          {/* the same amber gradient PriceAlert already ships, and not flat
              --ac: white on amber-600 is 4.29:1 and fails AA at 15px bold.
              Fading to amber-700 puts 5.0:1 behind the text's own line. */}
          <button onClick={onNarrow} className="k-press k-glow"
            style={st("flex:1; padding:15px 10px; border-radius:var(--r); border:none; background:linear-gradient(180deg,var(--ac),var(--acd)); box-shadow:0 4px 14px rgba(var(--rgb-amber),.35); cursor:pointer; font-size:15px; font-weight:700; color:var(--onp); font-family:var(--f-bn);")}>
            {t("ns_yes")}
          </button>
        </div>
      </div>
    </div>
  );
}
