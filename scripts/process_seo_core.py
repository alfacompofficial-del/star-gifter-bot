import json
from collections import defaultdict

with open('seo_core_dump.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

core = data['Семантическое ядро']
header = core[0]
rows = core[1:]

# Columns:
# 0: №
# 1: Поисковый запрос
# 2: Категория
# 3: Интент
# 4: Приоритет (гипотеза)
# 5: Целевая страница / тип
# 6: Язык
# 7: Частотность
# 8: Страница сайта для сверки
# 9: Комментарий

by_category = defaultdict(list)
by_site_url = defaultdict(list)
all_queries = []
uzbek_queries = []
high_priority_queries = []

for r in rows:
    if len(r) < 2:
        continue
    q = r[1].strip()
    if not q or q in all_queries:
        continue
    all_queries.append(q)
    
    cat = r[2].strip() if len(r) > 2 else ""
    priority = r[4].strip() if len(r) > 4 else ""
    lang = r[6].strip() if len(r) > 6 else ""
    url = r[8].strip() if len(r) > 8 else ""

    by_category[cat].append(q)
    by_site_url[url].append(q)
    
    if "узбек" in lang.lower() or "uz" in lang.lower():
        uzbek_queries.append(q)
    if "высок" in priority.lower() or "p1" in priority.lower():
        high_priority_queries.append(q)

commercial_sheet = data.get('Главные коммерческие', [])
commercial_queries = []
for r in commercial_sheet[1:]:
    if len(r) > 1 and r[1].strip():
        commercial_queries.append(r[1].strip())

res = {
    'total_unique_queries': len(all_queries),
    'commercial_queries_count': len(commercial_queries),
    'uzbek_queries_count': len(uzbek_queries),
    'high_priority_count': len(high_priority_queries),
    'commercial_queries': commercial_queries,
    'uzbek_queries': uzbek_queries,
    'by_category': {k: v for k, v in by_category.items()},
    'by_site_url': {k: v for k, v in by_site_url.items()},
}

with open('scripts/processed_seo.json', 'w', encoding='utf-8') as f:
    json.dump(res, f, ensure_ascii=False, indent=2)

with open('scripts/processed_seo_summary.txt', 'w', encoding='utf-8') as f:
    f.write(f"Total Unique Queries: {len(all_queries)}\n")
    f.write(f"Commercial Priority Queries: {len(commercial_queries)}\n")
    f.write(f"Uzbek Queries: {len(uzbek_queries)}\n")
    f.write(f"High Priority Queries: {len(high_priority_queries)}\n\n")
    f.write("=== Queries by Category ===\n")
    for cat, qs in by_category.items():
        f.write(f"\n[{cat}] ({len(qs)} queries):\n")
        f.write(", ".join(qs[:15]) + " ...\n")
    f.write("\n=== Queries by Site URL ===\n")
    for u, qs in by_site_url.items():
        f.write(f"\n[{u}] ({len(qs)} queries):\n")
        f.write(", ".join(qs[:15]) + " ...\n")
    f.write("\n=== Uzbek Queries ===\n")
    f.write(", ".join(uzbek_queries) + "\n")
    f.write("\n=== First 50 Commercial Queries ===\n")
    f.write(", ".join(commercial_queries[:50]) + "\n")
