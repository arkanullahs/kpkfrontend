import { useState } from "react";
import { st } from "../theme";
import { bnNum, t } from "../i18n";
import { deriveIntent, type Form } from "../App";
import { track } from "../track";

/* One-question-at-a-time quiz (feedback #4 redesign). Each answer re-derives
   the dynamic intent (use_case sentence + weighted priorities) — no archetype
   buckets. Single-choice questions auto-advance after a beat; the summary
   spells out what we understood in plain words and keeps every answer one tap
   from editable. Returning visitors with answers land on the summary. */

interface Props {
  form: Form;
  patch: (d: Partial<Form>) => void;
  onNext: () => void; // leave the quiz for the fine-tune step
  onBack: () => void; // leave the quiz backwards to the budget step
}

const WHO: [string, string, string][] = [
  ["me", "🙋", "qq_who_me"], ["elder", "🧓", "qq_who_elder"], ["other", "🎁", "qq_who_other"],
];
const ME: [string, string, string][] = [
  ["student", "🎓", "qq_me_student"], ["other", "💼", "qq_me_other"],
];
const DAY: [string, string, string][] = [
  ["photos", "📷", "qq_day_photos"], ["games", "🎮", "qq_day_games"],
  ["reels", "🎬", "qq_day_reels"], ["work", "💼", "qq_day_work"],
  ["chat", "💬", "qq_day_chat"], ["watch", "📺", "qq_day_watch"],
];
const DAY_ICON: Record<string, string> = Object.fromEntries(DAY.map(([k, i]) => [k, i]));
const HW: [string, string, string][] = [
  ["jack", "🎧", "qq_hw_jack"], ["ir", "📺", "qq_hw_ir"], ["fm", "📻", "qq_hw_fm"],
];
const HW_ICON: Record<string, string> = Object.fromEntries(HW.map(([k, i]) => [k, i]));

const chip = (sel: boolean, big = false) =>
  st(`display:inline-flex; align-items:center; gap:9px; padding:${big ? "15px 20px" : "12px 17px"}; border-radius:var(--r); cursor:pointer; font-size:${big ? "16px" : "15px"}; font-weight:600; transition:all .15s ease; font-family:var(--f-bn); background:${sel ? "var(--teal)" : "rgba(var(--rgb-white),.85)"}; color:${sel ? "var(--card)" : "var(--tx)"}; border:.5px solid ${sel ? "transparent" : "rgba(var(--rgb-ink),.1)"}; box-shadow:${sel ? "0 4px 14px rgba(var(--rgb-ink),.14)" : "0 1px 2px rgba(var(--rgb-ink),.04)"};`);

/* A tick box for the PICK-ALL questions only (owner 2026-07-26): a checkbox on
   a one-answer question promises you can choose several. Single-choice chips
   stay plain — selected is the filled chip. What every question DOES share now
   is the control row: nothing auto-advances, Next is always the buyer's. */
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

