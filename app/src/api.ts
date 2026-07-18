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

export interface Pick {
  id: string; key?: string; brand: string; model: string; image?: string | null;
  best_price: number | null;
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
  shop: string; price: number; official?: boolean | null;
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

export interface PhoneDetail {
  id: string; key?: string; brand: string; model: string; image?: string | null;
  best_price: number | null; best_price_shop?: string;
  price_low?: number | null; price_high?: number | null;
  best_price_official?: boolean;
  best_price_primary?: boolean;
  best_official_price: number | null; best_unofficial_price: number | null;
  best_official_variant?: string | null; best_unofficial_variant?: string | null;
  same_variant_saving?: VariantSaving | null;
  official_ref?: OfficialRef | null;
  official_status?: string; in_stock_shops?: number; age_years?: number;
  data_caution?: DataCaution | null;
  tags?: string[];
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
  phone: (id: string) => get<PhoneDetail>("/phones/" + id.split("/").map(encodeURIComponent).join("/")),
  phoneImage: (id: string) => get<{ url: string | null }>("/phone-image/" + id.split("/").map(encodeURIComponent).join("/")),
  browse: (p: { q?: string; brand?: string; min_price?: number; max_price?: number; in_stock?: boolean; limit?: number; offset?: number }) =>
    get<BrowseResp>("/phones", p as any),
  feedback: (p: FeedbackPayload) => post<{ ok: boolean }>("/feedback", p),
};
