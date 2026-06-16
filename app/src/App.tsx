import { useCallback, useEffect, useRef, useState } from "react";
import { api, type Archetype, type Meta, type PhoneDetail, type Pick, type RecommendResp, type RecParams } from "./api";
import { accentVars, st, type Accent } from "./theme";
import { getLang, setLang, t, type Lang } from "./i18n";
import { AskScreen } from "./components/AskScreen";
import { ResultsScreen } from "./components/ResultsScreen";
import { DetailScreen } from "./components/DetailScreen";
import { Dock } from "./components/Dock";

export type Screen = "ask" | "results" | "detail";

export interface Form {
  budget: number;
  archetypes: string[];          // multi-select: the buyer can pick several needs
  platform: "any" | "android" | "ios";
  osStyle: "any" | "clean" | "feature";
  includeCn: boolean;
  excludeBrands: string[];
  currentPhone: string;
  traitText: string;
}

const DEFAULT_FORM: Form = {
  budget: 95000, archetypes: ["photographer"], platform: "any",
  osStyle: "any", includeCn: false, excludeBrands: [], currentPhone: "", traitText: "",
};

/** form → /recommend query params */
export function toParams(f: Form, top = 5): RecParams {
  const p: RecParams = { budget: f.budget, top };
  // NL trait text takes over (server maps it to archetype/priorities/filters)
  if (f.traitText.trim()) {
    p.traits = f.traitText.trim();
  } else if (f.archetypes.length) {
    // multiple selected needs merge server-side (engine.resolve_intent)
    p.archetype = f.archetypes.join(",");
  }
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
  const [askStep, setAskStep] = useState(0); // wizard step on the ask screen
  const [form, setForm] = useState<Form>(DEFAULT_FORM);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [archetypes, setArchetypes] = useState<Archetype[]>([]);

  const [result, setResult] = useState<RecommendResp | null>(null);
  const [recLoading, setRecLoading] = useState(false);
  const [recReady, setRecReady] = useState(false); // data in, loader playing its finish beat
  const [recError, setRecError] = useState<string | null>(null);
  const [matchCount, setMatchCount] = useState<number | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pickHint, setPickHint] = useState<Pick | null>(null);
  const [detail, setDetail] = useState<PhoneDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // one-time loads
  useEffect(() => {
    api.meta().then(setMeta).catch(() => {});
    api.archetypes().then(setArchetypes).catch(() => {});
  }, []);

  const patch = useCallback((d: Partial<Form>) => setForm((f) => ({ ...f, ...d })), []);

  // 3-step ask wizard (budget → purpose → fine-tune). Stepping the query makes
  // giving the answer feel as considered as the answer we work for, so the RAG
  // wait reads as care rather than a fast-in / slow-out mismatch. (The old
  // official/unofficial step is gone — those flags proved too unreliable to ask
  // buyers to choose on.)
  const ASK_STEPS = 3;
  const askNext = useCallback(() => setAskStep((s) => Math.min(s + 1, ASK_STEPS - 1)), []);
  const askBack = useCallback(() => setAskStep((s) => Math.max(s - 1, 0)), []);

  // live candidate count for the "See results" badge (debounced). Hits the
  // lightweight /count endpoint — structured pre-filter only, no embed/LLM —
  // so editing the form doesn't fire a full 30-60s RAG call (and burn API
  // quota) on every keystroke just to show a match count.
  const debounceRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      api.count(toParams(form))
        .then((r) => setMatchCount(r.candidates))
        .catch(() => setMatchCount(null));
    }, 350);
    return () => window.clearTimeout(debounceRef.current);
  }, [form]);

  // signature of the form the current `result` was computed from, so navigating
  // back to Results after editing the query re-runs instead of showing stale picks
  const lastRunKey = useRef<string>("");

  // keep the loader on screen at least this long so a cached/instant result
  // doesn't flash through the staged animation; the loader then plays a short
  // completion beat (RagProgress `ready` -> onLoaderDone) before revealing.
  const MIN_LOADER_MS = 1000;

  const runRecommend = useCallback(async () => {
    const params = toParams(form, 5);
    lastRunKey.current = JSON.stringify(params);
    setScreen("results");
    window.scrollTo({ top: 0 });
    setRecLoading(true);
    setRecReady(false);
    setRecError(null);
    setResult(null);
    const t0 = Date.now();
    try {
      const r = await api.recommend(params);
      const wait = MIN_LOADER_MS - (Date.now() - t0);
      if (wait > 0) await new Promise((res) => setTimeout(res, wait));
      setResult(r);
      setRecReady(true);          // loader plays its finish, then calls onLoaderDone
    } catch (e: any) {
      setRecError(e?.message || "Could not load recommendations");
      setRecLoading(false);       // errors skip the finish beat
    }
  }, [form]);

  // RagProgress finished its completion beat -> reveal the results
  const onLoaderDone = useCallback(() => { setRecLoading(false); setRecReady(false); }, []);

  const openDetail = useCallback(async (id: string) => {
    setScreen("detail");
    setSelectedId(id);
    // instant hero/scores/verdict from the result pick while the full
    // DB-backed detail (specs, offers, owner voices) loads behind it
    setPickHint(result?.picks.find((p) => p.id === id) ?? null);
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
  }, [result]);

  const goAsk = () => { setScreen("ask"); setAskStep(0); window.scrollTo({ top: 0 }); };
  const goResults = () => { setScreen("results"); window.scrollTo({ top: 0 }); };
  const goScreen = (s: Screen) => {
    if (s === "results") {
      const stale = lastRunKey.current !== JSON.stringify(toParams(form, 5));
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
    <div key={lang} style={{ ...st("min-height:100vh; background:#f1f0ed; color:#17191d; font-family:var(--f-sans);"), ...accentVars(accent) }}>
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
            <button onClick={toggleLang} title="Language" className="k-press"
              style={st("flex-shrink:0; margin-left:2px; padding:4px 11px; border-radius:99px; border:.5px solid rgba(15,25,35,.12); background:rgba(255,255,255,.6); cursor:pointer; font-size:11.5px; font-weight:700; color:var(--acd); font-family:'Anek Bangla',sans-serif;")}>
              {lang === "en" ? "বাংলা" : "EN"}
            </button>
          </div>
        </div>
      </div>

      <div style={st("position:relative; z-index:1; padding:18px clamp(16px,4vw,40px) 130px;")}>
        {screen === "ask" && (
          <AskScreen
            form={form} patch={patch} archetypes={archetypes}
            metaStock={metaStock} onSubmit={runRecommend} matchCount={matchCount}
            step={askStep} totalSteps={ASK_STEPS} onNext={askNext} onBack={askBack}
          />
        )}
        {screen === "results" && (
          <ResultsScreen
            result={result} loading={recLoading} error={recError}
            form={form} matchCount={matchCount} ready={recReady} onLoaderDone={onLoaderDone}
            onEdit={goAsk} onPick={openDetail} onRetry={runRecommend}
          />
        )}
        {screen === "detail" && (
          <DetailScreen
            detail={detail} hint={pickHint} loading={detailLoading} error={detailError}
            budget={form.budget} onBack={goResults}
            onRetry={() => selectedId && openDetail(selectedId)}
          />
        )}
      </div>

      <Dock
        screen={screen} matchCount={matchCount} loading={recLoading}
        askStep={askStep} askLast={askStep === ASK_STEPS - 1}
        onAskNext={askNext} onAskBack={askBack} onSeeResults={runRecommend} onHome={goAsk}
      />
    </div>
  );
}
