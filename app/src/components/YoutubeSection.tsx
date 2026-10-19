import { useState } from "react";
import { flushSync } from "react-dom";
import { st } from "../theme";
import { t } from "../i18n";
import type { YoutubeBlock } from "../api";

/* What reviewers said, on the app's detail screen -- the same block the
   /phone/ page renders (2026-09-12): the reviewers' conclusion first, their
   videos as stills with an avatar for each reviewer, then what they praised
   and what they flagged as two tinted columns with a count each and a bar
   that shows the balance before a word is read. The row version before this
   was "very boring to read and see" (owner).

   The still is YouTube's own, hotlinked from the video id (owner 2026-10-19),
   and clicking it plays the video in place: the still is swapped for a
   youtube-nocookie player, and no player loads before that click. The title
   still opens the video on YouTube, and so does a modified click on the still.

   cards.py builds the block once at pipeline time (attribution needs the
   50 MB YouTube cache, and the API answers on a 0.1-CPU box), so this screen
   and the page cannot list a different set of reviews for one phone. A video
   with no id keeps the channel's initial, which reads as a design rather
   than a hole. */

const still = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
const player = (id: string) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;

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

/* A reviewer's avatar: the channel's own picture, hotlinked from YouTube,
   when the backend resolved one; else (or if it fails to load) the initial
   on a tint its own name picks -- the same sum the /phone/ page uses, so one
   reviewer wears one colour on both. The name always prints beside it. */
function Avatar({ name, src, size = 24 }: { name?: string | null; src?: string | null; size?: number }) {
  const [bad, setBad] = useState(false);
  if (src && !bad) {
    return (
      <img src={src} alt="" width={size} height={size} loading="lazy" decoding="async"
        referrerPolicy="no-referrer" onError={() => setBad(true)}
        style={st(`flex:none; display:block; width:${size}px; height:${size}px; border-radius:50%; object-fit:cover; background:rgba(var(--rgb-ink),.08);`)} />
    );
  }
  const n = (name || "?").trim() || "?";
  let sum = 0;
  for (const ch of n) sum += ch.codePointAt(0) || 0;
  const h = (sum * 37) % 360;
  return (
    <span aria-hidden="true" style={st(`flex:none; display:inline-grid; place-items:center; width:${size}px; height:${size}px; border-radius:50%; font-size:${Math.round(size * 0.46)}px; font-weight:800; line-height:1; background:hsl(${h} 45% 88%); color:hsl(${h} 50% 26%);`)}>
      {n.slice(0, 1).toUpperCase()}
    </span>
  );
}

