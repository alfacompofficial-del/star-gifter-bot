import type { Product } from "@/hooks/useProducts";
import { formatPrice } from "@/lib/constants";
import type { ChatMessage } from "@/services/geminiChat";

export interface GenerateLocalResponseOptions {
  userQuery: string;
  messages: ChatMessage[];
  products: Product[];
  exchangeRate?: number;
  lastMentionedProduct?: Product | null;
  isAudio?: boolean;
  onChunk?: (delta: string, accumulated: string) => void;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Clean and normalize text for fuzzy keyword matching
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'«»]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract target budget limit from query if specified
 * e.g. "до 10 млн", "до 500$", "до 8000000"
 */
function extractBudget(query: string, rate: number): number | null {
  const norm = normalize(query);

  // Look for "$500", "500$", "до 500$"
  const usdMatch = norm.match(/(?:до\s*)?(\d+[\d\s]*)\s*(?:\$|usd|долл|бакс)/i);
  if (usdMatch) {
    const val = Number(usdMatch[1].replace(/\s+/g, ""));
    if (!Number.isNaN(val) && val > 0 && rate > 0) {
      return val * rate;
    }
  }

  // Look for "млн" or "миллион"
  const mlnMatch = norm.match(/(?:до\s*)?(\d+(?:[.,]\d+)?)\s*(?:млн|миллион)/i);
  if (mlnMatch) {
    const val = Number(mlnMatch[1].replace(",", "."));
    if (!Number.isNaN(val) && val > 0) {
      return val * 1_000_000;
    }
  }

  // Look for raw large number "до 8000000"
  const sumMatch = norm.match(/до\s*(\d{6,10})/i);
  if (sumMatch) {
    const val = Number(sumMatch[1]);
    if (!Number.isNaN(val) && val > 0) {
      return val;
    }
  }

  return null;
}

/**
 * Generate intelligent, catalog-grounded assistant reply
 */
export function generateLocalAssistantText({
  userQuery,
  products,
  exchangeRate = 12800,
  lastMentionedProduct,
  isAudio = false,
}: GenerateLocalResponseOptions): string {
  const norm = normalize(userQuery);
  const totalCount = products.length;
  const inStockProducts = products.filter((p) => p.in_stock);
  const inStockCount = inStockProducts.length;
  const outOfStockCount = totalCount - inStockCount;

  // 1. Audio message without text
  if (isAudio && (!userQuery || norm.length === 0)) {
    return (
      `🎤 **Я получил ваше голосовое сообщение!**\n\n` +
      `Я готов подобрать для вас любую компьютерную технику из нашего ассортимента в Ташкенте.\n\n` +
      `Вы можете написать ваш вопрос текстом, например:\n` +
      `• *«Посоветуй игровой ноутбук до 1000$»*\n` +
      `• *«Какие видеокарты RTX есть в наличии?»*\n` +
      `• *«Сколько стоит монитор 144 Гц?»*\n` +
      `• *«Расскажи про доставку и оплату»*\n\n` +
      `Или напишите модель, которая вас интересует, и я сразу покажу её карточку с ценой!`
    );
  }

  // 2. Open / Show card action ("покажи этот товар", "открой его", "покажи характеристики")
  const isShowRequest = /покажи|открой|посмотреть|характеристик/i.test(norm);
  if (isShowRequest && /этот|предыдущий|тот|его|ее/i.test(norm) && lastMentionedProduct) {
    const usd = exchangeRate > 0 ? ` (~$${Math.round(lastMentionedProduct.price / exchangeRate)})` : "";
    return (
      `Открываю карточку товара **${lastMentionedProduct.name}**!\n\n` +
      `[[ACTION_OPEN:${lastMentionedProduct.id}]]\n` +
      `💰 **Цена**: ${formatPrice(lastMentionedProduct.price)} сум${usd}\n` +
      `📦 **Наличие**: ${lastMentionedProduct.in_stock ? "✅ В наличии на складе в Ташкенте" : "⏳ Ожидается / под заказ"}\n\n` +
      `[PRODUCT:${lastMentionedProduct.id}]`
    );
  }

  // 3. Greeting intent
  const greetingRegex = /^(привет|здравствуй|добрый день|добрый вечер|доброе утро|салом|ассалому|hello|hi|хай|здорово)/i;
  if (greetingRegex.test(norm) && norm.split(" ").length <= 4) {
    return (
      `Здравствуйте! 👋 Я официальный AI-консультант магазина компьютерной техники **AlfaComp** (г. Ташкент).\n\n` +
      `В нашем каталоге прямо сейчас **${totalCount} товаров** (${inStockCount} в наличии на складе).\n\n` +
      `Я могу вам помочь:\n` +
      `• 💻 **Подобрать ноутбук** (для игр, работы или учебы)\n` +
      `• 🖥️ **Собрать или выбрать ПК** под любой бюджет\n` +
      `• ⚡ **Найти комплектующие**: видеокарты RTX, процессоры Intel/AMD, память, SSD\n` +
      `• 🎮 **Выбрать монитор** (144–240 Гц, IPS, 2K/4K) и аксессуары\n` +
      `• 🚚 **Узнать условия доставки** по Ташкенту и всему Узбекистану\n\n` +
      `Напишите, что вы ищете или на какой бюджет рассчитываете!`
    );
  }

  // 4. Delivery questions
  if (/доставк|привез|курьер|куда достав|самарканд|бухар|ферган|андижан|регион|срок достав/i.test(norm)) {
    return (
      `🚚 **Условия доставки магазина AlfaComp:**\n\n` +
      `• **По Ташкенту**: Экспресс-доставка курьером в день заказа! При оформлении до 18:00 товар у вас уже через 1–3 часа.\n` +
      `• **По всему Узбекистану**: Доставка через курьерские службы (BTS, Fargo, Emu) во все регионы (Самарканд, Бухара, Андижан, Наманган, Фергана и др.) за 1–3 рабочих дня.\n` +
      `• **Безопасность**: Все товары надежно упаковываются, при получении вы можете проверить целостность и комплектацию.\n\n` +
      `Нужна помощь с выбором товара? Напишите, что вас интересует!`
    );
  }

  // 5. Payment questions
  if (/оплат|как оплат|click|payme|uzum|наличн|терминал|перечислен|рассрочк|кредит|картой/i.test(norm)) {
    return (
      `💳 **Способы оплаты в AlfaComp:**\n\n` +
      `• **Click и Payme**: Удобная и мгновенная оплата онлайн через приложение.\n` +
      `• **Uzum Bank**: Оплата без комиссии.\n` +
      `• **Наличными курьеру**: При получении и проверке заказа в Ташкенте.\n` +
      `• **Терминал (Uzcard / Humo)**: При самовывозе или курьеру.\n` +
      `• **Безналичный расчет**: Для юридических лиц (перечислением) с полным пакетом документов (счет-фактура, договор).\n\n` +
      `Все цены на сайте окончательные и указаны в национальной валюте (UZS).`
    );
  }

  // 6. Warranty questions
  if (/гаранти|сервис|брак|возврат|ремонт|поломк/i.test(norm)) {
    return (
      `🛡️ **Официальная гарантия AlfaComp:**\n\n` +
      `• На всю новую компьютерную технику и комплектующие предоставляется **официальная гарантия от 1 года до 3 лет**.\n` +
      `• Мы продаем исключительно **новую, оригинальную продукцию** с заводскими пломбами от официальных дистрибьюторов (ASUS, MSI, Gigabyte, Lenovo, Kingston, Samsung и др.).\n` +
      `• Собственный сервисный центр в Ташкенте обеспечивает оперативное тестирование и гарантийное обслуживание.\n\n` +
      `К каждому заказу обязательно прилагается гарантийный талон с печатью.`
    );
  }

  // 7. Contacts & Address questions
  if (/контакт|телефон|номер|адрес|где вы|где магазин|телеграм|telegram|связат|локаци/i.test(norm)) {
    return (
      `📞 **Контакты магазина AlfaComp:**\n\n` +
      `• 📱 **Телефон**: [+998 (88) 320-33-33](tel:+998883203333)\n` +
      `• 💬 **Telegram**: [@ALIBABO777](https://t.me/ALIBABO777) — консультации, наличие и прием заказов\n` +
      `• 📍 **Город**: г. Ташкент, Узбекистан\n` +
      `• ⏰ **График**: Прием онлайн-заказов на сайте — **круглосуточно 24/7**, доставка работает ежедневно с 09:00 до 20:00.\n\n` +
      `Напишите нам в Telegram или задайте вопрос прямо здесь!`
    );
  }

  // 8. Inventory counter questions
  if (/сколько товар|ассортимент|сколько штук|какие товар|наличи|склад|счетчик/i.test(norm)) {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });

    const categoryList = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, c]) => `• **${cat}**: ${c} шт.`)
      .join("\n");

    return (
      `📊 **Актуальное состояние склада AlfaComp (Ташкент):**\n\n` +
      `• 📦 Всего товаров в каталоге: **${totalCount} шт.**\n` +
      `• ✅ В наличии на складе прямо сейчас: **${inStockCount} шт.**\n` +
      `• ⏳ Под заказ / ожидаются: **${outOfStockCount} шт.**\n\n` +
      `**Количество по категориям:**\n` +
      `${categoryList}\n\n` +
      `Напишите, какая категория вас интересует, и я покажу лучшие модели!`
    );
  }

  // 9. Specific Product Search & Intelligent Recommendations
  const budget = extractBudget(norm, exchangeRate);
  const words = norm
    .split(" ")
    .filter((w) => w.length >= 2 && !["для", "или", "под", "все", "мне", "как", "что", "это", "хочу", "купить", "посоветуй", "покажи", "есть"].includes(w));

  // Score products based on matching words, brand, category, specs
  const scored = products.map((p) => {
    let score = 0;
    const pName = p.name.toLowerCase();
    const pCat = p.category.toLowerCase();
    const pBrand = (p.brand || "").toLowerCase();
    const pDesc = (p.description || "").toLowerCase();

    // Priority bonus for exact category match
    if (words.some((w) => pCat.includes(w))) score += 5;
    if (words.some((w) => pBrand.includes(w))) score += 4;

    words.forEach((w) => {
      if (pName.includes(w)) score += 3;
      if (pDesc.includes(w)) score += 1;
      if (p.specs) {
        Object.values(p.specs).forEach((val) => {
          if (String(val).toLowerCase().includes(w)) score += 2;
        });
      }
    });

    // Stock preference
    if (p.in_stock) score += 1;

    // Budget match
    if (budget !== null) {
      if (p.price <= budget) {
        score += 3;
      } else {
        score -= 5;
      }
    }

    return { product: p, score };
  });

  const matched = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.product);

  // If we found matching products
  if (matched.length > 0) {
    const topProducts = matched.slice(0, 4);
    const isSingleMatch = topProducts.length === 1 || (isShowRequest && matched.length > 0);
    const targetProduct = topProducts[0];

    let reply = "";
    if (isSingleMatch) {
      const usd = exchangeRate > 0 ? ` (~$${Math.round(targetProduct.price / exchangeRate)})` : "";
      reply += `🎯 Нашел для вас: **${targetProduct.name}**\n\n`;
      reply += `[[ACTION_OPEN:${targetProduct.id}]]\n`;
      reply += `• **Категория**: ${targetProduct.category}\n`;
      reply += `• **Цена**: ${formatPrice(targetProduct.price)} сум${usd}\n`;
      reply += `• **Статус**: ${targetProduct.in_stock ? "✅ В наличии на складе в Ташкенте" : "⏳ Ожидается поступление"}\n`;
      if (targetProduct.specs && Object.keys(targetProduct.specs).length > 0) {
        const specSummary = Object.entries(targetProduct.specs)
          .slice(0, 4)
          .map(([k, v]) => `  - ${k}: ${v}`)
          .join("\n");
        reply += `• **Характеристики**:\n${specSummary}\n`;
      }
      reply += `\n[PRODUCT:${targetProduct.id}]\n\n`;
      reply += `Карточка товара уже открыта! Нажмите «В корзину», чтобы оформить заказ, или задайте мне любой вопрос по этому товару.`;
      return reply;
    }

    reply += `🔍 По вашему запросу подобрал отличные варианты в **AlfaComp**:\n\n`;
    topProducts.forEach((p, idx) => {
      const usd = exchangeRate > 0 ? ` (~$${Math.round(p.price / exchangeRate)})` : "";
      const stock = p.in_stock ? "✅ В наличии" : "⏳ Под заказ";
      reply += `**${idx + 1}. ${p.name}**\n`;
      reply += `• Категория: ${p.category} | ${stock}\n`;
      reply += `• Цена: **${formatPrice(p.price)} сум**${usd}\n`;
      if (p.specs && Object.keys(p.specs).length > 0) {
        const specsText = Object.entries(p.specs)
          .slice(0, 3)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ");
        reply += `• Спецификации: ${specsText}\n`;
      }
      reply += `[PRODUCT:${p.id}]\n\n`;
    });

    reply += `Нажмите на любой товар выше, чтобы открыть его карточку и посмотреть подробные характеристики!`;
    return reply;
  }

  // 10. Default Fallback with Popular Hits
  const popularHits = inStockProducts.slice(0, 3);
  let fallback =
    `По вашему запросу я могу порекомендовать самые популярные модели из нашего каталога **AlfaComp**:\n\n`;

  popularHits.forEach((p, idx) => {
    const usd = exchangeRate > 0 ? ` (~$${Math.round(p.price / exchangeRate)})` : "";
    fallback += `**${idx + 1}. ${p.name}**\n`;
    fallback += `• ${p.category} | **${formatPrice(p.price)} сум**${usd}\n`;
    fallback += `[PRODUCT:${p.id}]\n\n`;
  });

  fallback +=
    `Вы также можете уточнить модель, категорию (например: *«ноутбук ASUS»*, *«видеокарта RTX»*, *«монитор 165Гц»*) или назвать желаемый бюджет, и я сразу найду подходящий вариант!`;

  return fallback;
}

/**
 * Stream local assistant response smoothly simulating typing animation
 */
export async function streamLocalAssistantResponse(
  options: GenerateLocalResponseOptions
): Promise<string> {
  const fullText = generateLocalAssistantText(options);
  if (!options.onChunk) {
    return fullText;
  }

  // Break response into words for realistic streaming
  const words = fullText.split(" ");
  let accumulated = "";
  const stepDelay = Math.max(8, Math.min(22, Math.floor(350 / words.length)));

  for (let i = 0; i < words.length; i++) {
    const word = words[i] + (i < words.length - 1 ? " " : "");
    accumulated += word;
    options.onChunk(word, accumulated);
    await sleep(stepDelay);
  }

  return fullText;
}
