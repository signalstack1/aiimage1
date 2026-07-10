/**
 * ─────────────────────────────────────────────────────────
 *  APP CONFIG  —  TVC Secured
 *  Trades Verified & Checked
 * ─────────────────────────────────────────────────────────
 *
 * Every user-facing string, colour, and piece of copy lives here.
 * The rest of the codebase imports from this file — nowhere else
 * contains hardcoded brand names, colours, or business copy.
 */

export const APP_CONFIG = {
  // ── Identity ─────────────────────────────────────────────
  appName: "TVC Secured",
  tagline: "Trades Verified & Checked",
  description:
    "TVC Secured independently verifies UK tradespeople — checking their business, insurance, accreditations, and digital footprint so you don't have to take their word for it.",
  supportEmail: "support@tvcsecured.co.uk",
  /** Name used in legal pages and copyright notice */
  legalName: "TVC Secured Ltd",
  /** One-liner describing what the business does — used in legal/disclaimer copy */
  businessType: "tradesperson verification and trust services",

  // ── Theme ─────────────────────────────────────────────────
  /**
   * Primary brand colour as an HSL value WITHOUT the hsl() wrapper.
   * TVC green: 142 71% 45%
   * Set to null to keep the default from index.css unchanged.
   */
  primaryColor: null as string | null,

  // ── Hero section ──────────────────────────────────────────
  hero: {
    badge: "UK Tradesperson Verification · Independent · Trusted",
    headlinePlain: "Don't take their",
    headlineGradient: "word for it…",
    subtext:
      "TVC Secured independently checks tradespeople so homeowners can verify who they are, where they operate, and whether their key credentials have been reviewed.",
    ctaPrimary: "Join TVC — from £15/month",
  },

  // ── Stats bar ─────────────────────────────────────────────
  stats: [
    { value: "6 checks", label: "Per verification" },
    { value: "48hrs", label: "Average turnaround" },
    { value: "TVC#", label: "Unique number assigned" },
    { value: "100%", label: "Independent verification" },
  ],

  // ── How it works ──────────────────────────────────────────
  howItWorks: [
    {
      step: "01",
      title: "Spot the Badge",
      desc: "Look for the TVC badge on a tradesperson's van, website, or quote. It means they've applied and been independently checked.",
    },
    {
      step: "02",
      title: "Search Company",
      desc: "Enter the TVC number into our search tool. Instantly see their verified business details, checks passed, and last review date.",
    },
    {
      step: "03",
      title: "Checked or Not",
      desc: "If they're TVC verified, you'll see a full public profile. If not found, the number isn't valid — simple as that.",
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
      desc: "We check that valid public liability insurance is held and current before issuing a TVC number.",
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
    { name: "Mark T.", handle: "Electrician, Manchester", text: "Getting TVC verified has genuinely helped me win more jobs. Customers mention it before I've even quoted.", stars: 5 },
    { name: "Sarah K.", handle: "Plumber, Birmingham", text: "The verification process was straightforward and the TVC badge on my van gets comments all the time.", stars: 5 },
    { name: "Dave R.", handle: "Builder, Leeds", text: "In a crowded market, having an independent body vouch for you is worth every penny of the £20 a month.", stars: 5 },
    { name: "Chris M.", handle: "Roofer, Bristol", text: "I had my TVC number within 48 hours. Dashboard is clean, badge looks professional.", stars: 5 },
    { name: "James H.", handle: "Gas Engineer, Glasgow", text: "Customers are increasingly asking if I'm TVC checked. It's becoming a recognised standard.", stars: 5 },
    { name: "Rachel B.", handle: "Decorator, London", text: "The priority checking add-on was worth it — had my full profile live the same day.", stars: 5 },
  ],

  // ── Pricing section ───────────────────────────────────────
  pricingTitle: "Simple, transparent pricing",
  pricingSubtext:
    "No hidden fees. Your TVC number, profile, badge, and public listing — all included.",

  planFeatures: {
    "tvc_basic": {
      name: "TVC Basic",
      price: "£15/month",
      features: [
        "Unique TVC number assigned",
        "Public TVC verified profile",
        "Digital verification badge",
        "Member dashboard access",
        "Referral code",
        "Cancel anytime",
      ],
      highlight: false,
    },
    "tvc_plus": {
      name: "TVC Plus",
      price: "£30/month",
      features: [
        "Everything in TVC Basic",
        "Portfolio & photo gallery",
        "Intro video embed",
        "Social media links on profile",
        "Customer testimonials section",
        "Priority verification (same/next day)",
        "Enhanced public profile",
      ],
      highlight: true,
    },
  } as Record<string, { name: string; price: string; features: string[]; highlight: boolean }>,

  // ── FAQ ───────────────────────────────────────────────────
  faqs: [
    { q: "How long does the verification take?", a: "Standard verification typically completes within 48 hours of a complete application. With the Priority Checking add-on, most verifications are completed same day or next working day." },
    { q: "What do you actually check?", a: "We run 6 independent checks: local address, business type and structure, public liability insurance, trade accreditations, digital footprint, and contact/public records. Each check is confirmed or flagged in your public profile." },
    { q: "What is a TVC number?", a: "A TVC number (e.g. TVC1042) is a unique identifier assigned to your business once your verification is approved. It appears on your public profile and badge. Anyone can search it to verify your status instantly." },
    { q: "What happens if I fail a check?", a: "If we cannot verify a specific item, it will show as unverified on your profile rather than confirmed. We'll contact you to give you the opportunity to provide additional documentation before rejecting an application." },
    { q: "Can I cancel my membership?", a: "Yes. Monthly membership can be cancelled at any time. Your TVC profile remains visible for the remainder of your paid period, then moves to inactive status." },
    { q: "Can customers search my TVC number for free?", a: "Yes, entirely. The public TVC number search is free for everyone. The fee is paid by tradespeople to get verified and maintain their active status." },
  ],

  // ── Final CTA ─────────────────────────────────────────────
  finalCta: {
    headline: "Stand out. Get verified.",
    subtext: "Join TVC Secured and give your customers the confidence to choose you.",
    buttonText: "Apply for TVC Membership",
  },

  // ── Legal pages ───────────────────────────────────────────
  disclaimerParagraphs: [
    "TVC Secured provides independent verification services for UK tradespeople. Our checks are based on information available at the time of verification and should not be taken as a guarantee of future conduct or service quality.",
    "Verification status may change. We recommend always re-checking a TVC number before engaging a tradesperson for significant work.",
    "TVC Secured accepts no liability for work carried out by verified or unverified tradespeople. Our service is informational only.",
  ],

  termsExtraSections: [
    { heading: "Verification Standards", body: "TVC Secured applies a consistent set of verification criteria to all applicants. Criteria and check types may be updated periodically. Members will be notified of material changes." },
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
   * TVC Secured preset — only TVC-relevant modules enabled.
   * Disabled modules are hidden from navigation AND blocked from direct URL access.
   * Original template modules are kept in code (not deleted) for future reactivation.
   */
  adminModules: {
    // Core
    overview:         true,
    settings:         true,
    activity:         true,
    analytics:        false, // TVC: disabled — no revenue analytics needed at MVP
    // Shop (TVC: disabled — no product shop)
    products:         false, // TVC: disabled
    customers:        false, // TVC: disabled — replaced by members/applications
    access:           false, // TVC: disabled
    // Services & Bookings (TVC: disabled)
    services:         false, // TVC: disabled
    bookings:         false, // TVC: disabled
    leads:            true,  // TVC: enabled — lead pipeline
    // Orders (TVC: disabled)
    orders:           false, // TVC: disabled
    // Content (TVC: disabled)
    reviews:          false, // TVC: disabled
    gallery:          false, // TVC: disabled
    messages:         false, // TVC: disabled
    // Disabled stubs
    content:          false, // TVC: disabled
    team:             false, // TVC: disabled
    // TVC-specific
    applications:     true,  // TVC: enabled
    members:          true,  // TVC: enabled
    payment_links:    true,  // TVC: enabled
  } as Record<string, boolean>,
};

// ── Plan Entitlements ─────────────────────────────────────────────────────────
/**
 * Central definition of what each plan includes.
 * Import this wherever plan checks are needed — never hardcode plan checks inline.
 * Legacy members (null plan_code) get full access until manually assigned.
 */
export const PLAN_ENTITLEMENTS = {
  tvc_basic: {
    name: "TVC Basic",
    price: "£15/month",
    pricePence: 1500,
    paymentSlug: "tvc-basic",
    enhanced_profile: false,
    portfolio_access: false,
    social_links: false,
    testimonial_access: false,
    priority_verification: false,
    monthly_image_limit: 0,
  },
  tvc_plus: {
    name: "TVC Plus",
    price: "£30/month",
    pricePence: 3000,
    paymentSlug: "tvc-plus",
    enhanced_profile: true,
    portfolio_access: true,
    social_links: true,
    testimonial_access: true,
    priority_verification: true,
    monthly_image_limit: 20,
  },
  legacy_unassigned: {
    name: "Legacy — Unassigned",
    price: "—",
    pricePence: null,
    paymentSlug: "via-membership",
    enhanced_profile: true,
    portfolio_access: true,
    social_links: true,
    testimonial_access: true,
    priority_verification: false,
    monthly_image_limit: 20,
  },
} as const;

export type PlanCode = keyof typeof PLAN_ENTITLEMENTS;

export function getPlanEntitlements(planCode: string | null | undefined) {
  if (planCode === "tvc_basic") return PLAN_ENTITLEMENTS.tvc_basic;
  if (planCode === "tvc_plus") return PLAN_ENTITLEMENTS.tvc_plus;
  return PLAN_ENTITLEMENTS.legacy_unassigned;
}

// ── Business Presets ──────────────────────────────────────────────────────────
/**
 * Original template presets preserved for reference.
 * TVC Secured uses its own adminModules config above.
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