function Mark({ praise, size = 12 }: { praise: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d={praise ? "M4 10.5 8 14.5l8-9" : "M4.5 10h11"} stroke="currentColor"
        strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type Point = YoutubeBlock["points"][number];
const SHOWN = 3;
const RULE = "1px solid rgba(var(--rgb-ink),.08)";

export function YoutubeSection({ yt }: { yt: YoutubeBlock }) {
  const vids = yt.videos || [];
  const points = yt.points || [];
  const [all, setAll] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const [grow, setGrow] = useState(false);
  /* The playing card takes the whole row (pick/index.html .kytv.play) and
     scrolls into view; one plays at a time because `playing` is one id.
     A View Transition animates the change where there is one, a short CSS
     ease where there is not, and nothing moves under reduced motion. */
  const play = (id: string, li: HTMLElement | null) => {
    const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const show = () => li?.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "center" });
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };
    if (doc.startViewTransition && !calm) {
      doc.startViewTransition(() => flushSync(() => { setGrow(false); setPlaying(id); })).finished.then(show, show);
    } else {
      setGrow(!calm);
      setPlaying(id);
      requestAnimationFrame(show);
    }
  };
  const praise = points.filter((p) => p.stance === "praise");
  const blame = points.filter((p) => p.stance !== "praise");
  const reach = vids.reduce((s, x) => s + (x.views || 0), 0);
  const extra = praise.length > SHOWN || blame.length > SHOWN;

  const source = (p: Point) => {
    // No credit at all when there is nobody to credit: an owner-written point
    // carries no video, and labelling it "review" would invent a source.
    if (!p.channel && !p.url) return null;
    const label = p.channel || "review";
    const look = "display:inline-flex; align-items:center; gap:7px; margin-top:2px; padding:6px 0; font-size:12.5px; font-weight:600;";
    return p.url
      ? <a href={p.url} target="_blank" rel="noopener noreferrer" className="kysrc"
          aria-label={label + (p.title ? " · " + p.title : "") + " (YouTube)"}
          style={st(look + " color:var(--ink2); text-decoration:none;")}><Avatar name={label} src={p.avatar} size={20} />{label} ↗</a>
      : <span style={st(look + " color:var(--mut2);")}><Avatar name={label} src={p.avatar} size={20} />{label}</span>;
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

      {/* the reviewers' conclusion first, before the evidence for it */}
      {(yt.verdict || yt.best_for) && (
        <div style={st("margin-top:14px;")}>
          {yt.verdict && (
            <p style={st("margin:0; font-size:16.5px; font-weight:600; line-height:1.45; letter-spacing:-.1px; color:var(--ink); text-wrap:pretty;")}>{yt.verdict}</p>
          )}
          {yt.best_for && (
            <span style={st("display:inline-flex; align-items:center; gap:7px; margin-top:10px; padding:6px 13px; border-radius:var(--r); background:var(--tealL); color:var(--tealD); font-size:13px; font-weight:600; line-height:1.35;")}>
              {t("yt_best_for")} {yt.best_for}
            </span>
          )}
        </div>
      )}

      {vids.length > 0 && (
        <ol className={"kytg" + (vids.length === 1 ? " one" : "") + (playing ? " playing" : "")}
          style={st("list-style:none; margin:18px 0 0; padding:0; display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,170px),1fr)); gap:22px 18px;")}>
          {vids.map((x) => {
            const meta = [x.views ? `${views(x.views)} ${t("yt_views")}` : "", x.aired].filter(Boolean).join(" · ");
            return (
              <li key={x.id || x.url} className={"kytv" + (playing === x.id && x.id ? (grow ? " play grow" : " play") : "")} style={st("display:flex; flex-direction:column; gap:10px; min-width:0;")}>
                {playing === x.id && x.id ? (
                  <iframe src={player(x.id)} title={x.title || x.channel || "YouTube"}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen referrerPolicy="strict-origin-when-cross-origin"
                    style={st("display:block; width:100%; aspect-ratio:16/9; border:0; border-radius:12px; background:#000;")} />
                ) : (
                <a href={x.url} target="_blank" rel="noopener noreferrer" className="kytt"
                  {...(x.id ? { "aria-label": `${t("yt_play")}: ${x.title || x.channel}` } : { tabIndex: -1, "aria-hidden": true })}
                  onClick={(e) => {
                    // a modified click keeps the link's own meaning
                    if (!x.id || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
                    e.preventDefault();
                    play(x.id, e.currentTarget.closest("li"));
                  }}
                  style={st("position:relative; display:flex; align-items:center; justify-content:center; aspect-ratio:16/9; border-radius:12px; overflow:hidden; background:#232a29; color:#fff; box-shadow:0 1px 2px rgba(var(--rgb-ink),.08), 0 10px 24px rgba(var(--rgb-ink),.12);")}>
                  {/* the initial always sits underneath: a still that fails to
                      load hides itself and the tile reads as a design, not a
                      broken-image icon */}
                  <span aria-hidden="true" style={st("position:absolute; left:12px; bottom:2px; font-size:54px; font-weight:800; line-height:1; opacity:.16;")}>{(x.channel || "?").slice(0, 1).toUpperCase()}</span>
                  {x.id && (
                    <img key={x.id} src={still(x.id)} alt="" loading="lazy" decoding="async" width={480} height={270}
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                      style={st("position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block;")} />
                  )}
                  <Play size={40} />
                </a>
                )}
                <div style={st("min-width:0;")}>
                  <div style={st("display:flex; align-items:center; gap:8px; font-size:13px; line-height:1.3; color:var(--ink2);")}>
                    <Avatar name={x.channel} src={x.avatar} size={26} />
                    <b style={st("min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:700;")}>{x.channel || "YouTube"}</b>
                  </div>
                  <a href={x.url} target="_blank" rel="noopener noreferrer" className="kytl"
                    aria-label={`${x.title || x.channel} (${t("yt_watch")})`}
                    style={st("margin-top:8px; font-size:15px; font-weight:700; line-height:1.35; color:var(--ink); text-decoration:none;")}>
                    {x.title || x.channel}
                  </a>
                  {meta && <div style={st("margin-top:6px; font-size:12.5px; color:var(--mut2);")}>{meta}</div>}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {(praise.length > 0 || blame.length > 0) && (
        <div style={st("margin-top:28px;")}>
          <div style={st("display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:10px 20px;")}>
            <h3 style={st("margin:0; font-size:18px; font-weight:800; letter-spacing:-.3px; color:var(--ink);")}>{t("yt_highlight")}</h3>
            {/* the balance before a word is read -- only when there is one */}
            {praise.length > 0 && blame.length > 0 && (
              <div role="img" aria-label={`${praise.length} ${t("yt_praised")} · ${blame.length} ${t("yt_tradeoffs")}`}
                style={st("display:flex; align-items:center; gap:10px; font-size:12.5px;")}>
                <span aria-hidden="true" style={st("display:flex; gap:3px; width:120px; height:8px;")}>
                  <i style={st(`flex:${praise.length}; border-radius:99px; background:var(--teal);`)} />
                  <i style={st(`flex:${blame.length}; border-radius:99px; background:var(--ac);`)} />
                </span>
                <span aria-hidden="true"><b style={st("color:var(--tealD);")}>{praise.length}</b> · <b style={st("color:var(--acd);")}>{blame.length}</b></span>
              </div>
            )}
          </div>
          <div style={st("display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr)); gap:12px; margin-top:12px;")}>
            {([[praise, t("yt_praised"), true], [blame, t("yt_tradeoffs"), false]] as const).map(([list, label, good]) =>
              list.length === 0 ? null : (
                <div key={label} style={st(`min-width:0; padding:16px 18px 8px; border-radius:12px; background:${good ? "rgba(var(--rgb-teal),.07)" : "rgba(var(--rgb-amber),.1)"};`)}>
                  <div style={st(`display:flex; align-items:center; gap:8px; font-size:15px; font-weight:800; color:${good ? "var(--tealD)" : "var(--acd)"};`)}>
                    <Mark praise={good} size={15} />{label}
                    <span style={st("margin-left:auto; min-width:24px; padding:2px 8px; border-radius:var(--r); background:var(--card); font-size:12px; font-weight:700; text-align:center;")}>{list.length}</span>
                  </div>
                  {list.slice(0, all ? list.length : SHOWN).map((p, i) => (
                    <div key={i} style={st(`display:grid; grid-template-columns:22px minmax(0,1fr); gap:11px; padding:11px 0; ${i ? "border-top:1px solid rgba(var(--rgb-ink),.07);" : ""}`)}>
                      <span style={st(`display:grid; place-items:center; width:22px; height:22px; margin-top:1px; border-radius:50%; background:var(--card); color:${good ? "var(--tealD)" : "var(--acd)"};`)}>
                        <Mark praise={good} />
                      </span>
                      <span style={st("min-width:0;")}>
                        <b style={st("display:block; font-size:14.5px; font-weight:700; line-height:1.4; color:var(--ink);")}>{p.point}</b>
                        {p.detail && <span style={st("display:block; margin-top:3px; font-size:13.5px; line-height:1.5; color:var(--ink2);")}>{p.detail}</span>}
                        {source(p)}
                      </span>
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
        <p style={st("margin:18px 0 0; font-size:12px; line-height:1.5; color:var(--mut2);")}>{t("yt_note")}</p>
      )}
    </>
  );
}
