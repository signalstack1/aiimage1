/**
 * E2E: login → session expiry → redirect → re-login flow
 *
 * Test 1 — "expired banner" is a standalone check that doesn't need Supabase:
 *   Navigate directly to /login?expired=1 and assert the amber warning banner
 *   is visible and the sign-in form is shown.
 *
 * Tests 2–4 — full flow, requires real Supabase credentials:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_PASSWORD
 *
 *   Creates a fresh member, confirms them via Admin API, links them to a
 *   business, then logs in. Once on the dashboard, the Playwright route
 *   interception makes /api/member/notifications always return 401. This
 *   causes fetchWithAuth to attempt a session refresh (which succeeds because
 *   the real session is still valid) and then retry — getting 401 again,
 *   which triggers handleSessionExpired() → redirect to /login?expired=1.
 *   The test then removes the interception and re-logs in to reach /dashboard.
 *
 * Run:
 *   pnpm exec playwright test tests/e2e/session-expiry.spec.ts
 */

import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

// ── Env ───────────────────────────────────────────────────────────────────────

const SUPABASE_URL         = process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const ADMIN_PASSWORD       = process.env.ADMIN_PASSWORD ?? "admin";

const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY);

// ── Helpers ───────────────────────────────────────────────────────────────────

function nanoid(len = 8): string {
  return Math.random().toString(36).slice(2, 2 + len);
}

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

/** Navigate to /login and sign in; waits for redirect to /dashboard. */
async function loginAsMember(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("**/dashboard", { timeout: 20_000 });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Session expiry banner (no Supabase required)", () => {
  test("navigating to /login?expired=1 shows the 'Your session expired' banner", async ({ page }) => {
    await page.goto("/login?expired=1");

    // The amber banner must be visible
    const banner = page.getByText(/your session expired/i);
    await expect(banner).toBeVisible({ timeout: 10_000 });

    // The sign-in form fields must still be accessible so the user can re-login
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });
});

