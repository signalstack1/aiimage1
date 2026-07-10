/**
 * Tests: link-user → welcome notification → member dashboard
 *
 * Covers the end-to-end flow:
 *   PATCH /api/admin/businesses/:id/link-user
 *     → notification row inserted into `notifications`
 *     → GET /api/member/notifications returns that same welcome row
 *
 * Edge cases:
 *   - Supabase not configured → link succeeds, notification silently skipped
 *   - Notification insert throws → link still returns { ok: true, linked: true }
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// ── Shared mutable state driven by each test ─────────────────────────────────

let mockIsConfigured = true;
let mockUsers: any[] = [];
let mockBusinessUpdateError: any = null;
let mockNotificationInsertError: any = null;

// Single source of truth for notifications — insert writes here, select reads here
const notificationsStore: any[] = [];

// ── Fluent Supabase chain mock ────────────────────────────────────────────────
// Returns a proxy that is thenable (can be awaited at any depth) and forwards
// every method call back to itself so arbitrary chains work.

function makeChain(result: any): any {
  const p = Promise.resolve(result) as any;
  return new Proxy(p, {
    get(target, prop: string) {
      if (prop === "then" || prop === "catch" || prop === "finally") {
        return target[prop].bind(target);
      }
      return (..._args: any[]) => makeChain(result);
    },
  });
}

// ── Module mock (hoisted by Vitest before imports) ────────────────────────────

vi.mock("../lib/supabase", () => {
  return {
    isSupabaseConfigured: () => mockIsConfigured,
    supabase: {
      auth: {
        admin: {
          listUsers: vi.fn(async () => ({
            data: { users: mockUsers },
            error: null,
          })),
        },
        getUser: vi.fn(async (_token: string) => ({
          data: { user: { id: "mock-member-id" } },
          error: null,
        })),
      },
      from: vi.fn((table: string) => {
        if (table === "businesses") {
          return {
            update: (_vals: any) => ({
              eq: (_col: string, _val: any) =>
                Promise.resolve({ error: mockBusinessUpdateError }),
            }),
            select: (_cols: string) => ({
              eq: (_col: string, _val: any) => ({
                single: () =>
                  Promise.resolve({
                    data: { id: "biz-123" },
                    error: null,
                  }),
              }),
            }),
          };
        }

        if (table === "notifications") {
          return {
            insert: async (row: any) => {
              if (mockNotificationInsertError) {
                throw mockNotificationInsertError;
              }
              notificationsStore.push(row);
              return { data: null, error: null };
            },
            // Return rows from the shared store, filtered the same way the real
            // route does: by business_id and recipient_type.
            select: (_cols: string) => {
              const chain = {
                _filters: {} as Record<string, any>,
                eq(col: string, val: any) {
                  this._filters[col] = val;
                  return this;
                },
                order(_col: string, _opts?: any) { return this; },
                limit(_n: number) {
                  const { business_id, recipient_type } = this._filters;
                  const rows = notificationsStore.filter((r) => {
                    if (business_id && r.business_id !== business_id) return false;
                    if (recipient_type && r.recipient_type !== recipient_type) return false;
                    return true;
                  });
                  return Promise.resolve({ data: rows, error: null });
                },
              };
              return chain;
            },
          };
        }

        return makeChain({ data: null, error: null });
      }),
    },
  };
});

// ── Import app AFTER mock is registered ──────────────────────────────────────
import app from "../app";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeAdminToken(password?: string): string {
  const pw = password ?? process.env.ADMIN_PASSWORD ?? "admin";
  const raw = `${pw}|${Date.now()}`;
  return `ss_admin_${Buffer.from(raw).toString("base64")}`;
}

const ADMIN_AUTH = { Authorization: `Bearer ${makeAdminToken()}` };
const MEMBER_AUTH = { Authorization: "Bearer mock-member-jwt" };

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockIsConfigured = true;
  mockBusinessUpdateError = null;
  mockNotificationInsertError = null;
  notificationsStore.length = 0;
  mockUsers = [{ id: "user-uuid-1", email: "member@example.com" }];

  vi.clearAllMocks();
});

// =============================================================================
// Flow test: PATCH → GET end-to-end
// =============================================================================

describe("End-to-end flow: link-user then member reads notifications", () => {
  it("welcome notification inserted by link-user is returned by GET /member/notifications", async () => {
    // Step 1: Admin links the member's account
    const linkRes = await request(app)
      .patch("/api/admin/businesses/biz-123/link-user")
      .set(ADMIN_AUTH)
      .send({ email: "member@example.com" });

    expect(linkRes.status).toBe(200);
    expect(linkRes.body).toMatchObject({ ok: true, linked: true, user_id: "user-uuid-1" });

    // Confirm the notification was inserted into the shared store
    expect(notificationsStore).toHaveLength(1);
    expect(notificationsStore[0]).toMatchObject({
      business_id: "biz-123",
      recipient_type: "member",
      title: "Your account is ready",
    });

    // Step 2: Member GETs their notifications — should see the row from step 1
    const notifRes = await request(app)
      .get("/api/member/notifications")
      .set(MEMBER_AUTH);

    expect(notifRes.status).toBe(200);
    expect(Array.isArray(notifRes.body)).toBe(true);
    expect(notifRes.body).toHaveLength(1);
    expect(notifRes.body[0]).toMatchObject({
      business_id: "biz-123",
      recipient_type: "member",
      title: "Your account is ready",
    });
    expect(typeof notifRes.body[0].body).toBe("string");
    expect(notifRes.body[0].body.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// link-user edge cases
// =============================================================================

describe("PATCH /api/admin/businesses/:id/link-user — edge cases", () => {
  it("returns { linked: false } without error when Supabase is not configured", async () => {
    mockIsConfigured = false;

    const res = await request(app)
      .patch("/api/admin/businesses/biz-123/link-user")
      .set(ADMIN_AUTH)
      .send({ email: "member@example.com" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, linked: false });
    expect(notificationsStore).toHaveLength(0);
  });

  it("still returns { linked: true } when notification insert throws", async () => {
    mockNotificationInsertError = new Error("DB constraint violation");

    const res = await request(app)
      .patch("/api/admin/businesses/biz-123/link-user")
      .set(ADMIN_AUTH)
      .send({ email: "member@example.com" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, linked: true });
  });

  it("returns 404 when no Supabase Auth user matches the email", async () => {
    mockUsers = [];

    const res = await request(app)
      .patch("/api/admin/businesses/biz-123/link-user")
      .set(ADMIN_AUTH)
      .send({ email: "nobody@example.com" });

    expect(res.status).toBe(404);
  });

  it("returns 400 when email is missing from the request body", async () => {
    const res = await request(app)
      .patch("/api/admin/businesses/biz-123/link-user")
      .set(ADMIN_AUTH)
      .send({});

    expect(res.status).toBe(400);
  });
});

// =============================================================================
// GET /member/notifications — no prior link
// =============================================================================

describe("GET /api/member/notifications — standalone", () => {
  it("returns an empty array when no notifications have been inserted", async () => {
    const res = await request(app)
      .get("/api/member/notifications")
      .set(MEMBER_AUTH);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns mock data when Supabase is not configured", async () => {
    mockIsConfigured = false;

    const res = await request(app)
      .get("/api/member/notifications")
      .set(MEMBER_AUTH);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});
