import type { VercelRequest, VercelResponse } from "@vercel/node";
import { checkAdminAuth } from "../_lib/admin";
import { supabase, isSupabaseConfigured } from "../_lib/supabase";

// Handles categories, tags, and product variants
// ?resource=categories|tags|variants  &id=<uuid>  &product_id=<uuid>

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!checkAdminAuth(req.headers.authorization)) return res.status(401).json({ error: "Unauthorized" });

  const resource = req.query.resource as string;
  const id = req.query.id as string | undefined;
  const productId = req.query.product_id as string | undefined;

  // ── Categories ──────────────────────────────────────────────────────────────
  if (resource === "categories") {
    if (req.method === "GET") {
      if (!isSupabaseConfigured()) return res.json([]);
      const { data, error } = await supabase.from("categories").select("id, name, parent_id, sort_order").order("sort_order").order("name");
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data || []);
    }
    if (req.method === "POST") {
      const { name, parent_id } = req.body || {};
      if (!name) return res.status(400).json({ error: "name required" });
      if (!isSupabaseConfigured()) return res.status(201).json({ id: `cat-${Date.now()}`, name, parent_id: parent_id || null });
      const { data, error } = await supabase.from("categories").insert({ name, parent_id: parent_id || null }).select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json(data);
    }
    if (req.method === "PATCH" && id) {
      const { name } = req.body || {};
      if (!name) return res.status(400).json({ error: "name required" });
      if (!isSupabaseConfigured()) return res.json({ id, name });
      const { data, error } = await supabase.from("categories").update({ name }).eq("id", id).select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }
    if (req.method === "DELETE" && id) {
      if (!isSupabaseConfigured()) return res.json({ deleted: true });
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ deleted: true });
    }
  }

  // ── Tags ────────────────────────────────────────────────────────────────────
  if (resource === "tags") {
    if (req.method === "GET") {
      if (!isSupabaseConfigured()) return res.json([]);
      const { data, error } = await supabase.from("tags").select("id, name").order("name");
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data || []);
    }
    if (req.method === "POST") {
      const { name } = req.body || {};
      if (!name) return res.status(400).json({ error: "name required" });
      if (!isSupabaseConfigured()) return res.status(201).json({ id: `tag-${Date.now()}`, name });
      const { data, error } = await supabase.from("tags").insert({ name }).select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json(data);
    }
    if (req.method === "DELETE" && id) {
      if (!isSupabaseConfigured()) return res.json({ deleted: true });
      const { error } = await supabase.from("tags").delete().eq("id", id);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ deleted: true });
    }
  }

  // ── Variants (read-only fetch for a product) ─────────────────────────────────
  // Variants are written via the plans PATCH endpoint (variants array in body)
  if (resource === "variants" && req.method === "GET" && productId) {
    if (!isSupabaseConfigured()) return res.json([]);
    const { data, error } = await supabase
      .from("product_variants")
      .select("id, name, sort_order, product_variant_options(id, value, sort_order)")
      .eq("product_id", productId)
      .order("sort_order");
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  }

  return res.status(400).json({ error: "Invalid resource or method" });
}
