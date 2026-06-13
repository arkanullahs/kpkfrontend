import { useCallback, useEffect, useRef, useState } from "react";
import { api, type Archetype, type Meta, type PhoneDetail, type RecommendResp, type RecParams } from "./api";
import { accentVars, st, type Accent } from "./theme";
import { getLang, setLang, t, type Lang } from "./i18n";
import { AskScreen } from "./components/AskScreen";
import { ResultsScreen } from "./components/ResultsScreen";
import { DetailScreen } from "./components/DetailScreen";
import { Dock } from "./components/Dock";

export type Screen = "ask" | "results" | "detail";

export interface Form {
  budget: number;
  archetype: string;
  channel: "any" | "official" | "unofficial";
  platform: "any" | "android" | "ios";
  osStyle: "any" | "clean" | "feature";
  includeCn: boolean;
  excludeBrands: string[];
  currentPhone: string;
  traitText: string;
}

const DEFAULT_FORM: Form = {
  budget: 95000, archetype: "photographer", channel: "any", platform: "any",
  osStyle: "any", includeCn: false, excludeBrands: [], currentPhone: "", traitText: "",
};

/** form → /recommend query params */
export function toParams(f: Form, top = 5): RecParams {
  const p: RecParams = { budget: f.budget, top };
  // NL trait text takes over (server maps it to archetype/priorities/filters)
  if (f.traitText.trim()) {
    p.traits = f.traitText.trim();
  } else if (f.archetype) {
    p.archetype = f.archetype;
  }
  if (f.channel !== "any") p.channel = f.channel;
  if (f.platform !== "any") p.platform = f.platform;
  if (f.osStyle !== "any") p.os_style = f.osStyle;
  if (f.includeCn) p.include_cn = true;
  if (f.excludeBrands.length) p.exclude_brand = f.excludeBrands.join(",");
  if (f.currentPhone.trim()) p.current_phone = f.currentPhone.trim();
  return p;
}

