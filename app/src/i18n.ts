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
  where_to_buy: { en: "Prices referenced from", bn: "যেসব দোকান থেকে দাম নেওয়া" },
  brand_ownership: { en: "Brand & ownership", bn: "ব্র্যান্ড ও মালিকানা" },
  who_its_for: { en: "Who it's for", bn: "কাদের জন্য" },
  official: { en: "Official", bn: "অফিসিয়াল" },
  unofficial: { en: "Unofficial", bn: "আনঅফিসিয়াল" },
  confirm_price: {
    en: "Call the shop to confirm price and stock before buying.",
    bn: "কেনার আগে দোকানে দাম ও স্টক নিশ্চিত করুন।"
  },
  best_price: { en: "Best price", bn: "সেরা দাম" },
  carried_by: { en: "Carried by", bn: "পাওয়া যায়" },
  shops: { en: "shops", bn: "দোকানে" },

  // ---- listing-data caution (feedback #5) + connectivity (P2 remainder) ----
  data_caution_few: { en: "Few/old listings — verify at shop", bn: "লিস্টিং কম বা পুরনো — দোকানে যাচাই করুন" },
  data_caution_stale: { en: "Listings look outdated — confirm price at shop", bn: "লিস্টিং পুরনো হতে পারে — দোকানে দাম নিশ্চিত করুন" },
  conn_title: { en: "Connectivity", bn: "কানেক্টিভিটি" },
  conn_jack: { en: "3.5mm jack", bn: "৩.৫ মিমি জ্যাক" },
  conn_ir: { en: "IR blaster", bn: "আইআর ব্লাস্টার" },
  conn_fm: { en: "FM radio", bn: "এফএম রেডিও" },
  conn_yes: { en: "Yes", bn: "আছে" },
  conn_no: { en: "No", bn: "নেই" },
  conn_unknown: { en: "Not verified", bn: "যাচাই হয়নি" },

  // ---- official signal (GadgetGear is the one shop we trust as official) ----
  maybe_official: { en: "Maybe official", bn: "অফিসিয়াল হতে পারে" },
  gng_note: {
    en: "GadgetGear — the one seller we trust as official — lists it at this price.",
    bn: "গ্যাজেটগিয়ার — আমরা যে একমাত্র অফিসিয়াল বিক্রেতা মানি — এই দামে রেখেছে।"
  },
  official_pitch: {
    en: "Want full warranty and a 100% genuine unit? Buy official from",
    bn: "ওয়ারেন্টি আর ১০০% আসল ইউনিট চাইলে অফিসিয়াল কিনুন"
  },
  official_pitch2: { en: "for", bn: "—" },
  just_so_you_know: { en: "Just so you know", bn: "জেনে রাখুন" },
  // one-time results notice
  notice_title: { en: "Before you look —", bn: "দেখার আগে —" },
  notice_body: {
    en: "Don't lean on the prices here — they're a guide, they shift daily, and the in-store price often differs. What we're really for: finding the best phone your budget can buy.",
    bn: "এখানের দাম শুধু ধারণা — প্রতিদিন বদলায়, দোকানে প্রায়ই আলাদা হয়। আমাদের আসল কাজ: আপনার বাজেটে সেরা ফোনটি খুঁজে দেওয়া।"
  },
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
  experimental_note: {
    en: "Experimental — your phone isn't in our database, so these specs were pulled live from GSMArena and matched automatically. Double-check before trusting.",
    bn: "পরীক্ষামূলক — আপনার ফোন আমাদের ডেটাবেসে নেই, তাই স্পেক GSMArena থেকে লাইভ আনা ও স্বয়ংক্রিয়ভাবে মেলানো হয়েছে। নির্ভর করার আগে যাচাই করুন।"
  },
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
  retention_disclaimer: {
    en: "Estimate based on the brand's resale reputation in Bangladesh — a guide, not a market quote.",
    bn: "ব্র্যান্ডের রিসেল সুনামের ভিত্তিতে আনুমানিক — দিকনির্দেশনা মাত্র, বাজারদর নয়।"
  },
  // ---- detail: where to buy warning ----
  price_warning: {
    en: "These are prices listed on shop websites. The real in-store price in Bangladesh is often different — sometimes by a lot. Always call or visit to confirm before you buy.",
    bn: "এগুলো দোকানের ওয়েবসাইটের দাম। বাস্তবে দোকানের দাম প্রায়ই আলাদা — কখনো অনেক বেশি। কেনার আগে ফোন করে বা গিয়ে দাম নিশ্চিত করুন।"
  },
  // ---- price provenance / authority (A3) + per-source stock ----
  price_from: { en: "Price from", bn: "দামের উৎস" },
  price_unconfirmed: { en: "Unconfirmed price", bn: "দাম অনিশ্চিত" },
  price_unconfirmed_note: {
    en: "No shop we keep current (Rio, GadgetGear or Pickaboo) lists this in stock, so this price is from another shop and may be outdated.",
    bn: "আমরা যেসব দোকানের দাম হালনাগাদ রাখি (Rio, GadgetGear, Pickaboo) তাদের কেউ এটি স্টকে রাখেনি, তাই দামটি অন্য দোকানের — পুরনো হতে পারে।"
  },
  stock_in: { en: "In stock", bn: "স্টকে আছে" },
  stock_out: { en: "Out of stock", bn: "স্টক নেই" },

  // ---- ask wizard (stepped query so giving the answer feels as considered
  //      as the answer we work to produce) ----
  step: { en: "Step", bn: "ধাপ" },
  of: { en: "of", bn: "/" },
  continue: { en: "Continue", bn: "পরবর্তী" },
  back: { en: "Back", bn: "পিছনে" },
  q_budget_t: { en: "What's your budget?", bn: "আপনার বাজেট কত?" },
  q_budget_s: {
    en: "Type the most you want to spend. We find the phone that makes the most of it.",
    bn: "সর্বোচ্চ কত খরচ করবেন লিখুন। সেই বাজেটে সেরা ফোনটি আমরা বের করব।"
  },
  q_purpose_t: { en: "What will you use it for?", bn: "কী কাজে ব্যবহার করবেন?" },
  q_purpose_s: {
    en: "Pick everything that matters — choose as many as you like. It shapes how we rank every phone.",
    bn: "যা যা জরুরি সব বাছুন — যত খুশি বাছতে পারেন। এটাই ঠিক করে আমরা কীভাবে ফোন সাজাব।"
  },
  q_channel_t: { en: "Official or unofficial?", bn: "অফিসিয়াল নাকি আনঅফিসিয়াল?" },
  q_channel_s: {
    en: "Gray-import phones cost less. Their warranty comes from the shop, not the brand.",
    bn: "গ্রে-ইম্পোর্ট ফোন কম দামি। তবে ওয়ারেন্টি ব্র্যান্ডের নয়, দোকানের।"
  },
  q_tune_t: { en: "Anything else?", bn: "আর কিছু?" },
  q_tune_s: {
    en: "Everything here is optional. Tune the match, or jump straight to results.",
    bn: "এখানে সবকিছু ঐচ্ছিক। আরও নিখুঁত করুন, কিংবা সরাসরি ফলাফলে যান।"
  },
  optional: { en: "optional", bn: "ঐচ্ছিক" },
  see_n_matches: { en: "See", bn: "দেখুন" },

  // ---- staged loading (the answer is slow because it is genuinely worked
  //      for, so show the work and the wait reads as care, not lag) ----
  rag_heading: { en: "Building your shortlist", bn: "আপনার শর্টলিস্ট তৈরি হচ্ছে" },
  rag1_t: { en: "Filtering by your budget", bn: "বাজেট অনুযায়ী বাছাই" },
  rag1_s: {
    en: "Checking every live listing in Bangladesh for phones that fit your budget.",
    bn: "আপনার বাজেটে মানানসই ফোনের জন্য সব লাইভ লিস্টিং দেখা হচ্ছে।"
  },
  rag2_t: { en: "Matching what you need", bn: "আপনার চাহিদা মেলানো হচ্ছে" },
  rag2_s: {
    en: "Turning your answers into a search and finding the closest-fit phones.",
    bn: "আপনার উত্তরকে সার্চে রূপ দিয়ে সবচেয়ে মানানসই ফোন খোঁজা হচ্ছে।"
  },
  rag3_t: { en: "Reading real reviews", bn: "আসল রিভিউ পড়া হচ্ছে" },
  rag3_s: {
    en: "Pulling owner reviews, specs and warranty notes for each phone.",
    bn: "প্রতিটি ফোনের ব্যবহারকারীর রিভিউ, স্পেক ও ওয়ারেন্টি তথ্য আনা হচ্ছে।"
  },
  rag4_t: { en: "Ranking your matches", bn: "মিলগুলো সাজানো হচ্ছে" },
  rag4_s: {
    en: "An AI reads all that evidence and writes a plain, honest verdict for each one.",
    bn: "একটি AI সব তথ্য পড়ে প্রতিটির জন্য সহজ, সৎ একটি রায় লেখে।"
  },
  rag_worth: {
    en: "This is free and unbiased. No paid rankings, no formula, just what real owners reported.",
    bn: "এটি ফ্রি ও নিরপেক্ষ। কোনো টাকার র‍্যাঙ্কিং বা ফর্মুলা নেই, শুধু আসল ব্যবহারকারীদের কথা।"
  },
  rag_reassure1: {
    en: "Almost there. The model is weighing the trade-offs for you.",
    bn: "প্রায় শেষ। মডেল আপনার জন্য সুবিধা-অসুবিধা মেপে দেখছে।"
  },
  rag_reassure2: {
    en: "Still reading reviews so you don't have to.",
    bn: "রিভিউ পড়া চলছে, যাতে আপনাকে পড়তে না হয়।"
  },
  rag_reassure3: {
    en: "Good answers take a few seconds. Thanks for waiting.",
    bn: "ভালো উত্তরে কয়েক সেকেন্ড লাগে। অপেক্ষার জন্য ধন্যবাদ।"
  },
  // queue / busy indicator
  queue_busy: { en: "High demand right now —", bn: "এখন অনেক চাপ —" },
  queue_one_ahead: {
    en: "1 search is ahead of yours. Hang tight, you're in the queue.",
    bn: "আপনার আগে ১টি খোঁজ চলছে। একটু অপেক্ষা করুন, আপনি লাইনে আছেন।"
  },
  queue_n_ahead: {
    en: "searches are ahead of yours. Hang tight, you're in the queue.",
    bn: "টি খোঁজ আপনার আগে চলছে। একটু অপেক্ষা করুন, আপনি লাইনে আছেন।"
  },

  // ---- plain-language helpers (accessibility: a parent or first-time buyer
  //      should understand what every choice DOES, in one short line) ----
  whats_this: { en: "What's this?", bn: "এটা কী?" },
  tap_q_hint: {
    en: "Not sure what something means? Tap the ? on any card.",
    bn: "কোনোটা বুঝতে না পারলে? যেকোনো কার্ডের ? এ চাপ দিন।"
  },
  // what picking each need actually does to the ranking
  exp_photographer: {
    en: "We'll put the phones with the best real cameras for your money first.",
    bn: "আপনার বাজেটে সেরা আসল ক্যামেরার ফোনগুলো আগে দেখাবো।"
  },
  exp_gamer: {
    en: "Phones with fast gaming chips and smooth, high-refresh screens come first.",
    bn: "দ্রুত গেমিং চিপ আর স্মুথ হাই-রিফ্রেশ স্ক্রিনের ফোন আগে আসবে।"
  },
  exp_vlogger: {
    en: "Best for video and selfies — steady footage and a sharp front camera.",
    bn: "ভিডিও আর সেলফির জন্য সেরা — স্থির ভিডিও আর পরিষ্কার সামনের ক্যামেরা।"
  },
  exp_rider: {
    en: "All-day battery and a bright screen you can read in direct sunlight.",
    bn: "সারাদিনের ব্যাটারি আর রোদেও দেখা যায় এমন উজ্জ্বল স্ক্রিন।"
  },
  exp_parents: {
    en: "Simple, easy phones — clear screen, loud sound, no annoying ad spam.",
    bn: "সহজ ও সরল ফোন — পরিষ্কার স্ক্রিন, জোরালো শব্দ, বিরক্তিকর বিজ্ঞাপন নেই।"
  },
  exp_student: {
    en: "Best all-round value for the taka, built to stay useful for years.",
    bn: "টাকার বিনিময়ে সব দিকে সেরা ভ্যালু, বছরের পর বছর কাজে লাগে।"
  },
  exp_professional: {
    en: "Fast, polished phones with long software support and good resale.",
    bn: "দ্রুত ও পরিপাটি ফোন — দীর্ঘ সফটওয়্যার সাপোর্ট আর ভালো রিসেল।"
  },
  exp_balanced: {
    en: "No weak spots — a phone that's good at everything, not just one thing.",
    bn: "কোনো দুর্বল দিক নেই — একটি কাজে নয়, সব কাজেই ভালো ফোন।"
  },
  // tune step
  tune_intro: {
    en: "Already good to go? Skip straight to results — nothing here is required.",
    bn: "চাইলে এখনই ফলাফলে যান — এখানের কিছুই বাধ্যতামূলক নয়।"
  },
  adv_title: { en: "Advanced filters", bn: "অ্যাডভান্সড ফিল্টার" },
  exp_hw: {
    en: "Phones confirmed to lack a must-have are dropped. Phones we haven't verified yet still show — check the spec sheet before buying.",
    bn: "যে ফোনে নিশ্চিতভাবে এই ফিচার নেই, সেটি বাদ যাবে। যেগুলো এখনো যাচাই হয়নি সেগুলো দেখাবে — কেনার আগে স্পেক দেখে নিন।"
  },
  exp_hw_simple: {
    en: "Most people don't need any of these — pick one only if you know you'll use it.",
    bn: "বেশিরভাগ মানুষের এগুলোর দরকার হয় না — নিশ্চিত হলে তবেই বাছুন।"
  },
  exp_jack: {
    en: "Headphone jack (3.5mm) — plug ordinary wired earphones straight into the phone. No adapter, no charging. Only matters if you actually use wired earphones.",
    bn: "হেডফোন জ্যাক (৩.৫ মিমি) — সাধারণ তারওয়ালা ইয়ারফোন সরাসরি ফোনে লাগানো যায়। অ্যাডাপ্টার বা চার্জের ঝামেলা নেই। তারওয়ালা ইয়ারফোন ব্যবহার করলেই কেবল দরকার।"
  },
  exp_ir: {
    en: "IR blaster — the phone can work as a remote for the TV or AC. A nice extra at home, but most people live fine without it.",
    bn: "আইআর ব্লাস্টার — ফোনটাই টিভি বা এসির রিমোট হয়ে যায়। বাসায় কাজে লাগে, তবে না থাকলেও বেশিরভাগ মানুষের দিব্যি চলে।"
  },
  exp_fm: {
    en: "FM radio — live radio without internet or data. Useful where the network is weak or during long power cuts.",
    bn: "এফএম রেডিও — ইন্টারনেট বা ডেটা ছাড়াই রেডিও শোনা যায়। দুর্বল নেটওয়ার্ক বা লম্বা লোডশেডিংয়ে কাজে লাগে।"
  },
  exp_soc: {
    en: "Snapdragon (Qualcomm) or MediaTek (Dimensity/Helio). Phones whose chipset we can't identify still show.",
    bn: "Snapdragon (Qualcomm) নাকি MediaTek (Dimensity/Helio)। যে ফোনের চিপসেট শনাক্ত করা যায়নি, সেটিও দেখাবে।"
  },
  exp_include_brands: {
    en: "Pick brands to see ONLY those. Leave empty for all brands.",
    bn: "শুধু নির্দিষ্ট ব্র্যান্ড দেখতে চাইলে বেছে নিন। খালি রাখলে সব ব্র্যান্ড দেখাবে।"
  },
  exp_chinese: {
    en: "This hides every China-headquartered brand — Xiaomi, Redmi, POCO, Oppo, Vivo, OnePlus, Tecno and more — even when the phone is a global version with full Google apps. You'll mostly see Samsung, Apple, Google, Motorola and Nokia. Leave it OFF unless brand origin itself matters to you. China-market ROM units (no Google apps) are always hidden, whatever you choose here.",
    bn: "এটি চীনা কোম্পানির সব ব্র্যান্ড লুকিয়ে দেয় — Xiaomi, Redmi, POCO, Oppo, Vivo, OnePlus, Tecno সহ — ফোনটি গুগল অ্যাপসহ গ্লোবাল ভার্সন হলেও। তখন মূলত Samsung, Apple, Google, Motorola আর Nokia দেখবেন। ব্র্যান্ডের দেশ নিয়ে আপত্তি না থাকলে এটি বন্ধ রাখুন। চীনের বাজারের ROM ইউনিট (গুগল অ্যাপ ছাড়া) এখানে যা-ই বাছুন সবসময়ই লুকানো থাকে।"
  },
  exp_platform: {
    en: "Android (Samsung, Xiaomi, etc.) or iPhone (iOS). Choose Any if it doesn't matter.",
    bn: "অ্যান্ড্রয়েড (Samsung, Xiaomi…) নাকি আইফোন (iOS)। পার্থক্য না থাকলে Any বাছুন।"
  },
  exp_software_t: { en: "How the phone's menus feel", bn: "ফোনের মেনু কেমন লাগবে" },
  exp_software: {
    en: "Clean = fewer extra apps and no ads, simple to use (like Pixel or iPhone). Rich = lots of built-in features and customisation (like Samsung or Xiaomi).",
    bn: "Clean = কম বাড়তি অ্যাপ, কোনো বিজ্ঞাপন নেই, ব্যবহারে সহজ (Pixel বা iPhone-এর মতো)। Rich = অনেক বিল্ট-ইন ফিচার আর কাস্টমাইজেশন (Samsung বা Xiaomi-এর মতো)।"
  },
  exp_exclude: {
    en: "Tap a brand to hide it from your results.",
    bn: "কোনো ব্র্যান্ড লুকাতে চাইলে তাতে চাপ দিন।"
  },
  exp_current: {
    en: "Type the phone you use now and we'll tell you whether each pick is a real upgrade.",
    bn: "এখন যে ফোনটি ব্যবহার করছেন লিখুন — প্রতিটি পছন্দ আসল আপগ্রেড কিনা জানিয়ে দেবো।"
  },
  choices_banner_t: {
    en: "Here's how your picks shape the results:",
    bn: "আপনার পছন্দ যেভাবে ফলাফল ঠিক করে:"
  },
  // ---- site-wide explainer banners (lively, always-on, plain grammar) ----
  results_how_t: { en: "How we actually rank these", bn: "আমরা আসলে যেভাবে সাজাই" },
  results_how: {
    en: "No sponsored rankings, no crude price formula. Based on your exact budget and needs, we run a retrieval-augmented (RAG) pipeline. It's a semantic search through each phone's own evidence file, built from real owner reviews, editorial verdicts, reported faults, live BD prices, and full specs. From there, an LLM weighs the evidence and ranks every match. Each one gets its own written verdict. Tap a phone to read its reasoning.",
    bn: "কোনো স্পনসরড র‍্যাঙ্কিং নেই, সাধারণ দামের ফর্মুলাও নেই। আপনার বাজেট ও চাহিদা অনুযায়ী আমরা একটি RAG (রিট্রিভাল-অগমেন্টেড) পাইপলাইন চালাই: প্রতিটি ফোনের একটি এভিডেন্স ফাইল — আসল ব্যবহারকারীর রিভিউ, এডিটোরিয়াল রায়, রিপোর্ট করা সমস্যা, লাইভ দাম ও পুরো স্পেক — এর ওপর সিমান্টিক সার্চ চালিয়ে একটি বড় ল্যাঙ্গুয়েজ মডেল সব তথ্য যাচাই করে প্রতিটি ফোন সাজায় ও রায় লেখে। কারণ দেখতে যেকোনো ফোনে চাপ দিন।"
  },
  scores_help: {
    en: "Each score is our honest read out of 10, from real reviews and specs — higher is better.",
    bn: "প্রতিটি স্কোর আসল রিভিউ আর স্পেক থেকে ১০-এ আমাদের সৎ মূল্যায়ন — বেশি মানে ভালো।"
  },
  detail_intro: {
    en: "Everything below is in plain words. Take your time — no rush.",
    bn: "নিচের সবকিছু সহজ ভাষায় লেখা। ধীরে দেখুন — কোনো তাড়া নেই।"
  },
  pricealert_t: { en: "Before you trust this price", bn: "দাম বিশ্বাস করার আগে" },
  pricealert_ok: { en: "Got it", bn: "বুঝেছি" },
  method_steps_h: { en: "Step by step", bn: "ধাপে ধাপে" },
  read_how: { en: "Read how it works", bn: "কীভাবে কাজ করে দেখুন" },

  // ---- first-visit mode gate + Simple questionnaire (feedback #2/#4) ----
  mode_gate_t: { en: "How do you want to choose?", bn: "কীভাবে ফোন খুঁজবেন?" },
  mode_gate_s: {
    en: "Pick a style. To choose again later, just reload the page.",
    bn: "একটি ধরন বাছুন। পরে বদলাতে চাইলে পেজটি রিলোড করলেই আবার বাছতে পারবেন।"
  },
  mode_gate_simple_d: {
    en: "A few easy questions — no tech words. We figure out the rest. Best for most people.",
    bn: "কয়েকটি সহজ প্রশ্ন — কোনো টেকনিক্যাল শব্দ নেই। বাকিটা আমরা বুঝে নেব। বেশিরভাগ মানুষের জন্য এটাই।"
  },
  mode_gate_advanced_d: {
    en: "Every filter and technical control: hardware must-haves, chipset, brands, import market, data stats.",
    bn: "সব ফিল্টার আর টেকনিক্যাল কন্ট্রোল: হার্ডওয়্যার, চিপসেট, ব্র্যান্ড, ইমপোর্ট মার্কেট, ডেটার খুঁটিনাটি।"
  },
  mode_gate_note: {
    en: "Not sure? Take Simple — the results are just as good.",
    bn: "দ্বিধায় আছেন? সহজ-টা নিন — ফলাফল একই রকম ভালো।"
  },
  q_you_t: { en: "Tell us about you", bn: "আপনার কথা বলুন" },
  q_you_s: {
    en: "Three quick questions. From your answers we work out exactly what to look for.",
    bn: "তিনটি ছোট প্রশ্ন। আপনার উত্তর থেকেই আমরা বুঝে নেব ঠিক কী খুঁজতে হবে।"
  },
  qq_who: { en: "Who is this phone for?", bn: "ফোনটা কার জন্য?" },
  qq_who_me: { en: "Me", bn: "আমি নিজে" },
  qq_who_elder: { en: "My parents / an elder", bn: "আম্মু-আব্বু / মুরুব্বি" },
  qq_who_other: { en: "Someone else", bn: "অন্য কেউ" },
  qq_me: { en: "And who are you?", bn: "আর আপনি কে?" },
  qq_me_student: { en: "A student", bn: "শিক্ষার্থী" },
  qq_me_other: { en: "Not a student", bn: "শিক্ষার্থী নই" },
  qq_day: { en: "What fills the day on the phone? Pick all that fit.", bn: "ফোনে সারাদিন কী করা হয়? যা যা মেলে বাছুন।" },
  qq_day_photos: { en: "Taking photos", bn: "ছবি তোলা" },
  qq_day_games: { en: "Gaming", bn: "গেমিং" },
  qq_day_reels: { en: "Making videos / reels", bn: "ভিডিও/রিল বানানো" },
  qq_day_work: { en: "Office / business work", bn: "অফিস বা ব্যবসার কাজ" },
  qq_day_chat: { en: "Calls, WhatsApp, Facebook", bn: "কল, WhatsApp, Facebook" },
  qq_day_watch: { en: "Watching shows & videos", bn: "নাটক-সিনেমা দেখা" },
  qq_out: { en: "Outside the house a lot?", bn: "বাইরে বাইরে থাকা হয় বেশি?" },
  qq_out_yes: { en: "Yes, most of the day", bn: "হ্যাঁ, দিনের বেশিরভাগ" },
  qq_out_no: { en: "Not really", bn: "না, তেমন না" },
  qq_hw: { en: "Any of these extras?", bn: "এগুলোর কোনোটা কি লাগবে?" },
  qq_hw_jack: { en: "Headphone jack", bn: "হেডফোন জ্যাক" },
  qq_hw_ir: { en: "TV/AC remote (IR)", bn: "টিভি/এসি রিমোট (IR)" },
  qq_hw_fm: { en: "FM radio", bn: "এফএম রেডিও" },

  // ---- one-by-one quiz redesign (feedback #4): dynamic intent, no buckets ----
  qz_why_who: {
    en: "Why we ask — an elder needs simple and clear; a student needs value that lasts. The answer changes what we hunt for.",
    bn: "কেন জানতে চাই — মুরুব্বিদের দরকার সহজ আর স্পষ্ট; শিক্ষার্থীর দরকার বছর টেকা ভালো দাম। উত্তর বদলালে খোঁজও বদলায়।"
  },
  qz_why_day: {
    en: "Why we ask — what the phone really does all day decides which specs matter, more than any spec sheet.",
    bn: "কেন জানতে চাই — ফোনে সারাদিন আসলে কী হয়, সেটাই ঠিক করে কোন স্পেক জরুরি — স্পেকশিটের চেয়ে বেশি।"
  },
  qz_why_me: {
    en: "Why we ask — a student needs the best value that lasts years on a tight budget; we tune for that.",
    bn: "কেন জানতে চাই — শিক্ষার্থীর দরকার কম বাজেটে বছরের পর বছর টেকার মতো সেরা দামের ফোন; আমরা সেভাবেই খুঁজি।"
  },
  qz_why_out: {
    en: "Why we ask — long outdoor days need a screen readable in sunlight and a battery that lasts till night.",
    bn: "কেন জানতে চাই — সারাদিন বাইরে থাকলে রোদে পড়া যায় এমন স্ক্রিন আর রাত পর্যন্ত চলা ব্যাটারি লাগে।"
  },
  qz_next: { en: "Next", bn: "পরের প্রশ্ন" },
  qz_back: { en: "Back", bn: "আগের প্রশ্ন" },
  qz_skip: { en: "Skip — just show solid all-rounders", bn: "বাদ দিন — ভালো অলরাউন্ডার দেখান" },
  qz_done: { en: "Looks right — continue", bn: "ঠিক আছে — এগিয়ে যান" },
  qz_sum_t: { en: "What we understood", bn: "আমরা যা বুঝলাম" },
  qz_sum_s: {
    en: "Your answers set these priorities. Tap any answer below to change it.",
    bn: "আপনার উত্তর থেকেই এই অগ্রাধিকার ঠিক হলো। বদলাতে নিচের যেকোনো উত্তরে চাপ দিন।"
  },
  qz_sum_balanced: {
    en: "No single strong need — we'll hunt for dependable all-rounders with no weak spot.",
    bn: "আলাদা কোনো বড় চাহিদা নেই — দুর্বলতা-ছাড়া নির্ভরযোগ্য অলরাউন্ডার খুঁজব।"
  },
  qz_sum_note: {
    en: "Exactly this understanding goes to the ranking engine — in your words, not a preset box.",
    bn: "ঠিক এই বোঝাটাই র‍্যাঙ্কিং ইঞ্জিনে যায় — আপনার কথায়, কোনো বাঁধা ছকে ফেলে নয়।"
  },
  qz_rank_1: { en: "Top priority", bn: "সবচেয়ে জরুরি" },
  qz_rank_2: { en: "Also important", bn: "এটাও জরুরি" },
  qz_rank_3: { en: "Nice to have", bn: "থাকলে ভালো" },
  qz_r_who: { en: "Who", bn: "কার জন্য" },
  qz_r_me: { en: "You", bn: "আপনি" },
  qz_r_day: { en: "Daily use", bn: "দৈনন্দিন ব্যবহার" },
  qz_r_out: { en: "Outdoors", bn: "বাইরে থাকা" },
  qz_r_hw: { en: "Extras", bn: "বাড়তি ফিচার" },
  pw_camera: {
    en: "Camera — photos that actually look good, not megapixel marketing",
    bn: "ক্যামেরা — সত্যিই ভালো ছবি, মেগাপিক্সেলের বিজ্ঞাপন নয়"
  },
  pw_video: {
    en: "Video — steady, sharp footage front and back",
    bn: "ভিডিও — সামনে-পেছনে ঝাঁকুনিহীন, শার্প ফুটেজ"
  },
  pw_battery: {
    en: "Battery — comfortably lasts the whole day",
    bn: "ব্যাটারি — নিশ্চিন্তে সারাদিন চলে"
  },
  pw_gaming: {
    en: "Gaming — holds high frame rates without overheating",
    bn: "গেমিং — গরম না হয়ে ফ্রেমরেট ধরে রাখে"
  },
  pw_performance: {
    en: "Speed — stays fast for work and heavy apps",
    bn: "গতি — কাজ আর ভারী অ্যাপে দ্রুত থাকে"
  },
  pw_ease_of_use: {
    en: "Ease of use — simple, clear, no confusing bloat",
    bn: "সহজ ব্যবহার — সরল, স্পষ্ট, বিভ্রান্তিকর জঞ্জাল নেই"
  },
  adv_stats_t: { en: "Our data right now:", bn: "এই মুহূর্তে আমাদের ডেটা:" },
  adv_stats_phones: { en: "phones tracked", bn: "ফোন ট্র্যাকড" },
  adv_stats_specs: { en: "with full specs", bn: "পূর্ণ স্পেকসহ" },
  adv_stats_cards: { en: "evidence cards", bn: "এভিডেন্স কার্ড" },
  adv_stats_embedded: { en: "embedded for search", bn: "সার্চে এমবেডেড" },
  adv_stats_stock: { en: "in stock", bn: "স্টকে" },

  conn_rom: { en: "Custom ROM (LineageOS)", bn: "কাস্টম রম (LineageOS)" },
  exp_custom_rom: {
    en: "Only phones with an official LineageOS build today — verified from LineageOS itself, not guessed. These phones usually run GCam ports well too. Very few qualify (mostly Pixel, OnePlus, Nothing, a few Samsung/Xiaomi).",
    bn: "শুধু যে ফোনের অফিসিয়াল LineageOS বিল্ড আছে — LineageOS থেকেই যাচাই করা, অনুমান নয়। এই ফোনগুলোতে সাধারণত GCam পোর্টও ভালো চলে। খুব কম ফোনই তালিকায় আছে (মূলত Pixel, OnePlus, Nothing, কিছু Samsung/Xiaomi)।"
  },

  exp_regions: {
    en: "Strict filter: import-market labels come only from Rio International's pricelist. Most listings don't say their market, so with this on you'll see only the few phones with a matching labeled unit.",
    bn: "কড়া ফিল্টার: ইমপোর্ট-মার্কেট তথ্য শুধু Rio International-এর প্রাইসলিস্ট থেকে আসে। বেশিরভাগ লিস্টিং-এ এই তথ্য নেই, তাই এটি চালু করলে কেবল মিল থাকা অল্প কিছু ফোনই দেখবেন।"
  },
  exp_regions_off: {
    en: "Prefer units imported from specific markets. Labeled by only one source — expect few results when on.",
    bn: "নির্দিষ্ট বাজার থেকে আসা ইউনিট চাইলে বাছুন। মাত্র একটি সোর্স এই তথ্য দেয় — চালু করলে ফলাফল কম আসবে।"
  },

  exp_official: {
    en: "Heads up: only two of our eight sources actually say this — Rio International's pricelist labels official units, and everything on GadgetAndGear is official. The other shops don't disclose it, so real official phones may be missing here and some labels can be wrong. Treat this as a guide and confirm warranty at the shop.",
    bn: "সতর্কতা: আমাদের আটটি সোর্সের মাত্র দুটি এই তথ্য দেয় — Rio International-এর প্রাইসলিস্ট অফিসিয়াল ইউনিট চিহ্নিত করে, আর GadgetAndGear-এর সবকিছু অফিসিয়াল। বাকি দোকানগুলো এটা জানায় না, তাই আসল অফিসিয়াল ফোনও এখানে বাদ পড়তে পারে, কিছু লেবেল ভুলও হতে পারে। এটাকে ধারণা হিসেবে নিন, ওয়ারেন্টি দোকানে নিশ্চিত করুন।"
  },

  // ---- Simple/Advanced mode split (feedback #2) ----
  mode_simple: { en: "Simple", bn: "সহজ" },
  mode_advanced: { en: "Advanced", bn: "অ্যাডভান্সড" },
  mode_hint_simple: {
    en: "Just the essentials — budget, needs and a couple of basics. Best for most buyers.",
    bn: "শুধু জরুরি প্রশ্ন — বাজেট, চাহিদা আর দু-একটি বেসিক। বেশিরভাগ ক্রেতার জন্য এটাই সেরা।"
  },
  mode_hint_advanced: {
    en: "Every filter unlocked — software style, brand lists, must-have hardware, chipset and strict matching.",
    bn: "সব ফিল্টার খোলা — সফটওয়্যার স্টাইল, ব্র্যান্ড তালিকা, জরুরি হার্ডওয়্যার, চিপসেট আর কড়া যাচাই।"
  },
  exp_strict: {
    en: "ON: phones we haven't verified for your must-haves are dropped too — only confirmed matches show. Fewer, surer results.",
    bn: "চালু থাকলে যে ফোনের ফিচার এখনো যাচাই হয়নি সেগুলোও বাদ যাবে — শুধু নিশ্চিত মিলগুলো দেখবেন। ফলাফল কম, কিন্তু নির্ভরযোগ্য।"
  },

  // ---- post-results feedback ----
  feedback_q: { en: "Were these picks right for you?", bn: "এই পছন্দগুলো কি ঠিক ছিল?" },
  feedback_comment_up: { en: "Anything we could do even better? (optional)", bn: "আরও ভালো করতে পারতাম কোথায়? (ঐচ্ছিক)" },
  feedback_comment_down: { en: "What were you actually looking for?", bn: "আসলে কী খুঁজছিলেন?" },
  feedback_placeholder: { en: "e.g. I wanted something with better battery life…", bn: "যেমন: আরও ভালো ব্যাটারির ফোন খুঁজছিলাম…" },
  feedback_submit: { en: "Send feedback", bn: "মতামত পাঠান" },
  feedback_thanks: { en: "Thanks! That helps us improve.", bn: "ধন্যবাদ! এটা আমাদের উন্নতিতে সাহায্য করে।" },
  feedback_skip: { en: "Skip", bn: "বাদ দিন" },
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
