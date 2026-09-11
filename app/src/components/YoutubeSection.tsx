import { useState } from "react";
import { st } from "../theme";
import { t } from "../i18n";
import type { YoutubeBlock } from "../api";

/* What reviewers said, on the app's detail screen -- the same block the
   /phone/ page renders (YouTube reviews v2, 2026-09-11): one review at a time
   above the list to pick it from, then the themes the reviews raise.

   Picking a reviewer only changes which review is shown. The still and
   "Watch on YouTube" both open that same video on YouTube; nothing embeds and
   nothing plays here, because these are other people's videos.

   cards.py builds the block once at pipeline time (attribution needs the
   50 MB YouTube cache, and the API answers on a 0.1-CPU box), so this screen
   and the page cannot list a different set of reviews for one phone. The
   stills are ours, never YouTube's CDN; a missing one falls back to the
   channel's initial, which reads as a design rather than a hole. */

function views(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return Math.round(n / 1000) + "K";
  return n ? String(n) : "";
}

function Play({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true"
      style={st("position:relative; filter:drop-shadow(0 2px 8px rgba(0,0,0,.5));")}>
      <path d="M10 2.6a7.4 7.4 0 1 1 0 14.8 7.4 7.4 0 0 1 0-14.8zM8.4 7.1l4.2 2.9-4.2 2.9V7.1z"
        stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

type Point = YoutubeBlock["points"][number];
const SHOWN = 3;
const RULE = "1px solid rgba(var(--rgb-ink),.08)";

export function YoutubeSection({ yt }: { yt: YoutubeBlock }) {
  const vids = yt.videos || [];
  const points = yt.points || [];
  const [sel, setSel] = useState(0);
  const [all, setAll] = useState(false);
  const v = vids.length ? vids[Math.min(sel, vids.length - 1)] : null;
  const praise = points.filter((p) => p.stance === "praise");
  const blame = points.filter((p) => p.stance !== "praise");
  const reach = vids.reduce((s, x) => s + (x.views || 0), 0);
  const extra = praise.length > SHOWN || blame.length > SHOWN;
  const meta = v ? [v.views ? `${views(v.views)} ${t("yt_views")}` : "", v.aired].filter(Boolean).join(" · ") : "";

  const source = (p: Point) => {
    // No credit at all when there is nobody to credit: an owner-written point
    // carries no video, and labelling it "review" would invent a source.
    if (!p.channel && !p.url) return null;
    const label = p.channel || "review";
    return p.url
      ? <a href={p.url} target="_blank" rel="noopener noreferrer"
          aria-label={label + (p.title ? " · " + p.title : "") + " (YouTube)"}
          style={st("flex:none; display:inline-block; padding:12px 0; margin:-12px 0; font-size:13px; color:var(--lnk); text-decoration:underline; text-underline-offset:3px; white-space:nowrap;")}>{label} ↗</a>
      : <span style={st("flex:none; font-size:13px; color:var(--mut2);")}>{label}</span>;
  };

  return (
    <>
      <div style={st(`display:flex; align-items:baseline; flex-wrap:wrap; gap:4px 16px; padding-bottom:12px; border-bottom:${RULE};`)}>
        {/* the verdict's "Review sources" scrolls here */}
        <h2 id="k-yt" style={st("flex:1 1 auto; min-width:0; margin:0; font-size:21px; font-weight:800; letter-spacing:-.4px; color:var(--ink); scroll-margin-top:84px;")}>
          {vids.length ? t("yt_title") : t("yt_title_plain")}
        </h2>
        {vids.length > 0 && (
          <span style={st("font-size:13px; color:var(--mut2);")}>
            {vids.length} {vids.length === 1 ? t("yt_review") : t("yt_reviews")}
            {reach ? ` · ${views(reach)} ${t("yt_views")}` : ""}
          </span>
        )}
      </div>

      {(yt.verdict || yt.best_for) && (
        <p style={st("margin:12px 0 0; font-size:15px; line-height:1.6; color:var(--ink2); text-wrap:pretty;")}>
          {yt.verdict}
          {yt.best_for && <span style={st("color:var(--mut2);")}>{yt.verdict ? " " : ""}{t("yt_best_for")} {yt.best_for}</span>}
        </p>
      )}

      {v && (
        <div style={st(`margin-top:16px; border:${RULE}; border-radius:12px; overflow:hidden; background:var(--card);`)}>
          <div style={st("padding:14px;")}>
            <a href={v.url} target="_blank" rel="noopener noreferrer"
              aria-label={`${t("yt_watch")}: ${v.title || v.channel}`}
              style={st("position:relative; display:flex; align-items:center; justify-content:center; width:100%; aspect-ratio:16/9; border-radius:8px; overflow:hidden; background:#232a29; color:#fff;")}>
              {v.thumb
                ? <img src={v.thumb} alt="" loading="lazy" decoding="async" width={480} height={270}
                    style={st("position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block;")} />
                : <span aria-hidden="true" style={st("position:absolute; left:14px; bottom:6px; font-size:56px; font-weight:800; line-height:1; opacity:.16;")}>{(v.channel || "?").slice(0, 1).toUpperCase()}</span>}
              <Play size={46} />
            </a>
            <div style={st("margin-top:12px; font-size:13px; color:var(--mut2);")}>{v.channel}</div>
            <div style={st("margin-top:3px; font-size:18px; font-weight:800; line-height:1.25; letter-spacing:-.3px; color:var(--ink); text-wrap:balance;")}>{v.title || v.channel}</div>
            <div style={st("display:flex; flex-wrap:wrap; align-items:center; gap:10px 16px; margin-top:12px;")}>
              {meta && <span style={st("font-size:13px; color:var(--mut2);")}>{meta}</span>}
              <a href={v.url} target="_blank" rel="noopener noreferrer"
                style={st("display:inline-flex; align-items:center; gap:8px; min-height:44px; padding:0 16px; border-radius:10px; background:var(--teal); color:var(--onp); font-size:14px; font-weight:700; text-decoration:none;")}>
                {t("yt_watch")} <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
          {vids.length > 1 && (
            <div style={st(`border-top:${RULE}; padding:10px 8px 8px;`)}>
              <div style={st("margin:2px 6px 6px; font-size:14px; font-weight:700; color:var(--ink);")}>{t("yt_choose")}</div>
              <ol style={st("list-style:none; margin:0; padding:0;")}>
                {vids.map((x, i) => (
                  <li key={x.id || x.url} style={st(i ? `border-top:${RULE};` : "")}>
                    {/* a button, not a link: choosing a reviewer changes the
                        pane above and goes nowhere */}
                    <button type="button" className="kytr" aria-pressed={i === sel} onClick={() => setSel(i)}
                      style={st(`display:grid; grid-template-columns:34px minmax(0,1fr); align-items:center; gap:0 10px; width:100%; min-height:60px; padding:8px 10px 8px 6px; border:0; border-radius:8px; cursor:pointer; font:inherit; text-align:left; color:inherit; background:${i === sel ? "var(--tint)" : "transparent"};`)}>
                      <span style={st(`font-size:15px; font-weight:700; font-variant-numeric:tabular-nums; color:${i === sel ? "var(--tealD)" : "var(--mut2)"};`)}>{String(i + 1).padStart(2, "0")}</span>
                      <span style={st("display:flex; flex-direction:column; min-width:0;")}>
                        <b style={st("font-size:14px; line-height:1.35; color:var(--ink);")}>{x.channel || "YouTube"}</b>
                        {/* truncated on screen, whole for a screen reader */}
                        <span style={st("font-size:13px; line-height:1.4; color:var(--ink2); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;")}>{x.title}</span>
                        {x.views ? <span style={st("font-size:12px; color:var(--mut2);")}>{views(x.views)} {t("yt_views")}</span> : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {(praise.length > 0 || blame.length > 0) && (
        <div style={st("margin-top:22px;")}>
          <h3 style={st("margin:0; font-size:17px; font-weight:800; letter-spacing:-.3px; color:var(--ink);")}>{t("yt_highlight")}</h3>
          <div style={st("display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr)); gap:14px 32px; margin-top:8px;")}>
            {([[praise, t("yt_praised"), "var(--tealD)"], [blame, t("yt_tradeoffs"), "var(--ink)"]] as const).map(([list, label, colour]) =>
              list.length === 0 ? null : (
                <div key={label} style={st("min-width:0;")}>
                  <div style={st(`font-size:14.5px; font-weight:700; color:${colour}; margin-bottom:2px;`)}>{label}</div>
                  {list.slice(0, all ? list.length : SHOWN).map((p, i) => (
                    <div key={i} style={st(`display:flex; align-items:baseline; justify-content:space-between; flex-wrap:wrap; gap:4px 14px; padding:9px 0; border-bottom:${RULE};`)}>
                      <span style={st("min-width:0; flex:1 1 180px; font-size:14px; line-height:1.45; color:var(--ink);")}>
                        <b style={st("font-weight:600;")}>{p.point}</b>
                        {p.detail && <span style={st("display:block; margin-top:2px; font-size:13px; color:var(--mut2);")}>{p.detail}</span>}
                      </span>
                      {source(p)}
                    </div>
                  ))}
                </div>
              ))}
          </div>
          {extra && (
            <button type="button" className="kytall" aria-expanded={all} onClick={() => setAll(!all)}
              style={st("display:flex; align-items:center; min-height:44px; margin:4px 0 0 auto; padding:0 2px; border:0; background:none; cursor:pointer; font:inherit; font-size:13.5px; font-weight:600; color:var(--ink); text-decoration:underline; text-underline-offset:4px;")}>
              {all ? t("yt_fewer_themes") : t("yt_all_themes")}
            </button>
          )}
        </div>
      )}

      {vids.length > 0 && (
        <p style={st(`margin:18px 0 0; padding-top:10px; border-top:${RULE}; font-size:12px; line-height:1.5; color:var(--mut2);`)}>{t("yt_note")}</p>
      )}
    </>
  );
}
