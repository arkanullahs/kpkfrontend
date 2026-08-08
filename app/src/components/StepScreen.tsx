import { st } from "../theme";
import { bnNum, t } from "../i18n";
import { screenOf, nextNode, askPosition, type Counts } from "../flow";
import { buildBrief } from "../filters";
import { useCountUp } from "../useCounts";
import { StepBody } from "./StepBody";
import { weightAt, type Form } from "../need";

/* One step owns the screen (spec 2026-08-08).

   The frame never changes shape: back, "4 of 9", the exit. That constancy is
   what stops nine screens from feeling like nine different places -- and it is
   why the rail is the only new persistent chrome. Its one job is to make the
   end visible from step 1, because "how much more of this is there" is what
   makes a long form feel long.

   The rail is also the ONLY surface in this flow carrying backdrop-filter
   continuously. backdrop-filter costs real frames on a Tk15,000 Android; the
   step blur is `filter` on the leaving layer and lasts 260ms. */

interface Props {
  nodeId: string;
  dir: 1 | -1;
  form: Form;
  counts: Counts;
  patch: (d: Partial<Form>) => void;
  matchCount: number | null;
  metaStock: string;
  /** carries the form the answer produced — see StepBody's `onAnswered` */
  onNext: (next?: Form) => void;
  onBack: () => void;
  onExit: () => void;
  onCommit: () => void;
}

export function StepScreen({ nodeId, dir, form, counts, patch, matchCount, metaStock,
                             onNext, onBack, onExit, onCommit }: Props) {
  const s = screenOf(nodeId)!;
  const shown = useCountUp(matchCount);
  // "4 of 8", counting only the ask screens on THIS buyer's live path. A total
  // that includes screens they will never see is a progress bar that lies.
  const { at, of } = askPosition(form, counts, nodeId);
  const isFirst = at === 0;
  const isLast = nextNode(form, counts, nodeId) === "END";

  return (
    /* overflow-x:clip on the WRAPPER, not on .k-step: the entry slide moves
       the step layer 8% off its own box, so the layer is the overflow and
       cannot clip itself. `clip` rather than `hidden` because clip does not
       create a scroll container — the rail below still pins to the viewport
       and the page still grows downward. */
    <div style={st("max-width:680px; margin:0 auto; overflow-x:clip;")}>
      <Rail at={at} of={of} />

      {/* Every control here is a real 48px target with a border you can see.
          The first build drew them as bare 13.5px text: technically 44px tall
          because of the padding, but with nothing on screen saying where to
          press, which the owner read as "too small and inaccessible". */}
      <div style={st("display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:12px; min-height:48px;")}>
        {!isFirst ? (
          <button onClick={onBack} className="k-press"
            style={st("display:inline-flex; align-items:center; gap:8px; min-height:48px; padding:10px 18px 10px 14px; border-radius:var(--r); border:1.5px solid var(--rule); background:var(--card); cursor:pointer; font-size:15px; font-weight:600; color:var(--ink); font-family:var(--f-bn);")}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M19 12H5M11 6l-6 6 6 6" stroke="var(--ink)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t("s_back")}
          </button>
        ) : <span />}

        {/* same template as the count pills — see CountPill: assembling this
            as `n + "of" + m` printed the two numbers the wrong way round in
            Bangla */}
        <span style={st("font-size:14.5px; font-weight:700; color:var(--tx); white-space:nowrap;")}>
          {t("fg_n_of_m").replace("{n}", bnNum(String(at + 1))).replace("{m}", bnNum(String(of)))}
        </span>

        {/* No exit on the first three asks: budget and the leading need axis
            are what the ranker consumes. The last screen's own Commit button is
            its exit, so it gets none either. Outlined, never amber. */}
        {at >= 3 && !isLast ? (
          <button onClick={onExit} className="k-press"
            style={st("display:inline-flex; align-items:center; gap:7px; min-height:48px; padding:10px 16px; border-radius:var(--r); border:1.5px solid var(--tint2); background:var(--tint); cursor:pointer; font-size:15px; font-weight:700; color:var(--lnk); font-family:var(--f-bn); white-space:nowrap;")}>
            {t("s_see_n")} {shown != null ? bnNum(String(shown)) : "…"}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" stroke="var(--lnk)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : <span />}
      </div>

      <SoFar form={form} isFirst={isFirst} />

      {/* keyed on the node id, so React remounts and the entry animation runs
          on every swap rather than only the first */}
      <div key={nodeId} className="k-step" style={{ ...st("margin-top:18px;"), ["--dir" as string]: String(dir) }}>
        {/* The add-more screen shows the ladder so far, each priority a shorter
            bar than the last. This is the owner's "warning" made honest: not
            "too many hurts precision", but each pick's real share on screen. */}
        {nodeId === "needN" && form.q.picks[0] && <PriorityLadder picks={form.q.picks} />}
        <h1 style={st("margin:0; font-family:var(--f-bn); font-size:clamp(25px,4.8vw,33px); font-weight:700; color:var(--ink); line-height:1.2; letter-spacing:-.5px; text-wrap:balance;")}>
          {t(s.titleKey)}
        </h1>
        <p style={st("margin:12px 0 0; font-size:16.5px; color:var(--tx); line-height:1.55; max-width:540px; text-wrap:pretty;")}>
          {t(s.whyKey)}
        </p>
        <div style={st("margin-top:22px;")}>
          <StepBody s={s} form={form} patch={patch} matchCount={matchCount}
            metaStock={metaStock} isLast={isLast} onAnswered={onNext} onCommit={onCommit} />
        </div>
      </div>
    </div>
  );
}

