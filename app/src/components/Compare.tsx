import { st, taka } from "../theme";
import { t } from "../i18n";
import type { CompareFrom, Upgrade, UpgradeRow } from "../api";
import { PhonePhoto } from "./PhonePhoto";

interface VMeta { label: string; c: string; bg: string; arrow: string; }
export function upgradeMeta(v: string): VMeta {
  if (v === "upgrade") return { label: t("upgrade"), c: "#0a7d57", bg: "rgba(10,157,106,.12)", arrow: "↑" };
  if (v === "downgrade") return { label: t("downgrade"), c: "#c4503c", bg: "rgba(196,80,60,.12)", arrow: "↓" };
  return { label: t("sidegrade"), c: "#5c626a", bg: "rgba(15,25,35,.07)", arrow: "→" };
}

/** Loud "this has a known defect" callout — shown even on our top pick. */
export function JustSoYouKnow({ text }: { text: string }) {
  return (
    <div style={st("display:flex; gap:10px; padding:12px 14px; border-radius:14px; background:rgba(196,80,60,.09); border:.5px solid rgba(196,80,60,.22);")}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={st("flex-shrink:0; margin-top:1px;")}><path d="M12 8v5M12 16v.5M12 3l9 16H3L12 3z" stroke="#c4503c" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <div style={st("min-width:0;")}>
        <div style={st("font-size:10.5px; font-weight:800; letter-spacing:1px; text-transform:uppercase; color:#c4503c; margin-bottom:2px;")}>{t("just_so_you_know")}</div>
        <span style={st("font-size:12.5px; color:#7a3b30; line-height:1.5;")}>{text}</span>
      </div>
    </div>
  );
}

const DIR_COLOR: Record<string, string> = { up: "#0a7d57", down: "#c4503c", same: "#9aa0a8" };
const DIR_ARROW: Record<string, string> = { up: "↑", down: "↓", same: "=" };

/** Small inline verdict pill (results rest-cards). */
export function UpgradeTag({ v, tiny }: { v: string; tiny?: boolean }) {
  const m = upgradeMeta(v);
  return (
    <span style={st(`display:inline-flex; align-items:center; gap:3px; font-size:${tiny ? 10 : 11}px; font-weight:700; padding:${tiny ? "1px 7px" : "3px 9px"}; border-radius:99px; white-space:nowrap; color:${m.c}; background:${m.bg};`)}>
      {m.arrow}{tiny ? "" : ` ${m.label}`}
    </span>
  );
}

/** Full axis-by-axis comparison vs the buyer's current phone (found in our DB). */
export function CompareCard({ up, pickName }: { up: Upgrade; pickName: string }) {
  const m = upgradeMeta(up.verdict);
  return (
    <div style={st(`border-radius:20px; padding:18px 20px; margin-top:12px; background:linear-gradient(110deg, ${m.bg}, rgba(255,255,255,.6)); box-shadow:inset 0 0 0 1px ${m.bg};`)}>
      <div style={st("display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;")}>
        <div style={st("font-size:13px; color:#5c626a;")}>
          {t("vs_your")} <span style={st("font-weight:700; color:#2c3036;")}>{up.current_name}</span>
          {" → "}<span style={st("font-weight:700; color:#2c3036;")}>{pickName}</span>
        </div>
        <div style={st("display:flex; align-items:center; gap:7px;")}>
          {up.experimental && (
            <span style={st("font-size:9.5px; font-weight:800; letter-spacing:.6px; padding:4px 9px; border-radius:99px; color:#7a4ec2; background:rgba(122,78,194,.12);")}>⚗ {t("experimental")}</span>
          )}
          <span style={st(`font-size:13px; font-weight:800; padding:5px 13px; border-radius:99px; color:${m.c}; background:#fff; box-shadow:0 1px 4px rgba(15,25,35,.08);`)}>{m.arrow} {m.label}</span>
        </div>
      </div>
      {up.rows.length > 0 && (
        <div style={st("display:grid; grid-template-columns:repeat(auto-fit,minmax(210px,1fr)); gap:14px 22px; margin-top:16px;")}>
          {up.rows.map((r, i) => <CompareRow key={i} r={r} />)}
        </div>
      )}
      {up.experimental && (
        <p style={st("margin:14px 0 0; font-size:11px; color:#9a9da4; line-height:1.5;")}>{t("experimental_note")}</p>
      )}
    </div>
  );
}