test.describe("Full session expiry flow (Supabase required)", () => {
  test.skip(
    !supabaseConfigured,
    "Supabase not configured — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to run this test",
  );

  let memberEmail: string;
  let memberPassword: string;
  let businessName: string;
  let businessId: string;
  let supabaseUserId: string;

  // ── beforeAll: create an application, confirm auth user, link account ──────
  test.beforeAll(async ({ request: ctx }) => {
    const tag      = nanoid();
    memberEmail    = `test-expiry-${tag}@e2e.invalid`;
    memberPassword = `TestPass1!${tag}`;
    businessName   = `Expiry Test Co ${tag}`;

    // 1. Submit a membership application
    const applyRes = await ctx.post("/api/via/apply", {
      data: {
        name:          "E2E Expiry Tester",
        business_name: businessName,
        trade_type:    "Plumber",
        location:      "Manchester",
        email:         memberEmail,
        phone:         "07700000001",
        message:       "Playwright session-expiry e2e test",
      },
    });
    expect(applyRes.ok(), `POST /api/via/apply failed: ${await applyRes.text()}`).toBe(true);

    // 2. Sign up the member via the UI (creates the Supabase auth user)
    //    Done via API directly: create user through Supabase Admin API
    const createRes = await supabaseAdmin(ctx, "/auth/v1/admin/users", {
      method: "POST",
      data: {
        email:            memberEmail,
        password:         memberPassword,
        email_confirm:    true,  // skip email confirmation step
      },
    });
    expect(createRes.ok(), `Failed to create Supabase user: ${await createRes.text()}`).toBe(true);
    const created = await createRes.json();
    supabaseUserId = created.id;

    // 3. Find the business record created by the application
    const adminToken  = await getAdminToken(ctx);
    const membersRes  = await ctx.get("/api/admin/members", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const members = await membersRes.json();
    const found   = Array.isArray(members)
      ? members.find((m: any) => m.business_name === businessName)
      : null;
    expect(found, `Business "${businessName}" not found in /api/admin/members`).toBeTruthy();
    businessId = found.id;

    // 4. Link the auth user's email to the business record
    const linkRes = await ctx.post(`/api/admin/members/${businessId}/link`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { email: memberEmail },
    });
    expect(linkRes.ok(), `Failed to link member: ${await linkRes.text()}`).toBe(true);
  });

  // ── afterAll: clean up all test data ─────────────────────────────────────
  test.afterAll(async ({ request: ctx }) => {
    if (supabaseUserId) {
      await supabaseAdmin(ctx, `/auth/v1/admin/users/${supabaseUserId}`, { method: "DELETE" });
    }
    if (businessId) {
      await supabaseAdmin(ctx, `/rest/v1/applications?business_id=eq.${businessId}`, { method: "DELETE" });
      await supabaseAdmin(ctx, `/rest/v1/businesses?id=eq.${businessId}`, { method: "DELETE" });
    }
  });

  // ── Test 1: member can log in and reach /dashboard ────────────────────────
  test("1 — member logs in and reaches /dashboard", async ({ page }) => {
    await loginAsMember(page, memberEmail, memberPassword);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  // ── Test 2: simulated 401 from notifications triggers redirect ────────────
  test("2 — 401 from /api/member/notifications triggers redirect to /login?expired=1", async ({ page }) => {
    // Log the member in first
    await loginAsMember(page, memberEmail, memberPassword);

    // Intercept ALL requests to the notifications endpoint and return 401.
    // fetchWithAuth in useAuth.tsx will:
    //   1. Call notifications → 401
    //   2. Attempt supabase.auth.refreshSession() → succeeds (real session is valid)
    //   3. Retry notifications → 401 again
    //   4. Call handleSessionExpired() → window.location.href = /login?expired=1
    await page.route("**/api/member/notifications**", (route) => {
      route.fulfill({ status: 401, body: JSON.stringify({ error: "Unauthorized" }) });
    });

    // Navigate to the dashboard — its useEffect fires and calls fetchWithAuth for notifications
    await page.goto("/dashboard");

    // Wait for the redirect to the expired login page
    await page.waitForURL(/\/login\?expired=1/, { timeout: 30_000 });
    await expect(page).toHaveURL(/login\?expired=1/);
  });

  // ── Test 3: expired banner is visible after the redirect ─────────────────
  test("3 — 'Your session expired' banner is visible on the login page after redirect", async ({ page }) => {
    await loginAsMember(page, memberEmail, memberPassword);

    await page.route("**/api/member/notifications**", (route) => {
      route.fulfill({ status: 401, body: JSON.stringify({ error: "Unauthorized" }) });
    });

    await page.goto("/dashboard");
    await page.waitForURL(/\/login\?expired=1/, { timeout: 30_000 });

    // The amber "Your session expired" banner must be visible
    const banner = page.getByText(/your session expired/i);
    await expect(banner).toBeVisible({ timeout: 10_000 });

    // The form should be ready for re-login (both fields + submit button visible)
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  // ── Test 4: re-logging in after expiry lands the member on /dashboard ─────
  test("4 — re-logging in after session expiry redirects back to /dashboard", async ({ page }) => {
    await loginAsMember(page, memberEmail, memberPassword);

    // Intercept to trigger expiry
    await page.route("**/api/member/notifications**", (route) => {
      route.fulfill({ status: 401, body: JSON.stringify({ error: "Unauthorized" }) });
    });

    await page.goto("/dashboard");
    await page.waitForURL(/\/login\?expired=1/, { timeout: 30_000 });

    // Remove the interception so re-login and subsequent API calls succeed
    await page.unrouteAll({ behavior: "ignoreErrors" });

    // The session expired banner confirms the correct page state
    await expect(page.getByText(/your session expired/i)).toBeVisible({ timeout: 10_000 });

    // Re-login with the same credentials
    await page.locator("#email").fill(memberEmail);
    await page.locator("#password").fill(memberPassword);
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should land back at /dashboard
    await page.waitForURL("**/dashboard", { timeout: 20_000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
