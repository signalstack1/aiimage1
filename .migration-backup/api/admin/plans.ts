import type { VercelRequest, VercelResponse } from "@vercel/node";
import { checkAdminAuth } from "../_lib/admin";
import { supabase, isSupabaseConfigured } from "../_lib/supabase";

const MOCK_PLANS = [
  { id: "plan-starter", name: "Starter", description: "Core features for individuals getting started.", price_cents: 2900, currency: "usd", interval: "monthly", is_active: true, status: "active", payment_provider: null, payment_url: null, button_label: null, image_url: null, category_id: null, stock_quantity: -1, show_stock: false, product_tags: [], product_variants: [] },
  { id: "plan-pro",     name: "Pro",     description: "Full feature access for power users.",           price_cents: 7900, currency: "usd", interval: "monthly", is_active: true, status: "active", payment_provider: null, payment_url: null, button_label: null, image_url: null, category_id: null, stock_quantity: -1, show_stock: false, product_tags: [], product_variants: [] },
  { id: "plan-lifetime",name: "Lifetime",description: "All Pro features, one payment, forever.",        price_cents: 49900,currency: "usd", interval: "lifetime",is_active: true, status: "active", payment_provider: null, payment_url: null, button_label: null, image_url: null, category_id: null, stock_quantity: -1, show_stock: false, product_tags: [], product_variants: [] },
];

const PRODUCT_SELECT = `*, product_tags(tag_id, tags(id, name)), product_variants(id, name, sort_order, product_variant_options(id, value, sort_order))`;

async function upsertTags(supabase: any, productId: string, tagIds: string[]) {
  await supabase.from("product_tags").delete().eq("product_id", productId);
  if (tagIds && tagIds.length > 0) {
    await supabase.from("product_tags").insert(tagIds.map((tid: string) => ({ product_id: productId, tag_id: tid })));
  }
}

async function upsertVariants(supabase: any, productId: string, variants: any[]) {
  await supabase.from("product_variants").delete().eq("product_id", productId);
  if (variants && variants.length > 0) {
    for (let vi = 0; vi < variants.length; vi++) {
      const v = variants[vi];
      const { data: vd } = await supabase.from("product_variants").insert({ product_id: productId, name: v.name, sort_order: vi }).select().single();
      if (vd && v.options && v.options.length > 0) {
        await supabase.from("product_variant_options").insert(v.options.map((val: string, oi: number) => ({ variant_id: vd.id, value: val, sort_order: oi })));
      }
    }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!checkAdminAuth(req.headers.authorization)) return res.status(401).json({ error: "Unauthorized" });

  if (req.method === "GET") {
    if (!isSupabaseConfigured()) return res.json(MOCK_PLANS);
    const { data, error } = await supabase.from("products").select(PRODUCT_SELECT).order("price_cents");
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  }

  if (req.method === "POST") {
    const { name, description, price_cents, currency, interval, payment_provider, payment_url, button_label, image_url, category_id, stock_quantity, show_stock, status, free_delivery_enabled, faster_delivery_enabled, faster_delivery_payment_link, tag_ids, variants } = req.body || {};
    if (!name || !price_cents || !interval) return res.status(400).json({ error: "name, price_cents, interval required" });

    const resolvedCurrency = currency === "gbp" ? "gbp" : "usd";
    const resolvedStatus = status || "active";
    const stockQty = stock_quantity != null && stock_quantity !== "" ? Number(stock_quantity) : -1;

    if (!isSupabaseConfigured()) {
      return res.status(201).json({ id: `plan-${Date.now()}`, name, description, price_cents, currency: resolvedCurrency, interval, is_active: resolvedStatus === "active", status: resolvedStatus, payment_provider: payment_provider || null, payment_url: payment_url || null, button_label: button_label || null, image_url: image_url || null, category_id: category_id || null, stock_quantity: stockQty, show_stock: show_stock || false, product_tags: [], product_variants: [] });
    }

    const { data, error } = await supabase.from("products").insert({ name, description, price_cents, currency: resolvedCurrency, interval, payment_provider: payment_provider || null, payment_url: payment_url || null, button_label: button_label || null, image_url: image_url || null, category_id: category_id || null, stock_quantity: stockQty, show_stock: show_stock || false, status: resolvedStatus, is_active: resolvedStatus === "active", free_delivery_enabled: free_delivery_enabled || false, faster_delivery_enabled: faster_delivery_enabled || false, faster_delivery_payment_link: faster_delivery_payment_link || null }).select().single();
    if (error) return res.status(500).json({ error: error.message });

    await upsertTags(supabase, data.id, tag_ids || []);
    await upsertVariants(supabase, data.id, variants || []);

    const { data: full } = await supabase.from("products").select(PRODUCT_SELECT).eq("id", data.id).single();
    return res.status(201).json(full || data);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
