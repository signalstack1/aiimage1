/**
 * Data layer for SignalStack Mobile.
 *
 * Mode B: the sibling web artifact (artifacts/signal-saas) calls the API
 * server via hand-written fetch("/api/...") calls (no generated client).
 * This file mirrors those exact endpoints and response shapes so both
 * artifacts share the same backend contract (artifacts/api-server).
 */

export const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export interface ApiTag {
  id: string;
  name: string;
}
export interface ApiCategory {
  id: string;
  name: string;
  parent_id: string | null;
}
export interface ApiVariantOption {
  id: string;
  value: string;
  sort_order: number;
}
export interface ApiVariant {
  id: string;
  name: string;
  sort_order: number;
  product_variant_options: ApiVariantOption[];
}
export interface ApiPlan {
  id: string;
  name: string;
  description?: string;
  price_cents: number;
  currency?: string;
  interval: string;
  is_active: boolean;
  status?: string;
  payment_provider?: string | null;
  payment_url?: string | null;
  button_label?: string | null;
  image_url?: string | null;
  category_id?: string | null;
  categories?: ApiCategory | null;
  stock_quantity?: number;
  show_stock?: boolean;
  product_tags?: { tag_id: string; tags: ApiTag }[];
  product_variants?: ApiVariant[];
  free_delivery_enabled?: boolean;
  faster_delivery_enabled?: boolean;
  faster_delivery_payment_link?: string | null;
  created_at?: string;
}

export interface ApiService {
  id: string;
  name: string;
  description: string;
  image_url: string;
  category: string;
  starting_price: string;
  cta_type: string;
  is_active: boolean;
  is_featured: boolean;
}

export interface GalleryItem {
  id: string;
  title: string;
  image_url: string;
  category: string;
  description: string;
  is_featured: boolean;
}

export interface AccessLink {
  id: string;
  platform: string;
  label: string;
  invite_url: string;
}

export interface Customer {
  id: string;
  email: string;
  plan: string;
  status: string;
  subscribed_at: string;
  expires_at?: string;
}

export interface Kpis {
  productsLive: number;
  totalMembers: number;
  productViews?: number;
  purchaseClicks?: number;
  monthlyRevenueCents?: number;
  totalRevenueCents?: number;
}
export interface ChartDay {
  date: string;
  views: number;
  clicks: number;
}
export interface TopProduct {
  planName: string;
  views: number;
  clicks: number;
  clickRate: number;
  isActive: boolean;
}
export interface ActivityItem {
  id: string;
  eventType: string;
  label: string;
  planName: string | null;
  createdAt: string;
}
export interface OverviewData {
  kpis: Kpis;
  chart30d: ChartDay[];
  topProducts: TopProduct[];
  recentActivity: ActivityItem[];
}

// ── Public endpoints ──────────────────────────────────────────────────────

export async function fetchPlans(): Promise<ApiPlan[]> {
  try {
    const res = await fetch(`${API_BASE}/api/plans`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function fetchPlanById(id: string): Promise<ApiPlan | null> {
  try {
    const res = await fetch(`${API_BASE}/api/plans?id=${id}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function trackEvent(eventType: string, planId?: string, planName?: string) {
  try {
    await fetch(`${API_BASE}/api/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type: eventType, plan_id: planId ?? null, plan_name: planName ?? null }),
    });
  } catch {
    // tracking failures must never break the UX
  }
}

export async function fetchAccessLinks(): Promise<AccessLink[]> {
  try {
    const res = await fetch(`${API_BASE}/api/access`);
    const body = await res.json();
    if (!res.ok) return [];
    // API may return a bare array or { access_links: [...] } — handle both.
    if (Array.isArray(body)) return body;
    return body?.access_links ?? [];
  } catch {
    return [];
  }
}

// Mirrors the web artifact's /services, /gallery, /book, and /contact pages
// (artifacts/signal-saas/src/pages/{services,gallery,book,contact}.tsx),
// which are unused-module scaffold pages for this business (services/
// bookings/gallery/messages are disabled in APP_CONFIG.adminModules and the
// api-server does not implement these routes yet). They're kept here so the
// mobile app mirrors the exact same reachable screens/behavior as web —
// both show graceful empty/error states until a business that uses these
// modules wires up the corresponding api-server routes.

export async function fetchServices(): Promise<ApiService[]> {
  try {
    const res = await fetch(`${API_BASE}/api/services`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function fetchGalleryItems(): Promise<GalleryItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/gallery`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function submitBooking(payload: {
  customer_name: string;
  email: string;
  phone: string;
  service: string;
  preferred_date: string;
  preferred_time: string;
  message: string;
}): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function submitContactMessage(payload: {
  name: string;
  email: string;
  subject: string;
  body: string;
}): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Admin auth ────────────────────────────────────────────────────────────

export async function adminLogin(password: string): Promise<{ token?: string; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.token) return { token: data.token };
    return { error: data.error || "Invalid password" };
  } catch {
    return { error: "Could not connect. Please try again." };
  }
}

function adminHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function normalizeOverview(raw: any): OverviewData {
  if (raw?.kpis) {
    return {
      kpis: {
        productsLive: raw.kpis.products_live ?? 0,
        totalMembers: raw.kpis.total_members ?? 0,
        productViews: raw.kpis.product_views ?? 0,
        purchaseClicks: raw.kpis.purchase_clicks ?? 0,
      },
      chart30d: (raw.chart_30d ?? []).map((d: any) => ({ date: d.date, views: d.views, clicks: d.clicks })),
      topProducts: (raw.top_products ?? []).map((p: any) => ({
        planName: p.plan_name,
        views: p.views,
        clicks: p.clicks,
        clickRate: p.click_rate,
        isActive: p.is_active,
      })),
      recentActivity: (raw.recent_activity ?? []).map((a: any) => ({
        id: a.id,
        eventType: a.event_type,
        label: a.label,
        planName: a.plan_name,
        createdAt: a.created_at,
      })),
    };
  }

  // Real api-server /admin/overview shape (see artifacts/api-server/src/routes/admin.ts)
  const recentSubs = raw?.recent_subscribers ?? [];
  return {
    kpis: {
      productsLive: raw?.products_live ?? 0,
      totalMembers: raw?.total_subscribers ?? 0,
      monthlyRevenueCents: raw?.monthly_revenue_cents ?? 0,
      totalRevenueCents: raw?.total_revenue_cents ?? 0,
    },
    chart30d: [],
    topProducts: [],
    recentActivity: recentSubs.map((s: any, i: number) => ({
      id: `sub-${i}`,
      eventType: "member_join",
      label: `${s.email} · ${s.plan}`,
      planName: s.plan ?? null,
      createdAt: s.subscribed_at,
    })),
  };
}

export async function fetchOverview(token: string): Promise<OverviewData | null> {
  try {
    const res = await fetch(`${API_BASE}/api/admin/overview`, { headers: adminHeaders(token) });
    if (!res.ok) return null;
    const raw = await res.json();
    return normalizeOverview(raw);
  } catch {
    return null;
  }
}

export async function fetchAdminProducts(token: string): Promise<ApiPlan[]> {
  try {
    const res = await fetch(`${API_BASE}/api/admin/plans`, { headers: adminHeaders(token) });
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function fetchAdminCustomers(token: string): Promise<Customer[]> {
  try {
    const res = await fetch(`${API_BASE}/api/admin/subscribers`, { headers: adminHeaders(token) });
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function fetchAdminAccessLinks(token: string): Promise<AccessLink[]> {
  try {
    const res = await fetch(`${API_BASE}/api/admin/links`, { headers: adminHeaders(token) });
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
