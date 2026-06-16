import { useEffect } from "react";
import { st } from "../theme";
import { t } from "../i18n";

/** Attention popup on the detail screen: the prices shown are scraped from shop
    websites and the real in-store BD price is often different. Shown once per
    session so people actually register it before trusting a number. Plays a
    short alert chime (best effort — browsers may block audio until a gesture;
    opening detail is a click, so it usually fires). */
export function PriceAlert({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    try {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const blip = (freq: number, at: number, dur = 0.18, vol = 0.16) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "triangle"; o.frequency.value = freq;
        o.connect(g); g.connect(ctx.destination);
        const t0 = ctx.currentTime + at;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.start(t0); o.stop(t0 + dur + 0.02);
      };
      ctx.resume?.();
      // a brisk rising alert (more "pay attention" than the soft results chime)
      blip(620, 0); blip(780, 0.12); blip(980, 0.24);
      setTimeout(() => ctx.close?.(), 1100);
    } catch { /* audio blocked — fine */ }
  }, []);

  return (
    <div onClick={onClose}
      style={st("position:fixed; inset:0; z-index:200; display:flex; align-items:center; justify-content:center; padding:20px; background:rgba(15,20,28,.45); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); animation:kfade .25s ease both;")}>
      <div onClick={(e) => e.stopPropagation()} role="alertdialog" aria-labelledby="pa-title"
        style={st("width:100%; max-width:440px; background:#fff; border-radius:24px; padding:clamp(24px,5vw,30px); box-shadow:0 24px 70px rgba(15,25,35,.3); animation:kpop .35s cubic-bezier(.2,.7,.2,1) both; text-align:center; border-top:5px solid #d8a13a;")}>
        <div style={st("width:64px; height:64px; margin:0 auto; border-radius:20px; display:flex; align-items:center; justify-content:center; background:rgba(192,137,42,.14);")}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M12 3L2 21h20L12 3z" stroke="#c0892a" strokeWidth="1.9" strokeLinejoin="round" /><path d="M12 9.5v5M12 17.4v.2" stroke="#c0892a" strokeWidth="2.1" strokeLinecap="round" /></svg>
        </div>
        <h2 id="pa-title" style={st("font-family:var(--f-display); margin:18px 0 0; font-size:23px; font-weight:700; letter-spacing:-.5px; color:#17191d;")}>{t("pricealert_t")}</h2>
        <p style={st("margin:12px 0 0; font-size:15px; color:#5c626a; line-height:1.6; text-wrap:pretty;")}>{t("price_warning")}</p>
        <button onClick={onClose} className="k-press k-glow"
          style={st("margin-top:22px; width:100%; padding:15px; border-radius:15px; border:none; cursor:pointer; background:linear-gradient(180deg,#e0a949,#c0892a); box-shadow:0 4px 14px rgba(192,137,42,.35); color:#fff; font-size:15.5px; font-weight:700;")}>{t("pricealert_ok")}</button>
      </div>
    </div>
  );
}
