/**
 * ─────────────────────────────────────────────────────────
 *  APP CONFIG  —  VIA Secured
 * ─────────────────────────────────────────────────────────
 *
 * Every user-facing string, colour, and piece of copy lives here.
 * The rest of the codebase imports from this file — nowhere else
 * contains hardcoded brand names, colours, or business copy.
 */

export const APP_CONFIG = {
  // ── Identity ─────────────────────────────────────────────
  appName: "VIA Secured",
  tagline: "Independently Verified. Publicly Trusted.",
  description:
    "VIA independently verifies UK tradespeople — checking their business, insurance, accreditations, and digital footprint so you don't have to take their word for it.",
  supportEmail: "support@viasecured.co.uk",
  /** Name used in legal pages and copyright notice */
  legalName: "VIA Secured Ltd",
  /** One-liner describing what the business does — used in legal/disclaimer copy */
  businessType: "tradesperson verification and trust services",

  // ── Theme ─────────────────────────────────────────────────
  /**
   * Primary brand colour as an HSL value WITHOUT the hsl() wrapper.
   * VIA green: 142 71% 45%
   * Set to null to keep the default from index.css unchanged.
   */
  primaryColor: null as string | null,

  // ── Hero section ──────────────────────────────────────────
  hero: {
    badge: "UK Tradesperson Verification · Independent · Trusted",
    headlinePlain: "Don't take their",
    headlineGradient: "word for it…",
    subtext:
      "VIA independently checks tradespeople across the UK — verifying their business, insurance, accreditations, address, and digital footprint before issuing a public VIA number.",
    ctaPrimary: "Join VIA — £20/month",
  },

  // ── Stats bar ─────────────────────────────────────────────
  stats: [
    { value: "6 checks", label: "Per verification" },
    { value: "48hrs", label: "Average turnaround" },
    { value: "VIA#", label: "Unique number assigned" },
    { value: "100%", label: "Independent verification" },
  ],

  // ── How it works ──────────────────────────────────────────
  howItWorks: [
    {
      step: "01",
      title: "Spot the Badge",
      desc: "Look for the VIA badge on a tradesperson's van, website, or quote. It means they've applied and been independently checked.",
    },
    {
      step: "02",
      title: "Search Company",
      desc: "Enter the VIA number into our search tool. Instantly see their verified business details, checks passed, and last review date.",
    },
    {
      step: "03",
      title: "Checked or Not",
      desc: "If they're VIA verified, you'll see a full public profile. If not found, the number isn't valid — simple as that.",
    },
  ],

  // ── What we check ─────────────────────────────────────────
  whatWeCheck: [
    {
      title: "Local Address",
      desc: "We confirm the tradesperson operates from the stated address and serves the claimed area.",
      icon: "MapPin",
    },
    {
      title: "Business Type",
      desc: "We verify the legal business structure — sole trader, limited company, or partnership — against public records.",
      icon: "Building2",
    },
    {
      title: "Public Liability Insurance",
      desc: "We check that valid public liability insurance is held and current before issuing a VIA number.",
      icon: "ShieldCheck",
    },
    {
      title: "Trade Accreditations",
      desc: "We verify relevant trade body memberships, certifications, and professional accreditations.",
      icon: "Award",
    },
    {
      title: "Digital Footprint",
      desc: "We review online presence, reviews, social media, and any concerning digital history.",
      icon: "Globe",
    },
    {
      title: "Contact & Public Records",
      desc: "We cross-reference contact details against Companies House, electoral roll, and public records.",
      icon: "FileSearch",
    },
  ],

  // ── Testimonials ──────────────────────────────────────────
  testimonialsSectionTitle: "Trusted by UK tradespeople",
  testimonialsSectionSubtext: "Real members building real trust.",
  testimonials: [
    { name: "Mark T.", handle: "Electrician, Manchester", text: "Getting VIA verified has genuinely helped me win more jobs. Customers mention it before I've even quoted.", stars: 5 },
    { name: "Sarah K.", handle: "Plumber, Birmingham", text: "The verification process was straightforward and the VIA badge on my van gets comments all the time.", stars: 5 },
    { name: "Dave R.", handle: "Builder, Leeds", text: "In a crowded market, having an independent body vouch for you is worth every penny of the £20 a month.", stars: 5 },
    { name: "Chris M.", handle: "Roofer, Bristol", text: "I had my VIA number within 48 hours. Dashboard is clean, badge looks professional.", stars: 5 },
    { name: "James H.", handle: "Gas Engineer, Glasgow", text: "Customers are increasingly asking if I'm VIA checked. It's becoming a recognised standard.", stars: 5 },
    { name: "Rachel B.", handle: "Decorator, London", text: "The priority checking add-on was worth it — had my full profile live the same day.", stars: 5 },
  ],

  // ── Pricing section ───────────────────────────────────────
  pricingTitle: "Simple, transparent pricing",
  pricingSubtext:
    "No hidden fees. Your VIA number, profile, badge, and public listing — all included.",

  planFeatures: {
    "via membership": {
      features: [
        "Unique VIA number assigned",
        "Public VIA verified profile",
        "Digital verification badge",
        "VIA van sticker pack",
        "Member dashboard access",
        "Referral code",
        "Cancel anytime",
      ],
      highlight: false,
    },
    "priority checking": {
      features: [
        "Everything in VIA Membership",
        "Priority verification (same/next day)",
        "Dedicated checker assigned",
        "Fast-track profile publication",
        "One-off payment",
      ],
      highlight: true,
    },
  } as Record<string, { features: string[]; highlight: boolean }>,

  // ── FAQ ───────────────────────────────────────────────────
  faqs: [
    { q: "How long does the verification take?", a: "Standard verification typically completes within 48 hours of a complete application. With the Priority Checking add-on, most verifications are completed same day or next working day." },
    { q: "What do you actually check?", a: "We run 6 independent checks: local address, business type and structure, public liability insurance, trade accreditations, digital footprint, and contact/public records. Each check is confirmed or flagged in your public profile." },
    { q: "What is a VIA number?", a: "A VIA number (e.g. VIA1042) is a unique identifier assigned to your business once your verification is approved. It appears on your public profile and badge. Anyone can search it to verify your status instantly." },
    { q: "What happens if I fail a check?", a: "If we cannot verify a specific item, it will show as unverified on your profile rather than confirmed. We'll contact you to give you the opportunity to provide additional documentation before rejecting an application." },
    { q: "Can I cancel my membership?", a: "Yes. Monthly membership can be cancelled at any time. Your VIA profile remains visible for the remainder of your paid period, then moves to inactive status." },
    { q: "Can customers search my VIA number for free?", a: "Yes, entirely. The public VIA number search is free for everyone. The fee is paid by tradespeople to get verified and maintain their active status." },
  ],

  // ── Final CTA ─────────────────────────────────────────────
  finalCta: {
    headline: "Stand out. Get verified.",
    subtext: "Join VIA Secured and give your customers the confidence to choose you.",
    buttonText: "Apply for VIA Membership",
  },

  // ── Legal pages ───────────────────────────────────────────
  disclaimerParagraphs: [
    "VIA Secured provides independent verification services for UK tradespeople. Our checks are based on information available at the time of verification and should not be taken as a guarantee of future conduct or service quality.",
    "Verification status may change. We recommend always re-checking a VIA number before engaging a tradesperson for significant work.",
    "VIA Secured accepts no liability for work carried out by verified or unverified tradespeople. Our service is informational only.",
  ],

  termsExtraSections: [
    { heading: "Verification Standards", body: "VIA Secured applies a consistent set of verification criteria to all applicants. Criteria and check types may be updated periodically. Members will be notified of material changes." },
  ] as { heading: string; body: string }[],

  // ── Post-payment success page ──────────────────────────────
  successPage: {
    heading: "Application received!",
    subtext: "We'll begin your verification shortly. Check your email for next steps.",
  },

  // ── Admin section labels ───────────────────────────────────
  admin: {
    products:  { singular: "Product",     plural: "Products" },
    customers: { singular: "Member",      plural: "Members" },
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
   * VIA Secured preset — only VIA-relevant modules enabled.
   * Disabled modules are hidden from navigation AND blocked from direct URL access.
   * Original template modules are kept in code (not deleted) for future reactivation.
   */
  adminModules: {
    // Core
    overview:         true,
    settings:         true,
    activity:         true,
    analytics:        false, // VIA: disabled — no revenue analytics needed at MVP
    // Shop (VIA: disabled — no product shop)
    products:         false, // VIA: disabled
    customers:        false, // VIA: disabled — replaced by members/applications in Task 3
    access:           false, // VIA: disabled
    // Services & Bookings (VIA: disabled)
    services:         false, // VIA: disabled
    bookings:         false, // VIA: disabled
    leads:            true,  // VIA: enabled — lead pipeline
    // Orders (VIA: disabled)
    orders:           false, // VIA: disabled
    // Content (VIA: disabled)
    reviews:          false, // VIA: disabled
    gallery:          false, // VIA: disabled
    messages:         false, // VIA: disabled
    // Disabled stubs
    content:          false, // VIA: disabled
    team:             false, // VIA: disabled
    // VIA-specific — enabled in Task 8 (admin dashboard)
    applications:     true,  // VIA: enabled
    members:          true,  // VIA: enabled
    payment_links:    true,  // VIA: enabled
  } as Record<string, boolean>,
};

// ── Business Presets ──────────────────────────────────────────────────────────
/**
 * Original template presets preserved for reference.
 * VIA Secured uses its own adminModules config above.
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
} as const;
