import { useCallback, useEffect, useRef, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { api, type Archetype, type Meta, type PhoneDetail, type Pick, type RecommendResp, type RecParams } from "./api";
import { accentVars, st, type Accent } from "./theme";
import { getLang, setLang, t, type Lang } from "./i18n";
import { AskScreen } from "./components/AskScreen";
import { ResultsScreen } from "./components/ResultsScreen";
import { DetailScreen } from "./components/DetailScreen";
import { MethodScreen } from "./components/MethodScreen";
import { ResultsNotice } from "./components/ResultsNotice";
import { PriceAlert } from "./components/PriceAlert";
import { Dock } from "./components/Dock";
import { track } from "./track";

export type Screen = "ask" | "results" | "detail" | "method";

/* Simple/Advanced mode (feedback #2): Simple keeps the ask flow to the
   essentials a first-time buyer can answer; Advanced unlocks every filter.
   The choice is per-visit on purpose — once picked, the other mode's controls
   never appear (no pressure to "upgrade"); reloading re-offers the gate. */
export type Mode = "simple" | "advanced";

export interface Form {
  budget: number;
  archetypes: string[];          // multi-select: the buyer can pick several needs
  platform: "any" | "android" | "ios";
  osStyle: "any" | "clean" | "feature";
  avoidChinese: boolean;         // hide China-HQ brands entirely (Xiaomi, Oppo…)
  officialOnly: boolean;         // only phones with an official-warranty listing
  excludeBrands: string[];
  traitText: string;
  // advanced mode (feedback #2/#7) — hardware dealbreakers + brand whitelist
  requireJack: boolean;
  requireIr: boolean;
  requireFm: boolean;
  socVendor: "any" | "snapdragon" | "mediatek";
  includeBrands: string[];       // only these brands (engine `brand` whitelist)
  hwStrict: boolean;             // unverified hardware also fails must-have filters
  regions: string[];             // accepted import markets (Rio-labeled offers only)
  requireRom: boolean;           // only phones with an official LineageOS build
  // Simple-mode quiz answers (feedback #4) — dynamically weighted, no buckets.
  // `me` is the branch question asked only when the buyer answers "for myself".
  q: { who: string; me: string; day: string[]; out: boolean | null; hw: string[] };
  useCase: string;               // EN sentence sent as use_case (embedded intent)
  priorities: string[];          // ordered axes derived from the quiz answers
}

const DEFAULT_FORM: Form = {
  budget: 95000, archetypes: [], platform: "any",
  osStyle: "any", avoidChinese: false, officialOnly: false,
  excludeBrands: [], traitText: "",
  requireJack: false, requireIr: false, requireFm: false,
  socVendor: "any", includeBrands: [], hwStrict: false, regions: [], requireRom: false,
  q: { who: "me", me: "", day: [], out: null, hw: [] },
  useCase: "", priorities: [],
};

/** Simple-mode quiz → dynamic intent (feedback #4 redesign). No archetype
    buckets: every answer adds weighted votes to the priority axes AND a plain
    sentence fragment. The sentence goes to the server as `use_case` (embedded
    verbatim and shown to the ranking LLM); the strongest axes ride along as
    `priorities`. Always English — the evidence cards it is matched against
    are English. Nothing answered = balanced (empty intent, server default). */
export interface QuizIntent { useCase: string; priorities: string[] }

const QUIZ_DAY_VOTES: Record<string, [string, number][]> = {
  photos: [["camera", 2]],
  games: [["gaming", 2], ["performance", 0.8]],
  reels: [["video", 2], ["camera", 0.8]],
  work: [["performance", 1.2], ["battery", 0.8]],
  chat: [["ease_of_use", 0.5], ["battery", 0.5]],
  watch: [["battery", 1], ["performance", 0.4]],
};
const QUIZ_DAY_TEXT: Record<string, string> = {
  photos: "takes lots of photos",
  games: "plays games seriously",
  reels: "shoots videos and reels for social media",
  work: "runs office and business apps all day",
  chat: "mostly calls, WhatsApp and Facebook",
  watch: "watches shows and videos for hours",
};

export function deriveIntent(q: Form["q"]): QuizIntent {
  const w: Record<string, number> = {};
  const add = (ax: string, v: number) => { w[ax] = (w[ax] || 0) + v; };
  const bits: string[] = [];
  if (q.who === "elder") {
    add("ease_of_use", 2.2); add("battery", 0.8);
    bits.push("for an older parent - must be simple and forgiving, loud clear sound, no ad spam");
  }
  if (q.who === "other") {
    add("ease_of_use", 0.6);
    bits.push("a gift for someone else - safe well-rounded choice that is easy to like");
  }
  if (q.who === "me" && q.me === "student") {
    add("performance", 0.8); add("battery", 0.8);
    bits.push("for a student - best value that stays good for years");
  }
  for (const d of q.day) for (const [ax, v] of QUIZ_DAY_VOTES[d] || []) add(ax, v);
  const dayBits = q.day.filter((d) => QUIZ_DAY_TEXT[d]).map((d) => QUIZ_DAY_TEXT[d]);
  if (dayBits.length) bits.push("day on the phone: " + dayBits.join(", "));
  if (q.out) {
    add("battery", 1.4);
    bits.push("outdoors most of the day - screen must stay readable in sunlight, battery must last");
  }
  const hwText: Record<string, string> = {
    jack: "wants a headphone jack for wired earphones",
    ir: "wants an IR blaster to control the TV or AC",
    fm: "wants FM radio that works without internet",
  };
  for (const h of q.hw) if (hwText[h]) bits.push(hwText[h]);
  const priorities = Object.keys(w).sort((a, b) => w[b] - w[a]).slice(0, 3);
  return { useCase: bits.join("; "), priorities };
}

/** form → /recommend query params */
export function toParams(f: Form, top = 5): RecParams {
  const p: RecParams = { budget: f.budget, top };
  // NL trait text takes over (server maps it to archetype/priorities/filters)
  if (f.traitText.trim()) {
    p.traits = f.traitText.trim();
  } else if (f.useCase || f.priorities.length) {
    // Simple quiz: dynamic intent — no archetype buckets (feedback #4)
    if (f.useCase) p.use_case = f.useCase;
    if (f.priorities.length) p.priorities = f.priorities.join(",");
  } else if (f.archetypes.length) {
    // multiple selected needs merge server-side (engine.resolve_intent)
    p.archetype = f.archetypes.join(",");
  }
  if (f.platform !== "any") p.platform = f.platform;
  if (f.osStyle !== "any") p.os_style = f.osStyle;
  if (f.avoidChinese) p.chinese = "exclude"; // brand-origin hard filter (engine)
  if (f.officialOnly) p.official_only = true;
  if (f.excludeBrands.length) p.exclude_brand = f.excludeBrands.join(",");
  if (f.requireJack) p.require_jack = true;
  if (f.requireIr) p.require_ir = true;
  if (f.requireFm) p.require_fm = true;
  if (f.socVendor !== "any") p.soc_vendor = f.socVendor;
  if (f.includeBrands.length) p.brand = f.includeBrands.join(",");
  if (f.hwStrict) p.hw_strict = true;
  if (f.regions.length) p.regions = f.regions.join(",");
  if (f.requireRom) p.require_custom_rom = true;
  return p;
}

export default function App() {
  const accent: Accent = "cobalt";
  const [lang, setLangState] = useState<Lang>(getLang());
  const toggleLang = () => { const n = lang === "en" ? "bn" : "en"; setLang(n); setLangState(n); };
  const [screen, setScreen] = useState<Screen>("ask");
  const [askStep, setAskStep] = useState(0); // wizard step on the ask screen
  const [form, setForm] = useState<Form>(DEFAULT_FORM);
  // switching to Simple resets the advanced-only fields so no invisible
  // filter keeps shaping results after the controls disappear
  const [mode, setMode] = useState<Mode>("simple");
  // every visit: ask Simple-or-Advanced before the wizard (feedback #2/#4).
  // Not persisted — a reload is the way to change modes (v2 decision #1).
  const [modeChosen, setModeChosen] = useState<boolean>(false);
  const changeMode = useCallback((m: Mode) => {
    track("mode_gate", { mode: m });
    setMode(m);
    setModeChosen(true);
    setForm((f) => m === "simple"
      ? {
        ...f, excludeBrands: [], osStyle: "any",
        requireJack: f.q.hw.includes("jack"), requireIr: f.q.hw.includes("ir"), requireFm: f.q.hw.includes("fm"),
        socVendor: "any", includeBrands: [], hwStrict: false, regions: [], requireRom: false,
        archetypes: [],               // quiz intent replaces the purpose cards
        ...deriveIntent(f.q),
      }
      // Advanced ranks by the purpose cards — drop the quiz intent so a stale
      // use_case cannot silently override the picked archetypes
      : { ...f, useCase: "", priorities: [] });
  }, []);
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
    api.meta().then(setMeta).catch(() => { });
    api.archetypes().then(setArchetypes).catch(() => { });
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

  // Client-generated UUID so the /status polling shows THIS request's provider
  // trail, not whatever finished last globally. Passed through to ResultsScreen
  // → RagProgress, and sent to /recommend so the backend stores the trail under it.
  const requestIdRef = useRef<string>("");

  const runRecommend = useCallback(async () => {
    const requestId = crypto.randomUUID();
    requestIdRef.current = requestId;
    track("see_results", { mode, budget: form.budget, quiz: !!(form.useCase || form.priorities.length) });
    const params: RecParams = { ...toParams(form, 5), request_id: requestId };
    lastRunKey.current = JSON.stringify(toParams(form, 5));
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
  }, [form, mode]);

  // RagProgress finished its completion beat -> reveal the results
  const onLoaderDone = useCallback(() => { setRecLoading(false); setRecReady(false); }, []);

  const openDetail = useCallback(async (id: string) => {
    setScreen("detail");
    setSelectedId(id);
    const rank = (result?.picks.findIndex((p) => p.id === id) ?? -1) + 1;
    track("result_click", { phone: id, rank: rank || null });
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
  const goMethod = () => { setScreen("method"); window.scrollTo({ top: 0 }); };

  // one-time "prices are a guide" notice when results first appear this session
  const [showNotice, setShowNotice] = useState(false);
  useEffect(() => {
    if (screen === "results" && result && !recLoading && !recError) {
      try { if (!sessionStorage.getItem("kpk_notice")) setShowNotice(true); } catch { /* ignore */ }
    }
  }, [screen, result, recLoading, recError]);
  const dismissNotice = useCallback(() => {
    setShowNotice(false);
    try { sessionStorage.setItem("kpk_notice", "1"); } catch { /* ignore */ }
  }, []);

  // attention popup (+ sound) about shop-website vs in-store prices, the first
  // time a phone's detail is opened this session
  const [showPriceAlert, setShowPriceAlert] = useState(false);
  useEffect(() => {
    if (screen === "detail") {
      try { if (!sessionStorage.getItem("kpk_pricealert")) setShowPriceAlert(true); } catch { /* ignore */ }
    }
  }, [screen, selectedId]);
  const dismissPriceAlert = useCallback(() => {
    setShowPriceAlert(false);
    try { sessionStorage.setItem("kpk_pricealert", "1"); } catch { /* ignore */ }
  }, []);

  const metaStock = meta ? String(meta.in_stock) : "—";
  // knowledge-base freshness = the day we last scraped every BD shop
  const updatedLabel = (() => {
    if (!meta?.last_refresh) return "";
    const d = new Date(meta.last_refresh);
    if (isNaN(d.getTime())) return "";
    return `${t("updated_on")} ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
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
        <div style={st("position:relative; width:100%; max-width:1080px; display:flex; align-items:center; justify-content:space-between; gap:14px; padding:9px 11px 9px 18px; border-radius:21px; background:linear-gradient(180deg, rgba(255,255,255,.72), rgba(250,251,253,.5)); backdrop-filter:blur(28px) saturate(190%); -webkit-backdrop-filter:blur(28px) saturate(190%); border:.5px solid rgba(255,255,255,.85); box-shadow:inset 0 1px 1px rgba(255,255,255,.95), inset 0 -1px 1px rgba(255,255,255,.3), 0 12px 34px rgba(20,24,32,.1);")}>
          {/* thin accent sheen along the top edge */}
          <span style={st("position:absolute; left:18px; right:18px; top:0; height:1px; border-radius:99px; background:linear-gradient(90deg, transparent, var(--acsoft2), transparent); pointer-events:none;")} />

          {/* LEFT: logo + tagline */}
          <div style={st("display:flex; align-items:center; gap:13px; min-width:0;")}>
            {/* brand links to the static SEO homepage; the app itself lives at /pick */}
            <a href="/" style={st("display:flex; align-items:center; gap:13px; text-decoration:none; flex-shrink:0;")}>
              <img src="/android-chrome-192x192.png" alt="bhalophone" style={st("height:34px; width:34px; display:block; flex-shrink:0; border-radius:9px;")} />
              <span style={st("font-family:var(--f-display); font-size:20px; font-weight:800; letter-spacing:-.4px; color:#171d25; white-space:nowrap;")}>bhalophone</span>
            </a>
            <span style={st("display:block; width:1px; height:24px; background:rgba(15,25,35,.1); flex-shrink:0;")} className="khdiv" />
            <div style={st("display:flex; flex-direction:column; min-width:0;")} className="khtag">
              <span style={st("font-family:var(--f-bn); font-size:13.5px; font-weight:600; color:#3a3f46; line-height:1.15; white-space:nowrap;")}>{t("brand_tagline")}</span>
              {updatedLabel && <span style={st("font-size:11.5px; color:#9a9da4; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;")}>{updatedLabel}</span>}
            </div>
          </div>

          {/* RIGHT: live phone-count badge + language toggle */}
          <div style={st("display:flex; align-items:center; gap:9px; flex-shrink:0;")}>
            {meta
              ? <span className="khstock" style={st("display:inline-flex; align-items:center; gap:8px; padding:7px 13px; border-radius:14px; background:var(--acsoft); border:.5px solid var(--acsoft2);")}>
                  <span className="k-live" style={st("width:8px; height:8px; border-radius:50%; background:var(--ac); flex-shrink:0;")} />
                  <span style={st("font-size:13px; font-weight:700; color:var(--acd); white-space:nowrap;")}>{metaStock} <span style={st("font-weight:600; color:#6b7280;")}>{t("in_stock")}</span></span>
                </span>
              : <span className="khstock" style={st("display:inline-flex; align-items:center; gap:7px; padding:7px 13px; border-radius:14px; background:rgba(15,25,35,.04); color:#84878f;")}>
                  <span style={st("width:12px; height:12px; border-radius:99px; border:2px solid rgba(15,25,35,.16); border-top-color:var(--ac); animation:kspin .7s linear infinite;")} />
                  <span style={st("font-size:12.5px; font-weight:600; white-space:nowrap;")}>{t("prices_loading")}</span>
                </span>}
            <button onClick={toggleLang} title="Language / ভাষা" aria-label="Toggle language" className="k-press k-glow"
              style={st("display:inline-flex; align-items:center; gap:6px; flex-shrink:0; padding:8px 14px; border-radius:14px; border:none; cursor:pointer; background:linear-gradient(180deg,var(--acg1),var(--acg2)); box-shadow:0 4px 12px var(--acglow), inset 0 1px 0 rgba(255,255,255,.35); font-size:13px; font-weight:700; color:#fff; font-family:'Anek Bangla',sans-serif;")}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#fff" strokeWidth="1.7" /><path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18" stroke="#fff" strokeWidth="1.5" /></svg>
              {lang === "en" ? "বাংলা" : "EN"}
            </button>
          </div>
        </div>
      </div>

      <div style={st("position:relative; z-index:1; padding:18px clamp(16px,4vw,40px) 130px;")}>
        {screen === "ask" && (
          <AskScreen
            form={form} patch={patch} archetypes={archetypes} meta={meta}
            mode={mode} onMode={changeMode} modeChosen={modeChosen}
            metaStock={metaStock} onSubmit={runRecommend} matchCount={matchCount}
            step={askStep} totalSteps={ASK_STEPS} onNext={askNext} onBack={askBack}
          />
        )}
        {screen === "results" && (
          <ResultsScreen
            result={result} loading={recLoading} error={recError}
            form={form} matchCount={matchCount} ready={recReady} onLoaderDone={onLoaderDone}
            onEdit={goAsk} onPick={openDetail} onRetry={runRecommend} onHowItWorks={goMethod}
            requestId={requestIdRef.current}
          />
        )}
        {screen === "detail" && (
          <DetailScreen
            detail={detail} hint={pickHint} loading={detailLoading} error={detailError}
            budget={form.budget} onBack={goResults}
            onRetry={() => selectedId && openDetail(selectedId)}
          />
        )}
        {screen === "method" && <MethodScreen onBack={goResults} />}
      </div>

      <Dock
        screen={screen} matchCount={matchCount} loading={recLoading}
        askStep={askStep} askLast={askStep === ASK_STEPS - 1}
        quizActive={screen === "ask" && modeChosen && mode === "simple" && askStep === 1}
        detailReady={!!result}
        onAskNext={askNext} onAskBack={askBack} onSeeResults={runRecommend} onHome={goAsk}
        onBackResults={goResults}
      />
      {showNotice && screen === "results" && <ResultsNotice onClose={dismissNotice} />}
      {showPriceAlert && screen === "detail" && <PriceAlert onClose={dismissPriceAlert} />}

      {/* page footer */}
      <div style={st("position:relative; z-index:1; padding:20px 24px 96px; text-align:center;")}>
        <a href="https://arkanullah.pro.bd" target="_blank" rel="noopener noreferrer"
          style={st("display:inline-flex; align-items:center; gap:10px; font-size:13px; font-weight:700; color:var(--acd); text-decoration:none; padding:10px 22px; border-radius:99px; background:rgba(255,255,255,.82); border:.5px solid var(--acsoft2); backdrop-filter:blur(10px); box-shadow:0 2px 12px rgba(15,25,35,.07);")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2a10 10 0 100 20A10 10 0 0012 2zM2 12h20M12 2c-3 3.5-3 15.5 0 20M12 2c3 3.5 3 15.5 0 20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          <span>Made by <b>Arkanullah Saad</b> · <span style={st("text-decoration:underline; text-underline-offset:3px;")}>see my portfolio ↗</span></span>
        </a>
        <div style={st("margin-top:14px; font-size:13px; color:#6b7280;")}>
          <a href="/best/" style={st("color:inherit; text-decoration:underline; text-underline-offset:3px;")}>{t("footer_guides")}</a>
          {" · "}
          <a href="/support" style={st("color:inherit; text-decoration:underline; text-underline-offset:3px;")}>{t("footer_support")}</a>
        </div>
      </div>

      <Analytics />
      <SpeedInsights />
    </div>
  );
}
