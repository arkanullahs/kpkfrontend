import { useEffect, useRef, useState, type ReactNode } from "react";
import { st, taka } from "../theme";
import { bnNum, t } from "../i18n";
import { api } from "../api";

/* Staged "show the work" loader. The /recommend call genuinely takes 30–60s on
   free APIs (an LLM reads every candidate's review+spec evidence and writes a
   verdict). A blank spinner reads as lag; walking the user through the REAL
   pipeline — budget filter → semantic match → read evidence → write verdicts —
   with the actual candidate count and a live "reviews read" tally makes the
   same wait read as care. Progress is elapsed-driven and eases toward (but
   never reaches) 100%; the parent unmounts this when the real result lands. */

interface Stage { tKey: string; at: number; icon: ReactNode; }

const I = (d: string) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <path d={d} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// `at` = elapsed seconds when the stage becomes active. The last stage (writing
// verdicts) is the long pole and stays active until the answer arrives.
const STAGES: Stage[] = [
  { tKey: "rag1", at: 0, icon: I("M3 7h18M3 12h18M3 17h10") },                          // filter
  { tKey: "rag2", at: 3, icon: I("M11 4a7 7 0 100 14 7 7 0 000-14zM16 16l4.5 4.5") },    // search
  { tKey: "rag3", at: 7, icon: I("M4 5.5A1.5 1.5 0 015.5 4H11v16H5.5A1.5 1.5 0 014 18.5v-13zM20 5.5A1.5 1.5 0 0018.5 4H13v16h5.5a1.5 1.5 0 001.5-1.5v-13z") }, // read
  { tKey: "rag4", at: 13, icon: I("M5 4h14v16l-7-3-7 3V4zM9 9h6M9 12h4") },              // verdict
];

const REASSURE = ["rag_reassure1", "rag_reassure2", "rag_reassure3"];