export default function App() {
  const accent: Accent = "cobalt";
  const [lang, setLangState] = useState<Lang>(getLang());
  const toggleLang = () => { const n = lang === "en" ? "bn" : "en"; setLang(n); setLangState(n); };
  const [screen, setScreen] = useState<Screen>("ask");
  const [form, setForm] = useState<Form>(DEFAULT_FORM);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [archetypes, setArchetypes] = useState<Archetype[]>([]);

  const [result, setResult] = useState<RecommendResp | null>(null);
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);
  const [matchCount, setMatchCount] = useState<number | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PhoneDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // one-time loads
  useEffect(() => {
    api.meta().then(setMeta).catch(() => {});
    api.archetypes().then(setArchetypes).catch(() => {});
  }, []);

  const patch = useCallback((d: Partial<Form>) => setForm((f) => ({ ...f, ...d })), []);

  // live candidate count for the "See results" badge (debounced)
  const debounceRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      api.recommend(toParams(form, 1))
        .then((r) => setMatchCount(r.meta.candidates))
        .catch(() => setMatchCount(null));
    }, 350);
    return () => window.clearTimeout(debounceRef.current);
  }, [form]);

  // signature of the form the current `result` was computed from, so navigating
  // back to Results after editing the query re-runs instead of showing stale picks
  const lastRunKey = useRef<string>("");

  const runRecommend = useCallback(async () => {
    const params = toParams(form, 8);
    lastRunKey.current = JSON.stringify(params);
    setScreen("results");
    window.scrollTo({ top: 0 });
    setRecLoading(true);
    setRecError(null);
    try {
      setResult(await api.recommend(params));
    } catch (e: any) {
      setRecError(e?.message || "Could not load recommendations");
    } finally {
      setRecLoading(false);
    }
  }, [form]);

  const openDetail = useCallback(async (id: string) => {
    setScreen("detail");
    setSelectedId(id);
    window.scrollTo({ top: 0 });
    setDetail(null);
    setDetailLoading(true);
    setDetailError(null);
    try {
      setDetail(await api.phone(id));
    } catch (e: any) {
      setDetailError(e?.message || "Could not load phone");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const goAsk = () => { setScreen("ask"); window.scrollTo({ top: 0 }); };
  const goResults = () => { setScreen("results"); window.scrollTo({ top: 0 }); };
  const goScreen = (s: Screen) => {
    if (s === "results") {
      const stale = lastRunKey.current !== JSON.stringify(toParams(form, 8));
      if (!recLoading && (!result || stale)) { runRecommend(); return; }
    }
    setScreen(s); window.scrollTo({ top: 0 });
  };

  const metaStock = meta ? String(meta.in_stock) : "—";
  const refreshedLabel = (() => {
    if (!meta?.last_refresh) return "live BD prices";
    const d = new Date(meta.last_refresh);
    if (isNaN(d.getTime())) return "live BD prices";
    const days = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (days <= 0) return t("refreshed_today");
    if (days === 1) return t("refreshed_yesterday");
    return `${t("refreshed_today").split(" ")[0]} ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
  })();

  return (
    <div key={lang} style={{ ...st("min-height:100vh; background:#f1f0ed; color:#17191d; font-family:'Space Grotesk','Anek Bangla',system-ui,sans-serif;"), ...accentVars(accent) }}>
      {/* ambient orbs */}
      <div style={st("position:fixed; inset:0; pointer-events:none; z-index:0; overflow:hidden;")}>
        <div style={st("position:absolute; top:-180px; right:-140px; width:560px; height:560px; border-radius:50%; background:radial-gradient(circle, var(--orbA), transparent 68%);")} />
        <div style={st("position:absolute; top:36%; left:-240px; width:680px; height:680px; border-radius:50%; background:radial-gradient(circle, var(--orbB), transparent 68%);")} />
        <div style={st("position:absolute; bottom:-240px; right:6%; width:600px; height:600px; border-radius:50%; background:radial-gradient(circle, var(--orbC), transparent 68%);")} />
      </div>

      {/* glass header */}
      <div style={st("position:sticky; top:0; z-index:60; display:flex; justify-content:center; padding:14px clamp(16px,4vw,40px) 6px;")}>
        <div style={st("width:100%; max-width:1020px; display:flex; align-items:center; justify-content:space-between; gap:14px; padding:10px 20px; border-radius:99px; background:rgba(252,252,253,.55); backdrop-filter:blur(26px) saturate(185%); -webkit-backdrop-filter:blur(26px) saturate(185%); border:.5px solid rgba(255,255,255,.8); box-shadow:inset 0 1px 1px rgba(255,255,255,.95), inset 0 -1px 1px rgba(255,255,255,.3), 0 10px 30px rgba(20,24,32,.09);")}>
          <div style={st("display:flex; align-items:center; gap:9px;")}>
            <span style={st("width:9px; height:9px; border-radius:99px; background:var(--ac); box-shadow:0 0 0 3.5px var(--acsoft); flex-shrink:0;")} />
            <span style={st("font-family:'Anek Bangla'; font-size:16px; font-weight:700; letter-spacing:-.2px; white-space:nowrap; flex-shrink:0;")}>কোন ফোন?</span>
            <span style={st("font-size:12.5px; color:#9a9da4; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0;")}>{t("budget_first")}</span>
          </div>
          <div style={st("display:flex; align-items:center; gap:8px; font-size:12.5px; color:#84878f; white-space:nowrap; min-width:0; overflow:hidden;")}>
            <span style={st("font-weight:600; color:#565b63; flex-shrink:0;")}>{metaStock} {t("in_stock")}</span>
            <span style={st("width:3px; height:3px; border-radius:50%; background:#c9cbd0; flex-shrink:0;")} />
            <span style={st("overflow:hidden; text-overflow:ellipsis; min-width:0;")}>{refreshedLabel}</span>
            <button onClick={toggleLang} title="Language"
              style={st("flex-shrink:0; margin-left:2px; padding:4px 11px; border-radius:99px; border:.5px solid rgba(15,25,35,.12); background:rgba(255,255,255,.6); cursor:pointer; font-size:11.5px; font-weight:700; color:var(--acd); font-family:'Anek Bangla',sans-serif;")}>
              {lang === "en" ? "বাংলা" : "EN"}
            </button>
          </div>
        </div>
      </div>

      <div style={st("position:relative; z-index:1; padding:18px clamp(16px,4vw,40px) 175px;")}>
        {screen === "ask" && (
          <AskScreen
            form={form} patch={patch} archetypes={archetypes}
            metaStock={metaStock} onSubmit={runRecommend} matchCount={matchCount}
          />
        )}
        {screen === "results" && (
          <ResultsScreen
            result={result} loading={recLoading} error={recError}
            form={form} onEdit={goAsk} onPick={openDetail} onRetry={runRecommend}
          />
        )}
        {screen === "detail" && (
          <DetailScreen
            detail={detail} loading={detailLoading} error={detailError}
            budget={form.budget} channel={form.channel} onBack={goResults}
            onRetry={() => selectedId && openDetail(selectedId)}
          />
        )}
      </div>

      <Dock
        screen={screen} onScreen={goScreen} onAsk={goAsk}
        onSeeResults={runRecommend} matchCount={matchCount}
      />
    </div>
  );
}
