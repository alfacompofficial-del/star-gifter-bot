// Google Gemini Chat & Multimodal Audio Service for AlfaComp
// Токены и секретные ключи подтягиваются исключительно через переменные окружения VITE_GEMINI_API_KEY.
// Никакие реальные ключи НЕ сохраняются в открытом виде в коде репозитория.

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

export class GeminiAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiAuthError";
  }
}

/**
 * Проверка разрешенного домена:
 * Защищает ваш API-ключ Gemini от несанкционированного использования и списания квоты на чужих доменах,
 * зеркалах или сторонних iframe.
 *
 * Разрешены:
 * - alfacomp.uz и любые его поддомены (*.alfacomp.uz)
 * - Стейджинг / Preview на Render (*.onrender.com)
 * - Локальная разработка: localhost, 127.0.0.1, [::1], 0.0.0.0
 */
export function isAllowedDomain(): boolean {
  if (typeof window === "undefined") return true;

  try {
    const host = (window.location.hostname || "").toLowerCase();
    if (!host) return false;

    // Защита от встраивания в чужие iframe (clickjacking / proxy)
    if (window.top !== window.self) {
      try {
        const topHost = (window.top?.location.hostname || "").toLowerCase();
        if (
          topHost &&
          topHost !== "alfacomp.uz" &&
          !topHost.endsWith(".alfacomp.uz") &&
          !topHost.endsWith(".onrender.com") &&
          topHost !== "localhost" &&
          topHost !== "127.0.0.1"
        ) {
          return false;
        }
      } catch {
        // Cross-origin iframe доступ заблокирован браузером — значит сайт открыт внутри чужого фрейма
        return false;
      }
    }

    if (
      host === "alfacomp.uz" ||
      host.endsWith(".alfacomp.uz") ||
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "[::1]" ||
      host === "0.0.0.0" ||
      host.endsWith(".onrender.com")
    ) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

/**
 * Безопасное получение API-ключа Gemini.
 * Возвращает ключ только на разрешенных доменах.
 */
export function getGeminiApiKey(): string {
  if (!isAllowedDomain()) return "";

  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey && typeof envKey === "string") {
    const trimmed = envKey.trim();
    if (!trimmed.startsWith("your-") && trimmed.length >= 25) {
      return trimmed;
    }
  }
  return "";
}

/**
 * Проверяет, настроен ли валидный API-ключ Gemini и открыт ли сайт на разрешенном домене
 */
export function isGeminiKeyConfigured(): boolean {
  if (!isAllowedDomain()) return false;
  const apiKey = getGeminiApiKey();
  return Boolean(apiKey && apiKey.length >= 25 && !apiKey.startsWith("your-"));
}

/**
 * Нормализация имени модели.
 * Google AI Studio вывел из эксплуатации gemini-2.5-flash, gemini-2.0-flash и 1.5 для новых пользователей (HTTP 404).
 * Если в Render Environment Variables указан gemini-2.5-flash, автоматически направляем на рабочую gemini-3.5-flash-lite.
 */
export function normalizeModelName(rawModel?: string): string {
  if (!rawModel) return "gemini-3.5-flash-lite";
  const trimmed = rawModel.trim();
  if (
    trimmed === "gemini-2.5-flash" ||
    trimmed === "gemini-2.0-flash" ||
    trimmed === "gemini-1.5-flash" ||
    trimmed.startsWith("gemini-2.") ||
    trimmed.startsWith("gemini-1.")
  ) {
    return "gemini-3.5-flash-lite";
  }
  return trimmed;
}

/**
 * Список кандидатов моделей в порядке приоритета
 */
export function getCandidateModels(): string[] {
  const configured = normalizeModelName(import.meta.env.VITE_GEMINI_MODEL);
  return Array.from(
    new Set([
      configured,
      "gemini-3.5-flash-lite",
      "gemini-3.5-flash",
      "gemini-flash-latest",
      "gemini-3.8-flash",
    ])
  );
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function streamGeminiChat({
  messages,
  systemPrompt,
  audio,
  onChunk,
}: SendChatOptions): Promise<string> {
  if (!isAllowedDomain()) {
    throw new GeminiAuthError("AI-консультант доступен только на официальном домене alfacomp.uz");
  }

  const apiKey = getGeminiApiKey();
  if (!apiKey || !isGeminiKeyConfigured()) {
    throw new GeminiAuthError("VITE_GEMINI_API_KEY не задан или не настроен для текущего домена");
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
      throw new Error(`Sync request failed with status ${resp.status}`);
    }
    const data = await resp.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }

  let lastError: Error | null = null;
  const candidateModels = getCandidateModels();

  // Try candidate models in order, with automatic fallback if quota (429) or 503 is encountered
  for (const model of candidateModels) {
    try {
      const response = await requestModelStream(model);

      // On auth error (invalid key, unauthenticated), stop immediately — no other model will succeed
      if (response.status === 400 || response.status === 401 || response.status === 403) {
        throw new GeminiAuthError(`Недействительный API-ключ Gemini (HTTP ${response.status})`);
      }

      if (response.status === 429) {
        await response.text().catch(() => "");
        lastError = new Error(`Превышен лимит запросов (429) для ${model}`);
        continue;
      }

      if (response.status === 503) {
        await response.text().catch(() => "");
        lastError = new Error(`Сервис Gemini временно перегружен (503)`);
        await sleep(600);
        continue;
      }

      if (response.status === 404) {
        await response.text().catch(() => "");
        continue;
      }

      if (!response.ok || !response.body) {
        continue;
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
      if (streamErr instanceof GeminiAuthError) {
        throw streamErr;
      }
      lastError = streamErr instanceof Error ? streamErr : new Error(String(streamErr));
    }

    // Try sync as fallback for this model
    try {
      const syncResult = await requestModelSync(model);
      if (syncResult.trim().length > 0) {
        onChunk(syncResult, syncResult);
        return syncResult;
      }
    } catch {
      // Continue to next model
    }
  }

  throw lastError || new Error("Не удалось получить ответ от Gemini API");
}
