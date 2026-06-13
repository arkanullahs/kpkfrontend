# আমার বাজেটে কোন ফোন? (Which phone fits my budget?) — Project Overview

*State as of 2026-06-12. Written as a self-contained briefing for reviewers with no prior context.*

## 1. What this is

A phone recommender for the Bangladesh market. A buyer enters a budget and priorities (camera / battery / gaming / "for my mother") and gets a ranked shortlist with live BD prices, where to buy, honest verdicts, and explicit caveats. Two design principles dominate:

1. **Closest-to-budget, not cheapest.** A ৳38k phone beats a ৳25k phone for a ৳40k budget when the specs justify the money. Users offered a budget; unused headroom is a wasted answer.
2. **Honesty over salesmanship.** Outdated overpriced phones get called out, gray-import warranty risk is always surfaced, China-ROM caveats are explicit, and every machine judgment is auditable and human-overridable.

BD market context baked in: "official" phones come through taxed, BTRC-registered channels with brand warranty (~30–35% duty); "unofficial" (gray) units are hand-carried imports, 15–35% cheaper, shop-warranty only. Most shops sell both without labeling. This official/unofficial distinction is a first-class field throughout.

## 2. Architecture

Strict two-loop separation:

```
PIPELINE (nightly cron, slow is fine)            REQUEST TIME (must be instant)
 9 shop scrapers ─┐                               user params
 GSMArena specs   ├─> normalize -> match ->        -> filter (budget band, stock,
 MobileDokan      │   score -> classify ->            smartphone, official-only…)
 editorial reviews│   verdict -> override          -> weighted scoring of
 owner opinions   │   -> enriched_phones.json         PRECOMPUTED fields
 YouTube + comments┘      (the database)           -> top-5 + reasons. No AI calls.
```

All AI/judgment work happens at pipeline time, cached permanently, keyed so that a weekly re-run only pays for *new phones and changed prices*. Request path is pure arithmetic over precomputed fields.

### Repo layout

```
KPK/
  scraper/     all pipeline + API code (Python)
  data/        VARIABLE, regenerated each refresh: combined_phones.json,
               enriched_phones.json, kpk.db, ANALYSIS.md, per-shop raw *_phones.json
  cache/       PERMANENT, offline-produced: gsmarena/opinion_llm/reviews/
               youtube/ai_official caches (uploaded to deploy box, read-only there)
  knowledge/   PERMANENT, curated: soc_db, os_db, brand_reliability,
               camera_knowledge, known_issues, archetypes, human_overrides
```
`scraper/paths.py` centralizes every path (`KPK_DATA` env var can point all
three dirs at a mounted volume on the deploy box; defaults to the repo root).

### Pipeline stages (each a standalone Python script, orchestrated by `pipeline.py`)

| Stage | Script | Function |
|---|---|---|
| 0 | 9 shop scrapers | Pickaboo, GadgetAndGear, ExcelTech, Gazi, SumashTech, Dazzle, AppleGadgets, Rio International, SMSGadget → raw JSON per shop (3,392 listings) |
| 1 | `combine.py` | Name normalization (brand detection w/ sub-brand priority, storage/color/region/promo-text stripping, 4G/5G unification, "Flip4"→"Flip 4"), cross-shop entity resolution → 1,167 canonical phones with per-shop offers |
| 2 | `gsmarena.py` | Spec scraping: search + fuzzy/token matching + spec-page parse (`data-spec` attrs). Rich camera fields: sensor size, telephoto zoom, aperture, OIS, nits. Permanent cache, polite rate (4s/req, GSMArena IP-bans aggressive crawlers) |
| 3 | `mobiledokan.py` | Secondary spec source (BD database) for local brands GSMArena lacks (Symphony, Walton, Benco, Helio). Slug-guessing instead of JS search |
| 4 | `enrich.py` | Merge specs; compute camera/battery/gaming/performance/ease scores from real hardware + knowledge bases; deterministic official/unofficial inference (explicit labels > authorized-shop prior > ±12% price clustering); stale-listing flags (old model + price ≫ current best) |
| 5 | `ai_classify.py` | LLM judges official/unofficial ONLY for offers with no deterministic anchor (~8%), using global-launch-price reasoning ("flagship at ৳133k can't be a taxed-channel price"). Verdict + confidence + one-line reason cached per (phone, shop, price) |
| 6 | `value_pass.py` | Availability score, ±15% price-band peer domination, caveats (CN-ROM per-brand, no-Google, unofficial-only, aging, known issues), pre-order deal detection, verdict per phone (template verdict assembled from facts; editorial cons appended), **human overrides applied last** |
| 7 | `review_scraper.py` | GSMArena owner opinions + editorial review pros/cons (lab-measured findings like "significant CPU throttling") |
| 8 | `youtube_scraper.py` | Review videos + view counts + top comments (incl. Bangla BD channels). Two engines: YouTube Data API (fast, 10k units/day ≈ 95 phones) and yt-dlp (quota-free, ~35s/phone). Brand-owned promo channels filtered |

