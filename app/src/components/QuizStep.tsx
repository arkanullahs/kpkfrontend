import { useState } from "react";
import { st } from "../theme";
import { t } from "../i18n";
import { deriveIntent, CHOICES, type Form } from "../App";
import { track } from "../track";

/* THE FORCED-CHOICE QUIZ (spec section 7).

   What this replaced: five branching questions, two of them additive
   multi-selects over activities ("what fills the day on the phone? pick all
   that fit"). Additive multi-select provably self-cancels — only 44 of its 672
   reachable combinations produced a dominant axis. A buyer who ticks photos AND
   games AND watching has said they want everything, which is identical to
   saying nothing, and the ranker got a flat vector it could not act on.

   Two changes make it work. The questions ask what the buyer would GIVE UP
   rather than what they do, because a recommendation is a choice under a budget
   and "what do you do" is near-identical across buyers. And the two answers are
   WEIGHTED UNEQUALLY (3.0 then 1.0, see deriveIntent) so two different answers
   still leave a clear leader — an evenly-weighted pair is flat 70% of the time.

   Question 3 stays a multi-select on purpose: hardware is a set of dealbreakers
   that produce no weights, so it cannot self-cancel, and a buyer really can
   need both a jack and FM radio. */

interface Props {
  form: Form;
  patch: (d: Partial<Form>) => void;
  onNext: () => void;
  onBack: () => void;
}

// Q1 offers the four big trade-offs; gaming and video are narrower, so they
// appear as second-answer options rather than crowding the main decision.
const Q1_KEYS = ["camera", "battery", "speed", "simple"];
const Q2_KEYS = ["camera", "battery", "speed", "simple", "gaming", "video"];
const ICON: Record<string, string> = {
  camera: "📷", battery: "🔋", speed: "⚡", simple: "🧓", gaming: "🎮", video: "🎬",
};
const HW: [string, string, string][] = [
  ["jack", "🎧", "qq_hw_jack"], ["ir", "📺", "qq_hw_ir"], ["fm", "📻", "qq_hw_fm"],
];
const HW_ICON: Record<string, string> = Object.fromEntries(HW.map(([k, i]) => [k, i]));

const chip = (sel: boolean, big = false) =>
  st(`display:inline-flex; align-items:center; gap:9px; padding:${big ? "15px 20px" : "12px 17px"}; border-radius:var(--r); cursor:pointer; font-size:${big ? "16px" : "15px"}; font-weight:600; transition:all .15s ease; font-family:var(--f-bn); background:${sel ? "var(--teal)" : "rgba(var(--rgb-white),.85)"}; color:${sel ? "var(--card)" : "var(--tx)"}; border:.5px solid ${sel ? "transparent" : "rgba(var(--rgb-ink),.1)"}; box-shadow:${sel ? "0 4px 14px rgba(var(--rgb-ink),.14)" : "0 1px 2px rgba(var(--rgb-ink),.04)"};`);

/* A tick box for the dealbreakers question ONLY (owner 2026-07-26): a checkbox
   on a one-answer question promises you can choose several. The two choice
   questions are single-answer, so their selected state is the filled chip. */
