import fs from 'fs';
import path from 'path';

const rawText = fs.readFileSync('scripts/user_products_raw.txt', 'utf8');

// Pattern to match each numbered block:
// e.g.:
// 1. Ion 600t-33 | ИБП | $33 | 394 350 сум
//    https://mtca.uz/image/...

const blocks = rawText.split(/\n(?=\d+\.\s+)/).map(b => b.trim()).filter(Boolean);

console.log(`Parsed ${blocks.length} blocks`);

const detectBrand = (name, category) => {
  const n = name.trim();
  if (/^Ion\b/i.test(n)) return 'Ion';
  if (/^Redmi\b/i.test(n)) return 'Redmi';
  if (/^Philips\b/i.test(n)) return 'Philips';
  if (/^VG249QG/i.test(n)) return 'ASUS';
  if (/^MSI\b|^Msi\b/i.test(n)) return 'MSI';
  if (/^Mercusys\b|^Mercusy\b/i.test(n)) return 'Mercusys';
  if (/^Lexar\b/i.test(n)) return 'Lexar';
  if (/^Kingston\b/i.test(n)) return 'Kingston';
  if (/990 pro/i.test(n)) return 'Samsung';
  if (/4tb kingston/i.test(n)) return 'Kingston';
  if (/^Wd\b|^WD\b/i.test(n)) return 'Western Digital';
  if (/apacer/i.test(n)) return 'Apacer';
  if (/usb ssd/i.test(n) || /usp ssd/i.test(n)) return 'SanDisk';
  if (/ULTRA 9285K|^I7|^I9/i.test(n)) return 'Intel';
  if (/^Asus\b/i.test(n) || /ROG Astral/i.test(n)) return 'ASUS';
  if (/^ZOTAG\b|^Zotac\b/i.test(n)) return 'Zotac';
  if (/^Acer\b/i.test(n)) return 'Acer';
  if (/^Lenovo\b/i.test(n)) return 'Lenovo';
  if (/CHO5|CH09|Lumi/i.test(n)) return 'Lumi';
  if (/^Aula\b/i.test(n)) return 'Aula';
  if (/^GM30\b/i.test(n)) return 'MSI';
  if (/^Usb DVD/i.test(n)) return 'HP';
  if (/^S87\b/i.test(n)) return 'Attack Shark';
  if (/Yandex\b/i.test(n)) return 'Yandex';
  if (/^Sony\b/i.test(n)) return 'Sony';
  if (/^Hopestar\b|^Hopestor\b|^PARTY BOX\b|^PARTY 500\b/i.test(n)) return 'Hopestar';
  if (/^LDT/i.test(n)) return 'Brateck';
  if (/^Deco\b/i.test(n)) return 'TP-Link';
  if (/^Archer\b|^Wi-Fi 7 BE3600\b/i.test(n)) return 'TP-Link';
  if (/^ATK\b/i.test(n)) return 'ATK';
  if (/Mirage R73|Renagade R72|R90 Plus|V7M71|V8MA/i.test(n)) return 'Bloody';
  return 'AlfaComp';
};

const products = [];

for (const b of blocks) {
  const lines = b.split('\n').map(l => l.trim()).filter(Boolean);
  const headerLine = lines[0];
  const urlLine = lines.slice(1).join(' ').trim();

  const m = headerLine.match(/^(\d+)\.\s*(.+?)\s*\|\s*(.+?)\s*\|\s*\$([\d.]+)\s*\|\s*([\d\s]+)\s*сум/i);
  if (!m) {
    console.error('Failed to parse line:', headerLine);
    continue;
  }

  const id = parseInt(m[1], 10);
  const name = m[2].trim();
  const category = m[3].trim();
  const priceUSD = parseFloat(m[4]);
  const priceUZS = parseInt(m[5].replace(/\s+/g, ''), 10);
  const image = urlLine;
  const brand = detectBrand(name, category);

  products.push({
    id,
    name,
    brand,
    image,
    priceUZS,
    priceUSD,
    category,
    in_stock: true,
    priority: id,
  });
}

console.log(`Parsed ${products.length} products successfully!`);

// Generate complete SQL
const escapeSql = (str) => str.replace(/'/g, "''");

const sqlLines = [];
sqlLines.push('-- =================================================================');
sqlLines.push('-- AlfaComp: Официальный список из всех 162 товаров с точными ценами');
sqlLines.push('-- =================================================================');
sqlLines.push('');
sqlLines.push('-- 1. Гарантируем наличие всех категорий');
sqlLines.push('INSERT INTO public.categories (name, sort_order) VALUES');
sqlLines.push("  ('ИБП', 1),");
sqlLines.push("  ('Мониторы', 2),");
sqlLines.push("  ('Сеть', 3),");
sqlLines.push("  ('Комплектующие', 4),");
sqlLines.push("  ('Моноблоки', 5),");
sqlLines.push("  ('Аксессуары', 6),");
sqlLines.push("  ('Колонки', 7),");
sqlLines.push("  ('Кронштейны', 8),");
sqlLines.push("  ('Deco', 9),");
sqlLines.push("  ('Wi-Fi роутеры', 10),");
sqlLines.push("  ('Мышки', 11),");
sqlLines.push("  ('SETTINGS_EXCHANGE_RATE', 11858)");
sqlLines.push('ON CONFLICT (name) DO UPDATE SET sort_order = EXCLUDED.sort_order;');
sqlLines.push('');
sqlLines.push('-- 2. Очищаем таблицу товаров');
sqlLines.push('TRUNCATE TABLE public.products RESTART IDENTITY;');
sqlLines.push('');
sqlLines.push('-- 3. Вставляем все 162 товара');
sqlLines.push('INSERT INTO public.products (id, name, brand, image, price, old_price, category, in_stock, priority) VALUES');

const valueRows = products.map((p, idx) => {
  const isLast = idx === products.length - 1;
  return `(${p.id}, '${escapeSql(p.name)}', '${escapeSql(p.brand)}', '${escapeSql(p.image)}', ${p.priceUZS}, NULL, '${escapeSql(p.category)}', true, ${p.priority})${isLast ? ';' : ','}`;
});

sqlLines.push(...valueRows);
sqlLines.push('');
sqlLines.push('-- 4. Корректируем последовательность id');
sqlLines.push("SELECT setval(pg_get_serial_sequence('public.products', 'id'), (SELECT MAX(id) FROM public.products));");
sqlLines.push('');

const fullSql = sqlLines.join('\n');
fs.writeFileSync('supabase/migrations/all_162_products_official.sql', fullSql, 'utf8');
fs.writeFileSync('all_162_products_official.sql', fullSql, 'utf8');

console.log('SQL generated and saved to supabase/migrations/all_162_products_official.sql');
console.log('Sample SQL rows:');
console.log(valueRows.slice(0, 5).join('\n'));
console.log('Last SQL rows:');
console.log(valueRows.slice(-3).join('\n'));
