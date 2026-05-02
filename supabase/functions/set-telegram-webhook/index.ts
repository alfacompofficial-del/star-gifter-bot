// Admin utility: registers Telegram bot webhook to point at telegram-webhook function.
// Call once after deploy, or whenever the function URL changes.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    // Auth: only admins
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json(401, { error: "Missing auth" });
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u.user) return json(401, { error: "Invalid session" });

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json(403, { error: "Admin only" });

    const { webhook_url } = await req.json();
    if (typeof webhook_url !== "string" || !webhook_url.startsWith("https://")) {
      return json(400, { error: "webhook_url (https) required" });
    }

    const r = await fetch(`https://connector-gateway.lovable.dev/telegram/setWebhook`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "X-Connection-Api-Key": Deno.env.get("TELEGRAM_API_KEY")!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: webhook_url,
        allowed_updates: ["message", "callback_query", "pre_checkout_query"],
      }),
    });
    const data = await r.json();
    return json(r.ok ? 200 : 500, data);
  } catch (e) {
    console.error("set-telegram-webhook error", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});
