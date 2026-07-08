import { Router } from "express";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { logger } from "../lib/logger";

const router = Router();

const MOCK_PRODUCTS = [
  { id: "plan-starter", name: "Starter", description: "Core features for individuals getting started.", price_cents: 2900, currency: "usd", interval: "monthly", is_active: true, status: "active", payment_provider: null, payment_url: null, button_label: null, image_url: null, category_id: null, stock_quantity: -1, show_stock: false, product_tags: [], product_variants: [] },
  { id: "plan-pro",     name: "Pro",     description: "Full feature access for power users.",           price_cents: 7900, currency: "usd", interval: "monthly", is_active: true, status: "active", payment_provider: null, payment_url: null, button_label: null, image_url: null, category_id: null, stock_quantity: -1, show_stock: false, product_tags: [], product_variants: [] },
  { id: "plan-lifetime",name: "Lifetime",description: "All Pro features, one payment, forever.",        price_cents: 49900,currency: "usd", interval: "lifetime",is_active: true, status: "active", payment_provider: null, payment_url: null, button_label: null, image_url: null, category_id: null, stock_quantity: -1, show_stock: false, product_tags: [], product_variants: [] },
];

const PRODUCT_PUBLIC_SELECT = `
  id, name, description, price_cents, currency, interval, is_active, status,
  payment_provider, payment_url, button_label, image_url,
  category_id, stock_quantity, show_stock, created_at,
  free_delivery_enabled, faster_delivery_enabled, faster_delivery_payment_link,
  categories(id, name, parent_id),
  product_tags(tag_id, tags(id, name)),
  product_variants(id, name, sort_order, product_variant_options(id, value, sort_order))
`;

// GET /api/plans — list active products, or single product with ?id=<uuid>
router.get("/plans", async (req, res) => {
  if (!isSupabaseConfigured()) return res.json(MOCK_PRODUCTS);

  const { id } = req.query;

  try {
    if (id) {
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_PUBLIC_SELECT)
        .eq("id", id as string)
        .single();
      if (error) {
        // Full join may fail if migration 002 not run — fall back to basic select
        const { data: basic, error: basicErr } = await supabase
          .from("products")
          .select("id, name, description, price_cents, currency, interval, is_active, payment_provider, payment_url, button_label, image_url")
          .eq("id", id as string)
          .single();
        if (basicErr) return res.status(404).json({ error: "Not found" });
        return res.json({ ...basic, stock_quantity: -1, show_stock: false, category_id: null, categories: null, free_delivery_enabled: false, faster_delivery_enabled: false, faster_delivery_payment_link: null, product_tags: [], product_variants: [] });
      }
      return res.json(data);
    }

    const { data, error } = await supabase
      .from("products")
      .select(PRODUCT_PUBLIC_SELECT)
      .eq("is_active", true)
      .order("price_cents");

    if (error) {
      logger.warn({ err: error.message }, "DB query failed for /plans — trying basic select");
      const { data: basic, error: basicErr } = await supabase
        .from("products")
        .select("id, name, description, price_cents, currency, interval, is_active, payment_provider, payment_url, button_label, image_url")
        .eq("is_active", true)
        .order("price_cents");
      if (basicErr) {
        logger.warn({ err: basicErr.message }, "Basic select also failed — returning mock data");
        return res.json(MOCK_PRODUCTS);
      }
      return res.json((basic || []).map((p: any) => ({ ...p, stock_quantity: -1, show_stock: false, category_id: null, categories: null, free_delivery_enabled: false, faster_delivery_enabled: false, faster_delivery_payment_link: null, product_tags: [], product_variants: [] })));
    }
    return res.json(data || []);
  } catch (err: any) {
    logger.warn({ err }, "/plans error");
    return res.json(MOCK_PRODUCTS);
  }
});

// POST /api/track — analytics event
router.post("/track", async (req, res) => {
  const { event_type, plan_id, plan_name } = req.body || {};
  if (!event_type) return res.status(400).json({ error: "event_type required" });

  if (!isSupabaseConfigured()) return res.json({ ok: true });

  try {
    await supabase.from("events").insert({
      event_type,
      product_id: plan_id || null,
      product_name: plan_name || null,
      actor: "anon",
      meta: {},
    });
    return res.json({ ok: true });
  } catch (err: any) {
    logger.warn({ err }, "/track error (non-fatal)");
    return res.json({ ok: true });
  }
});

// GET /api/access — public access links
router.get("/access", async (req, res) => {
  if (!isSupabaseConfigured()) {
    return res.json([
      { id: "link-discord",  platform: "discord",  label: "Members Community", invite_url: "https://discord.gg/example" },
      { id: "link-telegram", platform: "telegram", label: "Updates Channel",   invite_url: "https://t.me/example" },
    ]);
  }
  const { data, error } = await supabase.from("access_links").select("id, platform, label, invite_url").order("sort_order");
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || []);
});

export default router;
