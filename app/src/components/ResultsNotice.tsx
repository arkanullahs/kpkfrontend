import { useEffect } from "react";
import { st } from "../theme";
import { t } from "../i18n";

/** One-time heads-up when results first appear: prices are a guide, our job is
    the best phone for the budget. Plays a soft two-tone chime on open (best
    effort — browsers may block audio until a gesture; we fail silently). */
export function ResultsNotice({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    try {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const blip = (freq: number, at: number, dur = 0.16) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "sine"; o.frequency.value = freq;
        o.connect(g); g.connect(ctx.destination);
        const t0 = ctx.currentTime + at;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.start(t0); o.stop(t0 + dur + 0.02);
      };
      ctx.resume?.();
      blip(660, 0); blip(880, 0.14);            // gentle ding-dong
      setTimeout(() => ctx.close?.(), 900);
    } catch { /* audio blocked — fine */ }
  }, []);

  return (
    <div onClick={onClose}
      style={st("position:fixed; inset:0; z-index:200; display:flex; align-items:center; justify-content:center; padding:20px; background:rgba(15,20,28,.42); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); animation:kfade .25s ease both;")}>
      <div onClick={(e) => e.stopPropagation()}
        style={st("width:100%; max-width:430px; background:#fff; border-radius:24px; padding:clamp(24px,5vw,30px); box-shadow:0 24px 70px rgba(15,25,35,.3); animation:kpop .35s cubic-bezier(.2,.7,.2,1) both; text-align:center;")}>
        <div style={st("width:62px; height:62px; margin:0 auto; border-radius:19px; display:flex; align-items:center; justify-content:center; background:var(--acsoft);")}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M12 3l9 16H3L12 3z" stroke="var(--ac)" strokeWidth="1.9" strokeLinejoin="round" /><path d="M12 10v4M12 16.5v.5" stroke="var(--ac)" strokeWidth="2" strokeLinecap="round" /></svg>
        </div>
        <h2 style={st("font-family:var(--f-display); margin:18px 0 0; font-size:22px; font-weight:700; letter-spacing:-.5px; color:#17191d;")}>{t("notice_title")}</h2>
        <p style={st("margin:12px 0 0; font-size:14.5px; color:#5c626a; line-height:1.6; text-wrap:pretty;")}>{t("notice_body")}</p>
        <button onClick={onClose} className="k-press k-glow"
          style={st("margin-top:22px; width:100%; padding:14px; border-radius:15px; border:none; cursor:pointer; background:linear-gradient(180deg,var(--acg1),var(--acg2)); box-shadow:0 4px 14px var(--acglow); color:#fff; font-size:15px; font-weight:700;")}>{t("notice_ok")}</button>
      </div>
    </div>
  );
}
