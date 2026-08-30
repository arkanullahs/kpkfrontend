import { st } from "../theme";
import { t } from "../i18n";
import type { YoutubeBlock } from "../api";

/* What reviewers said, on the app's detail screen.

   The static /phone/ page has carried this since 2026-08-30 and the app had
   nothing: 854 phones in the catalogue hold video and the app showed none of
   it, while the ranker that produced the pick was reading four reviews of that
   exact phone. Same block, same source, same ordering -- cards.py builds it
   once at pipeline time (attribution needs the 50 MB YouTube cache, and the
   API answers on a 0.1-CPU box), so the two surfaces cannot list a different
   set of reviews for one phone.

   No YouTube embed and no hotlinked still. The thumbnails are ours, fetched
   once into the same bucket as the product photos; a video whose picture never
   arrived falls back to the channel's initial, which reads as a design rather
   than a hole. */

function views(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return Math.round(n / 1000) + "K";
  return n ? String(n) : "";
}

function Play({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none"
      style={st("position:relative; filter:drop-shadow(0 1px 3px rgba(0,0,0,.5));")}>
      <path d="M10 2.6a7.4 7.4 0 1 1 0 14.8 7.4 7.4 0 0 1 0-14.8zM8.4 7.1l4.2 2.9-4.2 2.9V7.1z"
        stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function YoutubeSection({ yt }: { yt: YoutubeBlock }) {
  const vids = yt.videos || [];
  const points = yt.points || [];
  const praise = points.filter((p) => p.stance === "praise");
  const blame = points.filter((p) => p.stance !== "praise");
  const reach = vids.reduce((s, v) => s + (v.views || 0), 0);

  const source = (p: { channel?: string; title?: string; url?: string }) => {
    // No credit at all when there is nobody to credit: an owner-written point
    // carries no video, and labelling it "review" would invent a source.
    if (!p.channel && !p.url) return null;
    const label = (p.channel || "review") + (p.title ? " · " + p.title : "");
    return p.url
      ? <a href={p.url} target="_blank" rel="noopener noreferrer"
          style={st("display:block; margin-top:5px; font-size:12.5px; color:var(--mut2); text-decoration:none;")}>{label} ↗</a>
      : <span style={st("display:block; margin-top:5px; font-size:12.5px; color:var(--mut2);")}>{label}</span>;
  };

  return (
    <>
      <div style={st("display:flex; align-items:center; gap:9px; flex-wrap:wrap;")}>
        <span style={st("color:#e0392b; display:flex;")}><Play size={20} /></span>
        <h2 style={st("margin:0; font-size:19px; font-weight:800; color:var(--ink);")}>
          {vids.length ? t("yt_title") : t("yt_title_plain")}
        </h2>
        {vids.length > 0 && (
          <span style={st("font-size:13px; color:var(--mut2); font-weight:600; background:rgba(var(--rgb-ink),.05); border-radius:999px; padding:4px 10px;")}>
            {vids.length} {vids.length === 1 ? t("yt_review") : t("yt_reviews")}
            {reach ? ` · ${views(reach)} ${t("yt_views")}` : ""}
          </span>
        )}
      </div>

      {yt.verdict && (
        <p style={st("margin:12px 0 0; font-size:16px; font-weight:600; line-height:1.6; color:var(--ink2); text-wrap:pretty;")}>{yt.verdict}</p>
      )}
      {yt.best_for && (
        <p style={st("margin:6px 0 0; font-size:14px; color:var(--mut2);")}>{t("yt_best_for")} {yt.best_for}</p>
      )}

      {[[praise, t("yt_praised"), "var(--tealD)"] as const,
        [blame, t("yt_criticised"), "var(--acd)"] as const].map(([list, label, colour]) =>
        list.length === 0 ? null : (
          <div key={label}>
            <div style={st(`margin:18px 0 8px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.6px; color:${colour};`)}>{label}</div>
            <div style={st("display:grid; gap:9px;")}>
              {list.map((p, i) => (
                <div key={i} style={st("background:var(--card); border-radius:var(--r); box-shadow:var(--sh-card); padding:13px 16px; font-size:14.5px; line-height:1.55; color:var(--ink2);")}>
                  <b style={st("display:block; margin-bottom:2px;")}>{p.point}</b>
                  {p.detail}
                  {source(p)}
                </div>
              ))}
            </div>
          </div>
        ))}

      {vids.length > 0 && (
        <>
          <div style={st("margin:18px 0 8px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.6px; color:var(--mut2);")}>{t("yt_the_reviews")}</div>
          <div style={st("display:grid; grid-template-columns:repeat(auto-fill,minmax(258px,1fr)); gap:10px;")}>
            {vids.map((v) => (
              <a key={v.id || v.url} href={v.url} target="_blank" rel="noopener noreferrer"
                style={st("display:flex; gap:12px; align-items:stretch; overflow:hidden; padding:0 14px 0 0; background:var(--card); border-radius:var(--r); box-shadow:var(--sh-card); text-decoration:none; color:inherit;")}>
                <span style={st(`position:relative; flex:none; width:${v.thumb ? 112 : 74}px; align-self:stretch; display:flex; align-items:center; justify-content:center; color:#fff; overflow:hidden; background:linear-gradient(150deg,#e0392b,#a51f1a);`)}>
                  {v.thumb
                    ? <img src={v.thumb} alt="" loading="lazy" decoding="async" width={240} height={135}
                        style={st("position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block;")} />
                    : <span style={st("position:absolute; left:8px; bottom:4px; font-size:26px; font-weight:800; opacity:.3; line-height:1;")}>{(v.channel || "?").slice(0, 1).toUpperCase()}</span>}
                  <Play />
                </span>
                <span style={st("min-width:0; align-self:center; padding:10px 0;")}>
                  <b style={st("display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; font-size:13.5px; line-height:1.4; font-weight:700; color:var(--ink);")}>{v.title || v.channel}</b>
                  <span style={st("display:block; margin-top:3px; font-size:12px; color:var(--mut2);")}>
                    {[v.channel, v.views ? `${views(v.views)} ${t("yt_views")}` : "", v.aired].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </a>
            ))}
          </div>
        </>
      )}
    </>
  );
}
