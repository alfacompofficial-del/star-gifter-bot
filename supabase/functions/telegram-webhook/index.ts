// Telegram bot webhook: handles /start (registers user, sends Mini App link),
// /buy (sends invoice for Stars), pre_checkout_query, and successful_payment.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY = "https://connector-gateway.lovable.dev/telegram";

async function tg(method: string, payload: Record<string, unknown>) {
  const r = await fetch(`${GATEWAY}/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      "X-Connection-Api-Key": Deno.env.get("TELEGRAM_API_KEY")!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) console.error(`tg ${method} failed`, r.status, data);
  return data;
}

const STAR_PACKS = [
  { stars: 50, label: "50 ⭐" },
  { stars: 100, label: "100 ⭐" },
  { stars: 250, label: "250 ⭐" },
  { stars: 500, label: "500 ⭐" },
  { stars: 1000, label: "1000 ⭐" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const update = await req.json();
    console.log("update", JSON.stringify(update).slice(0, 500));

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    // ----- pre_checkout_query MUST be answered within 10s -----
    if (update.pre_checkout_query) {
      await tg("answerPreCheckoutQuery", {
        pre_checkout_query_id: update.pre_checkout_query.id,
        ok: true,
      });
      return new Response("ok", { headers: corsHeaders });
    }

    const msg = update.message;
    if (!msg) return new Response("ok", { headers: corsHeaders });

    // ----- successful payment (Stars top-up) -----
    if (msg.successful_payment) {
      const sp = msg.successful_payment;
      const tgUserId = msg.from.id as number;
      const stars = sp.total_amount as number; // for XTR amount == stars

      // Find profile (must exist; user must have opened mini app at least once)
      const { data: profile } = await admin
        .from("profiles")
        .select("user_id")
        .eq("telegram_id", tgUserId)
        .maybeSingle();

      if (profile) {
        // Idempotent insert
        await admin.from("purchases").upsert(
          {
            user_id: profile.user_id,
            amount_stars: stars,
            telegram_payment_charge_id: sp.telegram_payment_charge_id,
            provider_payment_charge_id: sp.provider_payment_charge_id ?? null,
            invoice_payload: sp.invoice_payload,
          },
          { onConflict: "telegram_payment_charge_id" },
        );

        // Increment cumulative balance
        const { data: cur } = await admin
          .from("profiles")
          .select("stars_purchased")
          .eq("user_id", profile.user_id)
          .single();
        await admin
          .from("profiles")
          .update({ stars_purchased: (cur?.stars_purchased ?? 0) + stars })
          .eq("user_id", profile.user_id);

        await tg("sendMessage", {
          chat_id: tgUserId,
          text: `✅ ${stars}⭐ added to your balance. Open the app to send a gift!`,
        });
      } else {
        await tg("sendMessage", {
          chat_id: tgUserId,
          text: "Please open the app first via /start, then try again.",
        });
      }
      return new Response("ok", { headers: corsHeaders });
    }

    const text = (msg.text ?? "").trim();
    const chatId = msg.chat.id;
    const tgUserId = msg.from?.id;

    // ----- /start -----
    if (text.startsWith("/start")) {
      const appUrl = Deno.env.get("MINI_APP_URL") ?? "";
      await tg("sendMessage", {
        chat_id: chatId,
        text:
          "👋 Welcome to Anonymous Gifts!\n\n" +
          "• Tap the button below to open the app\n" +
          "• Buy ⭐ with /buy to send anonymous gifts\n" +
          "• Recipients never see who sent them",
        reply_markup: appUrl
          ? {
              inline_keyboard: [[{ text: "🎁 Open App", web_app: { url: appUrl } }]],
            }
          : undefined,
      });
      return new Response("ok", { headers: corsHeaders });
    }

    // ----- /buy -----
    if (text.startsWith("/buy")) {
      await tg("sendMessage", {
        chat_id: chatId,
        text: "Choose a Stars pack:",
        reply_markup: {
          inline_keyboard: STAR_PACKS.map((p) => [
            { text: p.label, callback_data: `buy:${p.stars}` },
          ]),
        },
      });
      return new Response("ok", { headers: corsHeaders });
    }

    // ----- callback query for buy -----
    if (update.callback_query) {
      const cq = update.callback_query;
      const cbData: string = cq.data ?? "";
      if (cbData.startsWith("buy:")) {
        const stars = parseInt(cbData.split(":")[1], 10);
        if (!Number.isNaN(stars) && stars > 0) {
          await tg("sendInvoice", {
            chat_id: cq.from.id,
            title: `${stars} Stars`,
            description: `Top up ${stars} ⭐ for anonymous gifts`,
            payload: `topup_${stars}_${cq.from.id}_${Date.now()}`,
            currency: "XTR",
            prices: [{ label: `${stars} ⭐`, amount: stars }],
          });
        }
        await tg("answerCallbackQuery", { callback_query_id: cq.id });
      }
      return new Response("ok", { headers: corsHeaders });
    }

    return new Response("ok", { headers: corsHeaders });
  } catch (e) {
    console.error("webhook error", e);
    return new Response("ok", { headers: corsHeaders }); // Always 200 so TG doesn't retry forever
  }
});
