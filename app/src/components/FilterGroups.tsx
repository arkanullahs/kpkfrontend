import { useState } from "react";
import { st } from "../theme";
import { t } from "../i18n";
import { GROUPS, toggleBrand, toggleHardware, type FilterGroup } from "../filters";
import { useCounts } from "../useCounts";
import type { Form } from "../need";

/* Two tiers of grouped controls. ONE group open at a time, so however many
   controls exist in total, at most one group's worth is ever on screen -- the
   cost of a seventh group is one 44px row, not a screenful.

   Every collapsed row states its own value. "any" is doing real work there:
   it tells the buyer nothing is silently filtering them, which is what makes
   hidden controls frightening. */

const ROW = "display:flex; align-items:center; gap:13px; width:100%; padding:15px; border:none; cursor:pointer; text-align:left; background:transparent;";

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      style={st(`flex-shrink:0; transition:transform .2s ease; transform:rotate(${open ? 180 : 0}deg);`)}>
      <path d="M6 9l6 6 6-6" stroke="var(--mut)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Icon({ d, on }: { d: string; on: boolean }) {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={st("flex-shrink:0;")}>
      <path d={d} stroke={on ? "var(--lnk)" : "var(--mut)"} strokeWidth="1.85"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Group({ g, form, patch, open, onOpen, matchCount }: {
  g: FilterGroup; form: Form; patch: (d: Partial<Form>) => void;
  open: boolean; onOpen: () => void; matchCount: number | null;
}) {
  const value = g.summary(form);
  const on = value !== null;
  return (
    <div style={st(`border-bottom:1.5px solid var(--rule); background:${open ? "var(--tint)" : "transparent"}; transition:background .18s ease;`)}>
      <button onClick={onOpen} className="k-press" aria-expanded={open} style={st(ROW)}>
        <Icon d={g.icon} on={on} />
        <span style={st("flex:1; min-width:0; display:block; font-size:16.5px; font-weight:500; color:var(--ink);")}>
          {t(g.labelKey)}
        </span>
        <span style={st(`flex-shrink:0; font-size:14px; font-weight:${on ? 600 : 400}; color:${on ? "var(--lnk)" : "var(--tx)"}; max-width:40%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;`)}>
          {value ?? t("fg_any")}
        </span>
        <Chevron open={open} />
      </button>
      {open && (
        <div style={st("padding:0 15px 16px; animation:kpop .3s cubic-bezier(.2,.7,.2,1) both;")}>
          <p style={st("margin:0 0 13px; font-size:14px; color:var(--tx); line-height:1.55;")}>{t(g.helpKey)}</p>
          <GroupBody g={g} form={form} patch={patch} matchCount={matchCount} />
          {on && (
            <button onClick={() => patch(g.patchOff(form))} className="k-press"
              style={st("margin-top:12px; padding:9px 15px; border-radius:var(--r); border:1.5px solid var(--rule); background:var(--card); cursor:pointer; font-size:13.5px; font-weight:600; color:var(--tx);")}>
              {t("fg_clear")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function FilterGroups({ form, patch, matchCount, openTier2 }: {
  form: Form; patch: (d: Partial<Form>) => void;
  matchCount: number | null; openTier2?: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [tier2, setTier2] = useState(!!openTier2);
  const tier2Set = GROUPS.filter((g) => g.tier === 2 && g.summary(form) !== null).length;
  const shell = "background:var(--card); box-shadow:var(--sh-card); border-radius:var(--r); overflow:hidden;";

  const render = (tier: 1 | 2) => GROUPS.filter((g) => g.tier === tier).map((g) => (
    <Group key={g.id} g={g} form={form} patch={patch} matchCount={matchCount}
      open={openId === g.id} onOpen={() => setOpenId(openId === g.id ? null : g.id)} />
  ));

  return (
    <div style={st("margin-top:26px;")}>
      <div style={st(shell)}>{render(1)}</div>

      <button onClick={() => setTier2(!tier2)} className="k-press" aria-expanded={tier2}
        style={st("display:flex; align-items:center; justify-content:center; gap:9px; width:100%; margin-top:12px; padding:14px; border-radius:var(--r); border:1.5px solid var(--rule); background:var(--card); cursor:pointer;")}>
        <span style={st("font-size:15px; font-weight:600; color:var(--tx);")}>{t("fg_tier2")}</span>
        {tier2Set > 0 && (
          <span style={st("background:var(--tint); color:var(--lnk); font-size:13px; font-weight:700; padding:3px 9px; border-radius:var(--r);")}>{tier2Set}</span>
        )}
        <Chevron open={tier2} />
      </button>

      {tier2 && <div style={st(`${shell} margin-top:12px; animation:kpop .3s cubic-bezier(.2,.7,.2,1) both;`)}>{render(2)}</div>}
    </div>
  );
}

/* ---------- the per-group controls ---------- */

function CountPill({ n, total }: { n: number | null; total: number | null }) {
  if (n === null) return null;
  const dead = n === 0;
  return (
    <span style={st(`flex-shrink:0; font-size:13.5px; font-weight:600; padding:5px 10px; border-radius:var(--r); background:${dead ? "var(--dangerL)" : "var(--tint)"}; color:${dead ? "var(--danger)" : "var(--lnk)"};`)}>
      {dead ? t("fg_zero") : `${n} ${t("fg_of")} ${total ?? "?"}`}
    </span>
  );
}

function Toggle({ label, on, count, total, onClick }: {
  label: string; on: boolean; count: number | null; total: number | null; onClick: () => void;
}) {
  // an option that would leave nothing standing is pre-marked rather than
  // discovered afterwards -- but only while it is OFF: a set filter must always
  // be un-settable, and disabling the one control that undoes it would trap the
  // buyer on an empty result with no way back.
  const dead = count === 0 && !on;
  return (
    <button onClick={onClick} disabled={dead} className="k-press" aria-pressed={on}
      style={st(`display:flex; align-items:center; gap:11px; width:100%; padding:13px 14px; margin-bottom:8px; border-radius:var(--r); cursor:${dead ? "not-allowed" : "pointer"}; text-align:left; opacity:${dead ? .55 : 1}; background:${on ? "var(--teal)" : "var(--card)"}; border:1.5px solid ${on ? "transparent" : "var(--rule)"}; box-shadow:${on ? "0 3px 12px rgba(var(--rgb-ink),.14)" : "none"};`)}>
      <span style={st(`flex:1; font-size:15.5px; font-weight:500; color:${on ? "var(--onp)" : "var(--ink)"};`)}>{label}</span>
      {!on && <CountPill n={count} total={total} />}
    </button>
  );
}

function GroupBody({ g, form, patch, matchCount }: {
  g: FilterGroup; form: Form; patch: (d: Partial<Form>) => void; matchCount: number | null;
}) {
  // Only the OPEN group renders a body, so at most one group's probes are ever
  // in flight -- three /count calls, not twelve.
  const probes: Record<string, Partial<Form>> =
    g.id === "warranty" ? { officialOnly: { officialOnly: true } }
    : g.id === "hardware" ? { jack: { requireJack: true }, ir: { requireIr: true }, fm: { requireFm: true } }
    : g.id === "avoid" ? { cn: { avoidChinese: true } }
    : {};
  const counts = useCounts(form, probes);

  if (g.id === "warranty") {
    return <Toggle label={t("fg_warranty")} on={form.officialOnly} count={counts.officialOnly ?? null}
      total={matchCount} onClick={() => patch({ officialOnly: !form.officialOnly })} />;
  }
  if (g.id === "hardware") {
    return (
      <div className="k-stagger">
        <Toggle label={t("fg_hw_jack")} on={form.requireJack} count={counts.jack ?? null} total={matchCount}
          onClick={() => patch(toggleHardware(form, "jack"))} />
        <Toggle label={t("fg_hw_ir")} on={form.requireIr} count={counts.ir ?? null} total={matchCount}
          onClick={() => patch(toggleHardware(form, "ir"))} />
        <Toggle label={t("fg_hw_fm")} on={form.requireFm} count={counts.fm ?? null} total={matchCount}
          onClick={() => patch(toggleHardware(form, "fm"))} />
      </div>
    );
  }
  if (g.id === "avoid") {
    return (
      <>
        <Toggle label={t("fg_avoid_cn")} on={form.avoidChinese} count={counts.cn ?? null}
          total={matchCount} onClick={() => patch({ avoidChinese: !form.avoidChinese })} />
        <Chips options={BRANDS.map((b) => [b, b] as [string, string])} selected={form.excludeBrands}
          onToggle={(v) => patch(toggleBrand(form, v, "avoid"))} />
      </>
    );
  }
  return <TierTwoBody g={g} form={form} patch={patch} />;
}

/* ---------- tier 2: segmented pickers and chip lists, not toggles ---------- */

const seg = (sel: boolean) =>
  `flex:1; padding:12px 4px; border-radius:var(--r); border:none; cursor:pointer; font-size:14.5px; font-weight:600; transition:all .15s ease; background:${sel ? "var(--card)" : "transparent"}; color:${sel ? "var(--lnk)" : "var(--tx)"}; box-shadow:${sel ? "0 1px 3px rgba(var(--rgb-ink),.14)" : "none"};`;
const SEGWRAP = "margin-top:10px; display:flex; gap:5px; padding:4px; border-radius:var(--r); background:rgba(var(--rgb-ink),.05);";
const BRANDS = ["Samsung", "Xiaomi", "vivo", "OnePlus", "realme", "Apple"];
const MARKETS: [string, string][] = [["IN", "India"], ["Global", "Global"], ["CN", "China"], ["US", "USA"], ["JP", "Japan"], ["SG", "Singapore"], ["AU", "Australia"]];

function Chips({ options, selected, onToggle }: {
  options: [string, string][]; selected: string[]; onToggle: (v: string) => void;
}) {
  return (
    <div style={st("display:flex; flex-wrap:wrap; gap:8px; margin-top:11px;")}>
      {options.map(([v, label]) => {
        const on = selected.includes(v);
        return (
          <button key={v} onClick={() => onToggle(v)} className="k-press" aria-pressed={on}
            style={st(`padding:11px 16px; border-radius:var(--r); cursor:pointer; font-size:14.5px; font-weight:600; background:${on ? "var(--teal)" : "var(--card)"}; color:${on ? "var(--onp)" : "var(--tx)"}; border:1.5px solid ${on ? "transparent" : "var(--rule)"};`)}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

function TierTwoBody({ g, form, patch }: { g: FilterGroup; form: Form; patch: (d: Partial<Form>) => void }) {
  const toggleIn = (list: string[], v: string) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  if (g.id === "type") {
    return (
      <>
        <div style={st(SEGWRAP)}>
          {([["any", t("fg_any")], ["android", t("fg_platform_android")], ["ios", t("fg_platform_ios")]] as const).map(([k, l]) => (
            <button key={k} onClick={() => patch({ platform: k as Form["platform"] })} className="k-press"
              aria-pressed={form.platform === k} style={st(seg(form.platform === k))}>{l}</button>
          ))}
        </div>
        <div style={st(SEGWRAP)}>
          {([["any", t("fg_any")], ["clean", t("fg_os_clean")], ["feature", t("fg_os_feature")]] as const).map(([k, l]) => (
            <button key={k} onClick={() => patch({ osStyle: k as Form["osStyle"] })} className="k-press"
              aria-pressed={form.osStyle === k} style={st(seg(form.osStyle === k))}>{l}</button>
          ))}
        </div>
      </>
    );
  }
  if (g.id === "power") {
    return (
      <>
        <div style={st(SEGWRAP)}>
          {([["any", t("fg_any")], ["snapdragon", t("fg_soc_snapdragon")], ["mediatek", t("fg_soc_mediatek")]] as const).map(([k, l]) => (
            <button key={k} onClick={() => patch({ socVendor: k as Form["socVendor"] })} className="k-press"
              aria-pressed={form.socVendor === k} style={st(seg(form.socVendor === k))}>{l}</button>
          ))}
        </div>
        <Chips options={[["6", "6GB RAM"], ["8", "8GB RAM"], ["12", "12GB RAM"]]}
          selected={form.minRam ? [String(form.minRam)] : []}
          onToggle={(v) => patch({ minRam: form.minRam === +v ? 0 : +v })} />
        <Chips options={[["128", "128GB"], ["256", "256GB"], ["512", "512GB"]]}
          selected={form.minStorage ? [String(form.minStorage)] : []}
          onToggle={(v) => patch({ minStorage: form.minStorage === +v ? 0 : +v })} />
      </>
    );
  }
  if (g.id === "only") {
    return <Chips options={BRANDS.map((b) => [b, b] as [string, string])} selected={form.includeBrands}
      onToggle={(v) => patch(toggleBrand(form, v, "only"))} />;
  }
  return (
    <>
      <Chips options={MARKETS} selected={form.regions}
        onToggle={(v) => patch({ regions: toggleIn(form.regions, v) })} />
      <Chips options={[["rom", t("fg_rom_on")], ["strict", t("fg_strict_on")]]}
        selected={[form.requireRom && "rom", form.hwStrict && "strict"].filter(Boolean) as string[]}
        onToggle={(v) => patch(v === "rom"
          ? { requireRom: !form.requireRom } : { hwStrict: !form.hwStrict })} />
    </>
  );
}
