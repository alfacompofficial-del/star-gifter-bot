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
  ChevronRight 
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Product } from "@/hooks/useProducts";
import { formatPrice } from "@/lib/constants";
import { useExchangeRate } from "@/hooks/useExchangeRate";

type Message = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

export interface AIChatWidgetProps {
  products?: Product[];
  onSelectProduct?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
}

const AIChatWidget = ({ products = [], onSelectProduct, onAddToCart }: AIChatWidgetProps) => {
  const { exchangeRate } = useExchangeRate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [addedToCartIds, setAddedToCartIds] = useState<number[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const openedProductsRef = useRef<Set<number>>(new Set());

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
  }, [messages, isLoading]);

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

  const send = async (overrideInput?: string) => {
    const textToSend = (overrideInput ?? input).trim();
    if (!textToSend || isLoading) return;

    // Check if user is asking "покажи этот товар" or "покажи [название]"
    const lowerText = textToSend.toLowerCase();
    const isShowRequest = /покажи|открой|посмотреть/i.test(lowerText);

    // If asking "покажи этот товар" and we have a last mentioned product, open it immediately
    if (isShowRequest && /этот|предыдущий|тот|его|ее/i.test(lowerText) && lastMentionedProduct) {
      onSelectProduct?.(lastMentionedProduct);
    } else if (isShowRequest) {
      // Try to find matching product by name
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

    const userMsg: Message = { role: "user", content: textToSend };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    if (!overrideInput) setInput("");
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
        return `[ID:${p.id}] "${p.name}" | Кат: ${p.category} | $${p.price} (~${formatPrice(Math.round(p.price * exchangeRate))} сум) | ${p.in_stock ? "В наличии" : "Под заказ"} | Бренд: ${p.brand || "AlfaComp"} ${specsText}`;
      })
      .join("\n");

    const systemPromptMessage: Message = {
      role: "system" as any,
      content: `Ты — официальный AI-консультант магазина компьютерной техники AlfaComp (г. Ташкент, Узбекистан).

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
1. Если пользователь спрашивает счетчик, количество товаров или ассортимент — называй точные цифры (${totalCount} товаров в каталоге, ${inStockCount} в наличии).
2. Когда предлагаешь или упоминаешь товар, ВСЕГДА прикрепляй его маркер: [PRODUCT:id], где id — ID товара из каталога выше (например, [PRODUCT:12]).
3. ВАЖНО: Если пользователь просит "покажи этот товар", "покажи мне [название]", "открой его", "покажи характеристики", или выбирает товар:
   - ОБЯЗАТЕЛЬНО добавь в ответ тег [[ACTION_OPEN:id]] с числовым ID товара.
   - Система на сайте перехватит этот тег и мгновенно откроет окно с характеристиками на экране!
4. Отвечай вежливо, кратко, форматируй ответ списками с эмодзи. Отвечай на русском языке (или узбекском, если клиент пишет на узбекском). Не выдумывай несуществующие товары.`,
    };

    let assistantSoFar = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          messages: [systemPromptMessage, ...allMessages] 
        }),
      });

      if (!resp.ok || !resp.body) {
        throw new Error("Failed to get response");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

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
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;

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
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      // Fallback response with live catalog stats if remote connection fails
      let fallbackText = "Извините, соединение с сервером AI временно недоступно.";
      if (lowerText.includes("сколько") || lowerText.includes("товар") || lowerText.includes("счетчик")) {
        fallbackText = `В нашем каталоге прямо сейчас **${totalCount} товаров** (${inStockCount} в наличии)!\n\nКатегории:\n${Object.entries(categoryCounts).map(([cat, c]) => `• **${cat}**: ${c} шт.`).join("\n")}\n\nНапишите, какой товар вас интересует, и я помогу с выбором!`;
      } else if (isShowRequest && lastMentionedProduct) {
        fallbackText = `Открываю для вас карточку **${lastMentionedProduct.name}**!\n\n[PRODUCT:${lastMentionedProduct.id}]`;
        onSelectProduct?.(lastMentionedProduct);
      }
      setMessages((prev) => [...prev, { role: "assistant", content: fallbackText }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to parse message content and extract mentioned product cards
  const renderMessageContent = (msg: Message) => {
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
                  className="p-2.5 rounded-xl border border-white/10 bg-[#111317] flex flex-col gap-2 hover:border-[#FF5A00]/50 transition-all shadow-lg"
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
                        {formatPrice(Math.round(p.price * exchangeRate))} сум
                      </div>
                    </div>
                  </div>

                  {/* Actions for this product */}
                  <div className="flex items-center gap-2 pt-1 border-t border-white/10">
                    <button
                      onClick={() => onSelectProduct?.(p)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-[#FF5A00] hover:bg-[#FF6A15] text-white font-semibold text-[11px] shadow-sm transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Посмотреть товар
                    </button>

                    {onAddToCart && (
                      <button
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
        className="fixed right-4 sm:bottom-6 sm:right-6 z-50 w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#14171E] border border-white/[0.12] hover:border-[#FF5A00]/60 text-white flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all"
        style={{ bottom: "calc(62px + env(safe-area-inset-bottom, 0px) + 16px)" }}
      >
        {isOpen ? (
          <X className="w-5 h-5 text-white" />
        ) : (
          <>
            <MessageCircle className="w-5 h-5 text-[#FF5A00]" />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#FF5A00] text-[8px] font-mono font-bold text-white items-center justify-center">
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
                  <Bot className="w-4 h-4 text-[#FF5A00]" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#10B981]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-white">Консультант AlfaComp</p>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30">
                    ONLINE
                  </span>
                </div>
                <p className="text-[10px] font-mono text-white/50">
                  {totalCount} товаров • {inStockCount} в наличии
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={handleClearChat}
                  title="Очистить диалог"
                  className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
              <button
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
                <div className="w-12 h-12 rounded-xl bg-[#FF5A00]/10 border border-[#FF5A00]/30 flex items-center justify-center mx-auto shadow-inner text-[#FF5A00]">
                  <Sparkles className="w-6 h-6 text-[#FF5A00]" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-black text-white">
                    Привет! Я ассистент AlfaComp
                  </h4>
                  <p className="text-xs text-white/65 mt-1 max-w-[290px] mx-auto leading-relaxed">
                    Знаю все цены, характеристики и наличие техники. Напишите «покажи этот товар», и я сразу открою его!
                  </p>
                </div>

                {/* Live Counters Banner */}
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-left">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#FF5A00] shrink-0" />
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
                    "📊 Сколько сейчас товаров в магазине?",
                    "🖥️ Покажи мониторы 144-240 Гц",
                    "⚡ Покажи ИБП ION для компьютера",
                    "🚀 Покажи роутер Wi-Fi 6",
                  ].map((promptText) => (
                    <button
                      key={promptText}
                      onClick={() => send(promptText)}
                      className="w-full text-left text-xs text-white/80 hover:text-white p-2 rounded-lg bg-white/[0.03] hover:bg-[#FF5A00]/10 hover:border-[#FF5A00]/30 border border-white/5 transition-all flex items-center justify-between group"
                    >
                      <span className="truncate">{promptText}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-white/30 group-hover:text-[#FF5A00] group-hover:translate-x-0.5 transition-all shrink-0" />
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
                  <div className="w-7 h-7 rounded-lg bg-[#FF5A00]/15 border border-[#FF5A00]/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-[#FF5A00]" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm shadow-md ${
                    msg.role === "user"
                      ? "bg-[#FF5A00] text-white font-medium rounded-tr-none"
                      : "bg-[#14171E] border border-white/10 text-white rounded-tl-none"
                  }`}
                >
                  {msg.role === "assistant" ? renderMessageContent(msg) : msg.content}
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
                  <Bot className="w-4 h-4 text-[#FF5A00] animate-pulse" />
                </div>
                <div className="bg-[#14171E] border border-white/10 rounded-xl rounded-tl-none px-3.5 py-2 text-xs text-white/60 flex items-center gap-1.5 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A00] animate-ping" />
                  Поиск в базе склада...
                </div>
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div className="p-3 border-t border-white/10 bg-[#121419]">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Спросите или напишите «покажи товар»..."
                aria-label="Сообщение консультанту"
                className="flex-1 bg-[#0A0B0E] border border-white/15 rounded-lg px-3.5 py-2 text-xs text-white outline-none placeholder:text-white/40 focus:border-[#FF5A00] transition-all font-sans"
              />
              <button
                onClick={() => send()}
                disabled={isLoading || !input.trim()}
                aria-label="Отправить сообщение"
                className="w-9 h-9 rounded-lg bg-[#FF5A00] hover:bg-[#FF6A15] text-white flex items-center justify-center disabled:opacity-40 transition-all shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatWidget;
