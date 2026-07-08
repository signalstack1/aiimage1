/**
 * Branding & copy source of truth for SignalStack Mobile.
 * Mirrors artifacts/signal-saas/src/config/app.ts (the web artifact's
 * APP_CONFIG) — kept in sync manually since each artifact bundles
 * independently. Only the fields used by the mobile screens are included.
 */

export const APP_CONFIG = {
  appName: "Master Template",
  supportEmail: "support@example.com",
  legalName: "SignalStack",
  businessType: "educational trading signal information",

  hero: {
    badge: "Live signals · 68–72% win rate · 800+ active traders",
    headlinePlain: "Trade smarter with",
    headlineGradient: "precision signals",
    subtext:
      "Professional-grade trading signals across Crypto, Forex, and Stocks — delivered instantly to Discord and Telegram with full entry, target, and stop-loss levels.",
  },

  stats: [
    { value: "68–72%", label: "Historical win rate" },
    { value: "3+ yrs", label: "Live track record" },
    { value: "800+", label: "Active subscribers" },
    { value: "4,500+", label: "Signals published" },
  ],

  sampleSectionTitle: "What our signals look like",
  sampleSectionSubtext:
    "Every signal is clear, actionable, and includes everything you need to execute the trade.",
  sampleItems: [
    { asset: "BTC/USDT", dir: "LONG" as const, entry: "$41,200", tp: ["$43,500", "$46,000", "$49,800"], sl: "$39,400", result: "+18.4%", market: "Crypto" },
    { asset: "EUR/USD", dir: "SHORT" as const, entry: "1.0850", tp: ["1.0780", "1.0710", "1.0640"], sl: "1.0910", result: "+12.1%", market: "Forex" },
    { asset: "AAPL", dir: "LONG" as const, entry: "$178.50", tp: ["$185.00", "$191.00"], sl: "$173.00", result: "+7.8%", market: "Stocks" },
  ],

  pricingTitle: "Simple, transparent pricing",
  pricingSubtext: "No hidden fees. Cancel monthly plans anytime. Lifetime is one payment, forever.",

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

  faqs: [
    { q: "How are signals delivered?", a: "All signals are delivered instantly to both our private Discord server and Telegram channel. You'll get a notification the moment a new signal is posted." },
    { q: "What markets do you cover?", a: "We cover Crypto (BTC, ETH, altcoins), Forex (major and minor pairs), and Stocks/Options. The Starter plan covers Crypto & Forex; Pro covers all markets." },
    { q: "What does a signal include?", a: "Every signal includes the asset, direction (long/short), entry price, take-profit targets (TP1, TP2, TP3), and a stop-loss level. Pro subscribers also receive the full trade rationale." },
    { q: "Can I cancel anytime?", a: "Monthly plans can be cancelled anytime — no contracts, no hidden fees. Your access continues until the end of your billing period." },
    { q: "How do I get access after paying?", a: "Immediately after payment you'll receive your Discord and Telegram invite links on the confirmation page and via email." },
    { q: "What's your win rate?", a: "Our historical win rate across all signals is ~68–72%. We publish our full track record, including losses, in the Discord so you can verify everything yourself." },
  ],

  successPage: {
    heading: "You're in!",
    subtext: "Payment confirmed. Join the channels below to get started.",
  },

  disclaimerParagraphs: [
    "Trading financial instruments involves significant risk and is not suitable for all investors. Past performance is not indicative of future results.",
    "We provide educational information only. Nothing in this app constitutes financial advice, investment advice, or a recommendation to buy or sell any asset.",
    "You should never invest money you cannot afford to lose. Always conduct your own research and consult a licensed financial advisor before making any investment decisions.",
    "Cryptocurrency, forex, and stock markets are highly volatile. Prices can move rapidly and unpredictably. We accept no liability for losses incurred as a result of following any signals or information published in this app.",
  ],

  termsExtraSections: [
    { heading: "Disclaimer", body: "All signals are provided for informational purposes only and do not constitute financial advice. See our Risk Disclaimer for full details." },
  ] as { heading: string; body: string }[],

  admin: {
    products: { singular: "Product", plural: "Products" },
    customers: { singular: "Customer", plural: "Customers" },
    access: { singular: "Access Link", plural: "Access" },
  },

  adminModules: {
    overview: true,
    settings: true,
    activity: true,
    analytics: true,
    products: true,
    customers: true,
    access: true,
    services: false,
    bookings: false,
    leads: false,
    orders: false,
    reviews: false,
    gallery: false,
    messages: false,
    content: false,
    team: false,
  } as Record<string, boolean>,
};
