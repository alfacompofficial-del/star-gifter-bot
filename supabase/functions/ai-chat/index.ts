const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `Ты — AI-помощник магазина AlfaComp (alfacomp.uz) в Узбекистане. Помогай клиентам с выбором компьютерной техники: ноутбуки, мониторы, ИБП, сетевое оборудование, аксессуары. Отвечай дружелюбно, кратко, на русском языке. Если не знаешь точную цену или наличие — предложи уточнить у менеджера. Цены в сумах (UZS).`;

const CANDIDATE_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-flash-lite-latest",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
];

// deno-lint-ignore no-explicit-any
function formatGeminiContents(messages: any[], audio?: { mimeType: string; data: string }) {
  const contents = [];

  for (const m of messages) {
    if (m.role === "system") continue;
    const role = m.role === "assistant" ? "model" : "user";
    const parts: any[] = [];
    if (m.content) {
      parts.push({ text: m.content });
    }
    if (parts.length > 0) {
      contents.push({ role, parts });
    }
  }

  // If direct audio is passed in the request, append it to the latest user message
  if (audio && audio.data) {
    const audioPart = {
      inlineData: {
        mimeType: audio.mimeType || "audio/wav",
        data: audio.data,
      },
    };
    if (contents.length > 0 && contents[contents.length - 1].role === "user") {
      contents[contents.length - 1].parts.push(audioPart);
    } else {
      contents.push({
        role: "user",
        parts: [
          { text: "Голосовой запрос от клиента. Прослушай и ответь консультацией по ассортименту магазина." },
          audioPart,
        ],
      });
    }
  }

  return contents;
}

// @ts-ignore Deno global
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const messages = body.messages || [];
    const audio = body.audio;

    // Extract system prompt if passed in messages
    // deno-lint-ignore no-explicit-any
    const systemMsg = messages.find((m: any) => m.role === "system");
    const activeSystemPrompt = systemMsg?.content || SYSTEM_PROMPT;

    // @ts-ignore Deno env
    const apiKey = Deno.env.get("GEMINI_API_KEY") || "";

    const contents = formatGeminiContents(messages, audio);
    if (contents.length === 0) {
      contents.push({ role: "user", parts: [{ text: "Привет!" }] });
    }

    const payload = {
      systemInstruction: {
        parts: [{ text: activeSystemPrompt }],
      },
      contents,
    };

    let resp: Response | null = null;

    // Try models in order, with automatic fallback on 429 quota exhaustion or 503
    for (const model of CANDIDATE_MODELS) {
      try {
        const candidateResp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );

        if (candidateResp.status === 429 || candidateResp.status === 503 || candidateResp.status === 404) {
          await candidateResp.text().catch(() => "");
          console.warn(`[Supabase Edge] ${model} returned ${candidateResp.status}, falling back...`);
          continue;
        }

        if (candidateResp.ok) {
          resp = candidateResp;
          break;
        }
      } catch (err) {
        console.warn(`[Supabase Edge] error contacting ${model}:`, err);
      }
    }

    if (!resp || !resp.ok) {
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Stream SSE directly back
    return new Response(resp.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (e) {
    console.error("ai-chat error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
