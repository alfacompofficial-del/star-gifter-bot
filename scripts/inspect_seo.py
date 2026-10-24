import json
import sys

with open('seo_core_dump.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

with open('scripts/seo_summary.txt', 'w', encoding='utf-8') as out:
    for sheet_name, rows in data.items():
        out.write(f"\n======================================================================\n")
        out.write(f"SHEET: {sheet_name} (Total rows: {len(rows)})\n")
        out.write(f"======================================================================\n")
        for i, r in enumerate(rows[:25]):
            out.write(f"Row {i}: {r}\n")