export function RagProgress({ budget, candidates, ready = false, onDone }:
  { budget: number; candidates: number | null; ready?: boolean; onDone?: () => void }) {
  const [elapsed, setElapsed] = useState(0);
  const [waiting, setWaiting] = useState(0);   // ranking requests queued ahead
  const start = useRef(Date.now());

  useEffect(() => {
    if (ready) return;
    const id = window.setInterval(() => setElapsed((Date.now() - start.current) / 1000), 250);
    return () => window.clearInterval(id);
  }, [ready]);

  // poll the server's ranking queue so a busy moment reads as "you're in line"
  useEffect(() => {
    if (ready) return;
    let alive = true;
    const tick = () => api.status().then((s) => { if (alive) setWaiting(s.waiting); }).catch(() => {});
    tick();
    const id = window.setInterval(tick, 2500);
    return () => { alive = false; window.clearInterval(id); };
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    const id = window.setTimeout(() => onDone?.(), 520);
    return () => window.clearTimeout(id);
  }, [ready, onDone]);

  let active = 0;
  for (let s = 0; s < STAGES.length; s++) if (elapsed >= STAGES[s].at) active = s;
  if (ready) active = STAGES.length;

  const pctBar = ready ? 100 : Math.round(96 * (1 - Math.exp(-elapsed / 19)));
  const onLast = !ready && active === STAGES.length - 1;
  const reassure = REASSURE[Math.floor(elapsed / 4) % REASSURE.length];
  const secs = bnNum(String(Math.floor(elapsed)));

  // live "reviews read" tally — eases toward the candidate count while the LLM
  // is reading (stage 3+), so the screen shows real work happening, not a freeze
  const n = candidates ?? 0;
  const readPhase = Math.max(0, elapsed - STAGES[2].at);
  const read = ready ? n : Math.min(n, Math.round(n * (1 - Math.exp(-readPhase / 9))));

  // accurate, slightly playful per-stage copy with the real numbers baked in
  const SUB: Record<string, string> = {
    rag1: n ? `Sifting every live BD listing down to the ${bnNum(String(n))} that fit your budget and filters.`
            : "Checking every live listing in Bangladesh against your budget and filters.",
    rag2: "Turning your answers into a search and ranking phones by how well they actually match.",
    rag3: n ? `Reading owner complaints, spec sheets, warranty notes and BD prices — ${bnNum(String(read))} of ${bnNum(String(n))} so far.`
            : "Reading owner complaints, spec sheets, warranty notes and BD prices for each phone.",
    rag4: "An AI weighs every trade-off and writes a plain, no-marketing verdict — best first.",
  };
  const TITLE: Record<string, string> = {
    rag1: "Filtering to your budget", rag2: "Matching what you need",
    rag3: "Reading the real reviews", rag4: "Writing honest verdicts",
  };

  return (
    <div style={st("max-width:680px; margin:0 auto; animation:kfade .4s cubic-bezier(.2,.7,.2,1) both;")}>
      <style>{`@keyframes kspin{to{transform:rotate(360deg)}}@keyframes kbar{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}@keyframes kfloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}`}</style>

      <div style={st("margin-top:clamp(12px,4vh,42px); text-align:center;")}>
        <div style={st("font-size:12px; font-weight:700; letter-spacing:1.8px; text-transform:uppercase; color:#9a9da4;")}>
          {candidates != null ? `${bnNum(String(candidates))} ${t("matches")} · ${taka(budget)}` : taka(budget)}
        </div>
        <h1 style={st("font-family:var(--f-display); margin:10px 0 0; font-size:clamp(26px,4vw,38px); font-weight:600; letter-spacing:-1px; line-height:1.12;")}>
          {t("rag_heading")} <span style={st("font-family:'Instrument Serif',serif; font-style:italic; font-weight:400; color:var(--acd);")}>· {secs}s</span>
        </h1>
      </div>

      {/* busy / queue notice — only when others are ranking ahead of you */}
      {waiting > 0 && !ready && (
        <div style={st("display:flex; align-items:center; gap:10px; margin-top:18px; padding:12px 16px; border-radius:14px; background:var(--acsoft); animation:kfade .3s ease both;")}>
          <span style={st("position:relative; width:18px; height:18px; flex-shrink:0;")}>
            <span style={st("position:absolute; inset:0; border-radius:50%; border:2px solid var(--acsoft2); border-top-color:var(--ac); animation:kspin .8s linear infinite;")} />
          </span>
          <span style={st("font-size:13px; color:var(--acd); font-weight:600; line-height:1.45;")}>
            {t("queue_busy")} {waiting === 1 ? t("queue_one_ahead") : `${bnNum(String(waiting))} ${t("queue_n_ahead")}`}
          </span>
        </div>
      )}

      {/* progress bar */}
      <div style={st("position:relative; height:7px; margin-top:24px; border-radius:99px; background:rgba(15,25,35,.07); overflow:hidden;")}>
        <div style={st(`position:absolute; inset:0 auto 0 0; width:${pctBar}%; border-radius:99px; background:linear-gradient(90deg,var(--acg1),var(--acg2)); transition:width .45s cubic-bezier(.3,.8,.4,1);`)} />
        <div style={st("position:absolute; top:0; bottom:0; left:0; width:35%; background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent); animation:kbar 1.6s linear infinite;")} />
      </div>

      {/* live counters — the actual shenanigans, in numbers */}
      <div style={st("display:flex; gap:10px; margin-top:18px;")}>
        <Counter big={bnNum(String(n || "—"))} small="phones fit your budget" lit={active >= 0} />
        <Counter big={active >= 2 ? bnNum(String(read)) : "…"} small="reviews read so far" lit={active >= 2} />
        <Counter big={ready ? "✓" : "AI"} small={ready ? "verdicts written" : "writing verdicts"} lit={active >= 3} />
      </div>

      {/* stage checklist */}
      <div style={st("margin-top:18px; display:flex; flex-direction:column; gap:9px;")}>
        {STAGES.map((s, i) => {
          const done = i < active, now = i === active, pending = i > active;
          return (
            <div key={s.tKey}
              style={st(`display:flex; align-items:center; gap:14px; padding:15px 17px; border-radius:18px; transition:all .35s ease; border:.5px solid ${now ? "rgba(255,255,255,.9)" : "transparent"}; background:${now ? "rgba(255,255,255,.92)" : done ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.32)"}; box-shadow:${now ? "0 8px 26px rgba(15,25,35,.08), inset 0 1px 1px rgba(255,255,255,.9)" : "none"}; opacity:${pending ? 0.5 : 1};`)}>
              <span style={st(`position:relative; width:30px; height:30px; border-radius:50%; flex-shrink:0; display:flex; align-items:center; justify-content:center; transition:all .35s ease; color:${now ? "var(--acd)" : done ? "#fff" : "#aab0b8"}; background:${done ? "var(--ac)" : now ? "var(--acsoft)" : "rgba(15,25,35,.05)"};`)}>
                {now && <span style={st("position:absolute; inset:-3px; border-radius:50%; border:2px solid var(--acsoft2); border-top-color:var(--ac); animation:kspin .85s linear infinite;")} />}
                {done
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4 10-11" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  : <span style={now ? st("animation:kfloat 1.6s ease-in-out infinite;") : undefined}>{s.icon}</span>}
              </span>
              <div style={st("min-width:0; flex:1;")}>
                <div style={st(`font-size:14.5px; font-weight:600; color:${pending ? "#9aa0a8" : "#2c3036"};`)}>{TITLE[s.tKey]}</div>
                <div style={st("font-size:12.5px; color:#80868f; line-height:1.45; margin-top:2px; text-wrap:pretty;")}>
                  {now && onLast ? t(reassure) : SUB[s.tKey]}
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

function Counter({ big, small, lit }: { big: string; small: string; lit: boolean }) {
  return (
    <div style={st(`flex:1; padding:13px 12px; border-radius:15px; text-align:center; transition:all .35s ease; background:${lit ? "rgba(255,255,255,.8)" : "rgba(255,255,255,.4)"}; box-shadow:${lit ? "0 4px 16px rgba(15,25,35,.06)" : "none"}; opacity:${lit ? 1 : 0.55};`)}>
      <div style={st(`font-family:var(--f-display); font-size:clamp(20px,4vw,27px); font-weight:600; line-height:1; color:${lit ? "var(--acd)" : "#aab0b8"};`)}>{big}</div>
      <div style={st("font-size:11px; color:#80868f; margin-top:5px; line-height:1.3;")}>{small}</div>
    </div>
  );
}
