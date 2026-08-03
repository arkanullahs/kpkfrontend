import { useCallback, useEffect, useRef, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { api, type Archetype, type Meta, type PhoneDetail, type Pick, type RecommendResp, type RecParams } from "./api";
import { st } from "./theme";
import { getLang, setLang, t, type Lang } from "./i18n";
import { AskScreen } from "./components/AskScreen";
import { ResultsScreen } from "./components/ResultsScreen";
import { DetailScreen } from "./components/DetailScreen";
import { MethodScreen } from "./components/MethodScreen";
import { ResultsNotice } from "./components/ResultsNotice";
import { PriceAlert } from "./components/PriceAlert";
import { Dock } from "./components/Dock";
import { BootNotice, Breadcrumbs } from "./components/Chrome";
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

  // one-time loads. /meta is also the wake-up probe: the API sleeps on the
  // free tier, so a failure here means "cold", not "broken" — keep asking and
  // tell the buyer what is happening instead of showing a dead header
  // (owner 2026-07-26).
  const [bootSecs, setBootSecs] = useState(0);
  useEffect(() => {
    let stop = false;
    const t0 = Date.now();
    const tick = window.setInterval(
      () => setBootSecs(Math.round((Date.now() - t0) / 1000)), 1000);
    const load = () => {
      api.meta().then((m) => { if (!stop) { setMeta(m); window.clearInterval(tick); } })
        .catch(() => { if (!stop) window.setTimeout(load, 2500); });
    };
    load();
    api.archetypes().then(setArchetypes).catch(() => { });
    return () => { stop = true; window.clearInterval(tick); };
  }, []);
  // only after a beat: a warm server answers in ~200ms and must never flash it
  const booting = !meta && bootSecs >= 2;

  /* ---- browser back ----
     The app is one URL with four screens, so the back button used to leave the
     site from the results page (owner 2026-07-26). Every forward move pushes a
     history entry; every back control calls history.back(), so the button and
     the on-screen "Back" do the same thing. A popstate with no state of ours
     is a real exit — we let it through. */
  const pushNav = useCallback((s: Screen, step = 0) => {
    window.history.pushState({ kpk: true, screen: s, askStep: step }, "");
  }, []);
  useEffect(() => {
    window.history.replaceState({ kpk: true, screen: "ask", askStep: 0 }, "");
    const onPop = (e: PopStateEvent) => {
      const h = e.state as { kpk?: boolean; screen?: Screen; askStep?: number } | null;
      if (!h?.kpk) return;
      setScreen(h.screen || "ask");
      setAskStep(h.askStep ?? 0);
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const goBack = useCallback(() => window.history.back(), []);

  const patch = useCallback((d: Partial<Form>) => setForm((f) => ({ ...f, ...d })), []);

  // 3-step ask wizard (budget → purpose → fine-tune). Stepping the query makes
  // giving the answer feel as considered as the answer we work for, so the RAG
  // wait reads as care rather than a fast-in / slow-out mismatch. (The old
  // official/unofficial step is gone — those flags proved too unreliable to ask
  // buyers to choose on.)
  const ASK_STEPS = 3;
  const askNext = useCallback(() => setAskStep((s) => {
    const n = Math.min(s + 1, ASK_STEPS - 1);
    if (n !== s) window.history.pushState({ kpk: true, screen: "ask", askStep: n }, "");
    return n;
  }), []);
  const askBack = useCallback(() => window.history.back(), []);

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
    pushNav("results");
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
    pushNav("detail");
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

  const goAsk = () => { setScreen("ask"); setAskStep(0); pushNav("ask", 0); window.scrollTo({ top: 0 }); };
  // "back to results" from a detail/method screen IS a back navigation — going
  // through history keeps the browser button and this button in step
  const goResults = () => goBack();
  const goMethod = () => { setScreen("method"); pushNav("method"); window.scrollTo({ top: 0 }); };

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
    <div key={lang} style={st("min-height:100vh; background:var(--bg); color:var(--ink); font-family:var(--f-sans);")}>

      {/* glass header */}
      <div style={st("position:sticky; top:0; z-index:60; display:flex; justify-content:center; padding:14px clamp(16px,4vw,40px) 6px;")}>
        <div className="k-glass" style={st("position:relative; width:100%; max-width:1080px; display:flex; align-items:center; justify-content:space-between; gap:14px; padding:9px 11px 9px 18px; border-radius:var(--r); background:var(--hdr-bg); backdrop-filter:blur(18px) saturate(1.8); -webkit-backdrop-filter:blur(18px) saturate(1.8); border:0; border-bottom:1px solid rgba(var(--rgb-teal),.22); box-shadow:var(--hdr-sh);")}>
          {/* chromatic dispersion along the edge -- the logo's own material */}
          <span style={st("position:absolute; left:0; right:0; bottom:-1px; height:1px; background:var(--prism); opacity:.55; pointer-events:none;")} />

          {/* LEFT: logo + tagline */}
          <div style={st("display:flex; align-items:center; gap:13px; min-width:0;")}>
            {/* brand links to the static SEO homepage; the app itself lives at /pick */}
            <a href="/" style={st("display:flex; align-items:center; gap:13px; text-decoration:none; flex-shrink:0;")}>
              <img src="/android-chrome-192x192.png" alt="bhalophone" style={st("height:34px; width:34px; display:block; flex-shrink:0; border-radius:var(--r);")} />
              <span style={st("font-family:var(--f-display); font-size:20px; font-weight:800; letter-spacing:-.4px; color:var(--ink); white-space:nowrap;")}>bhalophone</span>
            </a>
            <span style={st("display:block; width:1px; height:24px; background:rgba(var(--rgb-ink),.1); flex-shrink:0;")} className="khdiv" />
            {/* the site slogan is a full sentence, and it ran straight under
                the stock badge (owner 2026-07-26). It shrinks and clips now
                instead of overflowing, and it only appears when the bar is
                actually wide enough for it (.khtag media query). */}
            <div style={st("display:flex; flex-direction:column; min-width:0; flex:1 1 auto; overflow:hidden;")} className="khtag">
              <span style={st("font-family:var(--f-bn); font-size:13.5px; font-weight:600; color:var(--ink2); line-height:1.15; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;")}>{t("brand_tagline")}</span>
              {updatedLabel && <span style={st("font-size:11.5px; color:var(--mut2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;")}>{updatedLabel}</span>}
            </div>
          </div>

          {/* RIGHT: live phone-count badge + language toggle */}
          <div style={st("display:flex; align-items:center; gap:9px; flex-shrink:0; margin-left:auto;")}>
            {meta
              ? <span className="khstock" style={st("display:inline-flex; align-items:center; gap:8px; padding:7px 13px; border-radius:var(--r); background:var(--tint); border:.5px solid var(--tint2);")}>
                  <span className="k-live" style={st("width:8px; height:8px; border-radius:var(--r); background:var(--teal); flex-shrink:0;")} />
                  <span style={st("font-size:13px; font-weight:700; color:var(--lnk); white-space:nowrap;")}>{metaStock} <span style={st("font-weight:600; color:var(--mut);")}>{t("in_stock")}</span></span>
                </span>
              : <span className="khstock" style={st("display:inline-flex; align-items:center; gap:7px; padding:7px 13px; border-radius:var(--r); background:rgba(var(--rgb-ink),.04); color:var(--mut2);")}>
                  <span style={st("width:12px; height:12px; border-radius:var(--r); border:2px solid rgba(var(--rgb-ink),.16); border-top-color:var(--teal); animation:kspin .7s linear infinite;")} />
                  <span style={st("font-size:12.5px; font-weight:600; white-space:nowrap;")}>{t("prices_loading")}</span>
                </span>}
            <button onClick={toggleLang} title="Language / ভাষা" aria-label="Toggle language" className="k-press k-glow"
              style={st("display:inline-flex; align-items:center; gap:6px; flex-shrink:0; padding:8px 14px; border-radius:var(--r); border:none; cursor:pointer; background:var(--teal); box-shadow:0 4px 12px rgba(var(--rgb-ink),.14), inset 0 1px 0 rgba(var(--rgb-white),.35); font-size:13px; font-weight:700; color:var(--onp); font-family:'Anek Bangla',sans-serif;")}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="var(--card)" strokeWidth="1.7" /><path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18" stroke="var(--card)" strokeWidth="1.5" /></svg>
              {lang === "en" ? "বাংলা" : "EN"}
            </button>
          </div>
        </div>
      </div>

      <div style={st("position:relative; z-index:1; padding:18px clamp(16px,4vw,40px) 130px;")}>
        {/* one breadcrumb system with the static pages: Home > Personal pick >
            where you are (owner 2026-07-26). The ask screen is the root, so it
            carries none — same rule /best and /phone follow. */}
        {screen !== "ask" && (
          <div style={st("max-width:860px; margin:0 auto;")}>
            <Breadcrumbs trail={[
              { label: t("nav_pick"), onClick: goAsk },
              ...(screen === "results" ? [{ label: t("nav_results") }]
                : [{ label: t("nav_results"), onClick: goResults },
                   { label: screen === "detail" ? t("nav_detail") : t("results_how_t") }]),
            ]} />
          </div>
        )}
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
      {booting && <BootNotice seconds={bootSecs} />}

      {/* persistent site footer — dark, matches the static site (no picker card) */}
      <footer style={st("position:relative; z-index:1; margin-top:36px; background:var(--panel); border-radius:var(--r); padding:44px clamp(20px,5vw,52px) 0; text-align:left;")}>
        <div style={st("max-width:940px; margin:0 auto; display:flex; flex-wrap:wrap; gap:30px 40px; padding-bottom:32px;")}>
          <div style={st("flex:2 1 260px; min-width:220px;")}>
            <div style={st("display:flex; align-items:center; gap:11px; color:var(--onp); font-family:var(--f-display); font-size:22px; font-weight:800; letter-spacing:-.4px;")}>
              <img src="/android-chrome-192x192.png" alt="" style={st("width:46px; height:46px; border-radius:var(--r);")} />bhalophone
            </div>
            <p style={st("margin:15px 0 0; font-size:13px; line-height:1.65; color:var(--mut2);")}>{t("footer_tagline")}.</p>
          </div>
          <div style={st("flex:1 1 130px;")}>
            <div style={st("color:var(--rule); font-size:12px; font-weight:700; margin:0 0 14px;")}>Explore</div>
            <div style={st("display:flex; flex-direction:column; gap:11px;")}>
              <a href="/best/" style={st("color:var(--mut2); font-size:13.5px; text-decoration:none;")}>{t("footer_guides")}</a>
              <a href="/vs" style={st("color:var(--mut2); font-size:13.5px; text-decoration:none;")}>{t("footer_compare")}</a>
              <a href="/" style={st("color:var(--mut2); font-size:13.5px; text-decoration:none;")}>{t("footer_home")}</a>
            </div>
          </div>
          <div style={st("flex:1 1 130px;")}>
            <div style={st("color:var(--rule); font-size:12px; font-weight:700; margin:0 0 14px;")}>Social</div>
            <div style={st("display:flex; flex-direction:column; gap:11px;")}>
              <a href="https://www.facebook.com/bhalophone" rel="me" style={st("color:var(--mut2); font-size:13.5px; text-decoration:none;")}>Facebook</a>
            </div>
          </div>
          <div style={st("flex:1 1 130px;")}>
            <div style={st("color:var(--rule); font-size:12px; font-weight:700; margin:0 0 14px;")}>More</div>
            <div style={st("display:flex; flex-direction:column; gap:11px;")}>
              <a href="/support" style={st("color:var(--mut2); font-size:13.5px; text-decoration:none;")}>{t("footer_support")}</a>
              <a href="https://arkanullah.pro.bd" target="_blank" rel="noopener noreferrer" style={st("color:var(--mut2); font-size:13.5px; text-decoration:none;")}>Made by Arkanullah Saad ↗</a>
            </div>
          </div>
        </div>
        {/* the 96px well under the copyright was dock clearance, and it read as
            a dead black slab on every screen the dock is hidden on (owner
            2026-07-26). Clearance only when the dock is actually there. */}
        <div style={st(`border-top:1px solid rgba(var(--rgb-white),.08); max-width:940px; margin:0 auto; padding:20px 0 ${screen === "ask" && askStep === 0 ? 26 : 86}px; text-align:center; font-size:12.5px; color:var(--mut);`)}>© {new Date().getFullYear()} bhalophone. All rights reserved.</div>
      </footer>

      <Analytics />
      <SpeedInsights />
    </div>
  );
}
