// Send an anonymous gift: deduct from purchased-stars balance, create transaction,
// notify recipient (via bot DM) AND notification group — both messages are anonymous.
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

const GATEWAY = "https://connector-gateway.lovable.dev/telegram";

async function tg(method: string, payload: Record<string, unknown>) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
  const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY")!;
  const r = await fetch(`${GATEWAY}/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": TELEGRAM_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) console.error(`tg ${method} failed`, r.status, data);
  return { ok: r.ok, data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json(401, { error: "Missing auth" });

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json(401, { error: "Invalid session" });
    const senderId = userData.user.id;

    const body = await req.json();
    const giftId = String(body.gift_id ?? "");
    const recipientTelegramId = Number(body.recipient_telegram_id);
    if (!giftId || !recipientTelegramId) {
      return json(400, { error: "gift_id and recipient_telegram_id required" });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false },
    });

    // Resolve recipient
    const { data: recipient } = await admin
      .from("profiles")
      .select("user_id, telegram_id")
      .eq("telegram_id", recipientTelegramId)
      .maybeSingle();
    if (!recipient) return json(404, { error: "Recipient has not joined the app yet" });
    if (recipient.user_id === senderId) return json(400, { error: "Cannot send a gift to yourself" });

    // Resolve gift
    const { data: gift } = await admin
      .from("gifts")
      .select("id, name, price_stars, image_url, is_active")
      .eq("id", giftId)
      .maybeSingle();
    if (!gift || !gift.is_active) return json(404, { error: "Gift not available" });

    // Compute sender balance: stars_purchased - stars_spent
    const { data: senderProfile } = await admin
      .from("profiles")
      .select("stars_purchased")
      .eq("user_id", senderId)
      .single();
    const { data: spentRows } = await admin
      .from("transactions")
      .select("price_stars")
      .eq("sender_id", senderId);
    const spent = (spentRows ?? []).reduce((s, r) => s + (r.price_stars ?? 0), 0);
    const balance = (senderProfile?.stars_purchased ?? 0) - spent;
    if (balance < gift.price_stars) {
      return json(402, { error: "Insufficient stars", balance, needed: gift.price_stars });
    }

    // Insert transaction (sender_id stays in DB but never returned to clients)
    const { data: tx, error: txErr } = await admin
      .from("transactions")
      .insert({
        sender_id: senderId,
        recipient_id: recipient.user_id,
        gift_id: gift.id,
        price_stars: gift.price_stars,
      })
      .select("id")
      .single();
    if (txErr) return json(500, { error: txErr.message });

    // Load app settings for notification text/image and group id
    const { data: settings } = await admin
      .from("app_settings")
      .select("notification_group_id, gift_received_image_url, gift_received_message")
      .eq("id", 1)
      .single();

    const notifText = (settings?.gift_received_message ?? "🎁 You received an anonymous gift!");

    // 1. DM recipient (anonymous)
    try {
      const photoUrl = settings?.gift_received_image_url || gift.image_url;
      if (photoUrl) {
        await tg("sendPhoto", {
          chat_id: recipient.telegram_id,
          photo: photoUrl,
          caption: `${notifText}\n\n<b>${gift.name}</b> · ${gift.price_stars}⭐`,
          parse_mode: "HTML",
        });
      } else {
        await tg("sendMessage", {
          chat_id: recipient.telegram_id,
          text: `${notifText}\n\n<b>${gift.name}</b> · ${gift.price_stars}⭐`,
          parse_mode: "HTML",
        });
      }
    } catch (e) {
      console.error("Failed to DM recipient", e);
    }

    // 2. Group notification (FULLY ANONYMOUS — no sender, no recipient)
    if (settings?.notification_group_id) {
      try {
        await tg("sendMessage", {
          chat_id: settings.notification_group_id,
          text: `🎁 An anonymous gift was sent\n<b>${gift.name}</b> · ${gift.price_stars}⭐`,
          parse_mode: "HTML",
        });
      } catch (e) {
        console.error("Failed to notify group", e);
      }
    }

    return json(200, { success: true, transaction_id: tx.id, new_balance: balance - gift.price_stars });
  } catch (e) {
    console.error("send-gift error", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});
