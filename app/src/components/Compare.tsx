import { st, taka } from "../theme";
import { t } from "../i18n";
import type { CompareFrom, Upgrade } from "../api";
import { PhonePhoto } from "./PhonePhoto";

interface VMeta { label: string; c: string; bg: string; arrow: string; }
export function upgradeMeta(v: string): VMeta {
  if (v === "upgrade") return { label: t("upgrade"), c: "#0a7d57", bg: "rgba(10,157,106,.12)", arrow: "↑" };
  if (v === "downgrade") return { label: t("downgrade"), c: "#c4503c", bg: "rgba(196,80,60,.12)", arrow: "↓" };
  return { label: t("sidegrade"), c: "#5c626a", bg: "rgba(15,25,35,.07)", arrow: "→" };
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
      <div style={st("display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;")}>
        <div style={st("font-size:13px; color:#5c626a;")}>
          {t("vs_your")} <span style={st("font-weight:700; color:#2c3036;")}>{up.current_name}</span>
          {" → "}<span style={st("font-weight:700; color:#2c3036;")}>{pickName}</span>
        </div>
        <span style={st(`font-size:13px; font-weight:800; padding:5px 13px; border-radius:99px; color:${m.c}; background:#fff; box-shadow:0 1px 4px rgba(15,25,35,.08);`)}>{m.arrow} {m.label}</span>
      </div>
      {up.rows.length > 0 && (
        <div style={st("display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:9px 16px; margin-top:14px;")}>
          {up.rows.map((r, i) => (
            <div key={i} style={st("display:flex; align-items:center; gap:8px;")}>
              <span style={st(`width:18px; text-align:center; font-weight:800; color:${DIR_COLOR[r.dir]};`)}>{DIR_ARROW[r.dir]}</span>
              <span style={st("flex:1; min-width:0;")}>
                <span style={st("font-size:12.5px; font-weight:600; color:#2c3036;")}>{r.label}</span>
                <span style={st("display:block; font-size:11.5px; color:#80868f;")}>{r.from} → <span style={st(`color:${DIR_COLOR[r.dir]}; font-weight:600;`)}>{r.to}</span></span>
              </span>
            </div>
          ))}
        </div>
      )}
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
