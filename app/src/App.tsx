import { useCallback, useEffect, useRef, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { api, type Meta, type PhoneDetail, type Pick, type RecommendResp, type RecParams } from "./api";
import { st } from "./theme";
import { getLang, setLang, t, type Lang } from "./i18n";
import { anyFilterSet, buildBrief } from "./filters";
import { AskScreen } from "./components/AskScreen";
import { NarrowSheet } from "./components/NarrowSheet";
import { ResultsScreen } from "./components/ResultsScreen";
import { DetailScreen } from "./components/DetailScreen";
import { MethodScreen } from "./components/MethodScreen";
import { ResultsNotice } from "./components/ResultsNotice";
import { PriceAlert } from "./components/PriceAlert";
import { Dock } from "./components/Dock";
import { BootNotice, Breadcrumbs } from "./components/Chrome";
import { track } from "./track";
import { DEFAULT_FORM, formToQuery, queryToForm, toParams, type Form } from "./need";

export type Screen = "ask" | "results" | "detail" | "method";

export type { Form, QuizIntent } from "./need";
export { DEFAULT_FORM, CHOICE_LADDER, CHOICES, deriveIntent, toParams, formToQuery, queryToForm } from "./need";


export default function App() {
  const [lang, setLangState] = useState<Lang>(getLang());
  const toggleLang = () => { const n = lang === "en" ? "bn" : "en"; setLang(n); setLangState(n); };
  const [screen, setScreen] = useState<Screen>("ask");
  const [form, setForm] = useState<Form>(DEFAULT_FORM);
  const [meta, setMeta] = useState<Meta | null>(null);

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
  const pushNav = useCallback((s: Screen) => {
    window.history.pushState({ kpk: true, screen: s }, "");
  }, []);
  useEffect(() => {
    window.history.replaceState({ kpk: true, screen: "ask" }, "");
    const onPop = (e: PopStateEvent) => {
      const h = e.state as { kpk?: boolean; screen?: Screen } | null;
      if (!h?.kpk) return;
      setScreen(h.screen || "ask");
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const goBack = useCallback(() => window.history.back(), []);

  const patch = useCallback((d: Partial<Form>) => setForm((f) => ({ ...f, ...d })), []);

  // hydrate once from the URL, so a shared or reloaded brief comes back intact
  useEffect(() => {
    const q = window.location.search.slice(1);
    if (q) setForm((f) => ({ ...f, ...queryToForm(q) }));
  }, []);

  // mirror the form back into the URL. replaceState, NOT pushState: a keystroke
  // in the budget field must not become a history entry the buyer has to press
  // Back through forty times.
  useEffect(() => {
    const q = formToQuery(form);
    const next = q ? `${window.location.pathname}?${q}` : window.location.pathname;
    if (next !== window.location.pathname + window.location.search) {
      window.history.replaceState(window.history.state, "", next);
    }
  }, [form]);

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
    track("see_results", { budget: form.budget, quiz: !!(form.useCase || form.priorities.length) });
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
  }, [form]);

  /* The nudge. Fires ONCE, and only when a buyer commits without having set a
     single filter — the case where one tap would sharpen the pick a lot and
     they do not know the controls exist. `sheetSeen` flips before the sheet
     opens, so a buyer who dismisses it and immediately commits again goes
     straight through. */
  const [sheetSeen, setSheetSeen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const onSeeResults = useCallback(() => {
    if (!sheetSeen && !anyFilterSet(form)) {
      setSheetSeen(true);
      setSheetOpen(true);
      track("narrow_nudge", { shown: true });
      return;
    }
    runRecommend();
  }, [form, sheetSeen, runRecommend]);

  // the affirmative button does NOT rank — it closes the sheet and scrolls to
  // the filters. Only the brief bar spends a ranking call.
  const editJump = useCallback((id: string) => {
    setSheetOpen(false);
    document.getElementById("brief-" + id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

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

  const goAsk = () => { setScreen("ask"); pushNav("ask"); window.scrollTo({ top: 0 }); };
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
        <div className="k-glass" style={st("position:relative; width:100%; max-width:940px; display:flex; align-items:center; justify-content:space-between; gap:14px; padding:9px 11px 9px 18px; border-radius:var(--r); background:var(--hdr-bg); backdrop-filter:blur(18px) saturate(1.8); -webkit-backdrop-filter:blur(18px) saturate(1.8); border:0; border-bottom:1px solid rgba(var(--rgb-teal),.22); box-shadow:var(--hdr-sh);")}>
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
              style={st("display:inline-flex; align-items:center; justify-content:center; gap:6px; flex-shrink:0; min-height:44px; padding:8px 14px; border-radius:var(--r); border:none; cursor:pointer; background:var(--teal); box-shadow:0 4px 12px rgba(var(--rgb-ink),.14), inset 0 1px 0 rgba(var(--rgb-white),.35); font-size:13px; font-weight:700; color:var(--onp); font-family:'Anek Bangla',sans-serif;")}>
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
          <div style={st("max-width:940px; margin:0 auto;")}>
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
            form={form} patch={patch} meta={meta}
            metaStock={metaStock} matchCount={matchCount}
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
        brief={buildBrief(form)} detailReady={!!result}
        onSeeResults={onSeeResults} onEditJump={editJump} onHome={goAsk}
        onBackResults={goResults}
      />
      {sheetOpen && (
        <NarrowSheet matchCount={matchCount}
          onDismiss={() => setSheetOpen(false)}
          onNarrow={() => editJump("filters")} />
      )}
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
        <div style={st(`border-top:1px solid rgba(var(--rgb-white),.08); max-width:940px; margin:0 auto; padding:20px 0 ${screen === "method" ? 26 : 116}px; text-align:center; font-size:12.5px; color:var(--mut);`)}>
          © {new Date().getFullYear()} bhalophone. All rights reserved.
          {/* the trademark notice, quieter than the copyright above it and on
              its own line so it reads as a disclaimer rather than a byline.
              Same wording as pages.py TRADEMARK_NOTE — keep the two in step. */}
          <span style={st("display:block; max-width:660px; margin:7px auto 0; font-size:11.5px; line-height:1.55; color:var(--mut2); text-wrap:pretty;")}>{t("trademark_note")}</span>
        </div>
      </footer>

      <Analytics />
      <SpeedInsights />
    </div>
  );
}
