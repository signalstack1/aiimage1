/**
 * Server-side plan entitlements — mirrors the PLAN_ENTITLEMENTS in frontend app.ts.
 * Use this in any backend route that needs to check what a plan includes.
 */

export const PLAN_ENTITLEMENTS = {
  tvc_basic: {
    price: "£15/month",
    enhanced_profile: false,
    portfolio_access: false,
    social_links: false,
    testimonial_access: false,
    monthly_image_limit: 0,
    priority_verification: false,
  },
  tvc_plus: {
    price: "£30/month",
    enhanced_profile: true,
    portfolio_access: true,
    social_links: true,
    testimonial_access: true,
    monthly_image_limit: 20,
    priority_verification: true,
  },
  legacy_unassigned: {
    price: "—",
    enhanced_profile: true,
    portfolio_access: true,
    social_links: true,
    testimonial_access: true,
    monthly_image_limit: 20,
    priority_verification: false,
  },
} as const;

export type PlanCode = keyof typeof PLAN_ENTITLEMENTS;

export function getPlanEntitlements(planCode: string | null | undefined) {
  if (planCode === "tvc_basic") return PLAN_ENTITLEMENTS.tvc_basic;
  if (planCode === "tvc_plus") return PLAN_ENTITLEMENTS.tvc_plus;
  return PLAN_ENTITLEMENTS.legacy_unassigned;
}
