import { useState, useRef, useEffect, useMemo } from "react";
import { 
  MessageCircle, 
  X, 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Package, 
  Eye, 
  ShoppingCart, 
  Check, 
  RotateCcw, 
  ChevronRight,
  Mic,
  Play,
  Pause,
  Trash2,
  Volume2
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Product } from "@/hooks/useProducts";
import { formatPrice } from "@/lib/constants";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import { streamGeminiChat, type ChatMessage } from "@/services/geminiChat";
import { VoiceRecorder, formatDuration } from "@/utils/audioRecorder";

export interface AIChatWidgetProps {
  products?: Product[];
  onSelectProduct?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
}

// Inline audio player component for recorded voice messages
const VoiceMessagePlayer = ({
  audioUrl,
  duration,
}: {
  audioUrl: string;
  duration?: number;
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (audio.duration && !Number.isNaN(audio.duration)) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  return (
    <div className="flex items-center gap-2.5 py-1 px-1 min-w-[190px] select-none">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      <button
        type="button"
        onClick={togglePlay}
        className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/35 active:scale-95 text-white flex items-center justify-center transition-all shrink-0 shadow"
        title={isPlaying ? "Пауза" : "Воспроизвести запись"}
      >
        {isPlaying ? (
          <Pause className="w-3.5 h-3.5 fill-white" />
        ) : (
          <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
        )}
      </button>

      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <div className="flex items-center justify-between text-[10px] text-white/90 font-mono">
          <span className="flex items-center gap-1 font-semibold">
            <Volume2 className="w-3 h-3 text-white/80" />
            Голос
          </span>
          <span>{duration ? formatDuration(duration) : "0:00"}</span>
        </div>
        <div className="w-full h-1 bg-black/40 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

const AIChatWidget = ({ products = [], onSelectProduct, onAddToCart }: AIChatWidgetProps) => {
  const { exchangeRate } = useExchangeRate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [addedToCartIds, setAddedToCartIds] = useState<number[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const openedProductsRef = useRef<Set<number>>(new Set());

  // Voice recording state
  const recorderRef = useRef<VoiceRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Inventory counters
  const totalCount = products.length;
  const inStockCount = useMemo(() => products.filter((p) => p.in_stock).length, [products]);
  const outOfStockCount = totalCount - inStockCount;

  // Build condensed category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [products]);

  // Last mentioned product ID in conversation
  const lastMentionedProduct = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === "assistant") {
        const matches = Array.from(msg.content.matchAll(/\[PRODUCT:(\d+)\]/g));
        if (matches.length > 0) {
          const lastId = Number(matches[matches.length - 1][1]);
          const found = products.find((p) => p.id === lastId);
          if (found) return found;
        }
      }
    }
    return null;
  }, [messages, products]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading, isRecording]);

  // Cleanup voice recording on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      recorderRef.current?.cancel();
    };
  }, []);

  const handleAddToCart = (product: Product) => {
    if (onAddToCart) {
      onAddToCart(product);
      setAddedToCartIds((prev) => [...prev, product.id]);
      setTimeout(() => {
        setAddedToCartIds((prev) => prev.filter((id) => id !== product.id));
      }, 2500);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    openedProductsRef.current.clear();
  };

  // Start voice recording
  const startVoiceRecording = async () => {
    try {
      if (!recorderRef.current) {
        recorderRef.current = new VoiceRecorder();
      }
      setRecordingDuration(0);
      setVolumeLevel(0);
      await recorderRef.current.start((vol) => setVolumeLevel(vol));
      setIsRecording(true);

      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access error:", err);
      alert("Не удалось включить микрофон. Пожалуйста, разрешите доступ к микрофону в браузере.");
    }
  };

  // Cancel voice recording
  const cancelVoiceRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    recorderRef.current?.cancel();
    setIsRecording(false);
    setRecordingDuration(0);
    setVolumeLevel(0);
  };

  // Stop voice recording and send directly to Gemini 3.8 Flash
  const stopAndSendVoice = async () => {
    if (!recorderRef.current || !isRecording) return;
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    try {
      const recorded = await recorderRef.current.stop();
      setIsRecording(false);
      setRecordingDuration(0);
      setVolumeLevel(0);

      await send(undefined, {
        data: recorded.base64,
        mimeType: recorded.mimeType,
        duration: recorded.duration,
        audioUrl: recorded.audioUrl,
      });
    } catch (err) {
      console.error("Failed to stop and send voice recording:", err);
      setIsRecording(false);
      setRecordingDuration(0);
      setVolumeLevel(0);
    }
  };

  const send = async (
    overrideInput?: string,
    audioPayload?: { data: string; mimeType: string; duration: number; audioUrl: string }
  ) => {
    const textToSend = (overrideInput ?? input).trim();
    if (!textToSend && !audioPayload) return;
    if (isLoading) return;

    // Check if user is asking "покажи этот товар" or "покажи [название]" in text
    if (textToSend) {
      const lowerText = textToSend.toLowerCase();
      const isShowRequest = /покажи|открой|посмотреть/i.test(lowerText);

      if (isShowRequest && /этот|предыдущий|тот|его|ее/i.test(lowerText) && lastMentionedProduct) {
        onSelectProduct?.(lastMentionedProduct);
      } else if (isShowRequest) {
        const searchTerms = lowerText.replace(/покажи|открой|посмотреть|мне|пожалуйста|товар|купить/gi, "").trim();
        if (searchTerms.length >= 3) {
          const matched = products.find((p) => 
            p.name.toLowerCase().includes(searchTerms) ||
            p.category.toLowerCase().includes(searchTerms) ||
            (p.brand && p.brand.toLowerCase().includes(searchTerms))
          );
          if (matched) {
            onSelectProduct?.(matched);
          }
        }
      }
    }

    // Create user message
    const userMsg: ChatMessage = audioPayload
      ? {
          role: "user",
          content: "",
          isAudio: true,
          audioUrl: audioPayload.audioUrl,
          audioDuration: audioPayload.duration,
        }
      : {
          role: "user",
          content: textToSend,
        };

    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    if (!overrideInput && !audioPayload) setInput("");
    setIsLoading(true);

    // Prepare live inventory statistics & catalog knowledge
    const categorySummary = Object.entries(categoryCounts)
      .map(([cat, count]) => `• ${cat}: ${count} шт.`)
      .join("\n");

    const productCatalogText = products
      .map((p) => {
        const specsText = p.specs && Object.keys(p.specs).length > 0
          ? `| ${Object.entries(p.specs).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(", ")}`
          : "";
        const usdRef = exchangeRate > 0 ? ` (~$${Math.round(p.price / exchangeRate)})` : "";
        return `[ID:${p.id}] "${p.name}" | Кат: ${p.category} | ${formatPrice(p.price)} сум${usdRef} | ${p.in_stock ? "В наличии" : "Под заказ"} | Бренд: ${p.brand || "AlfaComp"} ${specsText}`;
      })
      .join("\n");

    const systemPrompt = `Ты — официальный AI-консультант магазина компьютерной техники AlfaComp (г. Ташкент, Узбекистан). Работаешь на базе модели Gemini 3.8 Flash.

📊 АКТУАЛЬНЫЕ СЧЕТЧИКИ И СТАТИСТИКА СКЛАДА (ОБЯЗАТЕЛЬНО ИСПОЛЬЗУЙ ЭТИ ТОЧНЫЕ ДАННЫЕ):
- Всего товаров на сайте: ${totalCount} шт.
- В наличии на складе прямо сейчас: ${inStockCount} шт.
- Под заказ / ожидается поступление: ${outOfStockCount} шт.
- Количество товаров по категориям:
${categorySummary}

📦 ПОЛНЫЙ АССОРТИМЕНТ ТОВАРОВ МАГАЗИНА:
${productCatalogText}

🏪 ИНФОРМАЦИЯ О МАГАЗИНЕ:
- Доставка: по Ташкенту в день заказа (курьером), по городам Узбекистана (Самарканд, Бухара и др.) — до 2–3 дней.
- Оплата: Click, Payme, Uzum Bank, наличными курьеру или перечислением.
- Официальная гарантия: от 1 до 3 лет на все товары.
- Контакты для связи: Telegram @ALIBABO777, телефон +998 (88) 320-33-33.

🎯 ГЛАВНЫЕ ПРАВИЛА И ИНТЕРАКТИВНОСТЬ:
1. Если пользователь прислал голосовое сообщение — внимательно прослушай его и ответь на вопрос клиента.
2. Если пользователь спрашивает счетчик, количество товаров или ассортимент — называй точные цифры (${totalCount} товаров в каталоге, ${inStockCount} в наличии).
3. Когда предлагаешь или упоминаешь товар, ВСЕГДА прикрепляй его маркер: [PRODUCT:id], где id — ID товара из каталога выше (например, [PRODUCT:12]).
4. ВАЖНО: Если пользователь просит "покажи этот товар", "покажи мне [название]", "открой его", "покажи характеристики", или выбирает конкретный товар (включая голосовой запрос):
   - ОБЯЗАТЕЛЬНО добавь в ответ тег [[ACTION_OPEN:id]] с числовым ID товара.
   - Система на сайте перехватит этот тег и мгновенно откроет окно с характеристиками на экране!
5. Отвечай вежливо, кратко, форматируй ответ списками с эмодзи. Отвечай на русском языке (или узбекском, если клиент говорит/пишет на узбекском). Не выдумывай несуществующие товары.`;

    let assistantSoFar = "";

    try {
      await streamGeminiChat({
        messages: allMessages,
        systemPrompt,
        audio: audioPayload
          ? {
              data: audioPayload.data,
              mimeType: audioPayload.mimeType,
              duration: audioPayload.duration,
            }
          : undefined,
        onChunk: (_delta, accumulated) => {
          assistantSoFar = accumulated;

          // Check if AI included an ACTION_OPEN tag
          const actionMatch = assistantSoFar.match(/\[\[ACTION_OPEN:(\d+)\]\]/);
          if (actionMatch) {
            const actionProductId = Number(actionMatch[1]);
            if (actionProductId && !openedProductsRef.current.has(actionProductId)) {
              openedProductsRef.current.add(actionProductId);
              const found = products.find((p) => p.id === actionProductId);
              if (found && onSelectProduct) {
                onSelectProduct(found);
              }
            }
          }

          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant") {
              return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
            }
            return [...prev, { role: "assistant", content: assistantSoFar }];
          });
        },
      });
    } catch (e) {
      console.error("Gemini stream error:", e);
      const realErr = e instanceof Error ? e.message : String(e);
      let fallbackText = `⚠️ AI временно недоступен.\n\n*Причина:* ${realErr}\n\nЕсли проблема повторяется — обратитесь к администратору.`;
      const lower = textToSend.toLowerCase();
      if (lower.includes("сколько") || lower.includes("товар") || lower.includes("счетчик")) {
        fallbackText = `В нашем каталоге прямо сейчас **${totalCount} товаров** (${inStockCount} в наличии)!\n\nКатегории:\n${Object.entries(categoryCounts).map(([cat, c]) => `• **${cat}**: ${c} шт.`).join("\n")}\n\nНапишите, какой товар вас интересует, и я помогу с выбором!`;
      } else if (lastMentionedProduct && /покажи|открой/i.test(lower)) {
        fallbackText = `Открываю карточку **${lastMentionedProduct.name}**!\n\n[PRODUCT:${lastMentionedProduct.id}]`;
        onSelectProduct?.(lastMentionedProduct);
      }
      setMessages((prev) => [...prev, { role: "assistant", content: fallbackText }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to parse message content and extract mentioned product cards
  const renderMessageContent = (msg: ChatMessage) => {
    // Strip technical action tag from display
    const cleanContent = msg.content
      .replace(/\[\[ACTION_OPEN:\d+\]\]/g, "")
      .replace(/\[PRODUCT:\d+\]/g, "")
      .trim();

    // Extract product IDs
    const productMatches = Array.from(msg.content.matchAll(/\[PRODUCT:(\d+)\]/g));
    const productIds = Array.from(new Set(productMatches.map((m) => Number(m[1]))));
    const mentioned = productIds
      .map((id) => products.find((p) => p.id === id))
      .filter((p): p is Product => Boolean(p));

    return (
      <div className="space-y-2.5">
        {/* Voice message player if this message is recorded audio */}
        {msg.isAudio && msg.audioUrl && (
          <VoiceMessagePlayer audioUrl={msg.audioUrl} duration={msg.audioDuration} />
        )}

        {cleanContent && (
          <div className="prose prose-sm prose-invert max-w-none [&>p]:m-0 [&>ul]:my-1.5 [&>ul]:pl-4 text-white/95 leading-relaxed">
            <ReactMarkdown>{cleanContent}</ReactMarkdown>
          </div>
        )}

        {/* Embedded Interactive Product Cards */}
        {mentioned.length > 0 && (
          <div className="space-y-2 pt-1">
            {mentioned.map((p) => {
              const isAdded = addedToCartIds.includes(p.id);
              return (
                <div
                  key={p.id}
                  className="p-2.5 rounded-xl border border-white/10 bg-[#111317] flex flex-col gap-2 hover:border-[#1565C0]/50 transition-all shadow-lg"
                >
                  <div className="flex gap-2.5 items-center">
                    <img
                      src={p.image}
                      alt={p.name}
                      className="w-12 h-12 rounded-lg object-cover bg-white/5 border border-white/10 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/70">
                          {p.category}
                        </span>
                        <span
                          className={`text-[9px] font-semibold flex items-center gap-1 ${
                            p.in_stock ? "text-emerald-400" : "text-amber-400"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              p.in_stock ? "bg-emerald-400" : "bg-amber-400"
                            }`}
                          />
                          {p.in_stock ? "В наличии" : "Под заказ"}
                        </span>
                      </div>
                      <h5 className="text-xs font-bold text-white truncate" title={p.name}>
                        {p.name}
                      </h5>
                      <div className="text-xs font-mono font-bold text-white">
                        {formatPrice(p.price)} сум
                        {exchangeRate > 0 && (
                          <span className="text-white/40 font-normal ml-1.5">
                            ≈ ${Math.round(p.price / exchangeRate)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions for this product */}
                  <div className="flex items-center gap-2 pt-1 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => onSelectProduct?.(p)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-[#1565C0] hover:bg-[#1976D2] text-white font-semibold text-[11px] shadow-sm transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Посмотреть товар
                    </button>

                    {onAddToCart && (
                      <button
                        type="button"
                        onClick={() => handleAddToCart(p)}
                        className={`flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg border text-[11px] font-bold transition-all ${
                          isAdded
                            ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                            : "bg-white/10 hover:bg-white/20 border-white/15 text-white"
                        }`}
                        title="Добавить в корзину"
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>В корзине</span>
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">В корзину</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Закрыть чат" : "Открыть технический чат"}
        aria-expanded={isOpen}
        className="fixed right-4 sm:bottom-6 sm:right-6 z-50 w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#14171E] border border-white/[0.12] hover:border-[#1565C0]/60 text-white flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all"
        style={{ bottom: "calc(62px + env(safe-area-inset-bottom, 0px) + 16px)" }}
      >
        {isOpen ? (
          <X className="w-5 h-5 text-white" />
        ) : (
          <>
            <MessageCircle className="w-5 h-5 text-[#1565C0]" />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#1565C0] text-[8px] font-mono font-bold text-white items-center justify-center">
                AI
              </span>
            </span>
          </>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          className="fixed right-3 left-3 sm:left-auto sm:right-6 z-50 sm:w-[380px] sm:max-w-[calc(100vw-2.5rem)] h-[72vh] sm:h-[540px] max-h-[calc(100vh-7.5rem)] bg-[#0c1017]/95 border border-white/15 backdrop-blur-xl rounded-2xl flex flex-col animate-in slide-in-from-bottom-4 shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden"
          style={{ bottom: "calc(62px + env(safe-area-inset-bottom, 0px) + 16px + 56px)" }}
        >
          {/* Header */}
          <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-[#121419]">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-8 h-8 rounded-lg bg-[#181B22] border border-white/10 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-[#1565C0]" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#10B981]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-white">AlfaComp AI</p>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-[#1565C0]/20 text-[#1565C0] border border-[#1565C0]/30 font-bold">
                    GEMINI 3.8 FLASH
                  </span>
                </div>
                <p className="text-[10px] font-mono text-white/50">
                  {totalCount} товаров • Голосовой ввод активен
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearChat}
                  title="Очистить диалог"
                  className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Закрыть"
                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">
            {messages.length === 0 && (
              <div className="text-center py-4 px-1 space-y-3.5">
                <div className="w-12 h-12 rounded-xl bg-[#1565C0]/10 border border-[#1565C0]/30 flex items-center justify-center mx-auto shadow-inner text-[#1565C0]">
                  <Sparkles className="w-6 h-6 text-[#1565C0]" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-black text-white">
                    Привет! Я ассистент AlfaComp
                  </h4>
                  <p className="text-xs text-white/65 mt-1 max-w-[290px] mx-auto leading-relaxed">
                    Отвечаю текстом или голосом! Нажмите на значок микрофона, чтобы задать вопрос вслух.
                  </p>
                </div>

                {/* Live Counters Banner */}
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-left">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#1565C0] shrink-0" />
                    <div>
                      <div className="text-[10px] text-white/50 uppercase font-semibold">Всего в базе</div>
                      <div className="text-xs font-mono font-black text-white">{totalCount} товаров</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <div>
                      <div className="text-[10px] text-white/50 uppercase font-semibold">В наличии</div>
                      <div className="text-xs font-mono font-black text-emerald-400">{inStockCount} позиций</div>
                    </div>
                  </div>
                </div>

                {/* Quick Prompts */}
                <div className="space-y-1.5 pt-1 text-left">
                  <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider px-1">
                    Быстрые вопросы:
                  </div>
                  {[
                    "🎙️ Нажмите на микрофон внизу и скажите вопрос",
                    "📊 Сколько сейчас товаров в магазине?",
                    "🖥️ Покажи мониторы 144-240 Гц",
                    "⚡ Покажи ИБП ION для компьютера",
                  ].map((promptText) => (
                    <button
                      key={promptText}
                      type="button"
                      onClick={() => {
                        if (promptText.startsWith("🎙️")) {
                          startVoiceRecording();
                        } else {
                          send(promptText);
                        }
                      }}
                      className="w-full text-left text-xs text-white/80 hover:text-white p-2 rounded-lg bg-white/[0.03] hover:bg-[#1565C0]/10 hover:border-[#1565C0]/30 border border-white/5 transition-all flex items-center justify-between group"
                    >
                      <span className="truncate">{promptText}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-white/30 group-hover:text-[#1565C0] group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message List */}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-lg bg-[#1565C0]/15 border border-[#1565C0]/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-[#1565C0]" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm shadow-md ${
                    msg.role === "user"
                      ? "bg-[#1565C0] text-white font-medium rounded-tr-none"
                      : "bg-[#14171E] border border-white/10 text-white rounded-tl-none"
                  }`}
                >
                  {msg.role === "assistant" ? renderMessageContent(msg) : (
                    msg.isAudio && msg.audioUrl ? (
                      <VoiceMessagePlayer audioUrl={msg.audioUrl} duration={msg.audioDuration} />
                    ) : (
                      msg.content
                    )
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))}

            {/* Thinking / Streaming Indicator */}
            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex gap-2.5 items-center">
                <div className="w-7 h-7 rounded-lg bg-[#14171E] border border-white/10 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-[#1565C0] animate-pulse" />
                </div>
                <div className="bg-[#14171E] border border-white/10 rounded-xl rounded-tl-none px-3.5 py-2 text-xs text-white/60 flex items-center gap-1.5 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1565C0] animate-ping" />
                  Gemini 3.8 Flash думает...
                </div>
              </div>
            )}
          </div>

          {/* Input Bar & Live Voice Recording UI */}
          <div className="p-3 border-t border-white/10 bg-[#121419]">
            {isRecording ? (
              /* Live Voice Recording Bar */
              <div className="flex items-center gap-2.5 bg-[#1C1F28] border border-red-500/40 rounded-xl px-3 py-2 animate-in fade-in duration-200">
                <div className="relative flex items-center justify-center w-3 h-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                </div>

                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-xs font-mono font-bold text-red-400">
                    {formatDuration(recordingDuration)}
                  </span>

                  {/* Reactive sound wave equalizer bars */}
                  <div className="flex items-center gap-0.5 h-4 px-1">
                    {[0.6, 1.0, 0.8, 1.2, 0.7, 0.9].map((multiplier, idx) => (
                      <span
                        key={idx}
                        className="w-1 rounded-full bg-red-500 transition-all duration-75"
                        style={{
                          height: `${Math.max(3, Math.min(16, (volumeLevel * 20 * multiplier)))}px`,
                        }}
                      />
                    ))}
                  </div>

                  <span className="text-[11px] text-white/60 truncate">
                    Говорите, слушаю...
                  </span>
                </div>

                {/* Cancel recording */}
                <button
                  type="button"
                  onClick={cancelVoiceRecording}
                  title="Отменить запись"
                  className="p-1.5 rounded-lg text-white/60 hover:text-red-400 hover:bg-white/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                {/* Send voice */}
                <button
                  type="button"
                  onClick={stopAndSendVoice}
                  title="Отправить голосовое сообщение"
                  className="flex items-center gap-1 py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                >
                  <Send className="w-3 h-3" />
                  <span>Отправить</span>
                </button>
              </div>
            ) : (
              /* Normal Text & Voice Input Bar */
              <div className="flex gap-2 items-center">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="Спросите или нажмите на микрофон..."
                  aria-label="Сообщение консультанту"
                  className="flex-1 bg-[#0A0B0E] border border-white/15 rounded-lg px-3.5 py-2 text-xs text-white outline-none placeholder:text-white/40 focus:border-[#1565C0] transition-all font-sans"
                />

                {/* Voice Record Button */}
                <button
                  type="button"
                  onClick={startVoiceRecording}
                  disabled={isLoading}
                  title="Записать голосовое сообщение"
                  aria-label="Голосовой ввод"
                  className="w-9 h-9 rounded-lg bg-white/[0.08] hover:bg-[#1565C0] hover:text-white text-white/80 border border-white/10 flex items-center justify-center transition-all disabled:opacity-40 shrink-0"
                >
                  <Mic className="w-4 h-4" />
                </button>

                {/* Send Text Button */}
                <button
                  type="button"
                  onClick={() => send()}
                  disabled={isLoading || !input.trim()}
                  aria-label="Отправить сообщение"
                  className="w-9 h-9 rounded-lg bg-[#1565C0] hover:bg-[#1976D2] text-white flex items-center justify-center disabled:opacity-40 transition-all shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatWidget;
