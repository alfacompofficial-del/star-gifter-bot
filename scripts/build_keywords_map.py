import json

with open('scripts/processed_seo.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

by_cat = data['by_category']
by_url = data['by_site_url']

# Let's inspect category mapping to our slugs
mapping = {
    'computers': by_cat.get('ПК и системные блоки', []) + by_cat.get('Игровые ПК / сборка', []) + by_cat.get('Офисные ПК / рабочие станции', []),
    'monitors': by_cat.get('Мониторы', []),
    'ups': by_cat.get('ИБП', []),
    'components': by_cat.get('Комплектующие', []) + by_cat.get('Комплектующие и видеокарты', []),
    'videocards': [q for q in (by_cat.get('Комплектующие и видеокарты', []) + by_cat.get('Комплектующие', [])) if any(w in q.lower() for w in ['видеокарт', 'rtx', 'gtx', 'gpu', 'videokarta'])],
    'wifi-routers': by_cat.get('Wi-Fi роутеры', []) + by_cat.get('Сеть / Wi-Fi роутеры', []),
    'networking': by_cat.get('Сеть', []) + by_cat.get('Сеть / Wi-Fi роутеры', []),
    'deco': by_cat.get('Deco / Mesh Wi-Fi', []),
    'all-in-one': by_cat.get('Моноблоки', []),
    'accessories': by_cat.get('Аксессуары', []),
    'mounts': by_cat.get('Кронштейны', []),
    'speakers': by_cat.get('Колонки', []),
    'mice': by_cat.get('Мышки', []),
}

# General / Home queries
home_queries = data['commercial_queries'] + data['uzbek_queries'] + by_cat.get('Общие запросы', [])
# Deduplicate while preserving order
def dedup(lst):
    seen = set()
    res = []
    for x in lst:
        s = x.strip()
        if s and s.lower() not in seen:
            seen.add(s.lower())
            res.append(s)
    return res

home_dedup = dedup(home_queries)

print(f"Home page unique keywords: {len(home_dedup)}")
for slug, qs in mapping.items():
    d = dedup(qs)
    print(f"Slug '{slug}': {len(d)} unique keywords")
    mapping[slug] = d

output = {
    'home_keywords': home_dedup,
    'category_keywords': mapping,
    'commercial_top50': data['commercial_queries'][:50],
    'uzbek_all': data['uzbek_queries']
}

with open('scripts/category_keywords_map.json', 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print("\nSaved category_keywords_map.json successfully!")
