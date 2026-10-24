import json

with open('scripts/category_keywords_map.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

with open('scripts/ts_keywords.utf8.txt', 'w', encoding='utf-8') as out:
    for slug, qs in d['category_keywords'].items():
        selected = qs[:35]
        s = ", ".join(selected)
        out.write(f"// === {slug} ===\n")
        out.write(f'keywords: "{s}",\n\n')

    # Home keywords
    home_sel = d['home_keywords'][:65]
    out.write("// === home ===\n")
    out.write(f'homeKeywords: "{", ".join(home_sel)}",\n\n')
