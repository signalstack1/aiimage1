import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { plan_id } = await req.json();

    const WHOP_API_KEY = Deno.env.get("WHOP_API_KEY");
    const WHOP_COMPANY_ID = Deno.env.get("WHOP_COMPANY_ID");

    if (!WHOP_API_KEY || !WHOP_COMPANY_ID) {
      return new Response(
        JSON.stringify({ error: "Whop is not configured. Set WHOP_API_KEY and WHOP_COMPANY_ID in Supabase Edge Function secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!plan_id) {
      return new Response(
        JSON.stringify({ error: "plan_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, price_cents, interval")
      .eq("id", plan_id)
      .single();

    if (productError || !product) {
      return new Response(
        JSON.stringify({ error: "Product not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const price = product.price_cents / 100;
    const planType = product.interval === "lifetime" ? "one_time" : "renewal";
    const billingDays =
      product.interval === "monthly"   ? 30
      : product.interval === "quarterly" ? 90
      : product.interval === "yearly"    ? 365
      : undefined;

    const whopBody: Record<string, unknown> = {
      company_id: WHOP_COMPANY_ID,
      plan: {
        initial_price: price,
        plan_type: planType,
        ...(planType === "renewal" && billingDays ? { billing_period: billingDays } : {}),
      },
      metadata: { plan_id: product.id, plan_name: product.name },
    };

    const whopRes = await fetch("https://api.whop.com/api/v5/checkout_configurations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHOP_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(whopBody),
    });

    const whopData = await whopRes.json();

    if (!whopRes.ok) {
      return new Response(
        JSON.stringify({ error: whopData?.message || "Whop API error", details: whopData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ session_id: whopData.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
