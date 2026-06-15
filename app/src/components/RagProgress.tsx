import { useEffect, useRef, useState, type ReactNode } from "react";
import { st, taka } from "../theme";
import { bnNum, t } from "../i18n";

/* Staged "show the work" loader. The /recommend call genuinely takes 30–60s on
   free APIs (an LLM reads every candidate's review+spec evidence and writes a
   verdict). A blank spinner makes that read as lag; walking the user through the
   real pipeline — budget filter → retrieve → read evidence → AI ranking — makes
   the same wait read as care. Progress is elapsed-driven and eases toward (but
   never reaches) 100%; the parent unmounts this when the real result lands. */

interface Stage {
  tKey: string; sKey: string; at: number; icon: ReactNode;
}

const I = (d: string) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <path d={d} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// `at` = elapsed seconds when the stage becomes the active one. The last stage
// (AI ranking) is the long pole and stays active until the answer arrives.
const STAGES: Stage[] = [
  { tKey: "rag1_t", sKey: "rag1_s", at: 0, icon: I("M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6") },
  { tKey: "rag2_t", sKey: "rag2_s", at: 3, icon: I("M11 4a7 7 0 100 14 7 7 0 000-14zM16 16l4.5 4.5") },
  { tKey: "rag3_t", sKey: "rag3_s", at: 7, icon: I("M4 5.5A1.5 1.5 0 015.5 4H11v16H5.5A1.5 1.5 0 014 18.5v-13zM20 5.5A1.5 1.5 0 0018.5 4H13v16h5.5a1.5 1.5 0 001.5-1.5v-13z") },
  { tKey: "rag4_t", sKey: "rag4_s", at: 12, icon: I("M12 3a5 5 0 015 5c0 2-1.2 3-2 4s-1 2-1 3h-4c0-1-.2-2-1-3s-2-2-2-4a5 5 0 015-5zM9.5 20h5M10.5 22.5h3") },
];

const REASSURE = ["rag_reassure1", "rag_reassure2", "rag_reassure3"];

