/* Minimal no-library i18n for the fixed UI chrome (nav, section labels,
   buttons, fit/channel phrases). The audience includes parents, so the
   navigation reads in Bangla; spec-derived prose verdicts stay English (they
   are generated server-side) but numbers render in Bangla digits when on BN.

   Usage: import { t, getLang, setLang }. Components call t("scores"); App owns
   the toggle and re-keys the tree on language change so everything re-reads. */

export type Lang = "en" | "bn";

const STRINGS: Record<string, { en: string; bn: string }> = {
  // SP1 static-page footer links
  footer_guides: { en: "Best phones by budget", bn: "বাজেট অনুযায়ী সেরা ফোন" },
  footer_support: { en: "Support us", bn: "সাপোর্ট করুন" },
  footer_tagline: { en: "AI-powered phone recommendations for Bangladesh", bn: "বাংলাদেশের জন্য এআই-চালিত ফোন সুপারিশ" },
  footer_compare: { en: "Compare phones", bn: "ফোন তুলনা করুন" },
  footer_home: { en: "Home", bn: "হোম" },
  // header / nav
  in_stock: { en: "phones tracked", bn: "ফোন ট্র্যাক করছি" },
  prices_loading: { en: "live prices", bn: "লাইভ দাম" },
  refreshed_today: { en: "refreshed today", bn: "আজ আপডেট হয়েছে" },
  refreshed_yesterday: { en: "refreshed yesterday", bn: "গতকাল আপডেট হয়েছে" },
  // ONE slogan sitewide (owner 2026-07-26): this is knowledge/site_config
  // "tagline", the same line the static pages' header and footer carry.
  brand_tagline: { en: "AI-powered phone recommendations for Bangladesh", bn: "বাংলাদেশের জন্য এআই-চালিত ফোন সুপারিশ" },
  nav_ask: { en: "Ask", bn: "খুঁজুন" },
  nav_pick: { en: "Personal pick", bn: "ব্যক্তিগত পছন্দ" },
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
  see_breakdown_sub: { en: "Every spec, every price, what owners say", bn: "সব স্পেক, সব দাম, ব্যবহারকারীদের কথা" },
  full_spec_sheet: { en: "See the full spec sheet", bn: "সম্পূর্ণ স্পেক শিট দেখুন" },
  spec_credit: { en: "Specifications from GSMArena. Prices and stock are ours, checked nightly against Bangladeshi shops.", bn: "স্পেসিফিকেশন GSMArena থেকে। দাম ও স্টক আমাদের, প্রতি রাতে বাংলাদেশি দোকানে যাচাই করা।" },
  if_stretch: { en: "If you stretch ↗", bn: "একটু বাড়ালে ↗" },
  // detail
  back_to_results: { en: "Back to results", bn: "ফলাফলে ফিরুন" },
  scores: { en: "Scores", bn: "স্কোর" },
  specs: { en: "Specs", bn: "স্পেক" },
  owner_voices: { en: "Owner voices", bn: "ব্যবহারকারীদের মত" },
  where_to_buy: { en: "Prices we checked", bn: "আমরা যেসব দাম যাচাই করেছি" },
  brand_ownership: { en: "Brand & ownership", bn: "ব্র্যান্ড ও মালিকানা" },
  who_its_for: { en: "Who it's for", bn: "কাদের জন্য" },
  official: { en: "Official", bn: "অফিসিয়াল" },
  unofficial: { en: "Unofficial", bn: "আনঅফিসিয়াল" },
  confirm_price: {
    en: "Call the shop to confirm price and stock before buying.",
    bn: "কেনার আগে দোকানে দাম ও স্টক নিশ্চিত করুন।"
  },
  best_price: { en: "Best price", bn: "সেরা দাম" },
  sellers: { en: "shops", bn: "দোকান" },
  variant_unknown: { en: "Variant not stated", bn: "ভ্যারিয়েন্ট উল্লেখ নেই" },
  all_sellers: { en: "All shops", bn: "সব দোকান" },
  shops_in_stock: { en: "shops in stock", bn: "দোকানে স্টকে আছে" },
  no_official_found: { en: "No official-channel listing found yet", bn: "এখনো কোনো অফিসিয়াল চ্যানেল লিস্টিং পাওয়া যায়নি" },
  no_unofficial_found: { en: "No unofficial import listing found yet", bn: "এখনো কোনো আনঅফিসিয়াল ইমপোর্ট লিস্টিং পাওয়া যায়নি" },
  shop_own: { en: "Run a shop and want your listings shown here?", bn: "দোকান চালান? আপনার লিস্টিং এখানে দেখাতে চান?" },
  shop_contact: { en: "Get in touch", bn: "যোগাযোগ করুন" },
  why_anon: {
    en: "We check every seller but keep them unnamed — no shop pays us to send you their way, and the price that matters is the one you confirm in person. Rows below show only what changes the price.",
    bn: "আমরা প্রতিটি বিক্রেতা যাচাই করি, তবে নাম দিই না — কোনো দোকান আমাদের টাকা দিয়ে আপনাকে পাঠায় না, আর আসল দাম সেটাই যা আপনি সরাসরি নিশ্চিত করেন। নিচের সারিতে শুধু যা দাম বদলায় তা-ই দেখানো হলো।"
  },
  carried_by: { en: "Carried by", bn: "পাওয়া যায়" },
  shops: { en: "shops", bn: "দোকানে" },

  // ---- the shop board. Shops are NAMED here now (owner 2026-08-04); the
  //      static /phone/ page and this screen render one derivation, so they
  //      can no longer disagree about who is cheapest. Still no links: naming
  //      a shop is disclosure, sending it traffic is a business we do not run.
  filter_all: { en: "All", bn: "সব" },
  filter_more: { en: "more", bn: "আরও" },
  clear_filters: { en: "Clear all filters", bn: "সব ফিল্টার মুছুন" },
  listings_word: { en: "listings", bn: "লিস্টিং" },
  from_word: { en: "from", bn: "থেকে" },
  cheapest_first: { en: "Cheapest first", bn: "সস্তা আগে" },
  cheapest_in_stock: { en: "Cheapest in stock", bn: "স্টকে সবচেয়ে সস্তা" },
  vs_cheapest: { en: "vs cheapest in stock", bn: "স্টকে সবচেয়ে সস্তার তুলনায়" },
  stock_unreported: { en: "Not reported", bn: "জানানো হয়নি" },
  show_all: { en: "Show all", bn: "সব দেখুন" },
  show_fewer: { en: "Show fewer listings", bn: "কম লিস্টিং দেখুন" },
  empty_combo: { en: "Nothing matches this combination", bn: "এই সমন্বয়ে কিছু মেলেনি" },
  empty_combo_help: {
    en: "Try clearing the colour or variant filter — most shops publish only one of them.",
    bn: "রঙ বা ভ্যারিয়েন্ট ফিল্টার সরিয়ে দেখুন — বেশিরভাগ দোকান দুটির একটিই জানায়।"
  },
  note_cheaper_out: {
    en: "{p} at {s} is lower, but that listing is out of stock.",
    bn: "{s}-এ {p} কম, কিন্তু ওই লিস্টিং স্টকে নেই।"
  },
  note_tied_one: { en: "1 other shop matches this price.", bn: "আরও ১টি দোকানে একই দাম।" },
  note_tied: { en: "{n} other shops match this price.", bn: "আরও {n}টি দোকানে একই দাম।" },
  note_below_next: { en: "{p} below the next shop with stock.", bn: "স্টক আছে এমন পরের দোকানের চেয়ে {p} কম।" },
  note_only_shop: { en: "The only shop reporting stock right now.", bn: "এই মুহূর্তে কেবল এই দোকানেই স্টক আছে।" },
  warranty_premium: {
    en: "On {v} the official BD warranty costs {p} more than the same configuration imported.",
    bn: "{v}-এ অফিসিয়াল বিডি ওয়ারেন্টির দাম একই কনফিগারেশনের ইমপোর্টের চেয়ে {p} বেশি।"
  },
  shop_names_note: {
    en: "Shop names and logos are listed for transparency, and belong to the shops themselves. We take no commission and link to no seller, so no shop can buy its way up this list.",
    bn: "স্বচ্ছতার জন্য দোকানের নাম ও লোগো দেওয়া হলো — সেগুলো দোকানের নিজস্ব সম্পত্তি। আমরা কোনো কমিশন নিই না, কোনো বিক্রেতার লিঙ্ক দিই না — তাই কেউ টাকা দিয়ে উপরে উঠতে পারে না।"
  },
  // kept verbatim in step with pages.py TRADEMARK_NOTE — one notice, two
  // codebases, and a reader who sees both should not see two wordings
  trademark_note: {
    en: "Shop logos, brand names and product names are the trademarks of their respective owners, shown only to identify who sells what. We are not affiliated with, endorsed by, or paid by any of them.",
    bn: "দোকানের লোগো, ব্র্যান্ড ও পণ্যের নাম তাদের নিজ নিজ মালিকের ট্রেডমার্ক — কে কী বিক্রি করছে তা বোঝাতেই কেবল দেখানো হয়েছে। তাদের কারও সঙ্গে আমাদের কোনো সম্পর্ক, অনুমোদন বা আর্থিক লেনদেন নেই।"
  },

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

  // ---- official signal. SP1 rule: the badge follows the SHOWN price's own
  //      channel; shops themselves stay anonymous in all ranker UI ----
  maybe_official: { en: "Maybe official", bn: "অফিসিয়াল হতে পারে" },
  official_bd: { en: "Official (BD warranty)", bn: "অফিসিয়াল (বিডি ওয়ারেন্টি)" },
  unofficial_import: { en: "Unofficial import", bn: "আনঅফিসিয়াল ইমপোর্ট" },
  official_from: { en: "Official from", bn: "অফিসিয়াল দাম" },
  // import market + config lines, mirroring the /best and /phone pages
  from: { en: "from", bn: "থেকে" },
  variants: { en: "Variants", bn: "ভ্যারিয়েন্ট" },
  markets: { en: "Import market", bn: "ইমপোর্ট মার্কেট" },
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
  live_from_gng: { en: "Found live online — not in our database", bn: "লাইভ খোঁজে পাওয়া — আমাদের ডেটাবেসে নেই" },
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
    en: "No source we keep freshly updated lists this in stock, so this price may be outdated.",
    bn: "আমরা যেসব উৎসের দাম নিয়মিত হালনাগাদ রাখি তাদের কেউ এটি স্টকে রাখেনি, তাই দামটি পুরনো হতে পারে।"
  },
  stock_in: { en: "In stock", bn: "স্টকে আছে" },
  in_stock_at: { en: "in stock at", bn: "স্টকে আছে" },
  shop_one: { en: "shop", bn: "দোকানে" },
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

  // ---- the single ask screen (spec 2026-08-07). One title for the whole
  // page, because there are no steps left to title separately.
  // owner: verify every bn string in this block.
  ask_title: { en: "Let's find your phone", bn: "চলুন আপনার ফোনটা খুঁজি" },
  ask_sub: {
    en: "Answer as much or as little as you like. Nothing here is required, and you can change any answer before you ask for results.",
    bn: "যতটুকু ইচ্ছা ততটুকু উত্তর দিন। কোনোটাই বাধ্যতামূলক নয়, আর ফলাফল দেখার আগে যেকোনো উত্তর বদলাতে পারবেন।" },

  // BudgetStep's own lines. These were hardcoded English, so a Bangla buyer
  // read them in English on the very first screen.
  q_budget_own: {
    en: "Type the number you can actually spend. Not sure? Start from one of these and edit it.",
    bn: "আপনি সত্যিই যত খরচ করতে পারবেন সেই সংখ্যাটা লিখুন। নিশ্চিত না হলে নিচের একটা থেকে শুরু করে বদলে নিন।" },
  q_budget_live_1: { en: "Live prices across", bn: "বাংলাদেশের" },
  q_budget_live_2: {
    en: "phones in Bangladesh. We look for the best fit, not the cheapest box.",
    bn: "ফোনের এখনকার দাম দেখা হচ্ছে। আমরা সবচেয়ে সস্তা নয়, সবচেয়ে মানানসই ফোনটা খুঁজি।" },

  // ---- the nine steps (spec 2026-08-08). Titles ask a question in words a
  // buyer would use; the `why` line says what the answer costs, and is always
  // visible rather than behind a tap.
  // owner: verify every bn string in this block.
  s_budget_ph: { en: "type your budget", bn: "আপনার বাজেট লিখুন" },
  s_budget_t: { en: "What can you spend?", bn: "কত টাকা খরচ করতে পারবেন?" },
  s_budget_why: { en: "Type your real number. We look for the best phone at it, not the cheapest.", bn: "আপনার সত্যিকার বাজেট লিখুন। আমরা এই দামে সেরা ফোন খুঁজি, সবচেয়ে সস্তাটা নয়।" },

  s_warranty_t: { en: "Do you want official warranty?", bn: "অফিশিয়াল ওয়ারেন্টি চান?" },
  s_warranty_why: { en: "Official phones cost more but a service centre will take them.", bn: "অফিশিয়াল ফোনের দাম বেশি, কিন্তু সার্ভিস সেন্টার নেবে।" },

  s_hardware_t: { en: "Anything it must have?", bn: "এমন কিছু আছে যা থাকতেই হবে?" },
  s_hardware_why: { en: "Most new phones dropped these. Asking for one cuts the list a lot.", bn: "বেশিরভাগ নতুন ফোনে এগুলো নেই। একটা চাইলেই তালিকা অনেক ছোট হয়।" },

  s_brands_t: { en: "Any brand you want, or don't?", bn: "কোনো ব্র্যান্ড চান, বা চান না?" },
  s_brands_why: { en: "Pick a favourite, or rule one out. Leaving this alone is fine.", bn: "পছন্দেরটা বেছে নিন, বা যেটা চান না বাদ দিন।" },

  s_type_t: { en: "Android or iPhone?", bn: "অ্যান্ডরয়েড না আইফোন?" },
  s_type_why: { en: "Two different worlds, and you cannot move apps between them. ", bn: "দুটো আলাদা জগৎ, অ্যাপ একটা থেকে আরকটায় নেওয়া যায় না। অ্যান্ডরয়েড বললে সফটওয়্যার নিয়ে পরে জিজ্ঞেস করব।" },

  s_power_t: { en: "Any chipset preference?", bn: "চিপসেট নিয়ে পছন্দ আছে?" },
  s_power_why: { en: "Most people have none, and that is the right answer. Skip it unless a game or an app you use needs one.", bn: "বেশিরভাগ মানুষের নেই, আর সেটাই সঠিক। কোনো গেম বা অ্যাপে দরকার না হলে বাদ দিন।" },

  s_market_t: { en: "Where was it made for?", bn: "কোন দেশের জন্য বানানো?" },
  s_market_why: { en: "An import market changes the software, the charger and who honours a repair.", bn: "ইমপোর্ট মার্কেট সফটওয়্যার, চার্জার আর রিপেয়ার বদলে দেয়।" },

  // "doesn't matter" is a first-class answer on the filter steps, so it is
  // worded as an ANSWER, not as a refusal to answer.
  s_skip: { en: "Skip", bn: "স্কিপ" },
  s_skip_need: { en: "I'm not sure", bn: "আমি নিশ্চিত নই" },
  s_skip_warranty: { en: "Doesn't matter", bn: "কোনো সমস্যা নেই" },
  s_skip_hardware: { en: "None of these", bn: "এগুলোর কোনোটাই নয়" },
  s_skip_brands: { en: "Any brand is fine", bn: "যেকোনো ব্র্যান্ড চলবে" },
  s_skip_type: { en: "Either is fine", bn: "যেকোনোটাই চলবে" },
  s_skip_power: { en: "Whatever fits the budget", bn: "বাজেটে যা হয়" },
  s_skip_market: { en: "Doesn't matter", bn: "কোনো সমস্যা নেই" },

  s_ram_6: { en: "6GB RAM", bn: "৬জিবি র্‍যাম" },
  s_ram_8: { en: "8GB RAM", bn: "৮জিবি র্‍যাম" },
  s_ram_12: { en: "12GB RAM", bn: "১২জিবি র্‍যাম" },
  s_rom_128: { en: "128GB storage", bn: "১২৮জিবি স্টোরেজ" },
  s_rom_256: { en: "256GB storage", bn: "২৫৬জিবি স্টোরেজ" },
  s_rom_512: { en: "512GB storage", bn: "৫১২জিবি স্টোরেজ" },

  // brand and market names are proper nouns -- identical in both languages,
  // and listed anyway so the both-languages test covers them
  brand_Samsung: { en: "Samsung", bn: "Samsung" },
  brand_Xiaomi: { en: "Xiaomi", bn: "Xiaomi" },
  brand_vivo: { en: "vivo", bn: "vivo" },
  brand_OnePlus: { en: "OnePlus", bn: "OnePlus" },
  brand_realme: { en: "realme", bn: "realme" },
  brand_Apple: { en: "Apple", bn: "Apple" },
  mkt_IN: { en: "India", bn: "ভারত" },
  mkt_Global: { en: "Global", bn: "গ্লোবাল" },
  mkt_CN: { en: "China", bn: "চীন" },
  mkt_US: { en: "USA", bn: "ইউএসএ" },
  mkt_JP: { en: "Japan", bn: "জাপান" },
  mkt_SG: { en: "Singapore", bn: "সিঙ্গাপুর" },
  mkt_AU: { en: "Australia", bn: "অস্ট্রেলিয়া" },

  // the frame
  s_of: { en: "of", bn: "এর মধ্যে" },
  s_back: { en: "Back", bn: "ফিরে যান" },
  s_see_n: { en: "see", bn: "দেখুন" },
  s_commit: { en: "Find my phone", bn: "আমার ফোন খুঁজুন" },
  s_brief_t: { en: "What we will look for", bn: "যা খুঁজব" },

  // ---- the restructure (owner walk-through 2026-08-08). The channel got its
  // own screen, the platform/skin and chipset/memory pairs were split, and the
  // overflow lists moved into sheets.
  // owner: verify every bn string in this block.
  s_channel_t: { en: "Official set, or unofficial?", bn: "অফিশিয়াল না আনঅফিশিয়াল?" },
  s_channel_why: { en: "The same phone is sold both ways in Bangladesh, at two different prices.", bn: "অফিশিয়ালের দাম বেশি, তবে সার্ভিস সেন্টার নেবে। আনঅফিশিয়াল সস্তা আর অনেক বেশি পছন্দ, কিন্তু রিপেয়ার নিজের।" },
  s_skip_channel: { en: "Unofficial is fine", bn: "আনঅফিশিয়াল হলেও চলবে" },
  s_market_open: { en: "Choose an import market", bn: "ইমপোর্ট মার্কেট বাছুন" },

  s_brands_hide: { en: "Hide a brand instead", bn: "বরং কোনো ব্র্যান্ড লুকান" },
  s_skin_t: { en: "And the software?", bn: "আর সফটওয়্যার?" },
  s_storage_t: { en: "How much storage? (what it can hold)", bn: "কত স্টোরেজ? (কতটা জমা রাখবে)" },
  s_strict_t: { en: "How strict?", bn: "কতটা কঠোর?" },

  s_memory_t: { en: "How much memory?", bn: "কতটুকু মেমরি?" },
  s_memory_why: { en: "A floor, not a target. More RAM and storage cost money you could spend on the camera instead.", bn: "এটা সর্বনিম্ন, লক্ষ্য নয়। বেশি র্‍যাম আর স্টোরেজের টাকা ক্যামেরায় যেতে পারত।" },
  s_skip_memory: { en: "Whatever fits the budget", bn: "বাজেটে যা হয়" },

  // ---- flow-graph screens (spec 2026-08-08). elderly fork, rechannel divert,
  // china-vs-global software, custom-rom support. owner: verify every bn string.
  s_elderly_t: { en: "Is this phone for an elderly person?", bn: "এই ফোনটি কি কোনো বয়স্ক মানুষের জন্য?" },
  s_elderly_why: { en: "We'll keep it simple — clear text, real service, no confusing extras.", bn: "আমরা সহজ রাখব — বড় পরিষ্কার লেখা, আসল সার্ভিস, কোনো ঝামেলা নয়।" },
  s_elderly_yes: { en: "Yes, for an elder", bn: "হ্যাঁ, বয়স্কদের জন্য" },
  s_elderly_yes_sub: { en: "We'll pick an easy, reliable phone", bn: "আমরা সহজ, নির্ভরযোগ্য ফোন বাছব" },
  s_elderly_no: { en: "No, general use", bn: "না, সাধারণ ব্যবহারে" },
  s_elderly_no_sub: { en: "A few quick questions instead", bn: "বদলে কয়েকটা দ্রুত প্রশ্ন" },

  s_rechannel_t: { en: "Very few official phones at this budget", bn: "এই বাজেটে অফিশিয়াল ফোন খুব কম" },
  s_rechannel_why: { en: "Unofficial sets cost less and there are far more of them. Include them?", bn: "আনঅফিশিয়াল সেট সস্তা আর অনেক বেশি। যোগ করব?" },
  s_rechannel_widen: { en: "Yes, include unofficial", bn: "হ্যাঁ, আনঅফিশিয়াল যোগ করুন" },
  s_rechannel_widen_sub: { en: "Far more phones at this price. The shop's warranty, usually 10 days.", bn: "এই দামে অনেক বেশি ফোন। ওয়ারেন্টি দোকানের, সাধারণত ১০ দিন।" },
  s_rechannel_keep: { en: "No, official only", bn: "না, শুধু অফিশিয়াল" },
  s_rechannel_keep_sub: { en: "Stay official. We'll take you back to the budget so you can raise it.", bn: "অফিশিয়ালই থাকুক। বাজেটে ফিরিয়ে নিচ্ছি, বাড়াতে পারবেন।" },
  s_soft_t: { en: "Global software, or is a China ROM fine?", bn: "গ্লোবাল সফটওয়্যার, না চায়না রম চলবে?" },
  s_soft_why: { en: "China-ROM phones cost less but need a software flash for Google apps and English.", bn: "চায়না-রম ফোন সস্তা, কিন্তু গুগল অ্যাপ আর ইংরেজির জন্য সফটওয়্যার ফ্ল্যাশ লাগে।" },
  s_soft_global: { en: "Global software only", bn: "শুধু গ্লোবাল সফটওয়্যার" },
  s_soft_global_sub: { en: "Works out of the box", bn: "খুলেই ব্যবহার করা যায়" },
  s_soft_cn: { en: "A China ROM is fine", bn: "চায়না রম চলবে" },
  s_soft_cn_sub: { en: "Cheaper, if you'll flash it", bn: "সস্তা, যদি ফ্ল্যাশ করেন" },

  s_rom_support_t: { en: "Custom ROM support?", bn: "কাস্টম রম সাপোর্ট?" },
  // the add-another-priority popup (spec 2026-08-08 §5). owner: verify bn.
  s_more_t: { en: "Add another priority?", bn: "আরেকটা অগ্রাধিকার যোগ করবেন?" },
  s_more_body: { en: "You can add as many as you like. Each one counts less than the one before, so your first choice always leads.", bn: "যত খুশি যোগ করতে পারেন। প্রতিটা আগেরটার চেয়ে কম গোনা হয়, তাই আপনার প্রথম পছন্দই সবসময় এগিয়ে থাকে।" },
  s_more_yes: { en: "Add one more", bn: "আরেকটা যোগ করুন" },
  s_more_no: { en: "No, that's all", bn: "না, এটুকুই" },
  // the shrinking priority ladder on the needN screen (spec 2026-08-08 §5.1):
  // the warning is SHOWN as each added priority's real share, not scolded.
  s_prio_ladder_t: { en: "Your priorities, strongest first", bn: "আপনার অগ্রাধিকার, সবচেয়ে জরুরিটা আগে" },
  s_prio_share: { en: "counts about {pct}% as much as your top pick", bn: "আপনার প্রথম পছন্দের প্রায় {pct}% গোনা হয়" },

  s_sheet_done: { en: "Done", bn: "হয়েছে" },

  // ---- owner round 2, 2026-08-08. Official and unofficial are two answers
  // with two prices, so both are spelled out; the choices-so-far bar keeps
  // the earlier answers on screen; the second need question names the first
  // one back, so the two stop reading as the same question twice.
  // owner: verify every bn string in this block.
  s_official: { en: "Official", bn: "অফিশিয়াল" },
  s_official_sub: { en: "Brand warranty and a service centre that will take it. Costs more, fewer models.", bn: "ব্র্যান্ড ওয়ারেন্টি আর সার্ভিস সেন্টার নেবে। দাম বেশি, মডেল কম।" },
  s_unofficial: { en: "Unofficial", bn: "আনঅফিশিয়াল" },
  s_unofficial_sub: { en: "Costs less and far more models to choose from. Warranty is the shop's, usually 10 days.", bn: "দাম কম, বাছাইয়ের মডেলও অনেক বেশি। ওয়ারেন্টি দোকানের, সাধারণত ১০ দিন।" },

  s_sofar: { en: "So far", bn: "এ পর্যন্ত" },
  s_echo: { en: "You said this matters most:", bn: "আপনি বলেছেন এটাই সবচেয়ে জরুরি:" },

  // ---- owner round 3, 2026-08-08. A size is a number a buyer cannot price,
  // so every one says what it actually buys; and an option that would empty
  // the results asks before it does it.
  // owner: verify every bn string in this block.
  s_ram_6_sub: { en: "Chat, browsing, a couple of apps at once.", bn: "চ্যাট, ব্রাউজিং, একসাথে দু‘টা অ্যাপ।" },
  s_ram_8_sub: { en: "Comfortable for years. Most people should stop here.", bn: "কয়েক বছর আরামে চলবে। বেশিরভাগের এখানেই থামা উচিত।" },
  s_ram_12_sub: { en: "Only for heavy games or many apps kept open.", bn: "ভারি গেম বা অনেক অ্যাপ খুলে রাখলেই দরকার।" },
  s_rom_128_sub: { en: "Enough unless you shoot a lot of video.", bn: "অনেক ভিডিও করা না হলে যথেষ্ট।" },
  s_rom_256_sub: { en: "Years of photos without deleting anything.", bn: "কিছু মুছতে হবে না -- বছরের পর বছর ছবি।" },
  s_rom_512_sub: { en: "Only if you keep everything on the phone, offline.", bn: "সব ফোনেই রাখলে তবেই।" },

  s_narrow_t: { en: "That cuts a lot", bn: "এতে অনেক কমে যাবে" },
  s_narrow_body: { en: "This leaves {n} phones out of {m}. You can still change it later.", bn: "{m}টার মধ্যে শুধু {n}টা থাকবে। পরে বদলানো যাবে।" },
  s_narrow_yes: { en: "Keep it", bn: "রাখুন" },
  s_narrow_no: { en: "Never mind", bn: "থাক" },

  // ---- short forms, for the brief bar only. The quiz labels are whole
  // sentences ("Photos that actually look good"), which is right where the
  // buyer is deciding and wrong in a bar that restates three answers at 375px
  // -- measured, it made the bar 233px tall, 29% of the viewport.
  // owner: verify every bn string in this block.
  qs_camera: { en: "Camera", bn: "ক্যামেরা" },
  qs_battery: { en: "Battery", bn: "ব্যাটারি" },
  qs_speed: { en: "Speed", bn: "স্পিড" },
  qs_simple: { en: "Simple to use", bn: "সহজ" },
  qs_gaming: { en: "Gaming", bn: "গেমিং" },
  qs_video: { en: "Video", bn: "ভিডিও" },
  brief_more: { en: "+{n} more", bn: "আরও {n}টি" },

  // ---- the brief bar. An unanswered clause says so in words rather than
  // going blank, so the bar never looks complete when it is not.
  // owner: verify every bn string in this block.
  brief_need_none: { en: "no preference yet", bn: "এখনো কিছু বাছা হয়নি" },
  brief_filters_none: { en: "no filters", bn: "কোনো শর্ত নেই" },
  brief_change: { en: "tap to change", bn: "বদলাতে চাপ দিন" },

  // ---- filter groups (spec 2026-08-07 section 4.2). Labels name the OUTCOME,
  // not the feature: a buyer knows what "works as a TV remote" means and has
  // never heard of an IR blaster. Every help line is ALWAYS visible, never
  // behind a tap, and says what the control costs as well as what it does.
  // owner: verify every bn string in this block.
  fg_warranty: { en: "Official warranty only", bn: "শুধু অফিশিয়াল ওয়ারেন্টি" },
  fg_warranty_help: {
    en: "Only phones sold through the brand's Bangladesh distributor, so the brand fixes it if it breaks. Costs more, and most shops here sell imported stock instead.",
    bn: "শুধু সেসব ফোন যেগুলো ব্র্যান্ডের বাংলাদেশ ডিস্ট্রিবিউটরের মাধ্যমে বিক্রি হয় — নষ্ট হলে ব্র্যান্ড নিজে ঠিক করে দেয়। দাম একটু বেশি, আর দেশের বেশিরভাগ দোকান ইমপোর্ট করা ফোন বিক্রি করে।" },
  fg_warranty_on: { en: "official only", bn: "শুধু অফিশিয়াল" },

  fg_hardware: { en: "Things it must have", bn: "যা থাকতেই হবে" },
  fg_hardware_help: {
    en: "Pick only what you truly need. Each one drops every phone without it, and these parts are getting rare on new phones.",
    bn: "সত্যিই যা দরকার শুধু সেটাই বাছুন। একেকটা বাছলে যেসব ফোনে ওটা নেই সব বাদ পড়বে, আর নতুন ফোনে এগুলো এখন কমই থাকে।" },
  fg_hw_jack: { en: "Headphone jack", bn: "হেডফোন জ্যাক" },
  fg_hw_ir: { en: "Works as a TV / AC remote", bn: "টিভি বা এসির রিমোট হিসেবে চলে" },
  fg_hw_fm: { en: "FM radio without internet", bn: "ইন্টারনেট ছাড়া এফএম রেডিও" },

  fg_avoid: { en: "Brands to avoid", bn: "যেসব ব্র্যান্ড বাদ" },
  fg_avoid_help: {
    en: "Hides brands you do not want to see at all. Leave this alone unless you have a reason.",
    bn: "যেসব ব্র্যান্ড একদমই দেখতে চান না সেগুলো লুকিয়ে দেয়। কারণ না থাকলে এটা ছুঁয়ে দেখার দরকার নেই।" },
  fg_avoid_cn: { en: "Chinese brands", bn: "চীনা ব্র্যান্ড" },

  fg_type: { en: "Kind of phone", bn: "কেমন ফোন" },
  fg_type_help: {
    en: "iPhone or Android, and whether you want plain software or one packed with extra features.",
    bn: "আইফোন না অ্যান্ড্রয়েড, আর সফটওয়্যার সাদামাটা চান নাকি অনেক ফিচারে ভরা।" },
  fg_platform_android: { en: "Android", bn: "অ্যান্ড্রয়েড" },
  fg_platform_ios: { en: "iPhone", bn: "আইফোন" },
  fg_os_clean: { en: "plain software", bn: "সাদামাটা সফটওয়্যার" },
  fg_os_feature: { en: "feature-packed", bn: "ফিচারে ভরা" },

  fg_power: { en: "Speed and memory floor", bn: "স্পিড আর মেমোরির সর্বনিম্ন" },
  fg_power_help: {
    en: "Sets a minimum so slower phones drop out. Higher is not automatically better value — a big number costs money you could have spent on the camera or the battery.",
    bn: "একটা সর্বনিম্ন ঠিক করে দেয়, যাতে ধীর ফোনগুলো বাদ পড়ে। বেশি মানেই ভালো দাম নয় — বড় সংখ্যার পেছনে যে টাকা যায়, সেটা ক্যামেরা বা ব্যাটারিতেও দেওয়া যেত।" },
  fg_soc_snapdragon: { en: "Snapdragon", bn: "স্ন্যাপড্রাগন" },
  fg_soc_mediatek: { en: "MediaTek", bn: "মিডিয়াটেক" },

  fg_only: { en: "Only these brands", bn: "শুধু এই ব্র্যান্ডগুলো" },
  fg_only_help: {
    en: "Shows nothing except the brands you pick. Strict — one or two can leave very few phones.",
    bn: "আপনি যেগুলো বাছবেন তার বাইরে কিছুই দেখাবে না। কড়া নিয়ম — এক-দুইটা বাছলে খুব কম ফোনই থাকতে পারে।" },

  fg_market: { en: "Which country it was made for", bn: "কোন দেশের জন্য বানানো" },
  fg_market_help: {
    en: "Imported phones are built for one market. An India unit takes two SIMs; a China unit may have no Play Store. Leave this alone unless you know you need it.",
    bn: "ইমপোর্ট করা ফোন এক-একটা দেশের জন্য বানানো। ইন্ডিয়ার ইউনিটে দুইটা সিম চলে; চীনের ইউনিটে প্লে স্টোর না-ও থাকতে পারে। দরকার আছে নিশ্চিত না হলে এটা ছোঁবেন না।" },
  fg_rom_on: { en: "custom ROM support", bn: "কাস্টম রম চলে" },
  fg_strict_on: { en: "verified only", bn: "শুধু যাচাই করা" },

  fg_any: { en: "any", bn: "যেকোনো" },
  fg_tier2: { en: "More controls", bn: "আরও অপশন" },
  fg_of: { en: "of", bn: "টির মধ্যে" },
  fg_zero: { en: "nothing matches", bn: "কিছুই মেলে না" },
  s_ram_t: { en: "How much RAM? (what it can juggle)", bn: "কত RAM? (একসাথে কতটা সামলাবে)" },
  s_reset_no: { en: "Keep my answers", bn: "উত্তরগুলো থাক" },
  s_reset_yes: { en: "Yes, clear it all", bn: "হ্যাঁ, সব মুছুন" },
  s_reset_body: { en: "This clears every answer and takes you back to the first question.", bn: "এতে আপনার সব উত্তর মুছে যাবে আর প্রথম প্রশ্নে ফিরে যাবেন।" },
  s_reset_t: { en: "Start over?", bn: "নতুন করে শুরু করবেন?" },
  s_clear_one: { en: "Clear {what}", bn: "{what} মুছে ফেলুন" },
  s_reset: { en: "Start over", bn: "নতুন করে শুরু" },
  s_commit_none: { en: "Nothing matches all of these together. Take one back above.", bn: "সবগুলো একসাথে মেলে এমন কিছু নেই। উপর থেকে একটা বাদ দিন।" },
  s_budget_none_use: { en: "Use {price}", bn: "{price} ব্যবহার করুন" },
  s_budget_none_body: { en: "No phone in Bangladesh matches this amount with your answers. Try a higher number.", bn: "আপনার উত্তরগুলোর সাথে এই টাকায় বাংলাদেশে কোনো ফোন মেলে না। একটু বেশি লিখে দেখুন।" },
  s_budget_none_floor: { en: "The cheapest phone we can find right now is {price}. Below that there is nothing to recommend.", bn: "এখন সবচেয়ে সস্তা যে ফোনটা পাওয়া যাচ্ছে সেটা {price}। এর নিচে সাজেস্ট করার মতো কিছু নেই।" },
  s_budget_none_t: { en: "Nothing sells at this budget", bn: "এই বাজেটে কোনো ফোন নেই" },
  fg_n_of_m: { en: "{n} of {m}", bn: "{m}টির মধ্যে {n}" },
  fg_clear: { en: "Clear", bn: "মুছে দিন" },

  // ---- the narrow-down nudge. owner: verify every bn string.
  ns_title: { en: "Want to narrow it down first?", bn: "আগে আরেকটু কমিয়ে নেবেন?" },
  ns_body: {
    en: "{n} phones fit your budget right now. One or two filters make the pick sharper — or skip this, it is optional.",
    bn: "এখন আপনার বাজেটে {n}টি ফোন মিলছে। দু-একটা শর্ত দিলে বাছাই আরও নিখুঁত হয় — না চাইলে বাদ দিন, এটা বাধ্যতামূলক নয়।" },
  ns_no: { en: "No, show them now", bn: "না, এখনই দেখান" },
  ns_yes: { en: "Narrow it down", bn: "কমিয়ে নিই" },
  ns_dismiss: { en: "Close", bn: "বন্ধ করুন" },

  // ---- forced-choice quiz (spec section 7). The old quiz asked what you DO;
  // this asks what you would GIVE UP, because a recommendation is a choice
  // under a budget. Two questions, single answer each, ordered = weighted. ----
  qc_q1: { en: "Same money. What must this phone do best?",
           bn: "একই টাকায় — ফোনটা কোন কাজে সবচেয়ে ভালো হতে হবে?" },
  qc_q1_why: {
    en: "One phone cannot be best at everything at this price — something always gives. Whatever you pick here, we hunt for first.",
    bn: "এই দামে একটা ফোন সব দিকেই সেরা হয় না — কিছু না কিছু ছাড়তেই হয়। এখানে যা বাছবেন, আমরা সেটাই আগে খুঁজব।"
  },
  qc_q2: { en: "What else matters? Add as many as you like.", bn: "আর কী কী জরুরি? যত খুশি যোগ করুন।" },
  qc_q2_why: { en: "Tap them in the order they matter to you. Each one counts for less than the one above it -- the bars show exactly how much.", bn: "যেই ক্রমে জরুরি, সেই ক্রমেই চাপুন। প্রতিটা এর উপরেরটার চেয়ে কম গোনা হয় -- পাশের বারগুলোতে কতটা দেখা যাচ্ছে।" },
  qc_camera: { en: "Photos that actually look good", bn: "ছবি — যেন সত্যিই ভালো ওঠে" },
  qc_battery: { en: "Battery that lasts into day two", bn: "ব্যাটারি — দ্বিতীয় দিনেও যেন চার্জ থাকে" },
  qc_speed: { en: "Speed that never stutters", bn: "স্পিড — কখনো যেন আটকে না যায়" },
  qc_simple: { en: "Simple to use, nothing confusing", bn: "সহজ — বড় স্পষ্ট লেখা, ঝামেলা নেই" },
  qc_gaming: { en: "Heavy games running smooth", bn: "গেমিং — হেভি গেম স্মুথ চলবে" },
  qc_video: { en: "Video and reels that look sharp", bn: "ভিডিও-রিল — যেন ঝকঝকে হয়" },
  qc_hw_why: {
    en: "These are dealbreakers, not preferences — tick one and every phone without it is dropped. Pick as many as you truly need.",
    bn: "এগুলো শখ নয়, শর্ত — টিক দিলে যেসব ফোনে নেই সব বাদ পড়বে। সত্যিই যা যা লাগবে, তত গুলোই বাছুন।"
  },
  qc_r_first: { en: "Most important", bn: "সবচেয়ে জরুরি" },
  qc_r_second: { en: "Then", bn: "এরপর" },
  qc_r_hw: { en: "Must have", bn: "থাকতেই হবে" },
  qc_none: { en: "—", bn: "—" },
  qc_skip_q2: { en: "Only the first matters to me", bn: "আমার কাছে প্রথমটাই আসল" },

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
  qz_skip: { en: "Skip the rest", bn: "বাকিটা বাদ দিন" },
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
    en: "Strict filter: import-market labels come from a single source's pricelist. Most listings don't say their market, so with this on you'll see only the few phones with a matching labeled unit.",
    bn: "কড়া ফিল্টার: ইমপোর্ট-মার্কেট তথ্য মাত্র একটি উৎস থেকে আসে। বেশিরভাগ লিস্টিং-এ এই তথ্য নেই, তাই এটি চালু করলে কেবল মিল থাকা অল্প কিছু ফোনই দেখবেন।"
  },
  exp_regions_off: {
    en: "Prefer units imported from specific markets. Labeled by only one source — expect few results when on.",
    bn: "নির্দিষ্ট বাজার থেকে আসা ইউনিট চাইলে বাছুন। মাত্র একটি সোর্স এই তথ্য দেয় — চালু করলে ফলাফল কম আসবে।"
  },

  exp_official: {
    en: "Heads up: only two of our eight sources actually disclose this — the rest don't say. Real official phones may be missing here and some labels can be wrong. Treat this as a guide and confirm warranty at the shop.",
    bn: "সতর্কতা: আমাদের আটটি উৎসের মাত্র দুটি এই তথ্য দেয়, বাকিরা জানায় না — তাই আসল অফিসিয়াল ফোনও এখানে বাদ পড়তে পারে, কিছু লেবেল ভুলও হতে পারে। এটাকে ধারণা হিসেবে নিন, ওয়ারেন্টি দোকানে নিশ্চিত করুন।"
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

/* Every key in the table, for checks. A key the UI asks for but the table
   lacks renders as the raw key name, which ships to a buyer as gibberish and
   is invisible in review — so it is worth asserting on rather than eyeballing. */
export const STRING_KEYS = Object.keys(STRINGS);

/** True only when BOTH languages carry real text for this key. */
export function hasBothLangs(key: string): boolean {
  const e = STRINGS[key];
  return !!e && !!e.en.trim() && !!e.bn.trim();
}

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
