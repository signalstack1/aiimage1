import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase, isSupabaseConfigured } from "./_lib/supabase";

const MOCK_PLANS = [
  { id: "plan-starter", name: "Starter", description: "Core features for individuals getting started.", price_cents: 2900, currency: "usd", interval: "monthly", is_active: true, status: "active", payment_provider: null, payment_url: null, button_label: null, image_url: null, category_id: null, stock_quantity: -1, show_stock: false, product_tags: [], product_variants: [] },
  { id: "plan-pro",     name: "Pro",     description: "Full feature access for power users.",           price_cents: 7900, currency: "usd", interval: "monthly", is_active: true, status: "active", payment_provider: null, payment_url: null, button_label: null, image_url: null, category_id: null, stock_quantity: -1, show_stock: false, product_tags: [], product_variants: [] },
  { id: "plan-lifetime",name: "Lifetime",description: "All Pro features, one payment, forever.",        price_cents: 49900,currency: "usd", interval: "lifetime",is_active: true, status: "active", payment_provider: null, payment_url: null, button_label: null, image_url: null, category_id: null, stock_quantity: -1, show_stock: false, product_tags: [], product_variants: [] },
];

const PRODUCT_PUBLIC_SELECT = `id, name, description, price_cents, currency, interval, is_active, status, payment_provider, payment_url, button_label, image_url, category_id, stock_quantity, show_stock, created_at, free_delivery_enabled, faster_delivery_enabled, faster_delivery_payment_link, categories(id, name, parent_id), product_tags(tag_id, tags(id, name)), product_variants(id, name, sort_order, product_variant_options(id, value, sort_order))`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!isSupabaseConfigured()) return res.json(MOCK_PLANS);

  const { id } = req.query;

  try {
    if (id) {
      const { data, error } = await supabase.from("products").select(PRODUCT_PUBLIC_SELECT).eq("id", id as string).single();
      if (error) return res.status(404).json({ error: "Not found" });
      return res.json(data);
    }
    const { data, error } = await supabase.from("products").select(PRODUCT_PUBLIC_SELECT).eq("is_active", true).order("price_cents");
    if (error) return res.json(MOCK_PLANS);
    return res.json(data || []);
  } catch {
    return res.json(MOCK_PLANS);
  }
}
