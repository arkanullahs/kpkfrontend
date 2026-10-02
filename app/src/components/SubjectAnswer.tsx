import { useEffect, useState } from "react";
import { st, taka } from "../theme";
import { t } from "../i18n";
import { api, type Pick, type SubjectEval } from "../api";
import { toParams, type Form } from "../need";

/* The answer about the phone a /phone/ page sent (plan 06, N05). The visitor
   came for one phone; the picks are five others. This says what happened to
   theirs, from /count's evaluation -- the pool's own rules, no ranker -- and
   never adds it to the picks because a link named it. */

/** the one sentence for an evaluation, or null when there is nothing honest
    to say (unknown id: the picker simply works as before) */
export function subjectLine(ev: SubjectEval, picks: Pick[]): { head: string; why: string } | null {
  const name = [ev.brand, ev.model].filter(Boolean).join(" ");
  const fill = (s: string) => s.replace("{model}", name);
  const reasons = ev.reasons
    .map((r) => {
      const s = t(`subj_r_${r}`);
      return s === `subj_r_${r}` ? "" : s.replace("{price}", taka(ev.selected_offer?.price ?? null));
    })
    .filter(Boolean);
  switch (ev.status) {
    case "qualified": {
      const n = picks.findIndex((p) => p.id === ev.model_id);
      return n >= 0 ? { head: fill(t("subj_rank")).replace("{n}", String(n + 1)), why: "" }
                    : { head: fill(t("subj_fits")), why: "" };
    }
    case "requirements_failed": return { head: fill(t("subj_not")), why: reasons.join("; ") };
    case "policy_gated": return { head: fill(t("subj_gated")), why: reasons.join("; ") };
    case "unverified": return { head: fill(t("subj_unverified")), why: "" };
    case "not_available": return { head: fill(t("subj_unavailable")), why: "" };
    default: return null;
  }
}

export function SubjectAnswer({ form, picks, onPick }: {
  form: Form; picks: Pick[]; onPick: (id: string) => void;
}) {
  const [ev, setEv] = useState<{ key: string; data: SubjectEval } | null>(null);
  const params = { ...toParams(form), subject: form.subject };
  const key = form.subject ? JSON.stringify(params) : "";

  useEffect(() => {
    if (!key) return;
    const ctl = new AbortController();
    api.count(params, ctl.signal)
      .then((r) => { if (r.subject) setEv({ key, data: r.subject }); })
      .catch(() => { /* no answer is the old behaviour, not an error to show */ });
    return () => ctl.abort();
    // the key is the params, serialised
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // an answer for another request is never shown under this one
  if (!ev || ev.key !== key) return null;
  const line = subjectLine(ev.data, picks);
  if (!line) return null;
  const name = [ev.data.brand, ev.data.model].filter(Boolean).join(" ");
  const ranked = ev.data.status === "qualified" && picks.some((p) => p.id === ev.data.model_id);
  return (
    <div role="status" style={st("display:flex; gap:12px; align-items:flex-start; flex-wrap:wrap; margin-top:14px; padding:14px 16px; border-radius:var(--r); background:var(--card); box-shadow:inset 0 0 0 1px var(--tint2);")}>
      <div style={st("flex:1; min-width:200px;")}>
        <div style={st("font-size:15px; font-weight:700; color:var(--ink);")}>{line.head}</div>
        {line.why && <div style={st("margin-top:3px; font-size:14px; color:var(--mut); line-height:1.5;")}>{line.why}</div>}
      </div>
      {!ranked && ev.data.model_id && (
        <button onClick={() => onPick(ev.data.model_id!)} className="k-press"
          style={st("font-size:13px; font-weight:700; color:var(--lnk); background:var(--tint); border:none; padding:7px 14px; border-radius:var(--r); cursor:pointer;")}>
          {t("subj_open").replace("{model}", name)} →
        </button>
      )}
    </div>
  );
}
