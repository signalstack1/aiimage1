import type { VercelRequest, VercelResponse } from "@vercel/node";
import { checkAdminAuth } from "../_lib/admin";
import { supabase, isSupabaseConfigured } from "../_lib/supabase";

// ── Mock data ────────────────────────────────────────────────────────────────

function mockChart(days: number) {
  const out: { date: string; views: number; clicks: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    out.push({
      date: d.toISOString().slice(0, 10),
      views: Math.floor(20 + Math.random() * 60),
      clicks: Math.floor(2 + Math.random() * 12),
    });
  }
  return out;
}

const MOCK = {
  kpis: { products_live: 3, total_members: 47, product_views: 1240, purchase_clicks: 89 },
  chart_30d: mockChart(30),
  top_products: [
    { plan_name: "Pro", views: 620, clicks: 52, click_rate: 8.4, is_active: true },
    { plan_name: "Starter", views: 410, clicks: 28, click_rate: 6.8, is_active: true },
    { plan_name: "Lifetime", views: 210, clicks: 9, click_rate: 4.3, is_active: true },
  ],
  recent_activity: [
    { id: "1", event_type: "purchase_click", label: "Clicked checkout for Pro", plan_name: "Pro", created_at: new Date(Date.now() - 3 * 60000).toISOString() },
    { id: "2", event_type: "product_view", label: "Viewed Starter", plan_name: "Starter", created_at: new Date(Date.now() - 11 * 60000).toISOString() },
    { id: "3", event_type: "member_join", label: "New member joined Lifetime", plan_name: "Lifetime", created_at: new Date(Date.now() - 42 * 60000).toISOString() },
    { id: "4", event_type: "purchase_click", label: "Clicked checkout for Starter", plan_name: "Starter", created_at: new Date(Date.now() - 65 * 60000).toISOString() },
    { id: "5", event_type: "product_publish", label: "Published Pro", plan_name: "Pro", created_at: new Date(Date.now() - 2 * 3600000).toISOString() },
    { id: "6", event_type: "product_view", label: "Viewed Pro", plan_name: "Pro", created_at: new Date(Date.now() - 3 * 3600000).toISOString() },
    { id: "7", event_type: "member_join", label: "New member joined Pro", plan_name: "Pro", created_at: new Date(Date.now() - 4 * 3600000).toISOString() },
  ],
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function eventLabel(type: string, productName: string | null): string {
  const p = productName || "a product";
  switch (type) {
    case "product_view":    return `Viewed ${p}`;
    case "purchase_click":  return `Clicked checkout for ${p}`;
    case "product_publish": return `Published ${p}`;
    case "member_join":     return `New member joined ${p}`;
    default:                return type;
  }
}

function buildChart(
  events: { event_type: string; created_at: string }[],
  days: number,
): { date: string; views: number; clicks: number }[] {
  const buckets: Record<string, { views: number; clicks: number }> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    buckets[d] = { views: 0, clicks: 0 };
  }
  for (const e of events) {
    const d = e.created_at.slice(0, 10);
    if (!buckets[d]) continue;
    if (e.event_type === "product_view")   buckets[d].views++;
    if (e.event_type === "purchase_click") buckets[d].clicks++;
  }
  return Object.entries(buckets).map(([date, v]) => ({ date, ...v }));
}

// ── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!checkAdminAuth(req.headers.authorization)) return res.status(401).json({ error: "Unauthorized" });
  if (!isSupabaseConfigured()) return res.json(MOCK);

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

    const [
      { count: productsLive },
      { count: totalMembers },
      { count: allViews },
      { count: allClicks },
      { data: recentEvents },
      { data: products },
    ] = await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("customers").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("events").select("id", { count: "exact", head: true }).eq("event_type", "product_view"),
      supabase.from("events").select("id", { count: "exact", head: true }).eq("event_type", "purchase_click"),
      supabase
        .from("events")
        .select("id, event_type, product_name, created_at")
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("products").select("id, name, is_active").order("price_cents"),
    ]);

    const events = recentEvents || [];

    const chart_30d = buildChart(events, 30);

    const productMap: Record<string, { views: number; clicks: number; is_active: boolean }> = {};
    for (const p of products || []) {
      productMap[p.name] = { views: 0, clicks: 0, is_active: p.is_active };
    }
    for (const e of events) {
      const name = e.product_name || "Unknown";
      if (!productMap[name]) productMap[name] = { views: 0, clicks: 0, is_active: false };
      if (e.event_type === "product_view")   productMap[name].views++;
      if (e.event_type === "purchase_click") productMap[name].clicks++;
    }
    const top_products = Object.entries(productMap)
      .map(([plan_name, v]) => ({
        plan_name,
        views: v.views,
        clicks: v.clicks,
        click_rate: v.views > 0 ? Math.round((v.clicks / v.views) * 1000) / 10 : 0,
        is_active: v.is_active,
      }))
      .sort((a, b) => b.views - a.views);

    const recent_activity = events.slice(0, 20).map((e) => ({
      id: e.id,
      event_type: e.event_type,
      label: eventLabel(e.event_type, e.product_name),
      plan_name: e.product_name,   // keep field name for frontend compatibility
      created_at: e.created_at,
    }));

    return res.json({
      kpis: {
        products_live: productsLive ?? 0,
        total_members: totalMembers ?? 0,
        product_views: allViews ?? 0,
        purchase_clicks: allClicks ?? 0,
      },
      chart_30d,
      top_products,
      recent_activity,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
