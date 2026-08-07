// Telegram Mini App initData validation -> Supabase session
// Docs: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function hmacSha256(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function validateInitData(initData: string, botToken: string): Promise<Record<string, string> | null> {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");

  const secretKey = await hmacSha256(new TextEncoder().encode("WebAppData"), botToken);
  const computed = await hmacSha256(secretKey, dataCheckString);
  const computedHex = bufToHex(computed);
  if (computedHex !== hash) return null;

  // Anti-replay: require auth_date within last 24h
  const authDate = Number(params.get("auth_date"));
  if (!authDate || Date.now() / 1000 - authDate > 86400) return null;

  return Object.fromEntries(params.entries());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!BOT_TOKEN || !SUPABASE_URL || !SERVICE_KEY) {
      return json(500, { error: "Server misconfigured" });
    }

    const { initData } = await req.json();
    if (typeof initData !== "string" || initData.length === 0) {
      return json(400, { error: "Missing initData" });
    }

    const validated = await validateInitData(initData, BOT_TOKEN);
    if (!validated) return json(401, { error: "Invalid initData" });

    const tgUser = JSON.parse(validated.user ?? "{}");
    if (!tgUser.id) return json(400, { error: "No telegram user" });

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Synthetic email for telegram users
    const email = `tg_${tgUser.id}@telegram.local`;
    const password = `tg_${tgUser.id}_${BOT_TOKEN.slice(0, 16)}`; // deterministic per bot

    // Try to fetch existing user via profiles -> telegram_id
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("user_id")
      .eq("telegram_id", tgUser.id)
      .maybeSingle();

    let userId = existingProfile?.user_id as string | undefined;

    if (!userId) {
      // Create new auth user
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          telegram_id: tgUser.id,
          username: tgUser.username,
          first_name: tgUser.first_name,
          last_name: tgUser.last_name,
          photo_url: tgUser.photo_url,
        },
      });
      if (createErr || !created.user) {
        return json(500, { error: createErr?.message ?? "Could not create user" });
      }
      userId = created.user.id;

      await admin.from("profiles").insert({
        user_id: userId,
        telegram_id: tgUser.id,
        username: tgUser.username ?? null,
        first_name: tgUser.first_name ?? null,
        last_name: tgUser.last_name ?? null,
        photo_url: tgUser.photo_url ?? null,
      });

      await admin.from("user_roles").insert({ user_id: userId, role: "user" });
    } else {
      // Refresh profile fields
      await admin.from("profiles").update({
        username: tgUser.username ?? null,
        first_name: tgUser.first_name ?? null,
        last_name: tgUser.last_name ?? null,
        photo_url: tgUser.photo_url ?? null,
      }).eq("user_id", userId);
    }

    // Issue session via password sign-in
    const anon = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "");
    const { data: signIn, error: signErr } = await anon.auth.signInWithPassword({ email, password });
    if (signErr || !signIn.session) {
      return json(500, { error: signErr?.message ?? "Could not start session" });
    }

    return json(200, {
      session: signIn.session,
      user: {
        id: userId,
        telegram_id: tgUser.id,
        username: tgUser.username,
        first_name: tgUser.first_name,
        photo_url: tgUser.photo_url,
      },
    });
  } catch (e) {
    console.error("telegram-auth error", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});
