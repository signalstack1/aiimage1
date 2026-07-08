/**
 * ─────────────────────────────────────────────────────────
 *  APP CONFIG  —  edit this file to white-label the template
 * ─────────────────────────────────────────────────────────
 *
 * Every user-facing string, colour, and piece of copy lives here.
 * The rest of the codebase imports from this file — nowhere else
 * contains hardcoded brand names, colours, or business copy.
 *
 * After cloning:
 *  1. Change appName, tagline, supportEmail, legalName
 *  2. Replace hero / stats / howItWorks / testimonials / faqs
 *  3. Update planFeatures to match your plan names in the DB
 *  4. Optionally change primaryColor (HSL string, e.g. "270 70% 55%")
 *  5. Pick a BUSINESS_PRESET or configure adminModules manually
 */

export const APP_CONFIG = {
  // ── Identity ─────────────────────────────────────────────
  appName: "Master Template",
  tagline: "Precision Trading Signals",
  description:
    "Professional-grade trading signals across Crypto, Forex, and Stocks — delivered instantly to Discord and Telegram.",
  supportEmail: "support@example.com",
  /** Name used in legal pages and copyright notice */
  legalName: "SignalStack",
  /** One-liner describing what the business does — used in legal/disclaimer copy */
  businessType: "educational trading signal information",

  // ── Theme ─────────────────────────────────────────────────
  /**
   * Primary brand colour as an HSL value WITHOUT the hsl() wrapper.
   * e.g. "270 70% 55%"  →  purple
   *      "142 76% 36%"  →  green
   *      "199 89% 48%"  →  cyan (default — matches index.css)
   * Set to null to keep the default from index.css unchanged.
   */
  primaryColor: null as string | null,

  // ── Hero section ──────────────────────────────────────────
  hero: {
    badge: "Live signals · 68–72% win rate · 800+ active traders",
    headlinePlain: "Trade smarter with",
    headlineGradient: "precision signals",
    subtext:
      "Professional-grade trading signals across Crypto, Forex, and Stocks — delivered instantly to Discord and Telegram with full entry, target, and stop-loss levels.",
    ctaPrimary: "Start with Starter — $29/mo",
  },

  // ── Stats bar ─────────────────────────────────────────────
  stats: [
    { value: "68–72%", label: "Historical win rate" },
    { value: "3+ yrs", label: "Live track record" },
    { value: "800+", label: "Active subscribers" },
    { value: "4,500+", label: "Signals published" },
  ],

  // ── Sample items (card grid under "Results") ──────────────
  sampleSectionTitle: "What our signals look like",
  sampleSectionSubtext:
    "Every signal is clear, actionable, and includes everything you need to execute the trade.",
  sampleItems: [
    {
      asset: "BTC/USDT",
      dir: "LONG" as "LONG" | "SHORT",
      entry: "$41,200",
      tp: ["$43,500", "$46,000", "$49,800"],
      sl: "$39,400",
      result: "+18.4%",
      market: "Crypto",
    },
    {
      asset: "EUR/USD",
      dir: "SHORT" as "LONG" | "SHORT",
      entry: "1.0850",
      tp: ["1.0780", "1.0710", "1.0640"],
      sl: "1.0910",
      result: "+12.1%",
      market: "Forex",
    },
    {
      asset: "AAPL",
      dir: "LONG" as "LONG" | "SHORT",
      entry: "$178.50",
      tp: ["$185.00", "$191.00"],
      sl: "$173.00",
      result: "+7.8%",
      market: "Stocks",
    },
  ],

  // ── How it works ──────────────────────────────────────────
  howItWorks: [
    {
      step: "01",
      title: "Choose a plan",
      desc: "Pick the plan that fits your needs. Pay securely via Whop — cancel monthly plans anytime.",
    },
    {
      step: "02",
      title: "Get instant access",
      desc: "After payment you immediately receive your private Discord and Telegram invite links on the confirmation page.",
    },
    {
      step: "03",
      title: "Follow the signals",
      desc: "Receive real-time alerts with full trade details — entry, targets, and stop-loss. Execute and track your results.",
    },
  ],

  // ── Testimonials ──────────────────────────────────────────
  testimonialsSectionTitle: "Trusted by 800+ traders",
  testimonialsSectionSubtext: "Real members, real results.",
  testimonials: [
    { name: "Alex R.", handle: "@alexr_trades", text: "Turned $5k into $18k in 3 months just following these signals. Best investment I've made.", stars: 5 },
    { name: "Maria C.", handle: "@mariac_fx", text: "The Forex calls are incredibly precise. Win rate is consistently above 70%. Absolutely worth it.", stars: 5 },
    { name: "James T.", handle: "@jamest_crypto", text: "I've tried 4 other signal groups. This is the only one that actually explains the reasoning.", stars: 5 },
    { name: "Priya S.", handle: "@priya_trader", text: "The live Q&A sessions alone are worth the Pro subscription. Learned so much in 2 months.", stars: 5 },
    { name: "Tom B.", handle: "@tombtrades", text: "Fast signals, clean Discord, great community. Went Lifetime after the first month.", stars: 5 },
    { name: "Nina W.", handle: "@ninaw_fx", text: "Finally a signal provider that is transparent about losses too. Real trust-building.", stars: 5 },
  ],

  // ── Pricing section ───────────────────────────────────────
  pricingTitle: "Simple, transparent pricing",
  pricingSubtext:
    "No hidden fees. Cancel monthly plans anytime. Lifetime is one payment, forever.",

  planFeatures: {
    starter: {
      features: ["3–5 signals per week", "Crypto & Forex coverage", "Entry, TP & stop-loss levels", "Discord + Telegram access", "Weekly market recap"],
      highlight: false,
    },
    pro: {
      features: ["10–15 signals per week", "All markets (Crypto, Forex, Stocks)", "Entry, TP & stop-loss levels", "Discord + Telegram VIP channel", "Real-time alert notifications", "Weekly live Q&A session", "Full trade rationale included"],
      highlight: true,
    },
    "lifetime vip": {
      features: ["Everything in Pro, forever", "Priority 1-on-1 signal alerts", "All future plan upgrades included", "Discord + Telegram VIP lifetime", "Private group access"],
      highlight: false,
    },
  } as Record<string, { features: string[]; highlight: boolean }>,

  // ── FAQ ───────────────────────────────────────────────────
  faqs: [
    { q: "How are signals delivered?", a: "All signals are delivered instantly to both our private Discord server and Telegram channel. You'll get a notification the moment a new signal is posted." },
    { q: "What markets do you cover?", a: "We cover Crypto (BTC, ETH, altcoins), Forex (major and minor pairs), and Stocks/Options. The Starter plan covers Crypto & Forex; Pro covers all markets." },
    { q: "What does a signal include?", a: "Every signal includes the asset, direction (long/short), entry price, take-profit targets (TP1, TP2, TP3), and a stop-loss level. Pro subscribers also receive the full trade rationale." },
    { q: "Can I cancel anytime?", a: "Monthly plans can be cancelled anytime — no contracts, no hidden fees. Your access continues until the end of your billing period." },
    { q: "How do I get access after paying?", a: "Immediately after payment you'll receive your Discord and Telegram invite links on the confirmation page and via email." },
    { q: "What's your win rate?", a: "Our historical win rate across all signals is ~68–72%. We publish our full track record, including losses, in the Discord so you can verify everything yourself." },
  ],

  // ── Final CTA ─────────────────────────────────────────────
  finalCta: {
    headline: "Ready to get your edge?",
    subtext: "Join 800+ traders already using our signals to trade smarter every day.",
    buttonText: "Choose a Plan",
  },

  // ── Legal pages ───────────────────────────────────────────
  disclaimerParagraphs: [
    "Trading financial instruments involves significant risk and is not suitable for all investors. Past performance is not indicative of future results.",
    "We provide educational information only. Nothing on this site constitutes financial advice, investment advice, or a recommendation to buy or sell any asset.",
    "You should never invest money you cannot afford to lose. Always conduct your own research and consult a licensed financial advisor before making any investment decisions.",
    "Cryptocurrency, forex, and stock markets are highly volatile. Prices can move rapidly and unpredictably. We accept no liability for losses incurred as a result of following any signals or information published on this site.",
  ],

  termsExtraSections: [
    { heading: "Disclaimer", body: "All signals are provided for informational purposes only and do not constitute financial advice. See our Risk Disclaimer for full details." },
  ] as { heading: string; body: string }[],

  // ── Post-payment success page ──────────────────────────────
  successPage: {
    heading: "You're in!",
    subtext: "Payment confirmed. Join the channels below to get started.",
  },

  // ── Admin section labels ───────────────────────────────────
  admin: {
    products:  { singular: "Product",     plural: "Products" },
    customers: { singular: "Customer",    plural: "Customers" },
    access:    { singular: "Access Link", plural: "Access" },
    services:  { singular: "Service",     plural: "Services" },
    leads:     { singular: "Lead",        plural: "Leads" },
    bookings:  { singular: "Booking",     plural: "Bookings" },
    orders:    { singular: "Order",       plural: "Orders" },
    reviews:   { singular: "Review",      plural: "Reviews" },
    gallery:   { singular: "Item",        plural: "Gallery" },
    messages:  { singular: "Message",     plural: "Messages" },
  },

  // ── Admin module toggles ───────────────────────────────────
  /**
   * Enable or disable each admin panel module.
   * Disabled modules are hidden from navigation AND blocked from direct URL access.
   * Set a BUSINESS_PRESET below to auto-configure these for your business type.
   */
  adminModules: {
    // Core
    overview:         true,
    settings:         true,
    activity:         true,
    analytics:        true,
    // Products / Shop
    products:         true,
    customers:        true,
    access:           true,
    // Services & Bookings
    services:         false,
    bookings:         false,
    leads:            false,
    // Orders
    orders:           false,
    // Content
    reviews:          false,
    gallery:          false,
    messages:         false,
    // Disabled stubs
    content:          false,
    team:             false,
  } as Record<string, boolean>,
};

