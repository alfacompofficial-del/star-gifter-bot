import zipfile
import xml.etree.ElementTree as ET
import json
import os

def parse_xlsx(file_path):
    with zipfile.ZipFile(file_path, 'r') as z:
        # 1. Shared strings
        shared_strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            ss_root = ET.fromstring(z.read('xl/sharedStrings.xml'))
            ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
            for si in ss_root.findall('ns:si', ns):
                texts = [t.text for t in si.findall('.//ns:t', ns) if t.text]
                shared_strings.append(''.join(texts))
        
        # 2. Workbook sheet names and rels
        wb_root = ET.fromstring(z.read('xl/workbook.xml'))
        ns_wb = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
                 'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
        sheets = []
        for s in wb_root.findall('.//ns:sheet', ns_wb):
            name = s.attrib.get('name')
            r_id = s.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
            sheets.append((name, r_id))
        
        wb_rels_root = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
        ns_rel = {'ns': 'http://schemas.openxmlformats.org/package/2006/relationships'}
        rel_map = {}
        for rel in wb_rels_root.findall('ns:Relationship', ns_rel):
            rel_map[rel.attrib['Id']] = rel.attrib['Target']

        data = {}
        for s_name, r_id in sheets:
            target = rel_map.get(r_id, '')
            if target.startswith('/'):
                sheet_file = target.lstrip('/')
            elif target.startswith('xl/'):
                sheet_file = target
            else:
                sheet_file = 'xl/' + target
            sheet_file = sheet_file.replace('//', '/')
            s_root = ET.fromstring(z.read(sheet_file))
            ns_s = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
            rows = []
            for row in s_root.findall('.//ns:row', ns_s):
                row_vals = []
                for cell in row.findall('ns:c', ns_s):
                    t = cell.attrib.get('t')
                    val_elem = cell.find('ns:v', ns_s)
                    val = val_elem.text if val_elem is not None else ''
                    if t == 's' and val.isdigit():
                        idx = int(val)
                        if idx < len(shared_strings):
                            val = shared_strings[idx]
                    row_vals.append(val)
                if any(row_vals):
                    rows.append(row_vals)
            data[s_name] = rows
        return data

data = parse_xlsx('alfacomp_seo_semantic_core_expanded.xlsx')
with open('seo_core_dump.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print('Extracted sheets:')
for k, v in data.items():
    print(f'Sheet "{k}": {len(v)} rows')
    if v:
        print('  Header:', v[0][:6])
        if len(v) > 1:
            print('  Row 1:', v[1][:6])
