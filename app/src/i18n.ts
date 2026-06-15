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
  our_take: { en: "Our take", bn: "আমাদের মত" },
  // loading detail screen
  loading_detail: { en: "Loading full breakdown…", bn: "বিস্তারিত লোড হচ্ছে…" },
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

  // ---- ask wizard (stepped query so giving the answer feels as considered
  //      as the answer we work to produce) ----
  step: { en: "Step", bn: "ধাপ" },
  of: { en: "of", bn: "/" },
  continue: { en: "Continue", bn: "পরবর্তী" },
  back: { en: "Back", bn: "পিছনে" },
  q_budget_t: { en: "What's your budget?", bn: "আপনার বাজেট কত?" },
  q_budget_s: { en: "Type the most you want to spend. We find the phone that makes the most of it.",
                bn: "সর্বোচ্চ কত খরচ করবেন লিখুন। সেই বাজেটে সেরা ফোনটি আমরা বের করব।" },
  q_purpose_t: { en: "What will you use it for?", bn: "কী কাজে ব্যবহার করবেন?" },
  q_purpose_s: { en: "Pick what matters most to you. It shapes how we rank every phone.",
                 bn: "আপনার কাছে যেটা সবচেয়ে জরুরি বাছুন। এটাই ঠিক করে আমরা কীভাবে ফোন সাজাব।" },
  q_channel_t: { en: "Official or unofficial?", bn: "অফিসিয়াল নাকি আনঅফিসিয়াল?" },
  q_channel_s: { en: "Gray-import phones cost less. Their warranty comes from the shop, not the brand.",
                 bn: "গ্রে-ইম্পোর্ট ফোন কম দামি। তবে ওয়ারেন্টি ব্র্যান্ডের নয়, দোকানের।" },
  q_tune_t: { en: "Anything else?", bn: "আর কিছু?" },
  q_tune_s: { en: "Everything here is optional. Tune the match, or jump straight to results.",
              bn: "এখানে সবকিছু ঐচ্ছিক। আরও নিখুঁত করুন, কিংবা সরাসরি ফলাফলে যান।" },
  optional: { en: "optional", bn: "ঐচ্ছিক" },
  see_n_matches: { en: "See", bn: "দেখুন" },

  // ---- staged loading (the answer is slow because it is genuinely worked
  //      for, so show the work and the wait reads as care, not lag) ----
  rag_heading: { en: "Building your shortlist", bn: "আপনার শর্টলিস্ট তৈরি হচ্ছে" },
  rag1_t: { en: "Filtering by your budget", bn: "বাজেট অনুযায়ী বাছাই" },
  rag1_s: { en: "Checking every live listing in Bangladesh for phones that fit your budget.",
            bn: "আপনার বাজেটে মানানসই ফোনের জন্য সব লাইভ লিস্টিং দেখা হচ্ছে।" },
  rag2_t: { en: "Matching what you need", bn: "আপনার চাহিদা মেলানো হচ্ছে" },
  rag2_s: { en: "Turning your answers into a search and finding the closest-fit phones.",
            bn: "আপনার উত্তরকে সার্চে রূপ দিয়ে সবচেয়ে মানানসই ফোন খোঁজা হচ্ছে।" },
  rag3_t: { en: "Reading real reviews", bn: "আসল রিভিউ পড়া হচ্ছে" },
  rag3_s: { en: "Pulling owner reviews, specs and warranty notes for each phone.",
            bn: "প্রতিটি ফোনের ব্যবহারকারীর রিভিউ, স্পেক ও ওয়ারেন্টি তথ্য আনা হচ্ছে।" },
  rag4_t: { en: "Ranking your matches", bn: "মিলগুলো সাজানো হচ্ছে" },
  rag4_s: { en: "An AI reads all that evidence and writes a plain, honest verdict for each one.",
            bn: "একটি AI সব তথ্য পড়ে প্রতিটির জন্য সহজ, সৎ একটি রায় লেখে।" },
  rag_worth: { en: "This is free and unbiased. No paid rankings, no formula, just what real owners reported.",
               bn: "এটি ফ্রি ও নিরপেক্ষ। কোনো টাকার র‍্যাঙ্কিং বা ফর্মুলা নেই, শুধু আসল ব্যবহারকারীদের কথা।" },
  rag_reassure1: { en: "Almost there. The model is weighing the trade-offs for you.",
                   bn: "প্রায় শেষ। মডেল আপনার জন্য সুবিধা-অসুবিধা মেপে দেখছে।" },
  rag_reassure2: { en: "Still reading reviews so you don't have to.",
                   bn: "রিভিউ পড়া চলছে, যাতে আপনাকে পড়তে না হয়।" },
  rag_reassure3: { en: "Good answers take a few seconds. Thanks for waiting.",
                   bn: "ভালো উত্তরে কয়েক সেকেন্ড লাগে। অপেক্ষার জন্য ধন্যবাদ।" },
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