/** One axis: label + arrow, then twin bars (your phone vs the pick) scaled to
    the larger value so the size of the jump is visible at a glance. */
function CompareRow({ r }: { r: UpgradeRow }) {
  const c = DIR_COLOR[r.dir];
  const hasBars = r.fromN != null && r.toN != null && Math.max(r.fromN, r.toN) > 0;
  return (
    <div style={st("min-width:0;")}>
      <div style={st("display:flex; align-items:center; justify-content:space-between; gap:8px;")}>
        <span style={st("font-size:12.5px; font-weight:600; color:#2c3036;")}>{r.label}</span>
        <span style={st(`font-size:13px; font-weight:800; color:${c};`)}>{DIR_ARROW[r.dir]}</span>
      </div>
      {hasBars ? (
        <div style={st("margin-top:8px; display:flex; flex-direction:column; gap:5px;")}>
          <Bar pctv={(r.fromN! / Math.max(r.fromN!, r.toN!)) * 100} label={r.from} color="#c2c6cd" valColor="#80868f" />
          <Bar pctv={(r.toN! / Math.max(r.fromN!, r.toN!)) * 100} label={r.to} color={c} valColor={c} bold />
        </div>
      ) : (
        <div style={st("margin-top:4px; font-size:11.5px; color:#80868f;")}>{r.from} → <span style={st(`color:${c}; font-weight:600;`)}>{r.to}</span></div>
      )}
    </div>
  );
}

function Bar({ pctv, label, color, valColor, bold }: { pctv: number; label: string; color: string; valColor: string; bold?: boolean }) {
  return (
    <div style={st("display:flex; align-items:center; gap:8px;")}>
      <div style={st("flex:1; height:7px; border-radius:99px; background:rgba(15,25,35,.06); overflow:hidden;")}>
        <div style={st(`height:100%; width:${Math.max(4, Math.min(100, pctv))}%; border-radius:99px; background:${color}; transition:width .4s ease;`)} />
      </div>
      <span style={st(`font-size:11px; ${bold ? "font-weight:700;" : ""} color:${valColor}; white-space:nowrap; min-width:54px; text-align:right;`)}>{label}</span>
    </div>
  );
}

/** Current phone wasn't in our DB — we found it live on GadgetGear. Lighter:
    identity + price delta only (no spec axes to compare). */
export function LiveCompareCard({ cf, pickPrice }: { cf: CompareFrom; pickPrice: number | null }) {
  const delta = cf.price != null && pickPrice != null ? pickPrice - cf.price : null;
  return (
    <div style={st("display:flex; align-items:center; gap:14px; border-radius:20px; padding:16px 18px; margin-top:12px; background:rgba(255,255,255,.7); box-shadow:inset 0 0 0 1px rgba(15,25,35,.06);")}>
      <PhonePhoto src={cf.image} w="44px" h="58px" radius={11} />
      <div style={st("flex:1; min-width:0;")}>
        <div style={st("font-size:11px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:#9a9da4;")}>{t("your_phone")}</div>
        <div style={st("font-size:15px; font-weight:700; color:#17191d; margin-top:2px;")}>{cf.name}</div>
        <div style={st("font-size:12px; color:#80868f; margin-top:2px;")}>{t("live_from_gng")}{cf.price != null ? ` · ${taka(cf.price)}` : ""}</div>
      </div>
      {delta != null && (
        <div style={st("text-align:right; flex-shrink:0;")}>
          <div style={st(`font-size:15px; font-weight:700; color:${delta >= 0 ? "#2c3036" : "#0a7d57"};`)}>{delta >= 0 ? "+" : "−"}{taka(Math.abs(delta))}</div>
          <div style={st("font-size:11px; color:#80868f;")}>{delta >= 0 ? t("pricier") : t("cheaper")}</div>
        </div>
      )}
    </div>
  );
}
