import type { VercelRequest, VercelResponse } from "@vercel/node";
import { checkAdminAuth } from "../../_lib/admin";
import { supabase, isSupabaseConfigured } from "../../_lib/supabase";

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
  const { id } = req.query as { id: string };

  if (req.method === "PATCH") {
    if (!isSupabaseConfigured()) return res.json({ id, ...req.body });

    const { tag_ids, variants, ...fields } = req.body || {};

    if (fields.status !== undefined) fields.is_active = fields.status === "active";
    if (fields.stock_quantity !== undefined && fields.stock_quantity !== "") fields.stock_quantity = Number(fields.stock_quantity);
    if (fields.category_id === "") fields.category_id = null;

    const { data: existing } = await supabase.from("products").select("name, is_active").eq("id", id).single();
    const { data, error } = await supabase.from("products").update(fields).eq("id", id).select().single();
    if (error) return res.status(500).json({ error: error.message });

    if (fields.is_active === true && existing && !existing.is_active) {
      await supabase.from("events").insert({ event_type: "product_publish", product_id: id, product_name: data?.name ?? existing.name, actor: "admin", meta: {} });
    }

    if (tag_ids !== undefined) await upsertTags(supabase, id, tag_ids);
    if (variants !== undefined) await upsertVariants(supabase, id, variants);

    const { data: full } = await supabase.from("products").select(PRODUCT_SELECT).eq("id", id).single();
    return res.json(full || data);
  }

  if (req.method === "DELETE") {
    if (!isSupabaseConfigured()) return res.json({ deleted: true });
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ deleted: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
