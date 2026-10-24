import json

with open('scripts/category_keywords_map.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

category_keywords = {}
for slug, qs in d['category_keywords'].items():
    # take top 40 queries for each category
    category_keywords[slug] = ", ".join(qs[:40])

# Construct comprehensive HOME_SEO_KEYWORDS
home_core_commercial = [
    "купить компьютер Ташкент",
    "купить ПК в Ташкенте",
    "сборка ПК Ташкент",
    "игровой компьютер купить",
    "игровой ПК в Ташкенте",
    "системный блок купить",
    "компьютерный магазин Ташкент",
    "интернет магазин компьютерной техники Ташкент",
    "компьютеры в Узбекистане цены",
    "купить монитор в Ташкенте",
    "игровой монитор 2K 4K",
    "мониторы 144 Гц 240 Гц",
    "мониторы MSI ASUS Dell LG Samsung",
    "купить видеокарту в Ташкенте",
    "NVIDIA GeForce RTX 5070",
    "RTX 5060",
    "RTX 5080",
    "RTX 5090",
    "комплектующие для ПК Ташкент",
    "оперативная память DDR5",
    "SSD NVMe PCIe 4.0",
    "купить ИБП в Ташкенте",
    "источник бесперебойного питания Ion",
    "ИБП для сервера и ПК",
    "Wi-Fi роутер купить Ташкент",
    "Wi-Fi 6",
    "Wi-Fi 7",
    "Mesh система TP-Link Deco",
    "моноблок купить Ташкент",
    "кронштейны для монитора",
    "игровая мышь",
    "компьютерные колонки",
    "доставка по Узбекистану",
    "гарантия до 3 лет",
    "AlfaComp",
    "alfacomp.uz",
    "АльфаКомп"
]

home_uzbek = [
    "kompyuter sotib olish Toshkent",
    "kompyuter narxi Toshkent",
    "kompyuter do'koni Toshkent",
    "o'yin kompyuteri sotib olish",
    "gaming PC sotib olish Toshkent",
    "sistem blok sotib olish",
    "kompyuter yig'ish Toshkent",
    "monitor sotib olish Toshkent",
    "gaming monitor Toshkent",
    "UPS sotib olish Toshkent",
    "videokarta sotib olish Toshkent",
    "kompyuter qismlari Toshkent",
    "Wi-Fi router Toshkent",
    "kompyuter jihozlari yetkazib berish O'zbekiston"
]

home_extra_commercial = d.get('commercial_top50', [])[:35]

# Merge and deduplicate
combined_home = []
seen = set()
for q in home_core_commercial + home_uzbek + home_extra_commercial:
    k = q.strip().lower()
    if k not in seen:
        seen.add(k)
        combined_home.append(q.strip())

home_keywords_str = ", ".join(combined_home)

catalog_keywords_str = "каталог компьютерной техники Ташкент, купить компьютер, купить монитор, комплектующие для ПК, видеокарты RTX, ИБП Ion, Wi-Fi роутеры, моноблоки, мыши, кронштейны, AlfaComp"

ts_content = f'''/**
 * SEO Semantic Core Keywords for AlfaComp.uz
 * Extracted from alfacomp_seo_semantic_core_expanded (1896 keywords, 6 sheets)
 * Covers: Commercial intent, PC assembly, Monitors, UPS, Components, GPUs, Networking, Mesh, Monoblocks, Peripherals & Uzbek queries
 */

export const HOME_SEO_KEYWORDS =
  {json.dumps(home_keywords_str, ensure_ascii=False)};

export const CATALOG_SEO_KEYWORDS =
  {json.dumps(catalog_keywords_str, ensure_ascii=False)};

export const CATEGORY_KEYWORDS_MAP: Record<string, string> = {json.dumps(category_keywords, ensure_ascii=False, indent=2)};
'''

with open('src/lib/seoKeywords.ts', 'w', encoding='utf-8') as f:
    f.write(ts_content)

print(f"Created src/lib/seoKeywords.ts with {len(combined_home)} home keywords and {len(category_keywords)} category sets.")