export function QuizStep({ form, patch, onNext, onBack }: Props) {
  const q = form.q;
  // the step list branches: "for myself" inserts the who-are-you question
  const steps: string[] = ["who", ...(q.who === "me" ? ["me"] : []), "day", "out", "hw"];
  const SUMMARY = steps.length; // summary sits one past the last question
  // any real answer means a returning visitor — open on the summary, not Q1
  const answered = q.out !== null || q.day.length > 0 || q.who !== "me" || q.me !== "" || q.hw.length > 0;
  const [sub, setSub] = useState(answered ? SUMMARY : 0);
  const [dir, setDir] = useState<1 | -1>(1);

  // clamp against the CURRENT list — changing "who" can shrink/grow the branch
  const cur = Math.min(sub, SUMMARY);
  const stepName = cur < SUMMARY ? steps[cur] : "summary";

  const go = (s: number) => {
    setDir(s >= cur ? 1 : -1);
    setSub(Math.max(0, Math.min(SUMMARY, s)));
  };
  const setQ = (d: Partial<Form["q"]>) => {
    const next = { ...q, ...d };
    patch({ q: next, ...deriveIntent(next) });
  };
  const toggleHw = (k: string) => {
    const hw = q.hw.includes(k) ? q.hw.filter((x) => x !== k) : [...q.hw, k];
    const next = { ...q, hw };
    patch({
      q: next, ...deriveIntent(next),
      requireJack: hw.includes("jack"), requireIr: hw.includes("ir"), requireFm: hw.includes("fm"),
    });
  };

  return (
    <div style={st("margin-top:26px;")}>
      <style>{`@keyframes kqf{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:none}}
@keyframes kqb{from{opacity:0;transform:translateX(-30px)}to{opacity:1;transform:none}}`}</style>

      {/* quiz progress: growing dots + counter, hidden on the summary */}
      {cur < SUMMARY && (
        <div style={st("display:flex; align-items:center; gap:7px;")}>
          {steps.map((_, i) => (
            <span key={i} style={st(`width:${i === cur ? 22 : 8}px; height:8px; border-radius:var(--r); transition:all .3s ease; background:${i < cur ? "var(--lnk)" : i === cur ? "var(--teal)" : "rgba(var(--rgb-ink),.12)"};`)} />
          ))}
          <span style={st("margin-left:6px; font-size:13px; font-weight:700; color:var(--mut2);")}>{bnNum(String(cur + 1))} / {bnNum(String(steps.length))}</span>
        </div>
      )}

      {/* the active question — re-mounts per sub-step for the slide entrance */}
      <div key={cur} style={{ ...st("margin-top:18px;"), animation: `${dir === 1 ? "kqf" : "kqb"} .38s cubic-bezier(.2,.7,.2,1) both` }}>
        {stepName === "who" && (
          <div>
            <div style={QTITLE}>{t("qq_who")}</div>
            <p style={WHY}>{t("qz_why_who")}</p>
            <div style={st("display:flex; flex-wrap:wrap; gap:10px; margin-top:16px;")}>
              {WHO.map(([k, icon, lk]) => (
                <button key={k} onClick={() => { track("quiz_answer", { q: "who", value: k }); setQ({ who: k }); }} className="k-press" style={chip(q.who === k, true)}>
                  <span>{icon}</span>{t(lk)}
                </button>
              ))}
            </div>
          </div>
        )}

        {stepName === "me" && (
          <div>
            <div style={QTITLE}>{t("qq_me")}</div>
            <p style={WHY}>{t("qz_why_me")}</p>
            <div style={st("display:flex; flex-wrap:wrap; gap:10px; margin-top:16px;")}>
              {ME.map(([k, icon, lk]) => (
                <button key={k} onClick={() => { track("quiz_answer", { q: "me", value: k }); setQ({ me: k }); }} className="k-press" style={chip(q.me === k, true)}>
                  <span>{icon}</span>{t(lk)}
                </button>
              ))}
            </div>
          </div>
        )}

        {stepName === "day" && (
          <div>
            <div style={QTITLE}>{t("qq_day")}</div>
            <p style={WHY}>{t("qz_why_day")}</p>
            <div style={st("display:flex; flex-wrap:wrap; gap:10px; margin-top:16px;")}>
              {DAY.map(([k, icon, lk]) => {
                const sel = q.day.includes(k);
                return (
                  <button key={k} onClick={() => setQ({ day: sel ? q.day.filter((x) => x !== k) : [...q.day, k] })} className="k-press" style={chip(sel)}>
                    <Tick on={sel} /><span>{icon}</span>{t(lk)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {stepName === "out" && (
          <div>
            <div style={QTITLE}>{t("qq_out")}</div>
            <p style={WHY}>{t("qz_why_out")}</p>
            <div style={st("display:flex; flex-wrap:wrap; gap:10px; margin-top:16px;")}>
              {([[true, "☀️", "qq_out_yes"], [false, "🏠", "qq_out_no"]] as const).map(([v, icon, lk]) => (
                <button key={String(v)} onClick={() => { track("quiz_answer", { q: "out", value: v }); setQ({ out: v }); }} className="k-press" style={chip(q.out === v, true)}>
                  <span>{icon}</span>{t(lk)}
                </button>
              ))}
            </div>
          </div>
        )}

        {stepName === "hw" && (
          <div>
            <div style={QTITLE}>{t("qq_hw")}</div>
            <p style={WHY}>{t("exp_hw_simple")}</p>
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

            {form.priorities.length ? (
              <div style={st("display:flex; flex-direction:column; gap:10px; margin-top:16px;")}>
                {form.priorities.map((ax, i) => (
                  <div key={ax} style={st("display:flex; gap:13px; align-items:flex-start; padding:13px 15px; border-radius:var(--r); background:var(--card);")}>
                    <span style={st("display:flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:var(--r); flex-shrink:0; background:var(--teal); color:var(--onp); font-size:13px; font-weight:800;")}>{bnNum(String(i + 1))}</span>
                    <div style={st("min-width:0;")}>
                      <div style={st("font-size:11.5px; font-weight:700; letter-spacing:.8px; text-transform:uppercase; color:var(--lnk);")}>{t("qz_rank_" + Math.min(i + 1, 3))}</div>
                      <p style={st("margin:3px 0 0; font-size:15px; color:var(--ink2); line-height:1.5; font-family:var(--f-bn); text-wrap:pretty;")}>{t("pw_" + ax)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={st("margin:16px 0 0; padding:13px 15px; border-radius:var(--r); background:var(--card); font-size:15px; color:var(--ink2); line-height:1.55; font-family:var(--f-bn);")}>{t("qz_sum_balanced")}</p>
            )}

            <p style={st("margin:12px 0 0; font-size:13px; color:var(--mut2); line-height:1.55;")}>{t("qz_sum_note")}</p>

            {/* every answer stays editable from here */}
            <div style={st("display:flex; flex-wrap:wrap; gap:8px; margin-top:16px;")}>
              <EditChip onClick={() => go(0)} label={t("qz_r_who")} value={t("qq_who_" + q.who)} />
              {q.who === "me" && (
                <EditChip onClick={() => go(1)} label={t("qz_r_me")} value={q.me ? t("qq_me_" + q.me) : "—"} />
              )}
              <EditChip onClick={() => go(steps.indexOf("day"))} label={t("qz_r_day")} value={q.day.length ? q.day.map((d) => DAY_ICON[d]).join(" ") : "—"} />
              <EditChip onClick={() => go(steps.indexOf("out"))} label={t("qz_r_out")} value={q.out === null ? "—" : t(q.out ? "qq_out_yes" : "qq_out_no")} />
              <EditChip onClick={() => go(steps.indexOf("hw"))} label={t("qz_r_hw")} value={q.hw.length ? q.hw.map((h) => HW_ICON[h]).join(" ") : "—"} />
            </div>

            <button onClick={() => { track("quiz_complete", { who: q.who, me: q.who === "me" ? (q.me || "skipped") : "na", day: q.day.length ? [...q.day].sort().join(",") : "none", out: q.out === null ? "skipped" : q.out, hw: q.hw.length ? [...q.hw].sort().join(",") : "none", priorities: form.priorities.join(",") || "balanced" }); onNext(); }} className="k-press k-glow" style={PRIMARY}>
              {t("qz_done")}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 12h14M12 6l6 6-6 6" stroke="var(--card)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        )}
      </div>

      {/* ONE control row under every question: back, skip, next. The skip was an
          underlined text link that read as fine print, and next only existed on
          the two multi-select questions — so the single-choice ones moved by
          themselves and the buyer never got to decide when (owner 2026-07-26). */}
      {cur < SUMMARY && (
        <div style={st("display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-top:26px;")}>
          <button onClick={() => (cur === 0 ? onBack() : go(cur - 1))} className="k-press" style={SECONDARY}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 12H6M12 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {t("qz_back")}
          </button>
          <div style={st("display:flex; align-items:center; gap:10px; flex-wrap:wrap;")}>
            <button onClick={() => { track("quiz_skip", { at: steps[cur] }); go(SUMMARY); }} className="k-press" style={SECONDARY}>
              {t("qz_skip")}
            </button>
            <button onClick={() => { track("quiz_answer", { q: steps[cur], value: "next" }); go(cur + 1); }}
              className="k-press k-glow" style={{ ...PRIMARY, marginTop: 0 }}>
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
