// Transliteration map for Russian to Latin characters (SEO-friendly)
const RU_TO_LATIN: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
  ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
  я: "ya",
};

/** Convert Russian and special characters to clean latin slug */
export function transliterate(text: string): string {
  return text
    .toLowerCase()
    .split("")
    .map((char) => RU_TO_LATIN[char] ?? char)
    .join("");
}

export function slugify(text: string): string {
  return transliterate(text)
    .toLowerCase()
    .replace(/["'«»]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

// Category name → English URL slug mapping
export const CATEGORY_SLUGS: Record<string, string> = {
  "ИБП": "ups",
  "Мониторы": "monitors",
  "Сеть": "networking",
  "Комплектующие": "components",
  "Моноблоки": "all-in-one",
  "Аксессуары": "accessories",
  "Колонки": "speakers",
  "Кронштейны": "mounts",
  "Deco": "deco",
  "Wi-Fi роутеры": "wifi-routers",
  "Мышки": "mice",
  "Компьютеры": "computers",
  "ПК": "computers",
};

// Reverse mapping: English slug → Russian category name
export const SLUG_TO_CATEGORY: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_SLUGS).map(([ru, en]) => [en, ru])
);

export interface CategorySEOInfo {
  name: string;
  slug: string;
  h1: string;
  metaTitle: string;
  metaDescription: string;
  seoDescription: string;
}

export const CATEGORY_SEO_DATA: Record<string, CategorySEOInfo> = {
  monitors: {
    name: "Мониторы",
    slug: "monitors",
    h1: "Мониторы в Ташкенте",
    metaTitle: "Купить игровой или офисный монитор в Ташкенте — MSI, ASUS, Dell, LG | AlfaComp",
    metaDescription: "Игровые и профессиональные мониторы 2K, 4K, OLED с частотой 144–360 Гц в Ташкенте. MSI, ASUS, Dell, LG, Samsung. Официальная гарантия, доставка по Узбекистану.",
    seoDescription: "В интернет-магазине AlfaComp вы можете купить мониторы ведущих брендов MSI, ASUS, Dell, LG и Samsung с официальной гарантией. В наличии модели для киберспорта с частотой обновления до 360 Гц, сверхчеткие 2K и 4K панели для дизайна и видеомонтажа, а также надежные офисные мониторы с защитой зрения.",
  },
  ups: {
    name: "ИБП",
    slug: "ups",
    h1: "Источники бесперебойного питания (ИБП) в Ташкенте",
    metaTitle: "Купить ИБП Ion в Ташкенте — защита серверов, ПК и дома | AlfaComp",
    metaDescription: "ИБП Ion в Ташкенте: линейно-интерактивные и онлайн ИБП для ПК, серверов, котлов и медицинской техники. Мощность от 650VA до 120kVA. Официальная гарантия в AlfaComp.",
    seoDescription: "Надежные источники бесперебойного питания Ion для защиты чувствительной техники от перепадов напряжения и аварийных отключений электросети в Ташкенте и регионах Узбекистана. Подбор мощности, профессиональная консультация и гарантийное обслуживание.",
  },
  components: {
    name: "Комплектующие",
    slug: "components",
    h1: "Комплектующие для ПК в Ташкенте",
    metaTitle: "Купить комплектующие для ПК в Ташкенте — видеокарты, память, SSD, процессоры | AlfaComp",
    metaDescription: "Комплектующие для сборки и апгрейда ПК в Ташкенте: видеокарты RTX, оперативная память DDR4/DDR5, скоростные NVMe SSD, кулеры и блоки питания. Гарантия качества — AlfaComp.",
    seoDescription: "Каталог оригинальных комплектующих для сборки игровых и рабочих компьютеров в Ташкенте. Видеокарты NVIDIA GeForce RTX, оперативная память Lexar и Kingston, скоростные накопители NVMe PCIe 4.0/5.0. Быстрая доставка по Ташкенту и всему Узбекистану.",
  },
  networking: {
    name: "Сеть",
    slug: "networking",
    h1: "Сетевое оборудование в Ташкенте",
    metaTitle: "Сетевое оборудование в Ташкенте — роутеры, коммутаторы, кабели | AlfaComp",
    metaDescription: "Профессиональное сетевое оборудование в Ташкенте: гигабитные коммутаторы, оптоволоконные компоненты, патч-корды и сетевые карты. Надежные решения для дома и бизнеса в AlfaComp.",
    seoDescription: "Полный спектр оборудования для организации стабильных проводных и беспроводных локальных сетей в офисах, дата-центрах и частных домах. Доставка и официальная гарантия.",
  },
  "wifi-routers": {
    name: "Wi-Fi роутеры",
    slug: "wifi-routers",
    h1: "Wi-Fi роутеры в Ташкенте",
    metaTitle: "Купить Wi-Fi роутер в Ташкенте — Wi-Fi 6 и Wi-Fi 7 | AlfaComp",
    metaDescription: "Современные Wi-Fi роутеры с поддержкой Wi-Fi 6 и Wi-Fi 7 в Ташкенте. Высокая скорость, стабильное покрытие без мертвых зон. Доставка по Ташкенту — AlfaComp.",
    seoDescription: "Маршрутизаторы нового поколения для высокоскоростного интернета. Поддержка множества одновременных подключений, низкий пинг для онлайн-игр и потокового видео в 4K/8K.",
  },
  deco: {
    name: "Deco",
    slug: "deco",
    h1: "Mesh-системы TP-Link Deco в Ташкенте",
    metaTitle: "Купить Mesh-системы Deco в Ташкенте — бесшовный Wi-Fi для больших помещений | AlfaComp",
    metaDescription: "Mesh-системы TP-Link Deco в Ташкенте: бесшовный роуминг Wi-Fi для квартир, коттеджей и офисов. Единая сеть без обрывов. В наличии в AlfaComp с гарантией.",
    seoDescription: "Mesh-системы Deco обеспечивают идеальное покрытие Wi-Fi на площади до сотен квадратных метров. Автоматическое переключение между модулями без задержек и обрывов связи.",
  },
  "all-in-one": {
    name: "Моноблоки",
    slug: "all-in-one",
    h1: "Моноблоки в Ташкенте",
    metaTitle: "Купить моноблок для офиса и дома в Ташкенте | AlfaComp",
    metaDescription: "Стильные и производительные моноблоки в Ташкенте: современные процессоры Intel и AMD, IPS экраны. Экономия рабочего пространства. Гарантия и доставка — AlfaComp.",
    seoDescription: "Универсальные моноблоки 'все-в-одному' для эффективной работы, учебы и мультимедиа. Минимум проводов, максимальная эстетика и надежность.",
  },
  accessories: {
    name: "Аксессуары",
    slug: "accessories",
    h1: "Компьютерные аксессуары в Ташкенте",
    metaTitle: "Компьютерные аксессуары в Ташкенте — клавиатуры, кабели, переходники | AlfaComp",
    metaDescription: "Качественные аксессуары для компьютеров и периферии в Ташкенте. Широкий выбор переходников, адаптеров и полезных мелочей по доступным ценам в AlfaComp.",
    seoDescription: "Широкий ассортимент надежных аксессуаров для комфортной работы за компьютером. Вся продукция протестирована на совместимость и долговечность.",
  },
  mounts: {
    name: "Кронштейны",
    slug: "mounts",
    h1: "Кронштейны для мониторов и ТВ в Ташкенте",
    metaTitle: "Купить кронштейны для мониторов в Ташкенте — настольные и настенные | AlfaComp",
    metaDescription: "Эргономичные кронштейны с газлифтом для одного и двух мониторов в Ташкенте. Стандарт VESA, плавная регулировка высоты и наклона. Гарантия AlfaComp.",
    seoDescription: "Кронштейны для мониторов освобождают рабочее пространство на столе и позволяют настроить идеальный угол обзора для сохранения правильной осанки.",
  },
  speakers: {
    name: "Колонки",
    slug: "speakers",
    h1: "Колонки и акустика в Ташкенте",
    metaTitle: "Купить колонки для ПК в Ташкенте — акустические системы | AlfaComp",
    metaDescription: "Акустические системы и колонки для ПК в Ташкенте. Чистый звук, глубокий бас, компактные размеры. Официальная гарантия — AlfaComp.",
    seoDescription: "Качественный звук для фильмов, музыки и компьютерных игр. Компактные стереоколонки и мощные акустические системы в каталоге AlfaComp.",
  },
  mice: {
    name: "Мышки",
    slug: "mice",
    h1: "Компьютерные мыши в Ташкенте",
    metaTitle: "Купить компьютерную мышь в Ташкенте — игровые и беспроводные | AlfaComp",
    metaDescription: "Игровые и офисные мыши в Ташкенте: высокоточные оптические сенсоры, эргономичный корпус, проводные и Bluetooth модели в AlfaComp.",
    seoDescription: "Мыши для любых задач: от киберспортивных моделей с высоким DPI до удобных эргономичных беспроводных манипуляторов для офисной работы.",
  },
  computers: {
    name: "Компьютеры",
    slug: "computers",
    h1: "Компьютеры и системные блоки в Ташкенте",
    metaTitle: "Купить компьютер в Ташкенте — игровые ПК и рабочие станции | AlfaComp",
    metaDescription: "Купить готовый компьютер или заказать индивидуальную сборку ПК в Ташкенте. Игровые компьютеры с RTX, ПК для офиса и дизайна. Гарантия до 3 лет — AlfaComp.uz",
    seoDescription: "AlfaComp предлагает мощные системные блоки и сборку ПК на заказ в Ташкенте. Подбор оптимальной конфигурации под ваш бюджет, стресс-тестирование, профессиональный кабель-менеджмент и гарантия.",
  },
};

/** Get English category slug for a product category */
export function getCategorySlug(category: string): string {
  return CATEGORY_SLUGS[category] ?? slugify(category);
}

/** Get Russian category name from English slug */
export function getCategoryNameBySlug(slug: string): string {
  return SLUG_TO_CATEGORY[slug] ?? slug;
}

/** Generate a unique, clean, SEO-friendly slug for a product: e.g. "lexar-thor-rgb-ddr5-64gb-6000mhz-12" */
export function generateProductSlug(product: { id: number; name: string }): string {
  const baseSlug = slugify(product.name);
  return `${baseSlug}-${product.id}`;
}

/** Get full canonical product URL path: e.g. "/product/lexar-thor-rgb-ddr5-64gb-6000mhz-12" */
export function getProductUrl(product: { id: number; name: string; category?: string } | number, name?: string): string {
  if (typeof product === "number") {
    const slug = name ? `${slugify(name)}-${product}` : `${product}`;
    return `/product/${slug}`;
  }
  return `/product/${generateProductSlug(product)}`;
}

/** Get full canonical category URL path: e.g. "/category/monitors" */
export function getCategoryUrl(categoryOrSlug: string): string {
  const slug = CATEGORY_SLUGS[categoryOrSlug] ?? categoryOrSlug;
  return `/category/${slug}`;
}

/** Extract numeric ID from a product slug (looks at trailing "-{id}" or numeric string) */
export function extractProductIdFromSlug(slug: string): number | null {
  if (!slug) return null;
  // If slug is purely a number
  if (/^\d+$/.test(slug)) {
    return parseInt(slug, 10);
  }
  // If slug ends with -{id}
  const match = slug.match(/-(\d+)$/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

/** Find a product by slug or ID */
export function findProductBySlug<T extends { id: number; name: string }>(slug: string, products: T[]): T | undefined {
  if (!slug || !products.length) return undefined;
  
  // 1. Try extracting trailing numeric ID
  const id = extractProductIdFromSlug(slug);
  if (id !== null) {
    const byId = products.find((p) => p.id === id);
    if (byId) return byId;
  }

  // 2. Try exact slug match
  const byExactSlug = products.find((p) => generateProductSlug(p) === slug);
  if (byExactSlug) return byExactSlug;

  // 3. Try base slug match (without ID)
  const baseInputSlug = slug.replace(/-\d+$/, "");
  return products.find((p) => slugify(p.name) === baseInputSlug);
}

/**
 * Backward compatibility parser for legacy hash links:
 * - #/products/{category}/{id}
 * - #/product/{slug}
 */
export function parseProductHash(hash: string): { categorySlug?: string; id?: number; slug?: string } | null {
  if (!hash) return null;

  // matches: #/products/{category}/{id}
  const legacyMatch = hash.match(/^#\/products\/([a-z0-9-]+)\/(\d+)$/);
  if (legacyMatch) {
    const id = parseInt(legacyMatch[2], 10);
    if (!isNaN(id) && id > 0) {
      return { categorySlug: legacyMatch[1], id };
    }
  }

  // matches: #/product/{slug}
  const directMatch = hash.match(/^#\/product\/([a-z0-9-]+)$/);
  if (directMatch) {
    return { slug: directMatch[1] };
  }

  return null;
}
