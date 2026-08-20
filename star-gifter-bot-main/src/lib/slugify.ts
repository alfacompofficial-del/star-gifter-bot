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
};

// Reverse mapping: English slug → Russian category name
export const SLUG_TO_CATEGORY: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_SLUGS).map(([ru, en]) => [en, ru])
);

/** Get English category slug for a product category */
export function getCategorySlug(category: string): string {
  return CATEGORY_SLUGS[category] ?? category.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

/** Build full product URL: /#/products/{category-slug}/{id} */
export function getProductUrl(id: number, category: string): string {
  const catSlug = getCategorySlug(category);
  return `/#/products/${catSlug}/${id}`;
}

/** Parse a product URL hash and return { categorySlug, id } or null */
export function parseProductHash(hash: string): { categorySlug: string; id: number } | null {
  // matches: #/products/{category}/{id}
  const match = hash.match(/^#\/products\/([a-z0-9-]+)\/(\d+)$/);
  if (!match) return null;
  const id = parseInt(match[2], 10);
  if (isNaN(id) || id <= 0) return null;
  return { categorySlug: match[1], id };
}