function Tick({ on }: { on: boolean }) {
  return (
    <span style={st(`display:inline-flex; align-items:center; justify-content:center; width:19px; height:19px; border-radius:var(--r); flex-shrink:0; transition:all .15s ease; background:${on ? "rgba(var(--rgb-white),.22)" : "transparent"}; border:1.5px solid ${on ? "rgba(var(--rgb-white),.85)" : "rgba(var(--rgb-ink),.18)"};`)}>
      {on && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M5 12.5l4.5 4.5L19 7" stroke="var(--card)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

const SECONDARY = st("display:inline-flex; align-items:center; gap:7px; padding:12px 18px; border-radius:var(--r); border:.5px solid rgba(var(--rgb-ink),.12); cursor:pointer; background:var(--card); font-size:13.5px; font-weight:600; color:var(--mut); font-family:var(--f-bn);");
const PRIMARY = st("display:inline-flex; align-items:center; gap:8px; margin-top:22px; padding:14px 26px; border-radius:var(--r); border:none; cursor:pointer; font-size:15.5px; font-weight:700; color:var(--onp); font-family:var(--f-bn); background:var(--teal); box-shadow:0 6px 18px rgba(var(--rgb-ink),.14), inset 0 1px 0 rgba(var(--rgb-white),.35);");
const QTITLE = st("font-size:clamp(20px,3vw,26px); font-weight:700; color:var(--ink); font-family:var(--f-bn); line-height:1.25; text-wrap:balance;");
const WHY = st("margin:10px 0 0; font-size:14px; color:var(--mut2); line-height:1.55; max-width:480px; text-wrap:pretty;");

const STEPS = ["q1", "q2", "hw"] as const;
const SUMMARY = STEPS.length;

export function QuizStep({ form, patch, onNext, onBack }: Props) {
  const q = form.q;
  const answered = q.picks.length > 0 || q.hw.length > 0;
  const [sub, setSub] = useState(answered ? SUMMARY : 0);
  const [dir, setDir] = useState<1 | -1>(1);

  const cur = Math.min(sub, SUMMARY);
  const stepName = cur < SUMMARY ? STEPS[cur] : "summary";

  const go = (s: number) => {
    setDir(s >= cur ? 1 : -1);
    setSub(Math.max(0, Math.min(SUMMARY, s)));
  };
  const setQ = (d: Partial<Form["q"]>) => {
    const next = { ...q, ...d };
    patch({ q: next, ...deriveIntent(next) });
  };
  /* Answering slot i REPLACES it — the whole point is that this is a choice,
     not an accumulation. Re-answering Q1 also drops Q2 when they collide, so
     the buyer can never end up with the same axis in both slots by accident. */
  const pick = (slot: number, key: string) => {
    const picks = [...q.picks];
    picks[slot] = key;
    setQ({ picks: picks.filter(Boolean).filter((k, i, a) => a.indexOf(k) === i) });
    track("quiz_answer", { q: "choice" + (slot + 1), value: key });
  };
  const toggleHw = (k: string) => {
    const hw = q.hw.includes(k) ? q.hw.filter((x) => x !== k) : [...q.hw, k];
    const next = { ...q, hw };
    patch({
      q: next, ...deriveIntent(next),
      requireJack: hw.includes("jack"), requireIr: hw.includes("ir"), requireFm: hw.includes("fm"),
    });
  };

  // Q2 never re-offers what Q1 already won: "camera matters most" followed by
  // "camera" again is not a second piece of information.
  const q2Keys = Q2_KEYS.filter((k) => k !== q.picks[0]);

  return (
    <div style={st("margin-top:26px;")}>
      <style>{`@keyframes kqf{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:none}}
@keyframes kqb{from{opacity:0;transform:translateX(-30px)}to{opacity:1;transform:none}}`}</style>

      {cur < SUMMARY && (
        <div style={st("display:flex; align-items:center; gap:7px;")}>
          {STEPS.map((_, i) => (
            <span key={i} style={st(`width:${i === cur ? 22 : 8}px; height:8px; border-radius:var(--r); transition:all .3s ease; background:${i < cur ? "var(--lnk)" : i === cur ? "var(--teal)" : "rgba(var(--rgb-ink),.12)"};`)} />
          ))}
        </div>
      )}

      <div key={cur} style={{ ...st("margin-top:18px;"), animation: `${dir === 1 ? "kqf" : "kqb"} .38s cubic-bezier(.2,.7,.2,1) both` }}>
        {stepName === "q1" && (
          <div>
            <div style={QTITLE}>{t("qc_q1")}</div>
            <p style={WHY}>{t("qc_q1_why")}</p>
            <div style={st("display:flex; flex-wrap:wrap; gap:10px; margin-top:16px;")}>
              {Q1_KEYS.map((k) => (
                <button key={k} onClick={() => pick(0, k)} className="k-press" style={chip(q.picks[0] === k, true)}>
                  <span>{ICON[k]}</span>{t("qc_" + k)}
                </button>
              ))}
            </div>
          </div>
        )}

        {stepName === "q2" && (
          <div>
            <div style={QTITLE}>{t("qc_q2")}</div>
            <p style={WHY}>{t("qc_q2_why")}</p>
            <div style={st("display:flex; flex-wrap:wrap; gap:10px; margin-top:16px;")}>
              {q2Keys.map((k) => (
                <button key={k} onClick={() => pick(1, k)} className="k-press" style={chip(q.picks[1] === k)}>
                  <span>{ICON[k]}</span>{t("qc_" + k)}
                </button>
              ))}
            </div>
          </div>
        )}

        {stepName === "hw" && (
          <div>
            <div style={QTITLE}>{t("qq_hw")}</div>
            <p style={WHY}>{t("qc_hw_why")}</p>
            <div style={st("display:flex; flex-wrap:wrap; gap:10px; margin-top:16px;")}>
              {HW.map(([k, icon, lk]) => (
                <button key={k} onClick={() => toggleHw(k)} className="k-press" style={chip(q.hw.includes(k))}>
                  <Tick on={q.hw.includes(k)} /><span>{icon}</span>{t(lk)}
                </button>
              ))}
            </div>
            {q.hw.map((k) => (
              <p key={k} style={st("margin:12px 0 0; padding:12px 14px; border-radius:var(--r); background:var(--card); font-size:13.5px; color:var(--mut); line-height:1.55; max-width:520px;")}>{t("exp_" + k)}</p>
            ))}
          </div>
        )}

        {stepName === "summary" && (
          <div style={st("padding:22px; border-radius:var(--r); background:var(--tint); border:.5px solid var(--tint2);")}>
            <div style={st("display:flex; align-items:center; gap:9px;")}>
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9.3" stroke="var(--teal)" strokeWidth="1.7" /><path d="M8 12.5l2.8 2.8L16.5 9" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span style={st("font-weight:700; font-size:17px; color:var(--lnk); font-family:var(--f-bn);")}>{t("qz_sum_t")}</span>
            </div>
            <p style={st("margin:8px 0 0; font-size:14px; color:var(--mut2); line-height:1.55;")}>{t("qz_sum_s")}</p>

            {q.picks.length ? (
              <div style={st("display:flex; flex-direction:column; gap:10px; margin-top:16px;")}>
                {q.picks.filter((k) => CHOICES[k]).map((k, i) => (
                  <div key={k} style={st("display:flex; gap:13px; align-items:flex-start; padding:13px 15px; border-radius:var(--r); background:var(--card);")}>
                    <span style={st("display:flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:var(--r); flex-shrink:0; background:var(--teal); font-size:14px;")}>{ICON[k]}</span>
                    <div style={st("min-width:0;")}>
                      <div style={st("font-size:11.5px; font-weight:700; letter-spacing:.8px; text-transform:uppercase; color:var(--lnk);")}>{t(i === 0 ? "qc_r_first" : "qc_r_second")}</div>
                      <p style={st("margin:3px 0 0; font-size:15px; color:var(--ink2); line-height:1.5; font-family:var(--f-bn); text-wrap:pretty;")}>{t("qc_" + k)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={st("margin:16px 0 0; padding:13px 15px; border-radius:var(--r); background:var(--card); font-size:15px; color:var(--ink2); line-height:1.55; font-family:var(--f-bn);")}>{t("qz_sum_balanced")}</p>
            )}

            <p style={st("margin:12px 0 0; font-size:13px; color:var(--mut2); line-height:1.55;")}>{t("qz_sum_note")}</p>

            <div style={st("display:flex; flex-wrap:wrap; gap:8px; margin-top:16px;")}>
              <EditChip onClick={() => go(0)} label={t("qc_r_first")} value={q.picks[0] ? t("qc_" + q.picks[0]) : t("qc_none")} />
              <EditChip onClick={() => go(1)} label={t("qc_r_second")} value={q.picks[1] ? t("qc_" + q.picks[1]) : t("qc_none")} />
              <EditChip onClick={() => go(2)} label={t("qc_r_hw")} value={q.hw.length ? q.hw.map((h) => HW_ICON[h]).join(" ") : t("qc_none")} />
            </div>

            <button onClick={() => { track("quiz_complete", { first: q.picks[0] || "none", second: q.picks[1] || "none", hw: q.hw.length ? [...q.hw].sort().join(",") : "none", priorities: form.priorities.join(",") || "balanced" }); onNext(); }} className="k-press k-glow" style={PRIMARY}>
              {t("qz_done")}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 12h14M12 6l6 6-6 6" stroke="var(--card)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        )}
      </div>

      {/* ONE control row under every question: back, skip, next. Nothing
          auto-advances — the buyer decides when to move (owner 2026-07-26). */}
      {cur < SUMMARY && (
        <div style={st("display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-top:26px;")}>
          <button onClick={() => (cur === 0 ? onBack() : go(cur - 1))} className="k-press" style={SECONDARY}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 12H6M12 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {t("qz_back")}
          </button>
          <div style={st("display:flex; align-items:center; gap:10px; flex-wrap:wrap;")}>
            <button onClick={() => { track("quiz_skip", { at: STEPS[cur] }); go(SUMMARY); }} className="k-press" style={SECONDARY}>
              {t(cur === 1 ? "qc_skip_q2" : "qz_skip")}
            </button>
            <button onClick={() => go(cur + 1)} className="k-press k-glow" style={{ ...PRIMARY, marginTop: 0 }}>
              {t("qz_next")}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 12h14M12 6l6 6-6 6" stroke="var(--card)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EditChip({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="k-press"
      style={st("display:inline-flex; align-items:center; gap:7px; padding:9px 14px; border-radius:var(--r); cursor:pointer; background:var(--card); border:.5px solid rgba(var(--rgb-ink),.1); font-size:13px; font-family:var(--f-bn);")}>
      <span style={st("color:var(--mut2); font-weight:600;")}>{label}</span>
      <span style={st("color:var(--ink); font-weight:700;")}>{value}</span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M4 20h4L19 9l-4-4L4 16v4z" stroke="var(--mut2)" strokeWidth="1.8" strokeLinejoin="round" /></svg>
    </button>
  );
}