/* What the buyer has said so far, on every screen after the first.

   Owner 2026-08-08: "users should also be able to see their choice made so
   far every screen." In a replace-model walk nothing else keeps the earlier
   answers visible, so by screen six the buyer is being asked to trust that we
   remembered. Only SET clauses appear -- the placeholders buildBrief emits
   for unanswered ones would fill this with "no preference yet" and say
   nothing. buildBrief is the same pure function step 9's restatement uses, so
   the two can never drift. */
function SoFar({ form, isFirst }: { form: Form; isFirst: boolean }) {
  if (isFirst) return null;
  const said = buildBrief(form).filter((b) => b.set);
  if (!said.length) return null;
  return (
    <div style={st("display:flex; flex-wrap:wrap; align-items:center; gap:7px; margin-top:14px;")}>
      <span style={st("font-size:13px; font-weight:700; color:var(--mut); letter-spacing:.3px; text-transform:uppercase; margin-right:2px;")}>
        {t("s_sofar")}
      </span>
      {said.map((b) => (
        <span key={b.id} style={st("display:inline-flex; align-items:center; gap:6px; padding:6px 12px; border-radius:var(--r); background:var(--tint); border:1px solid var(--tint2); font-size:13.5px; font-weight:600; color:var(--lnk); font-family:var(--f-bn);")}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 13l4 4L19 7" stroke="var(--lnk)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {b.text}
        </span>
      ))}
    </div>
  );
}

/* The geometric ladder, drawn. Each priority the buyer has picked is a bar
   whose width is its share of the top pick -- 100%, 33%, 11%, 4% -- so the
   fourth is visibly a sliver. The share caption on every bar past the first is
   the "warning" the owner asked for, shown as a true number rather than a
   scold: an unbounded list is safe precisely because it looks like this. */
function PriorityLadder({ picks }: { picks: string[] }) {
  const known = picks.filter((k) => t("qs_" + k) !== "qs_" + k);
  if (!known.length) return null;
  const top = weightAt(0);
  return (
    <div style={st("margin-bottom:16px; padding:14px 16px; border-radius:var(--r); background:var(--tint); border:1px solid var(--tint2);")}>
      <div style={st("font-size:12.5px; font-weight:700; color:var(--mut); letter-spacing:.3px; text-transform:uppercase; margin-bottom:10px;")}>
        {t("s_prio_ladder_t")}
      </div>
      {known.map((k, i) => {
        const pct = Math.round((weightAt(i) / top) * 100);
        return (
          <div key={k} style={st("display:flex; align-items:center; gap:10px; margin-top:" + (i ? "9px" : "0") + ";")}>
            <div style={st("flex-shrink:0; width:96px; font-size:14px; font-weight:700; color:var(--ink); font-family:var(--f-bn);")}>
              {t("qs_" + k)}
            </div>
            <div style={st("flex:1; height:9px; border-radius:var(--r); background:var(--card); overflow:hidden;")}>
              <div style={st(`height:100%; width:${pct}%; background:var(--teal); border-radius:var(--r); transition:width .35s ease;`)} />
            </div>
            {i > 0 && (
              <div style={st("flex-shrink:0; font-size:12px; color:var(--mut); font-family:var(--f-bn); white-space:nowrap;")}>
                {t("s_prio_share").replace("{pct}", bnNum(String(pct)))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ONE bar, sticky, glass — not a row of segments.

   The segment row was drawn with one span per remaining screen, so the honest
   total re-flowed the whole rail: "2 / 8" on the elderly fork became "3 / 4"
   one tap later, eight bars collapsing into four. The buyer reads that as the
   thing breaking, not as good news. The total still changes — it must, a fork
   really is shorter — but a single fill only ever slides forward, which is
   what progress is supposed to look like.

   The bar is aria-hidden and a live text position sits beside it: a
   decorative bar announces nothing, and a screen reader needs the number. */
function Rail({ at, of }: { at: number; of: number }) {
  const pct = Math.round(((at + 1) / Math.max(1, of)) * 100);
  return (
    <div className="k-glass"
      style={st("position:sticky; top:74px; z-index:40; padding:10px 0; background:var(--hdr-bg); backdrop-filter:blur(14px) saturate(1.6); -webkit-backdrop-filter:blur(14px) saturate(1.6);")}>
      <div aria-hidden="true"
        style={st("height:5px; border-radius:var(--r); background:var(--rule); overflow:hidden;")}>
        <div style={st(`height:100%; width:${pct}%; border-radius:var(--r); background:var(--teal); transition:width .42s cubic-bezier(.2,.7,.2,1);`)} />
      </div>
      <span className="sr-only" aria-live="polite">{`${at + 1} / ${of}`}</span>
    </div>
  );
}