export function RagProgress({ budget, candidates, ready = false, onDone }:
  { budget: number; candidates: number | null; ready?: boolean; onDone?: () => void }) {
  const [elapsed, setElapsed] = useState(0); // seconds, float
  const start = useRef(Date.now());

  useEffect(() => {
    if (ready) return;                  // freeze the clock during the finish beat
    const id = window.setInterval(() => {
      setElapsed((Date.now() - start.current) / 1000);
    }, 400);
    return () => window.clearInterval(id);
  }, [ready]);

  // data is in: hold the completed state briefly, then hand off to the results
  useEffect(() => {
    if (!ready) return;
    const id = window.setTimeout(() => onDone?.(), 520);
    return () => window.clearTimeout(id);
  }, [ready, onDone]);

  // active stage = last whose `at` threshold has passed; all done once ready
  let active = 0;
  for (let s = 0; s < STAGES.length; s++) if (elapsed >= STAGES[s].at) active = s;
  if (ready) active = STAGES.length;

  // eased progress that approaches but never reaches 100 until the data lands,
  // then snaps to a full bar so the reveal reads as a finish, not a cut
  const pctBar = ready ? 100 : Math.round(96 * (1 - Math.exp(-elapsed / 19)));
  const onLast = !ready && active === STAGES.length - 1;
  const reassure = REASSURE[Math.floor(elapsed / 4) % REASSURE.length];
  const secs = bnNum(String(Math.floor(elapsed)));

  return (
    <div style={st("max-width:680px; margin:0 auto; animation:kfade .4s cubic-bezier(.2,.7,.2,1) both;")}>
      <style>{`@keyframes kspin{to{transform:rotate(360deg)}}@keyframes kpulse{0%,100%{opacity:.45}50%{opacity:1}}@keyframes kbar{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}`}</style>

      <div style={st("margin-top:clamp(12px,4vh,42px); text-align:center;")}>
        <div style={st("font-size:12px; font-weight:700; letter-spacing:1.8px; text-transform:uppercase; color:#9a9da4;")}>
          {candidates != null ? `${bnNum(String(candidates))} ${t("matches")} · ${taka(budget)}` : taka(budget)}
        </div>
        <h1 style={st("font-family:var(--f-display); margin:10px 0 0; font-size:clamp(26px,4vw,38px); font-weight:600; letter-spacing:-1px; line-height:1.12;")}>
          {t("rag_heading")} <span style={st("font-family:'Instrument Serif',serif; font-style:italic; font-weight:400; color:var(--acd);")}>· {secs}s</span>
        </h1>
      </div>

      {/* progress bar */}
      <div style={st("position:relative; height:7px; margin-top:24px; border-radius:99px; background:rgba(15,25,35,.07); overflow:hidden;")}>
        <div style={st(`position:absolute; inset:0 auto 0 0; width:${pctBar}%; border-radius:99px; background:linear-gradient(90deg,var(--acg1),var(--acg2)); transition:width .45s cubic-bezier(.3,.8,.4,1);`)} />
        {/* travelling sheen so it never looks frozen during the long LLM call */}
        <div style={st("position:absolute; top:0; bottom:0; left:0; width:35%; background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent); animation:kbar 1.6s linear infinite;")} />
      </div>

      {/* stage checklist */}
      <div style={st("margin-top:26px; display:flex; flex-direction:column; gap:9px;")}>
        {STAGES.map((s, i) => {
          const done = i < active;
          const now = i === active;
          const pending = i > active;
          return (
            <div key={s.tKey}
              style={st(`display:flex; align-items:center; gap:14px; padding:15px 17px; border-radius:18px; transition:all .35s ease; border:.5px solid ${now ? "rgba(255,255,255,.9)" : "transparent"}; background:${now ? "rgba(255,255,255,.9)" : done ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.32)"}; box-shadow:${now ? "0 8px 26px rgba(15,25,35,.08), inset 0 1px 1px rgba(255,255,255,.9)" : "none"}; opacity:${pending ? 0.5 : 1};`)}>
              {/* status node */}
              <span style={st(`position:relative; width:30px; height:30px; border-radius:50%; flex-shrink:0; display:flex; align-items:center; justify-content:center; transition:all .35s ease; color:${now ? "var(--acd)" : done ? "#fff" : "#aab0b8"}; background:${done ? "var(--ac)" : now ? "var(--acsoft)" : "rgba(15,25,35,.05)"};`)}>
                {now && <span style={st("position:absolute; inset:-3px; border-radius:50%; border:2px solid var(--acsoft2); border-top-color:var(--ac); animation:kspin .85s linear infinite;")} />}
                {done
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4 10-11" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  : s.icon}
              </span>
              <div style={st("min-width:0; flex:1;")}>
                <div style={st(`font-size:14.5px; font-weight:600; color:${pending ? "#9aa0a8" : "#2c3036"};`)}>{t(s.tKey)}</div>
                <div style={st("font-size:12.5px; color:#80868f; line-height:1.45; margin-top:2px; text-wrap:pretty;")}>
                  {now && onLast ? t(reassure) : t(s.sKey)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* honesty / value note — turns the wait into a trust signal */}
      <div style={st("display:flex; gap:11px; padding:15px 17px; border-radius:17px; background:var(--acsoft); margin-top:18px;")}>
        <svg width="17" height="17" viewBox="0 0 18 18" fill="none" style={st("flex-shrink:0; margin-top:1px;")}><path d="M9 1.5l2 4.5 4.9.4-3.7 3.2 1.1 4.8L9 11.8 4.7 14.4l1.1-4.8L2.1 6.4 7 6 9 1.5z" fill="var(--ac)" /></svg>
        <p style={st("margin:0; font-size:13px; color:#41464d; line-height:1.55; text-wrap:pretty;")}>{t("rag_worth")}</p>
      </div>
    </div>
  );
}
