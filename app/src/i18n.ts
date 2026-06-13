/* Minimal no-library i18n for the fixed UI chrome (nav, section labels,
   buttons, fit/channel phrases). The audience includes parents, so the
   navigation reads in Bangla; spec-derived prose verdicts stay English (they
   are generated server-side) but numbers render in Bangla digits when on BN.

   Usage: import { t, getLang, setLang }. Components call t("scores"); App owns
   the toggle and re-keys the tree on language change so everything re-reads. */

export type Lang = "en" | "bn";

const STRINGS: Record<string, { en: string; bn: string }> = {
  // header / nav
  in_stock: { en: "phones in stock", bn: "ফোন স্টকে আছে" },
  refreshed_today: { en: "refreshed today", bn: "আজ আপডেট হয়েছে" },
  refreshed_yesterday: { en: "refreshed yesterday", bn: "গতকাল আপডেট হয়েছে" },
  nav_ask: { en: "Ask", bn: "খুঁজুন" },
  nav_results: { en: "Results", bn: "ফলাফল" },
  nav_detail: { en: "Detail", bn: "বিস্তারিত" },
  see_results: { en: "See results", bn: "ফলাফল দেখুন" },
  matches: { en: "matches", bn: "মিল" },
  live_picks: { en: "live picks", bn: "লাইভ পিক" },
  new_search: { en: "New search", bn: "নতুন খোঁজ" },
  // ask screen
  budget_first: { en: "budget-first picks", bn: "বাজেট অনুযায়ী পছন্দ" },
  // results
  top_picks: { en: "top picks", bn: "সেরা পছন্দ" },
  edit: { en: "Edit", bn: "এডিট" },
  any_channel: { en: "any channel", bn: "যেকোনো চ্যানেল" },
  official_only: { en: "official only", bn: "শুধু অফিসিয়াল" },
  unofficial_only: { en: "unofficial only", bn: "শুধু আনঅফিসিয়াল" },
  understood: { en: "understood", bn: "বুঝেছি" },
  conf_strong: { en: "top tier", bn: "সেরা সারির" },
  conf_good: { en: "solid match", bn: "ভালো মিল" },
  conf_backup: { en: "backup option", bn: "বিকল্প" },
  budget_fit: { en: "Budget fit", bn: "বাজেট ফিট" },
  uses_budget: { en: "Uses your full budget", bn: "পুরো বাজেট কাজে লাগে" },
  see_breakdown: { en: "See full breakdown", bn: "বিস্তারিত দেখুন" },
  if_stretch: { en: "If you stretch ↗", bn: "একটু বাড়ালে ↗" },
  // detail
  back_to_results: { en: "Back to results", bn: "ফলাফলে ফিরুন" },
  scores: { en: "Scores", bn: "স্কোর" },
  specs: { en: "Specs", bn: "স্পেক" },
  owner_voices: { en: "Owner voices", bn: "ব্যবহারকারীদের মত" },
  where_to_buy: { en: "Where to buy", bn: "কোথায় কিনবেন" },
  brand_ownership: { en: "Brand & ownership", bn: "ব্র্যান্ড ও মালিকানা" },
  who_its_for: { en: "Who it's for", bn: "কাদের জন্য" },
  official: { en: "Official", bn: "অফিসিয়াল" },
  unofficial: { en: "Unofficial", bn: "আনঅফিসিয়াল" },
  confirm_price: { en: "Call the shop to confirm price and stock before buying.",
                   bn: "কেনার আগে দোকানে দাম ও স্টক নিশ্চিত করুন।" },
  best_price: { en: "Best price", bn: "সেরা দাম" },
  carried_by: { en: "Carried by", bn: "পাওয়া যায়" },
  shops: { en: "shops", bn: "দোকানে" },
};

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

let _lang: Lang =
  (typeof localStorage !== "undefined" && (localStorage.getItem("kpk_lang") as Lang)) || "en";

export function getLang(): Lang {
  return _lang;
}

export function setLang(l: Lang) {
  _lang = l;
  try { localStorage.setItem("kpk_lang", l); } catch { /* ignore */ }
}

export function t(key: keyof typeof STRINGS | string): string {
  const e = STRINGS[key];
  return e ? e[_lang] : String(key);
}

/** Convert ASCII digits in a string to Bangla digits when the language is BN.
    Used for prices/numbers so a ৳ figure reads natively. */
export function bnNum(s: string): string {
  if (_lang !== "bn") return s;
  return s.replace(/[0-9]/g, (d) => BN_DIGITS[+d]);
}
