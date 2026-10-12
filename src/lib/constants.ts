export const DEFAULT_EXCHANGE_RATE = 14000;
export const EXCHANGE_RATE = 14000;

export const CONTACTS = {
  TELEGRAM: "https://t.me/ALIBABO777",
  PHONE: "+998883203333",
  EMAIL: "info@alfacomp.uz",
  ADDRESS: "Ташкент, Узбекистан",
};

export const ADMIN_PASSWORD = "Xojakbar777";

export const CATEGORY_ICONS: Record<string, string> = {
  "ИБП": "⚡",
  "Мониторы": "🖥️",
  "Сеть": "📡",
  "Комплектующие": "🔧",
  "Моноблоки": "💻",
  "Аксессуары": "🎧",
  "Колонки": "🔊",
};

export const FAQ_DATA = [
  {
    question: "Как оформить заказ?",
    answer: "1. Добавьте товары в корзину\n2. Нажмите на иконку корзины\n3. Нажмите «Оформить в Telegram»\n4. Отправьте сообщение менеджеру",
  },
  {
    question: "Какие способы оплаты?",
    answer: "Наличные при получении, перевод на карту, Click, Payme, Uzumbank. Для юридических лиц - безналичный расчет.",
  },
  {
    question: "Есть гарантия?",
    answer: "Да, официальная гарантия производителя + наш сервисный центр. Срок гарантии от 12 до 36 месяцев в зависимости от товара.",
  },
  {
    question: "Как быстро доставка?",
    answer: "По Ташкенту - 1 день, по Узбекистану - до 3 дней. Стоимость доставки от 30,000 сум.",
  },
  {
    question: "Можно ли вернуть товар?",
    answer: "Да, в течение 14 дней с момента покупки при сохранении товарного вида и упаковки.",
  },
];

export const formatPrice = (price: number) => {
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

export const convertToUZS = (priceUSD: number, rate = EXCHANGE_RATE) => {
  return Math.round(priceUSD * rate);
};

export const convertToUSD = (priceUZS: number, rate = EXCHANGE_RATE) => {
  return Math.round(priceUZS / rate);
};

/**
 * Universal price resolver.
 * Handles both USD (e.g. 33, 46, 105, 6500) and UZS (e.g. 394350, 549700, 1254750) inputs seamlessly.
 */
export const resolveProductPrices = (
  rawPrice: number | null | undefined,
  exchangeRate: number = DEFAULT_EXCHANGE_RATE
): { priceUZS: number; priceUSD: number; formattedUZS: string } => {
  const price = typeof rawPrice === "number" && !isNaN(rawPrice) && rawPrice > 0 ? rawPrice : 0;
  const rate = exchangeRate > 0 ? exchangeRate : DEFAULT_EXCHANGE_RATE;

  if (price === 0) {
    return { priceUZS: 0, priceUSD: 0, formattedUZS: "0" };
  }

  let priceUZS: number;
  let priceUSD: number;

  if (price < 15000) {
    // Stored in USD ($)
    priceUSD = Math.round(price);
    priceUZS = Math.round(price * rate);
  } else {
    // Stored in UZS (сум)
    priceUZS = Math.round(price);
    priceUSD = Math.round(price / rate);
  }

  return {
    priceUZS,
    priceUSD,
    formattedUZS: formatPrice(priceUZS),
  };
};
