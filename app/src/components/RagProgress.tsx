import { useEffect, useRef, useState, type ReactNode } from "react";
import { st, taka } from "../theme";
import { bnNum, t } from "../i18n";
import { api, type QueueStatus } from "../api";

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

/* No provider names in here. There used to be a lookup table turning the
   ranker's chain keys into "Groq", "Gemini", "Ollama" -- and anything the
   table had never heard of, sambanova among them, printed raw and lowercase.
   A buyer cannot act on which vendor wrote their verdict, the name changes
   whenever the chain does, and a failover that the UI narrates by naming a
   company reads as something going wrong (audit PICK-04). What a buyer CAN
   act on is whether it is moving, how many people are ahead, and whether this
   one is slower than usual -- so those are the three things this shows, and
   the provider trail stays in /status for diagnostics. */

export function RagProgress({ budget, candidates, ready = false, onDone, requestId }:
  { budget: number; candidates: number | null; ready?: boolean; onDone?: () => void; requestId?: string }) {
  const [elapsed, setElapsed] = useState(0);
  const [status, setStatus] = useState<QueueStatus | null>(null);
  const start = useRef(Date.now());

  useEffect(() => {
    if (ready) return;
    const id = window.setInterval(() => setElapsed((Date.now() - start.current) / 1000), 250);
    return () => window.clearInterval(id);
  }, [ready]);

  // Poll the server's ranking queue so we can show queue position AND
  // which provider is currently handling the request / which failed over.
  // When a request_id is provided, the /status endpoint returns per-request
  // provider trails so concurrent users each see their own provider.
  useEffect(() => {
    if (ready) return;
    let alive = true;
    const tick = () =>
      api.status(requestId)
        .then((s) => { if (alive) setStatus(s); })
        .catch(() => {});
    tick();
    const id = window.setInterval(tick, 2500);
    return () => { alive = false; window.clearInterval(id); };
  }, [ready, requestId]);

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

  // live "reviews read" tally
  const n = candidates ?? 0;
  const readPhase = Math.max(0, elapsed - STAGES[2].at);
  const read = ready ? n : Math.min(n, Math.round(n * (1 - Math.exp(-readPhase / 9))));

  const processing = status?.processing ?? 0;
  const waiting = status?.waiting ?? 0;
  const totalQueue = processing + waiting;
  const rateLimited = status?.rate_limited ?? [];
  const currentAttempt = status?.current_attempt;
  // slower than usual = the chain is rate-limited, resting, or has already
  // failed over on this very request
  const degraded = rateLimited.length > 0
    || Object.keys(status?.breaker ?? {}).length > 0
    || (!!currentAttempt && rateLimited.includes(currentAttempt));

  /* Stage copy comes from i18n, where rag1_t..rag4_s have been translated all
     along -- this component held its own English literals instead, so the
     whole 30-60s wait stayed English on BN (audit I18N-01). The counts the
     old literals carried are not lost: they are the two live Counter tiles
     directly above the checklist, which now read in Bangla too. */

  return (
    <div style={st("max-width:680px; margin:0 auto; animation:kfade .4s cubic-bezier(.2,.7,.2,1) both;")}>
      <style>{`
        @keyframes kspin{to{transform:rotate(360deg)}}
        @keyframes kbar{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}
        @keyframes kfloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
        @keyframes kpulse{0%,100%{opacity:1}50%{opacity:.55}}
      `}</style>

      <div style={st("margin-top:clamp(12px,4vh,42px); text-align:center;")}>
        <div style={st("font-size:12px; font-weight:700; letter-spacing:1.8px; text-transform:uppercase; color:var(--mut2);")}>
          {candidates != null ? `${bnNum(String(candidates))} ${t("matches")} · ${taka(budget)}` : taka(budget)}
        </div>
        <h1 style={st("font-family:var(--f-display); margin:10px 0 0; font-size:clamp(26px,4vw,38px); font-weight:600; letter-spacing:-1px; line-height:1.12;")}>
          {t("rag_heading")} <span style={st("font-family:'Instrument Serif',serif; font-style:italic; font-weight:400; color:var(--lnk);")}> · {secs}s</span>
        </h1>
        {/* a running counter with nothing to measure itself against is just a
            number going up; the audit asked for "usually takes under X" */}
        <div style={st("margin-top:7px; font-size:12.5px; color:var(--mut2);")}>{t("rag_est")}</div>
      </div>

      {/* ── Queue / server status bar (always visible when polled) ─────────── */}
      {!ready && status && (
        <div style={st("margin-top:16px; display:flex; flex-wrap:wrap; gap:8px; align-items:center; justify-content:center;")}>
          {/* Users in system */}
          {totalQueue > 0 && (
            <span style={st("display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:700; color:var(--lnk); background:var(--tint); border:.5px solid var(--tint2); padding:6px 13px; border-radius:var(--r);")}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {processing > 0 && <>{bnNum(String(processing))} {t("rag_q_served")}</>}
              {processing > 0 && waiting > 0 && " · "}
              {waiting > 0 && <>{bnNum(String(waiting))} {t("rag_q_waiting")}</>}
            </span>
          )}
          {/* Queue position (only when you're actually waiting) */}
          {waiting > 0 && (
            <span style={st("display:inline-flex; align-items:center; gap:5px; font-size:12px; font-weight:800; color:var(--onp); background:var(--teal); padding:6px 13px; border-radius:var(--r); box-shadow:0 2px 8px rgba(var(--rgb-ink),.14);")}>
              <span style={st("width:6px; height:6px; border-radius:var(--r); background:var(--card); animation:kpulse 1.2s ease-in-out infinite;")} />
              #{bnNum(String(waiting + 1))} {t("rag_q_inline")}
            </span>
          )}
          {/* ONE chip for every degraded state the chain can be in. Rate
              limited, circuit-broken, or an attempt that has already been
              rate-limited: from where the buyer sits these are the same fact
              -- this run is slower than the usual minute and something else
              is picking it up. Which provider, and its cooldown, are in
              /status for us. */}
          {degraded && (
            <span style={st("display:inline-flex; align-items:center; gap:6px; font-size:11.5px; font-weight:700; color:var(--acd); background:rgba(var(--rgb-amber),.1); border:.5px solid rgba(var(--rgb-amber),.22); padding:5px 11px; border-radius:var(--r);")}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 8v5M12 16v.5M12 3l9 16H3L12 3z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {t("rag_slow")}
            </span>
          )}
        </div>
      )}

      {/* progress bar */}
      <div style={st("position:relative; height:7px; margin-top:22px; border-radius:var(--r); background:rgba(var(--rgb-ink),.07); overflow:hidden;")}>
        <div style={st(`position:absolute; inset:0 auto 0 0; width:${pctBar}%; border-radius:var(--r); background:var(--teal); transition:width .45s cubic-bezier(.3,.8,.4,1);`)} />
        <div style={st("position:absolute; top:0; bottom:0; left:0; width:35%; background:linear-gradient(90deg,transparent,rgba(var(--rgb-white),.55),transparent); animation:kbar 1.6s linear infinite;")} />
      </div>

      {/* live counters */}
      <div style={st("display:flex; gap:10px; margin-top:18px;")}>
        <Counter big={bnNum(String(n || "—"))} small={t("rag_c_fit")} lit={active >= 0} />
        <Counter big={active >= 2 ? bnNum(String(read)) : "…"} small={t("rag_c_read")} lit={active >= 2} />
        <Counter big={ready ? "✓" : "AI"} small={t(ready ? "rag_c_written" : "rag_c_writing")} lit={active >= 3} />
      </div>

      {/* stage checklist */}
      <div style={st("margin-top:18px; display:flex; flex-direction:column; gap:9px;")}>
        {STAGES.map((s, i) => {
          const done = i < active, now = i === active, pending = i > active;
          return (
            <div key={s.tKey}
              style={st(`display:flex; align-items:center; gap:14px; padding:15px 17px; border-radius:var(--r); transition:all .35s ease; border:.5px solid ${now ? "rgba(var(--rgb-white),.9)" : "transparent"}; background:${now ? "rgba(var(--rgb-white),.92)" : done ? "rgba(var(--rgb-white),.5)" : "rgba(var(--rgb-white),.32)"}; box-shadow:${now ? "0 8px 26px rgba(var(--rgb-ink),.08), inset 0 1px 1px rgba(var(--rgb-white),.9)" : "none"}; opacity:${pending ? 0.5 : 1};`)}>
              <span style={st(`position:relative; width:30px; height:30px; border-radius:var(--r); flex-shrink:0; display:flex; align-items:center; justify-content:center; transition:all .35s ease; color:${now ? "var(--lnk)" : done ? "var(--card)" : "var(--faint)"}; background:${done ? "var(--teal)" : now ? "var(--tint)" : "rgba(var(--rgb-ink),.05)"};`)}>
                {now && <span style={st("position:absolute; inset:-3px; border-radius:var(--r); border:2px solid var(--tint2); border-top-color:var(--teal); animation:kspin .85s linear infinite;")} />}
                {done
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4 10-11" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  : <span style={now ? st("animation:kfloat 1.6s ease-in-out infinite;") : undefined}>{s.icon}</span>}
              </span>
              <div style={st("min-width:0; flex:1;")}>
                <div style={st(`font-size:14.5px; font-weight:600; color:${pending ? "var(--mut2)" : "var(--ink2)"};`)}>{t(s.tKey + "_t")}</div>
                <div style={st("font-size:12.5px; color:var(--mut2); line-height:1.45; margin-top:2px; text-wrap:pretty;")}>
                  {now && onLast ? t(reassure) : t(s.tKey + "_s")}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* honesty / value note */}
      <div style={st("display:flex; gap:11px; padding:15px 17px; border-radius:var(--r); background:var(--tint); margin-top:18px;")}>
        <svg width="17" height="17" viewBox="0 0 18 18" fill="none" style={st("flex-shrink:0; margin-top:1px;")}><path d="M9 1.5l2 4.5 4.9.4-3.7 3.2 1.1 4.8L9 11.8 4.7 14.4l1.1-4.8L2.1 6.4 7 6 9 1.5z" fill="var(--teal)" /></svg>
        <p style={st("margin:0; font-size:13px; color:var(--tx); line-height:1.55; text-wrap:pretty;")}>{t("rag_worth")}</p>
      </div>
    </div>
  );
}

function Counter({ big, small, lit }: { big: string; small: string; lit: boolean }) {
  return (
    <div style={st(`flex:1; padding:13px 12px; border-radius:var(--r); text-align:center; transition:all .35s ease; background:${lit ? "rgba(var(--rgb-white),.8)" : "rgba(var(--rgb-white),.4)"}; box-shadow:${lit ? "0 4px 16px rgba(var(--rgb-ink),.06)" : "none"}; opacity:${lit ? 1 : 0.55};`)}>
      <div style={st(`font-family:var(--f-display); font-size:clamp(20px,4vw,27px); font-weight:600; line-height:1; color:${lit ? "var(--lnk)" : "var(--faint)"};`)}>{big}</div>
      <div style={st("font-size:11px; color:var(--mut2); margin-top:5px; line-height:1.3;")}>{small}</div>
    </div>
  );
}
