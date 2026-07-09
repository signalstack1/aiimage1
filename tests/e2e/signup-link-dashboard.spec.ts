/**
 * E2E: Full sign-up → admin link → member login → dashboard flow
 *
 * Requires real Supabase credentials:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_PASSWORD
 *
 * Run with:
 *   pnpm exec playwright test tests/e2e/signup-link-dashboard.spec.ts
 *
 * Skip condition: test is skipped when SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY are
 * not set (mock/dev mode). All test-created DB rows and auth users are deleted in afterAll.
 */

import { test, expect, type APIRequestContext } from "@playwright/test";

const SUPABASE_URL         = process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const ADMIN_PASSWORD       = process.env.ADMIN_PASSWORD ?? "admin";

const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY);

function nanoid(len = 8): string {
  return Math.random().toString(36).slice(2, 2 + len);
}

/**
 * Authenticated call to the Supabase REST/Auth Admin API using the service-role key.
 */
async function supabaseAdmin(
  ctx: APIRequestContext,
  path: string,
  init: Parameters<APIRequestContext["fetch"]>[1] = {},
) {
  return ctx.fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Prefer": "return=representation",
      ...(init.headers ?? {}),
    },
  });
}

async function getAdminToken(ctx: APIRequestContext): Promise<string> {
  const res  = await ctx.post("/api/admin/login", { data: { password: ADMIN_PASSWORD } });
  const body = await res.json();
  return body.token as string;
}

test.describe("Sign-up → admin link → dashboard", () => {
  test.skip(
    !supabaseConfigured,
    "Supabase not configured — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to run this test",
  );

  let memberEmail: string;
  let memberPassword: string;
  let businessName: string;
  let businessId: string;
  let supabaseUserId: string;

  // ── Setup: create a fresh business + application via the public apply endpoint ──
  test.beforeAll(async ({ request: ctx }) => {
    const tag      = nanoid();
    memberEmail    = `test-member-${tag}@e2e.invalid`;
    memberPassword = `TestPass1!${tag}`;
    businessName   = `E2E Test Co ${tag}`;

    const applyRes = await ctx.post("/api/via/apply", {
      data: {
        name:          "E2E Tester",
        business_name: businessName,
        trade_type:    "Electrician",
        location:      "London",
        email:         memberEmail,
        phone:         "07700000000",
        message:       "Playwright E2E test application",
      },
    });
    expect(applyRes.ok(), `POST /api/via/apply failed: ${await applyRes.text()}`).toBe(true);

    const adminToken   = await getAdminToken(ctx);
    const membersRes   = await ctx.get("/api/admin/members", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const members = await membersRes.json();
    const found   = Array.isArray(members)
      ? members.find((m: any) => m.business_name === businessName)
      : null;
    expect(found, `Business "${businessName}" not found in /api/admin/members`).toBeTruthy();
    businessId = found.id;
  });

  // ── Cleanup: remove all test data to avoid DB pollution ──
  test.afterAll(async ({ request: ctx }) => {
    // Remove Supabase auth user
    if (supabaseUserId) {
      await supabaseAdmin(ctx, `/auth/v1/admin/users/${supabaseUserId}`, { method: "DELETE" });
    }
    // Remove application rows tied to this business
    if (businessId) {
      await supabaseAdmin(
        ctx,
        `/rest/v1/applications?business_id=eq.${businessId}`,
        { method: "DELETE" },
      );
      // Remove the business itself
      await supabaseAdmin(
        ctx,
        `/rest/v1/businesses?id=eq.${businessId}`,
        { method: "DELETE" },
      );
    }
  });

  // ── Test 1: sign-up UI ────────────────────────────────────────────────────────
  test("1 — member signs up at /signup and sees the email-confirmation screen", async ({ page }) => {
    await page.goto("/signup");
    await page.locator("#email").fill(memberEmail);
    await page.locator("#password").fill(memberPassword);
    await page.locator("#confirm").fill(memberPassword);
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(
      page.getByRole("heading", { name: /check your email/i }),
    ).toBeVisible({ timeout: 10_000 });

    // The confirmation screen must show the user's email address
    await expect(page.getByText(memberEmail)).toBeVisible();
  });

  // ── Test 2: CI-confirm user via Supabase Admin API ───────────────────────────
  test("2 — CI: email-confirm the Supabase auth user so they can sign in", async ({ request: ctx }) => {
    const listRes   = await supabaseAdmin(ctx, "/auth/v1/admin/users?per_page=1000");
    const body      = await listRes.json();
    const users: any[] = body.users ?? [];
    const user      = users.find((u: any) => u.email === memberEmail);
    expect(user, `Supabase user with email "${memberEmail}" not found after sign-up`).toBeTruthy();
    supabaseUserId = user.id;

    const confirmRes = await supabaseAdmin(
      ctx,
      `/auth/v1/admin/users/${supabaseUserId}`,
      { method: "PUT", data: { email_confirm: true } },
    );
    expect(confirmRes.ok(), `Failed to confirm user: ${await confirmRes.text()}`).toBe(true);
  });

  // ── Test 3: admin links the member account ───────────────────────────────────
  test("3 — admin logs in and links the member email to the business record", async ({ page }) => {
    await page.goto("/admin/login");
    await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL("**/admin", { timeout: 15_000 });

    await page.goto(`/admin/members/${businessId}`);
    await expect(page.getByText(businessName)).toBeVisible({ timeout: 10_000 });

    // The "Member Login Account" section must show "Not yet linked" before we act
    await expect(page.getByText(/not yet linked/i)).toBeVisible();

    await page.locator("#link-email").fill(memberEmail);
    await page.getByRole("button", { name: /link account/i }).click();

    // Success message must contain the member's email
    await expect(
      page.getByText(new RegExp(`linked to ${memberEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} successfully`, "i")),
    ).toBeVisible({ timeout: 10_000 });

    // Status indicator must flip to "Linked to Supabase Auth account"
    await expect(page.getByText("Linked to Supabase Auth account")).toBeVisible({ timeout: 5_000 });
  });

  // ── Test 4: member login and dashboard showing real business data ─────────────
  test("4 — member signs in and the dashboard shows their business name and TVC status", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill(memberEmail);
    await page.locator("#password").fill(memberPassword);
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.waitForURL("**/dashboard", { timeout: 20_000 });
    await expect(page).toHaveURL(/\/dashboard/);

    // Heading MUST include the actual business name — not the generic fallback.
    // A generic "Member Dashboard" heading would mean the member is logged in but
    // NOT linked to a business record, which is the exact regression this test guards against.
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible({ timeout: 10_000 });
    await expect(heading).toContainText(businessName, { timeout: 5_000 });

    // The TVC hero card must be visible and show either "Pending…" or a real TVC number.
    // Both are valid since the member was just linked and not yet approved.
    const tvcDisplay = page.getByText(/Pending…|TVC\d+|VIA\d+/i).first();
    await expect(tvcDisplay).toBeVisible({ timeout: 10_000 });

    // The member-specific "Your TVC Number" label confirms the card is rendering
    // real data from /api/member/me (not a stub).
    await expect(page.getByText("Your TVC Number")).toBeVisible();
  });
});