// ── Business Presets ──────────────────────────────────────────────────────────
/**
 * Copy the modules block from a preset into APP_CONFIG.adminModules
 * to quickly configure the admin panel for a specific business type.
 *
 * Usage: replace adminModules above with the preset's modules object.
 */
export const BUSINESS_PRESETS = {
  /** Full product shop with orders, reviews, gallery */
  ecommerce: {
    ctaLabel: "Shop Now",
    ctaLink: "/shop",
    modules: {
      overview: true, settings: true, activity: true, analytics: true,
      products: true, customers: true, orders: true, reviews: true,
      gallery: true, messages: true,
      services: false, bookings: false, leads: false, access: false,
      content: false, team: false,
    },
  },
  /** Food takeaway / restaurant order tracker */
  takeaway: {
    ctaLabel: "Order Now",
    ctaLink: "/shop",
    modules: {
      overview: true, settings: true, activity: true, analytics: true,
      products: true, orders: true, reviews: true, messages: true,
      customers: false, services: false, bookings: false, leads: false,
      access: false, gallery: false, content: false, team: false,
    },
  },
  /** Tradesman / contractor — leads, bookings, services, gallery */
  tradesman: {
    ctaLabel: "Get a Free Quote",
    ctaLink: "/contact",
    modules: {
      overview: true, settings: true, activity: true,
      services: true, leads: true, bookings: true, reviews: true,
      gallery: true, messages: true,
      products: false, customers: false, orders: false, access: false,
      analytics: false, content: false, team: false,
    },
  },
  /** Salon / clinic / service business with bookings */
  booking_business: {
    ctaLabel: "Book Now",
    ctaLink: "/book",
    modules: {
      overview: true, settings: true, activity: true,
      services: true, bookings: true, leads: true, reviews: true,
      gallery: true, messages: true,
      products: false, customers: false, orders: false, access: false,
      analytics: false, content: false, team: false,
    },
  },
  /** SaaS / digital products with access links */
  digital_products: {
    ctaLabel: "Get Access",
    ctaLink: "/#pricing",
    modules: {
      overview: true, settings: true, activity: true, analytics: true,
      products: true, customers: true, access: true, reviews: true,
      messages: true,
      services: false, bookings: false, leads: false, orders: false,
      gallery: false, content: false, team: false,
    },
  },
  /** Freelancer / creative portfolio */
  portfolio: {
    ctaLabel: "View My Work",
    ctaLink: "/gallery",
    modules: {
      overview: true, settings: true,
      gallery: true, services: true, reviews: true, leads: true,
      messages: true,
      products: false, customers: false, bookings: false, orders: false,
      access: false, analytics: false, activity: false, content: false, team: false,
    },
  },
} as const;
