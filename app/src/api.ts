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

export interface VariantSaving {
  variant: string; official: number; unofficial: number; pct: number;
}

export interface Pick {
  id: string; key?: string; brand: string; model: string; image?: string | null;
  best_price: number | null; best_price_shop?: string; best_price_url?: string;
  best_official_price: number | null; best_unofficial_price: number | null;
  best_official_variant?: string | null; best_unofficial_variant?: string | null;
  same_variant_saving?: VariantSaving | null;
  in_stock_shops?: number; age_years?: number;
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
    comparing_to: string | null; disclaimer: string;
    mapped_from_traits?: string;
    pick_logic?: string;
    ranking?: string;
    cached?: boolean;
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
  official_final?: string; in_stock?: boolean; url?: string | null;
  image?: string | null; variant?: string | null;
}

export interface OpinionProfile {
  llm_summary?: string | null; praise_flags?: string[]; complaint_flags?: string[];
  standout_praise?: string[]; best_for?: string[]; avoid_if?: string[];
  aspects?: Record<string, { quotes?: string[]; summary?: string }>;
}

export interface PhoneDetail {
  id: string; key?: string; brand: string; model: string; image?: string | null;
  best_price: number | null; best_price_shop?: string;
  best_official_price: number | null; best_unofficial_price: number | null;
  best_official_variant?: string | null; best_unofficial_variant?: string | null;
  same_variant_saving?: VariantSaving | null;
  official_status?: string; in_stock_shops?: number; age_years?: number;
  tags?: string[];
  specs?: Record<string, any>;
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

/* ---------- recommend params ---------- */
export interface RecParams {
  budget: number;
  archetype?: string;
  priorities?: string;
  current_phone?: string;
  official_only?: boolean;
  include_cn?: boolean;
  exclude_brand?: string;
  os_style?: string;
  platform?: string;
  channel?: string;
  traits?: string;
  top?: number;
}

export const api = {
  meta: () => get<Meta>("/meta"),
  archetypes: () => get<Archetype[]>("/archetypes"),
  recommend: (p: RecParams) => get<RecommendResp>("/recommend", p as any),
  count: (p: RecParams) => get<CountResp>("/count", p as any),
  phone: (id: string) => get<PhoneDetail>("/phones/" + id.split("/").map(encodeURIComponent).join("/")),
  browse: (p: { q?: string; brand?: string; min_price?: number; max_price?: number; in_stock?: boolean; limit?: number; offset?: number }) =>
    get<BrowseResp>("/phones", p as any),
};
