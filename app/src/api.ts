/* Thin client over the FastAPI backend. In dev, requests go to /api/* and Vite
   proxies them to the API server (see vite.config.ts). Override the base with
   VITE_API_BASE for production builds. */

const BASE = (import.meta as any).env?.VITE_API_BASE ?? "/api";

async function get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const url = new URL(BASE + path, window.location.origin);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === "" || v === false) continue;
      url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    let detail = res.statusText;
    try { detail = (await res.json()).detail ?? detail; } catch { /* ignore */ }
    throw new Error(detail || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/* ---------- response types (loose; only fields the UI reads) ---------- */

export type Scores = Partial<Record<string, number | null>>;

export interface Strength { axis: string; score: number; }
export interface Caveat { id?: string; text: string; sev?: string; }
export interface AiVerdict {
  value_rating?: number; recommendation?: "buy" | "consider" | "avoid";
  verdict?: string; best_for?: string[]; confidence?: number;
}
export interface CostOfOwnership {
  support_years?: number; remaining_years?: number; cost_per_year?: number;
}

export interface Connectivity {
  has_ir_blaster: boolean | null;
  has_fm_radio: boolean | null;
  has_headphone_jack: boolean | null;
}

/** Thin/stale listing-data flag (feedback #5). The UI badges medium/high only. */
export interface DataCaution {
  level: "high" | "medium" | "low";
  reason: string;
}

export interface VariantSaving {
  variant: string; official: number; unofficial: number; pct: number;
}

/** GadgetGear (GadgetAndGear) listing — the one BD shop we treat as a
    confirmed-official channel. Present only when GNG actually carries the phone. */
export interface OfficialRef { price: number; url?: string | null; }

/** Deterministic upgrade read of a pick vs the buyer's current phone. */
export interface UpgradeRow { label: string; dir: "up" | "down" | "same"; from: string; to: string; fromN?: number; toN?: number; }
export interface Upgrade {
  verdict: "upgrade" | "sidegrade" | "downgrade";
  rows: UpgradeRow[]; ups: number; downs: number; current_name: string;
  experimental?: boolean;
}
/** The buyer's current phone, resolved from our DB, live GSMArena specs, or GadgetGear. */
export interface CompareFrom {
  name: string; found: boolean; source?: string; experimental?: boolean;
  price?: number | null; image?: string | null; url?: string | null;
}

/** Per-channel sellers + in-stock price range (backend engine.channel_summary):
    the ONE source the card range, chips and listings sections all render from. */
export interface ChannelSide { lo: number; hi: number; sellers: number; in_stock: number; }
export interface Channels { official?: ChannelSide | null; unofficial?: ChannelSide | null; }

/** ONE spec derivation for the whole product (backend core.specfmt): the same
    strings the /best guides, the /vs tables and the /phone/ pages render. The
    app used to label and format the raw `specs` dict itself, so the picker and
    the pages described the same phone differently (owner 2026-07-26). */
export interface SpecRow { label: string; value: string; icon: string; }
/** The compact five a CARD carries, same wording as the full rows. */
export interface SpecTile { icon: string; value: string; }
/** Import market a shop actually names and has in stock, cheapest first. */
export interface RegionOffer { code: string; name: string; price: number; }
/** A RAM/storage config the shops price, cheapest first.

    Backend `specfmt.variant_options` — the SAME derivation the static /phone/
    pages render, so the configure screen and the page can never describe one
    configuration differently. Everything here is what a shop published for
    that exact SKU, never for the model as a whole. */
export interface StockBucket {
  price: number | null; price_high: number | null;
  colors: string[]; regions: RegionOffer2[];
  /** null = NOBODY reported stock, which is not the same as sold out */
  in_stock: boolean | null;
  /** shop COUNT, never names — this surface is shop-anonymous */
  shops: number;
  /** only ever a figure a shop actually published */
  units: number | null;
}
/** market a shop named for this configuration (no price of its own here) */
export interface RegionOffer2 { code: string; name: string; }
/** One channel of one configuration. An official unit and a gray import are
    different products — different warranty, different price, often different
    colours in stock — so they never share a row. `sim` splits it further: an
    eSIM unit is cheaper and, for a buyer whose operator issues none, unusable. */
export interface VariantChannel extends StockBucket {
  channel: "official" | "unofficial" | "unstated" | string;
  sim: "physical" | "single" | "hybrid" | "esim" | null;
  label: string;
}
export interface VariantPrice extends StockBucket {
  variant: string;
  channels?: VariantChannel[];
}

export interface Pick {
  id: string; key?: string; brand: string; model: string; image?: string | null;
  best_price: number | null;
  channels?: Channels | null;
  spec_rows?: SpecRow[]; spec_strip?: SpecTile[];
  variants?: VariantPrice[]; regions?: RegionOffer[];
  /** price RANGE across in-stock sources in the shown price's channel —
      SP1 rule: never a lone lowest number. Shops stay anonymous. */
  price_low?: number | null; price_high?: number | null;
  /** true = shown price is from a kept-current source;
      false = secondary source, may be outdated (A3 authority). */
  best_price_primary?: boolean;
  /** the SHOWN price's own channel is official (BD warranty) */
  best_price_official?: boolean;
  best_official_price: number | null; best_unofficial_price: number | null;
  best_official_variant?: string | null; best_unofficial_variant?: string | null;
  same_variant_saving?: VariantSaving | null;
  in_stock_shops?: number; age_years?: number;
  data_caution?: DataCaution | null;
  overall_score?: number;
  confidence?: "high" | "medium" | "low" | string;
  score_gap?: number;
  headline_axis: string | null; headline_value: number | null;
  strengths: Strength[];
  blended_scores: Scores;
  score_reasons?: Record<string, string[]>;
  cost_of_ownership?: CostOfOwnership;
  archetype_notes?: string[];
  delta?: { verdict: string; text: string } | null;
  opinion?: string | null;
  verdict?: AiVerdict | null;
  smart_verdict?: string | null;
  strength_notes?: string[];
  caveats_to_show?: string[];
  variant_hint?: string | null;
  caveats?: Caveat[] | null;
  superseded_by?: unknown;
  preorder_deal?: unknown;
  niche?: boolean;
  upgrade?: Upgrade | null;
}

export interface Stretch {
  key?: string; brand: string; model: string; image?: string | null; best_price: number;
  over_budget_by: number; score?: number; strengths?: Strength[];
  headline_axis: string | null; headline_value?: number | null; reason: string;
}

export interface RecommendResp {
  meta: {
    budget: number; label: string; archetype: string | null;
    archetype_blurb: string | null; candidates: number; relaxed: boolean;
    comparing_to: string | null; compare_from?: CompareFrom | null; disclaimer: string;
    mapped_from_traits?: string;
    pick_logic?: string;
    ranking?: string;
    requested?: boolean;
    cached?: boolean;
    request_id?: string | null;
  };
  top_reasoning: string[] | null;
  picks: Pick[];
  stretch: Stretch | null;
}

export interface Archetype { key: string; label: string; why: string | null; blurb: string | null; }

export interface Meta {
  last_refresh: string; total_phones: number; living_phones: number;
  with_specs: number; in_stock: number;
  llm_rated?: number; with_cards?: number; embedded?: number;
}

export interface Offer {
  shop: string; price: number;
  /** source's channel claim: "official" | "unofficial" | null (undisclosed) */
  official?: string | null;
  official_final?: string; in_stock?: boolean | null; url?: string | null;
  /** shop's price is kept reasonably current (Rio/GadgetGear/Pickaboo) */
  price_primary?: boolean;
  image?: string | null; variant?: string | null;
  /** import market (IN/CN/US/JP/SG/AU/Global) — only Rio-pricelist offers carry it */
  region?: string | null;
}

export interface OpinionProfile {
  llm_summary?: string | null; praise_flags?: string[]; complaint_flags?: string[];
  standout_praise?: string[]; best_for?: string[]; avoid_if?: string[];
  aspects?: Record<string, { quotes?: string[]; summary?: string }>;
}

/** One shop's listing, as `core.specfmt.listing_view` derives it. The static
    /phone/ page renders the same records, so the app and the SEO page can no
    longer disagree about who is cheapest or what a listing is. */
export interface Listing {
  shop: string; name: string; initials: string;
  /** absolute URL of the shop's self-hosted brand mark; null = use initials */
  logo: string | null;
  /** that mark's own colour as "R,G,B", which accents the hero band */
  accent: string | null;
  /** the mark to use on the near-black hero band — often a knocked-out or
      inverted variant of `logo`. null = nothing readable there, use `initials` */
  logo_dark: string | null;
  /** null when we will not do maths on it (missing, or flagged implausible) */
  price: number | null;
  /** what the shop actually publishes, shown even where `price` is null */
  shown_price: number | null;
  suspect: boolean;
  stock: "in" | "out" | "unknown";
  channel: "official" | "unofficial" | "unstated" | string;
  channel_word: string;
  variant: string | null; sim: string | null;
  region: string | null; region_name: string | null;
  colors: { name: string; hex: string[] }[];
  /** filter keys, shared with the static page's data-attributes */
  cfg: string; color_ids: string[]; region_id: string;
}
export interface ListingAxis {
  key: "stock" | "chan" | "region" | "cfg" | "color" | string;
  title: string; hint: string; primary: boolean;
  options: { value: string; label: string; hex?: string[] }[];
}
export interface ListingView {
  listings: Listing[];
  axes: ListingAxis[];
  /** what the BD warranty costs where both channels sell the same config */
  premium: { variant: string; diff: number } | null;
  shops: number;
}

export interface PhoneDetail {
  id: string; key?: string; brand: string; model: string; image?: string | null;
  best_price: number | null; best_price_shop?: string;
  price_low?: number | null; price_high?: number | null;
  channels?: Channels | null;
  best_price_official?: boolean;
  best_price_primary?: boolean;
  best_official_price: number | null; best_unofficial_price: number | null;
  best_official_variant?: string | null; best_unofficial_variant?: string | null;
  same_variant_saving?: VariantSaving | null;
  official_ref?: OfficialRef | null;
  official_status?: string; in_stock_shops?: number; age_years?: number;
  data_caution?: DataCaution | null;
  tags?: string[];
  /** the shared spec sheet — render these, not `specs`, which stays raw */
  spec_rows?: SpecRow[]; spec_strip?: SpecTile[]; regions?: RegionOffer[];
  /** every configuration with its own colours, markets and stock */
  variants?: VariantPrice[];
  /** the whole GSMArena table, grouped as /phone/* and /vs folds it away */
  spec_sheet?: { title: string; rows: { label: string; value: string }[] }[];
  spec_source?: string | null;
  specs?: Record<string, any>;
  connectivity?: Connectivity | null;
  blended_scores?: Scores; scores?: Scores;
  score_reasons?: Record<string, string[]>;
  traits?: Record<string, any>;
  opinion_profile?: OpinionProfile | null;
  caveats?: Caveat[] | null;
  ai_verdict?: AiVerdict | null;
  cost_of_ownership?: CostOfOwnership;
  os_summary?: { os_name?: string; update_years?: string; bloat_ads?: string } | null;
  brand_summary?: { bd_service?: number; update_record?: number; resale?: number } | null;
  offers?: Offer[];
  /** every shop listing, named, plus the axes to narrow them by */
  listings?: ListingView | null;
  flags?: string[];
  price_history?: { date: string; best_price: number; official: number | null; unofficial: number | null; in_stock_shops: number }[];
  price_trend?: { trend: "up" | "down" | "flat" | "new"; delta: number } | null;
}

export interface BrowseCard {
  id: string; brand: string; model: string;
  best_price: number | null; best_official_price: number | null;
  best_unofficial_price: number | null; in_stock_shops?: number;
  age_years?: number; blended_scores?: Scores;
  verdict?: string | null; tags?: string[];
}
export interface BrowseResp { total: number; limit: number; offset: number; items: BrowseCard[]; }

/** /count — structured pre-filter only (no LLM); powers the live match badge */
export interface CountResp { candidates: number; relaxed: boolean; }

export interface FeedbackPayload {
  rating: "up" | "down";
  comment?: string;
  budget: number;
  archetype: string;
  picks: string[];
}

/* ---------- recommend params ---------- */
export interface RecParams {
  budget: number;
  archetype?: string;
  priorities?: string;
  /** free-text buyer situation from the Simple quiz — embedded as the intent */
  use_case?: string;
  /** The forced-choice quiz's own weight vector, "axis:weight,axis:weight".
      Sent INSTEAD of `priorities`: an ordered list of names makes the server
      invent magnitudes back from rank order, which is what flattened the
      quiz's signal before. Unknown axes are dropped and values clamped
      server-side. */
  weights?: string;
  current_phone?: string;
  official_only?: boolean;
  include_cn?: boolean;
  /** "only" | "exclude" — brand-origin filter: brands headquartered in China */
  chinese?: string;
  /** comma list — only these brands */
  brand?: string;
  exclude_brand?: string;
  /** hardware dealbreakers — unverified phones still pass unless hw_strict */
  require_jack?: boolean;
  require_ir?: boolean;
  require_fm?: boolean;
  /** qualcomm | mediatek | ... (snapdragon/dimensity aliases accepted) */
  soc_vendor?: string;
  hw_strict?: boolean;
  /** comma list of accepted import markets — strict, Rio-labeled offers only */
  regions?: string;
  /** only phones with an official LineageOS build */
  require_custom_rom?: boolean;
  /** spec-level RAM/storage floor in GB; ANY variant satisfying it passes */
  min_ram?: number;
  min_storage?: number;
  os_style?: string;
  platform?: string;
  channel?: string;
  traits?: string;
  top?: number;
  /** Client-generated UUID for per-request provider tracking in the /status poll */
  request_id?: string;
}


export interface QueueStatus {
  processing: number;
  waiting: number;
  /** Which provider answered the last completed request */
  used?: string | null;
  /** The provider currently being tried for THIS request (per-request trail) */
  current_attempt?: string | null;
  /** Providers currently handling a request right now (system-wide) */
  active?: string[];
  /** Every provider tried in order (including the one that succeeded) */
  attempts?: string[];
  /** Providers that returned a 429 rate-limit error */
  rate_limited?: string[];
  /** Providers skipped because their circuit breaker was still open */
  skipped?: string[];
  /** Providers currently in circuit-breaker cooldown with reason + seconds left */
  breaker?: Record<string, { reason: string; cooldown_s: number }>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const url = new URL(BASE + path, window.location.origin);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = res.statusText;
    try { detail = (await res.json()).detail ?? detail; } catch { /* ignore */ }
    throw new Error(detail || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  meta: () => get<Meta>("/meta"),
  status: (request_id?: string) =>
    request_id ? get<QueueStatus>("/status", { request_id }) : get<QueueStatus>("/status"),
  archetypes: () => get<Archetype[]>("/archetypes"),
  recommend: (p: RecParams) => get<RecommendResp>("/recommend", p as any),
  count: (p: RecParams) => get<CountResp>("/count", p as any),
  cheapest: (brand: string, official_only = false) =>
    get<{ price: number | null }>("/cheapest", { brand, official_only } as any),
  phone: (id: string) => get<PhoneDetail>("/phones/" + id.split("/").map(encodeURIComponent).join("/")),
  phoneImage: (id: string) => get<{ url: string | null }>("/phone-image/" + id.split("/").map(encodeURIComponent).join("/")),
  browse: (p: { q?: string; brand?: string; min_price?: number; max_price?: number; in_stock?: boolean; limit?: number; offset?: number }) =>
    get<BrowseResp>("/phones", p as any),
  feedback: (p: FeedbackPayload) => post<{ ok: boolean }>("/feedback", p),
};
