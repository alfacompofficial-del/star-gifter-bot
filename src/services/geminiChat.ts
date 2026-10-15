// Google Gemini 3.8 Flash Chat & Multimodal Audio Service

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  isAudio?: boolean;
  audioUrl?: string;
  audioDuration?: number;
}

export interface SendChatOptions {
  messages: ChatMessage[];
  systemPrompt: string;
  audio?: {
    data: string; // base64
    mimeType: string;
    duration?: number;
  };
  onChunk: (delta: string, accumulated: string) => void;
}

const CANDIDATE_MODELS = [
  import.meta.env.VITE_GEMINI_MODEL || "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-flash-lite-latest",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function streamGeminiChat({
  messages,
  systemPrompt,
  audio,
  onChunk,
}: SendChatOptions): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("VITE_GEMINI_API_KEY не задан в конфигурации (.env)");
  }

  // Build Gemini contents
  const contents: Array<{
    role: "user" | "model";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parts: any[];
  }> = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === "system") continue;

    const role = msg.role === "assistant" ? "model" : "user";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts: any[] = [];

    if (msg.content && msg.content.trim()) {
      parts.push({ text: msg.content.trim() });
    } else if (msg.isAudio) {
      parts.push({ text: "Голосовой запрос от клиента" });
    }

    // Attach audio to the last message if this is the target user message
    if (audio && i === messages.length - 1 && role === "user") {
      parts.push({
        inlineData: {
          mimeType: audio.mimeType,
          data: audio.data,
        },
      });
      // If no text was provided with the voice message, provide clear context
      if (!msg.content || !msg.content.trim()) {
        parts.unshift({
          text: "Голосовое сообщение от клиента. Внимательно прослушай аудио и ответь как официальный AI-консультант магазина компьютерной техники AlfaComp.",
        });
      }
    }

    if (parts.length > 0) {
      contents.push({ role, parts });
    }
  }

  // Ensure there is at least one content entry
  if (contents.length === 0) {
    if (audio) {
      contents.push({
        role: "user",
        parts: [
          { text: "Голосовой запрос от клиента. Прослушай запись и проконсультируй по товарам магазина." },
          { inlineData: { mimeType: audio.mimeType, data: audio.data } },
        ],
      });
    } else {
      contents.push({ role: "user", parts: [{ text: "Привет!" }] });
    }
  }

  const payload = {
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    contents,
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    },
  };

  async function requestModelStream(modelName: string): Promise<Response> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${apiKey}`;
    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  }

  async function requestModelSync(modelName: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      await resp.text().catch(() => "");
      throw new Error(`Sync request failed with status ${resp.status}`);
    }
    const data = await resp.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }

  let lastError: Error | null = null;

  // Try candidate models in order, with automatic fallback if quota (429) or 503 is encountered
  for (const model of CANDIDATE_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await requestModelStream(model);

        if (response.status === 429) {
          // Model quota reached; break immediately to switch to next model!
          await response.text().catch(() => "");
          console.warn(`[Gemini] Model ${model} returned 429 quota, switching to next model...`);
          break;
        }

        if (response.status === 503) {
          await response.text().catch(() => "");
          console.warn(`[Gemini] ${model} attempt ${attempt + 1} returned 503, waiting 1s...`);
          await sleep(1000);
          continue;
        }

        if (response.status === 404) {
          await response.text().catch(() => "");
          break;
        }

        if (!response.ok || !response.body) {
          const errText = await response.text().catch(() => "");
          console.error(`[Gemini] ${model} returned error ${response.status}:`, errText);
          break;
        }

        // Process SSE Stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        let fullResponse = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          let newlineIndex: number;

          while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === "[DONE]") continue;

            try {
              const parsed = JSON.parse(jsonStr);
              const candidates = parsed.candidates;
              if (candidates && candidates.length > 0) {
                const parts = candidates[0].content?.parts;
                if (parts && parts.length > 0) {
                  for (const part of parts) {
                    if (part.text) {
                      fullResponse += part.text;
                      onChunk(part.text, fullResponse);
                    }
                  }
                }
              }
            } catch {
              buffer = line + "\n" + buffer;
              break;
            }
          }
        }

        if (fullResponse.trim().length > 0) {
          return fullResponse;
        }
      } catch (streamErr) {
        console.warn(`[Gemini] Stream attempt failed on ${model}:`, streamErr);
        lastError = streamErr instanceof Error ? streamErr : new Error(String(streamErr));
      }
    }

    // Fallback: try non-streaming for this model before moving to next
    try {
      const syncResult = await requestModelSync(model);
      if (syncResult.trim().length > 0) {
        onChunk(syncResult, syncResult);
        return syncResult;
      }
    } catch {
      // Proceed to next candidate model
    }
  }

  throw lastError || new Error("Не удалось получить ответ от AI. Сервер Gemini временно перегружен, попробуйте через пару секунд.");
}
