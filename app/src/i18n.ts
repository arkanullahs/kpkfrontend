/* Minimal no-library i18n for the fixed UI chrome (nav, section labels,
   buttons, fit/channel phrases). The audience includes parents, so the
   navigation reads in Bangla; spec-derived prose verdicts stay English (they
   are generated server-side) but numbers render in Bangla digits when on BN.

   Usage: import { t, getLang, setLang }. Components call t("scores"); App owns
   the toggle and re-keys the tree on language change so everything re-reads. */

export type Lang = "en" | "bn";

const STRINGS: Record<string, { en: string; bn: string }> = {
  // header / nav
  in_stock: { en: "phones tracked", bn: "ফোন ট্র্যাক করছি" },
  prices_loading: { en: "live prices", bn: "লাইভ দাম" },
  refreshed_today: { en: "refreshed today", bn: "আজ আপডেট হয়েছে" },
  refreshed_yesterday: { en: "refreshed yesterday", bn: "গতকাল আপডেট হয়েছে" },
  brand_tagline: { en: "The easy way to buy a phone", bn: "ফোন কেনার সহজ উপায়" },
  nav_ask: { en: "Ask", bn: "খুঁজুন" },
  nav_results: { en: "Results", bn: "ফলাফল" },
  nav_detail: { en: "Detail", bn: "বিস্তারিত" },
  see_results: { en: "See results", bn: "ফলাফল দেখুন" },
  matches: { en: "matches", bn: "মিল" },
  live_picks: { en: "live picks", bn: "লাইভ পিক" },
  new_search: { en: "New search", bn: "নতুন খোঁজ" },
  // ask screen
  budget_first: { en: "budget-first picks", bn: "বাজেট অনুযায়ী পছন্দ" },
  updated_on: { en: "updated", bn: "আপডেট" },
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

  // ---- official signal (GadgetGear is the one shop we trust as official) ----
  maybe_official: { en: "Maybe official", bn: "অফিসিয়াল হতে পারে" },
  gng_note: { en: "GadgetGear — the one seller we trust as official — lists it at this price.",
              bn: "গ্যাজেটগিয়ার — আমরা যে একমাত্র অফিসিয়াল বিক্রেতা মানি — এই দামে রেখেছে।" },
  official_pitch: { en: "Want full warranty and a 100% genuine unit? Buy official from",
                    bn: "ওয়ারেন্টি আর ১০০% আসল ইউনিট চাইলে অফিসিয়াল কিনুন" },
  official_pitch2: { en: "for", bn: "—" },
  just_so_you_know: { en: "Just so you know", bn: "জেনে রাখুন" },
  // one-time results notice
  notice_title: { en: "Before you look —", bn: "দেখার আগে —" },
  notice_body: { en: "Don't lean on the prices here — they're a guide, they shift daily, and the in-store price often differs. What we're really for: finding the best phone your budget can buy.",
                 bn: "এখানের দাম শুধু ধারণা — প্রতিদিন বদলায়, দোকানে প্রায়ই আলাদা হয়। আমাদের আসল কাজ: আপনার বাজেটে সেরা ফোনটি খুঁজে দেওয়া।" },
  notice_ok: { en: "Got it, show my picks", bn: "বুঝেছি, পছন্দ দেখান" },
  // ---- results: stretch ----
  worth_stretch: { en: "Worth the stretch", bn: "একটু বাড়ালেই মূল্যবান" },
  // ---- current-phone comparison ----
  upgrade: { en: "Upgrade", bn: "আপগ্রেড" },
  downgrade: { en: "Downgrade", bn: "ডাউনগ্রেড" },
  sidegrade: { en: "Sidegrade", bn: "একই মানের" },
  vs_your: { en: "Compared to your", bn: "আপনার ফোনের তুলনায়" },
  your_phone: { en: "Your phone", bn: "আপনার ফোন" },
  live_from_gng: { en: "Live from GadgetGear — not in our database", bn: "গ্যাজেটগিয়ার থেকে লাইভ — আমাদের ডেটাবেসে নেই" },
  pricier: { en: "pricier", bn: "বেশি দামি" },
  cheaper: { en: "cheaper", bn: "সস্তা" },
  experimental: { en: "EXPERIMENTAL", bn: "পরীক্ষামূলক" },
  experimental_note: { en: "Experimental — your phone isn't in our database, so these specs were pulled live from GSMArena and matched automatically. Double-check before trusting.",
                       bn: "পরীক্ষামূলক — আপনার ফোন আমাদের ডেটাবেসে নেই, তাই স্পেক GSMArena থেকে লাইভ আনা ও স্বয়ংক্রিয়ভাবে মেলানো হয়েছে। নির্ভর করার আগে যাচাই করুন।" },
  // ---- detail: who it's for ----
  great_for: { en: "Great for", bn: "যাদের জন্য দারুণ" },
  think_twice: { en: "Think twice if", bn: "ভেবে দেখুন যদি" },
  owners_flag: { en: "Owners flag", bn: "ব্যবহারকারীরা যা বলেন" },
  // ---- detail: value retention graph ----
  value_retention: { en: "Holds its value?", bn: "দাম ধরে রাখে?" },
  holds_better: { en: "Holds value better than most", bn: "অধিকাংশের চেয়ে ভালো দাম ধরে রাখে" },
  holds_worse: { en: "Loses value faster than most", bn: "অধিকাংশের চেয়ে দ্রুত দাম হারায়" },
  holds_typical: { en: "Holds value about average", bn: "গড়পড়তা দাম ধরে রাখে" },
  est_resale_left: { en: "Estimated resale value left:", bn: "আনুমানিক রিসেল মূল্য থাকবে:" },
  after_3y: { en: "after 3 years", bn: "৩ বছর পরে" },
  typical_phone: { en: "Typical phone", bn: "সাধারণ ফোন" },
  updates: { en: "Updates", bn: "আপডেট" },
  retention_disclaimer: { en: "Estimate based on the brand's resale reputation in Bangladesh — a guide, not a market quote.",
                          bn: "ব্র্যান্ডের রিসেল সুনামের ভিত্তিতে আনুমানিক — দিকনির্দেশনা মাত্র, বাজারদর নয়।" },
  // ---- detail: where to buy warning ----
  price_warning: { en: "These are prices listed on shop websites. The real in-store price in Bangladesh is often different — sometimes by a lot. Always call or visit to confirm before you buy.",
                   bn: "এগুলো দোকানের ওয়েবসাইটের দাম। বাস্তবে দোকানের দাম প্রায়ই আলাদা — কখনো অনেক বেশি। কেনার আগে ফোন করে বা গিয়ে দাম নিশ্চিত করুন।" },

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
  q_purpose_s: { en: "Pick everything that matters — choose as many as you like. It shapes how we rank every phone.",
                 bn: "যা যা জরুরি সব বাছুন — যত খুশি বাছতে পারেন। এটাই ঠিক করে আমরা কীভাবে ফোন সাজাব।" },
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
  // queue / busy indicator
  queue_busy: { en: "High demand right now —", bn: "এখন অনেক চাপ —" },
  queue_one_ahead: { en: "1 search is ahead of yours. Hang tight, you're in the queue.",
                     bn: "আপনার আগে ১টি খোঁজ চলছে। একটু অপেক্ষা করুন, আপনি লাইনে আছেন।" },
  queue_n_ahead: { en: "searches are ahead of yours. Hang tight, you're in the queue.",
                   bn: "টি খোঁজ আপনার আগে চলছে। একটু অপেক্ষা করুন, আপনি লাইনে আছেন।" },

  // ---- plain-language helpers (accessibility: a parent or first-time buyer
  //      should understand what every choice DOES, in one short line) ----
  whats_this: { en: "What's this?", bn: "এটা কী?" },
  tap_q_hint: { en: "Not sure what something means? Tap the ? on any card.",
                bn: "কোনোটা বুঝতে না পারলে? যেকোনো কার্ডের ? এ চাপ দিন।" },
  // what picking each need actually does to the ranking
  exp_photographer: { en: "We'll put the phones with the best real cameras for your money first.",
                      bn: "আপনার বাজেটে সেরা আসল ক্যামেরার ফোনগুলো আগে দেখাবো।" },
  exp_gamer: { en: "Phones with fast gaming chips and smooth, high-refresh screens come first.",
               bn: "দ্রুত গেমিং চিপ আর স্মুথ হাই-রিফ্রেশ স্ক্রিনের ফোন আগে আসবে।" },
  exp_vlogger: { en: "Best for video and selfies — steady footage and a sharp front camera.",
                 bn: "ভিডিও আর সেলফির জন্য সেরা — স্থির ভিডিও আর পরিষ্কার সামনের ক্যামেরা।" },
  exp_rider: { en: "All-day battery and a bright screen you can read in direct sunlight.",
               bn: "সারাদিনের ব্যাটারি আর রোদেও দেখা যায় এমন উজ্জ্বল স্ক্রিন।" },
  exp_parents: { en: "Simple, easy phones — clear screen, loud sound, no annoying ad spam.",
                 bn: "সহজ ও সরল ফোন — পরিষ্কার স্ক্রিন, জোরালো শব্দ, বিরক্তিকর বিজ্ঞাপন নেই।" },
  exp_student: { en: "Best all-round value for the taka, built to stay useful for years.",
                 bn: "টাকার বিনিময়ে সব দিকে সেরা ভ্যালু, বছরের পর বছর কাজে লাগে।" },
  exp_professional: { en: "Fast, polished phones with long software support and good resale.",
                     bn: "দ্রুত ও পরিপাটি ফোন — দীর্ঘ সফটওয়্যার সাপোর্ট আর ভালো রিসেল।" },
  exp_balanced: { en: "No weak spots — a phone that's good at everything, not just one thing.",
                  bn: "কোনো দুর্বল দিক নেই — একটি কাজে নয়, সব কাজেই ভালো ফোন।" },
  // tune step
  tune_intro: { en: "Already good to go? Skip straight to results — nothing here is required.",
                bn: "চাইলে এখনই ফলাফলে যান — এখানের কিছুই বাধ্যতামূলক নয়।" },
  exp_cn: { en: "Some cheap phones are built for China. They often have no Google apps, no Bangla, and miss updates. Best left ON unless you really know the phone.",
            bn: "কিছু সস্তা ফোন চীনের বাজারের জন্য তৈরি। এগুলোতে প্রায়ই গুগল অ্যাপ বা বাংলা থাকে না, আপডেটও আসে না। ফোনটি ভালো করে না জানলে এটি চালু রাখাই ভালো।" },
  exp_platform: { en: "Android (Samsung, Xiaomi, etc.) or iPhone (iOS). Choose Any if it doesn't matter.",
                  bn: "অ্যান্ড্রয়েড (Samsung, Xiaomi…) নাকি আইফোন (iOS)। পার্থক্য না থাকলে Any বাছুন।" },
  exp_software_t: { en: "How the phone's menus feel", bn: "ফোনের মেনু কেমন লাগবে" },
  exp_software: { en: "Clean = fewer extra apps and no ads, simple to use (like Pixel or iPhone). Rich = lots of built-in features and customisation (like Samsung or Xiaomi).",
                  bn: "Clean = কম বাড়তি অ্যাপ, কোনো বিজ্ঞাপন নেই, ব্যবহারে সহজ (Pixel বা iPhone-এর মতো)। Rich = অনেক বিল্ট-ইন ফিচার আর কাস্টমাইজেশন (Samsung বা Xiaomi-এর মতো)।" },
  exp_exclude: { en: "Tap a brand to hide it from your results.",
                 bn: "কোনো ব্র্যান্ড লুকাতে চাইলে তাতে চাপ দিন।" },
  exp_current: { en: "Type the phone you use now and we'll tell you whether each pick is a real upgrade.",
                 bn: "এখন যে ফোনটি ব্যবহার করছেন লিখুন — প্রতিটি পছন্দ আসল আপগ্রেড কিনা জানিয়ে দেবো।" },
  choices_banner_t: { en: "Here's how your picks shape the results:",
                      bn: "আপনার পছন্দ যেভাবে ফলাফল ঠিক করে:" },
  // ---- site-wide explainer banners (lively, always-on, plain grammar) ----
  results_how_t: { en: "How we actually rank these", bn: "আমরা আসলে যেভাবে সাজাই" },
  results_how: { en: "No sponsored rankings, no crude price formula. For your exact budget and needs we run a retrieval-augmented (RAG) pipeline: semantic search over a per-phone evidence file — real owner reviews, editorial verdicts, reported faults, live BD prices and full specs — and then a large language model weighs that evidence to rank every match and write each verdict. Tap a phone to read its reasoning.",
                 bn: "কোনো স্পনসরড র‍্যাঙ্কিং নেই, সাধারণ দামের ফর্মুলাও নেই। আপনার বাজেট ও চাহিদা অনুযায়ী আমরা একটি RAG (রিট্রিভাল-অগমেন্টেড) পাইপলাইন চালাই: প্রতিটি ফোনের একটি এভিডেন্স ফাইল — আসল ব্যবহারকারীর রিভিউ, এডিটোরিয়াল রায়, রিপোর্ট করা সমস্যা, লাইভ দাম ও পুরো স্পেক — এর ওপর সিমান্টিক সার্চ চালিয়ে একটি বড় ল্যাঙ্গুয়েজ মডেল সব তথ্য যাচাই করে প্রতিটি ফোন সাজায় ও রায় লেখে। কারণ দেখতে যেকোনো ফোনে চাপ দিন।" },
  scores_help: { en: "Each score is our honest read out of 10, from real reviews and specs — higher is better.",
                 bn: "প্রতিটি স্কোর আসল রিভিউ আর স্পেক থেকে ১০-এ আমাদের সৎ মূল্যায়ন — বেশি মানে ভালো।" },
  detail_intro: { en: "Everything below is in plain words. Take your time — no rush.",
                  bn: "নিচের সবকিছু সহজ ভাষায় লেখা। ধীরে দেখুন — কোনো তাড়া নেই।" },
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

/** Convert Bangla digits back to ASCII, always (regardless of language). The
    budget field renders Bangla digits in BN mode, so a user editing it produces
    a string of Bangla digits — parsing must map them back or the value resets to
    0. Also lets a user type Bangla numerals directly on either language. */
export function bnToAscii(s: string): string {
  return s.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
}