Plus: `recommend.py` (CLI recommendation engine prototype), `review.py` (human verification CLI), `dashboard.py` (rich-TUI live status), `knowledge.py` (lookup layer), `llm.py` (Gemini primary / OpenRouter fallback with retry).

### Knowledge bases (AI-seeded once, human-verified, never regenerated after edit)

- `soc_db.json` — ~140 base SoCs: tier 1-10, sustained-gaming rating (throttle-aware: SD 888/8 Gen 1 marked hot), efficiency, AnTuTu approx, one-line notes. A normalizer maps marketing rebrands ("Helio G99 Ultimate" → `helio g99`; critically, Redmi ≠ Xiaomi so "Xiaomi 15"/"Redmi 15" never merge).
- `os_db.json` — per-brand ROM nuance incl. CN-vs-global splits (vivo: Funtouch global vs OriginOS CN with no Google/Bangla; OnePlus CN ships ColorOS; Huawei HarmonyOS NEXT can't run BD banking apps), update policy, ad/bloat level, Bangla support.
- `brand_reliability.json` — BD service-network reach, build reputation, update track record, resale value, known patterns (OnePlus green-line epidemic, Transsion's Carlcare ubiquity).
- `camera_knowledge.json` — DXOMark-informed line priors (vivo X Pro/Ultra = 10, Pixel Pro = 9.5, gaming phones = 6), blended 60/40 with hardware-derived score (sensor size, tele zoom, OIS).
- `known_issues.json` — widely-reported defects only (green-line AMOLEDs, Tensor modem drain, Redmi Note dead boards), explicit "no known issues" entries for the rest; strict anti-hallucination prompt (empty list beats invented issue).

### Human-in-the-loop

`review.py` walks the owner (who has strong phone knowledge) through 5 queues: AI channel calls, SoC sign-offs, issue lists, "avoid"/low-confidence verdicts, spec-match failures (paste correct GSMArena URL → fetches immediately). Decisions persist in `human_overrides.json` and verified-flags; they outrank every machine output on every future run.

## 3. Current coverage (live numbers)

- 1,167 canonical phones from 3,392 listings across 9 shops; 954 currently in stock somewhere
- Specs: 1,097 (94%) — GSMArena 1,048 + MobileDokan 49; 107 unresolved → human queue
- Official/unofficial: 3,178 of 3,342 offers resolved (95%); 262 AI-judged with stored reasoning
- Scores: 1,014 phones fully scored; verdicts on 946
- Reviews: 702 phones with owner opinions, 237 with editorial pros/cons (still crawling)
- YouTube: 275 phones with videos+comments (crawl ongoing, target ~920)
- Median unofficial-vs-official saving on same model: 23.5% — a headline product feature

## 4. Recommendation engine (prototype CLI)

`recommend.py --budget 95000 --priorities camera,performance`:
- Filter: smartphone, in range [0.55×, 1.12×] budget, in stock (or worthwhile pre-order), optional official-only / brand / CN-ROM toggles. Relaxed fallback with explicit labeling when zero exact matches.
- Score = 0.36·spec_match (priority-weighted axes) + 0.16·value_rating + 0.22·budget_proximity (peaks AT budget; under-spend penalized, over-spend penalized harder) + 0.13·availability + 0.13·recency + adjustments (dominated-in-band −1.2, major issue −1.5, CN-ROM −1.8 unless opted in).
- Output: ranked picks with strengths, official/unofficial prices, shop count, OS/update/service line, verdict with reviewer-measured flags, caveat warnings, confirm-price disclaimer.

Validation: the ৳95k camera query returns vivo X300 Pro at ৳95,999 (at-budget camera flagship), not a ৳62k performance midranger — the earlier failure mode.

## 5. Honest weaknesses (the improvement agenda)

1. **Verdict text is template-monotone.** "Chipset punches above its price class" appears everywhere. The evidence stack (specs, peers, editorial, owner opinions, YouTube comments) is collected but only shallowly fused into prose. Needs an LLM/human upgrade pass over the top ~300 phones.
2. **Review/comment data is raw, not distilled.** 702 phones of opinions + 275 of YouTube comments sit uncached into any `review_summary` field. Top-liked YouTube comments skew meme-heavy; needs keyword-weighted (battery/heating/ব্যাটারি/problem) extraction.
3. **Storage variants are folded into one model.** best_price = cheapest variant ("starts from"); a 512GB listing can inflate apparent price spread. Variant-level price comparison not yet built.
4. **Peer domination only sees spec axes.** Galaxy A07 gets "dominated by Honor Play 10" although One UI + 6-year updates + 10/10 service network arguably wins for non-technical buyers. Service/update/reliability should enter the domination math or at least veto it.
5. **4G/5G merge heuristic can mislabel** when a shop lists a 5G phone without the suffix and a 4G sibling exists.
6. **Price history not yet recorded** (single snapshot). Append-per-scrape table needed for "price dropped ৳3k" features and stale-detection improvement.
7. **Frontend not built yet** — `api.py` (FastAPI) + `kpk.db` (SQLite) are live and serve `/recommend`, `/phones`, `/phones/{id}`, `/price-history/{id}`, `/archetypes`, `/meta`. `mapper.py`'s `traits` free-text parameter handles Bangla NL input ("আম্মুর জন্য ১৫ হাজারে ফোন") server-side already — see §7 for the full API/data reference.
8. **Some CN-only models carry shop-claimed "official" labels** (e.g., Redmi K80 Ultra) — in the human review queue; could also be auto-flagged via a CN-only-line knowledge list.
9. **LLM dependency fragility**: free-tier Gemini quota collapses under bulk load (mitigated: permanent caching, template fallback, Claude-in-session seeding of knowledge bases, OpenRouter free-model fallback).
10. **Scrapers are HTML-fragile** by nature; per-shop breakage detection/alerting not yet built (a "listings dropped >30% vs last run" tripwire would catch most).

## 6. Constraints worth respecting in any redesign

- Request path must stay AI-free and instant; BD users on mobile data.
- Specs must come from scraped sources, never LLM memory (hallucinated mAh numbers poison trust).
- Every machine judgment needs stored reasoning + human override that survives re-runs.
- Weekly refresh must cost near-zero API calls (caching keyed by phone+price).
- GSMArena/YouTube crawls must stay polite (IP bans, quota cycles).

## 7. API & data reference (for frontend work)

`uvicorn api:app` from `scraper/`, then `GET /docs` for the live OpenAPI explorer / TS type generation. CORS is wide-open (`*`).

### Endpoints

- **`GET /recommend`** — the main screen. Params: `budget` (required), `archetype` (rider|vlogger|parents|gamer|student|photographer|professional|balanced), `priorities` (comma axes: camera,video,battery,gaming,performance,ease_of_use — used only if no archetype), `current_phone` (free text, for upgrade-delta), `official_only`, `include_cn`, `brand`/`exclude_brand` (comma lists), `os_style` (clean|feature), `chinese` (only|exclude), `platform` (ios|android), `channel` (official|unofficial), `traits` (free-text incl. Bangla — auto-maps to archetype/priorities/filters server-side), `top` (1-30).
  Returns `{meta, top_reasoning[], picks[], stretch}`. Each pick carries: id, brand, model, best_price(+shop+url), best_official_price, best_unofficial_price, in_stock_shops, age_years, overall_score, headline_axis/value, strengths[], blended_scores{}, score_reasons{}, cost_of_ownership{}, archetype_notes[], delta (vs current_phone), opinion (LLM summary), verdict (ai_verdict), smart_verdict, variant_hint, caveats[], superseded_by, preorder_deal, niche.
- **`GET /phones`** — browse/search. Params: `q`, `brand`, `min_price`, `max_price`, `in_stock`, `include_delisted`, `limit`, `offset`. Returns lightweight cards (id, brand, model, prices, in_stock_shops, age_years, blended_scores, verdict text, tags[]).
- **`GET /phones/{id}`** (`id` = `"Brand|key"`, e.g. `Samsung|galaxy a16`) — full record (everything below) + `price_history[]`.
- **`GET /price-history/{id}`** — `{id, history:[{date, best_price, official, unofficial, in_stock_shops}]}`. One row per refresh day; only appended while a phone is not delisted.
- **`GET /archetypes`** — `[{key, label, why, blurb}]` for the buyer-persona picker UI.
- **`GET /meta`** — `{last_refresh, total_phones, living_phones, with_specs, llm_rated, in_stock}` for a "data freshness" badge.
- **`POST /reload`** — ops only, reloads from `kpk.db` after a refresh.

### Full per-phone shape (`/phones/{id}`)

```
brand, model, key, official_status, best_price, best_price_shop, best_price_url,
best_official_price, best_unofficial_price, in_stock_shops, age_years, delisted,
availability_score, updated_at, tags[],
offers[]            — per-shop: shop, raw_name, variant, region, price, original_price,
                       in_stock, official, preorder, badges[], url, official_final, official_source
specs{}             — release_year, chipset, battery_mah, charging_w, display_inch,
                       display_type, refresh_hz, main_camera_mp, camera_count, has_ois,
                       weight_g, os, net_5g, source, match_score, url
traits{}            — ip_rating, water_resistant, peak_nits, curved_screen, glass_back,
                       stereo_speakers, headphone_jack, main_video_4k(60), selfie_4k,
                       selfie_mp, main_ois, gyro
scores{} / blended_scores{}  — camera, battery, gaming, performance, ease_of_use (0-10)
score_reasons{}     — per-axis list of one-line "why this score" strings
meta_scores{}       — value, longevity, reliability, availability, freshness, data_confidence
cost_of_ownership{} — support_years, remaining_years, cost_per_year
os_summary{}        — os_name, update_years, bloat_ads
brand_summary{}     — bd_service, update_record, resale (1-10 each)
opinion_profile{}   — source, ratings{} (per-axis owner/LLM rating), rating_basis,
                       rating_confidence, aspects{axis: {score, mentions, summary, quotes[]}},
                       complaint_flags[], praise_flags[], specific_issues[]
                       (issue, frequency, severity, evidence_quote), standout_praise[],
                       bd_notes[], best_for[], avoid_if[], llm_summary, confidence
caveats[]           — {id, text} e.g. cn_rom, issue_major, aging, weak_service
ai_verdict{}        — value_rating, recommendation (buy|consider|avoid), verdict text,
                       best_for[], confidence, source
peer_analysis{}     — band_size, dominated_by[]
flags[]             — e.g. "dominated_in_band", "superseded", "delisted", "niche"
preorder_deal       — set when a pre-order is flagged as a deal
price_history[]     — only on /phones/{id}, see above
```

### In the raw pipeline data but NOT in the API/db

`enriched_phones.json` (the pre-`build_db.py` file) has three fields `build_db.py` doesn't carry into `kpk.db`, so they're invisible to the API:
- **`shops`** — list of shop names this phone has any offer at (derivable from `offers[].shop`, but not deduplicated/precomputed for you).
- **`shop_count`** — `len(shops)` (derivable: count distinct `offers[].shop`).
- **`is_feature_phone`** — redundant with the `"feature_phone"` tag in `tags[]`.

Everything else in `enriched_phones.json` is in the API. Knowledge-base files (`soc_db.json`, `os_db.json`, `brand_reliability.json`, `camera_knowledge.json`, `known_issues.json`) are **inputs** already baked into `scores`/`os_summary`/`brand_summary`/`caveats` — not separately queryable, and shouldn't need to be for the frontend.

`data/ANALYSIS.md` is a market-wide text report (top buyable phones, price spread, brand counts) generated by `combine.py` — useful for an internal/ops dashboard, not currently exposed via any endpoint. If the frontend wants a "market overview" page, that'd need a small new endpoint (the underlying numbers are easy to recompute from `/phones` + `/meta`, or `ANALYSIS.md` could be served as static text).

If the frontend needs `shops`/`shop_count` directly (e.g. "available at 5 shops" badge), cheapest fix: add them to `SCALAR_COLS`/derive in `_card()` — both are one-line additions to `store.py`/`api.py`, not a pipeline change.
