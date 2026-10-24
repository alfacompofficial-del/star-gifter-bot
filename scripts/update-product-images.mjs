/**
 * Скрипт обновления URL изображений товаров в Supabase
 * Маппит локальные файлы по номеру в начале имени файла с ID товара в БД
 * Запуск: node scripts/update-product-images.mjs
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = 'https://vtlzfcjxpnrsqlsrvyer.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Ieiof0ojLifGDUpgD6ldVA_utmqM2nZ';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const PHOTOS_DIR = path.join(process.cwd(), 'public', 'products');

// Получаем список файлов
const photoFiles = fs.readdirSync(PHOTOS_DIR).filter(f =>
  /\.(jpg|jpeg|png|webp|gif)$/i.test(f)
);

// Создаём маппинг: номер -> имя файла (используется как путь /products/имя_файла)
const fileByNumber = {};
photoFiles.forEach(file => {
  const match = file.match(/^(\d+)[_\s]/);
  if (match) {
    fileByNumber[parseInt(match[1])] = file;
  }
});

console.log(`📁 Найдено ${photoFiles.length} фото, ${Object.keys(fileByNumber).length} с номерами`);

// Получаем все товары из Supabase
const { data: products, error } = await supabase
  .from('products')
  .select('id, name, image')
  .order('id', { ascending: true });

if (error) {
  console.error('❌ Ошибка получения товаров:', error.message);
  process.exit(1);
}

console.log(`📦 Товаров в БД: ${products.length}\n`);

let updated = 0;
let skipped = 0;
let notFound = 0;

for (const product of products) {
  const photoFile = fileByNumber[product.id];

  if (!photoFile) {
    // Пробуем поиск по числу в имени товара
    console.log(`⚠️  [${product.id}] Нет фото для: ${product.name}`);
    notFound++;
    continue;
  }

  const newUrl = `/products/${encodeURIComponent(photoFile)}`;

  // Если URL уже локальный и совпадает — пропускаем
  if (product.image === newUrl) {
    console.log(`✅ [${product.id}] Уже актуально: ${product.name}`);
    skipped++;
    continue;
  }

  // Обновляем в Supabase
  const { error: updateError } = await supabase
    .from('products')
    .update({ image: newUrl })
    .eq('id', product.id);

  if (updateError) {
    console.error(`❌ [${product.id}] Ошибка обновления ${product.name}: ${updateError.message}`);
  } else {
    console.log(`🔄 [${product.id}] Обновлено: ${product.name}`);
    console.log(`       ${product.image?.substring(0, 60)}... → ${newUrl}`);
    updated++;
  }

  // Небольшая задержка чтобы не перегружать API
  await new Promise(r => setTimeout(r, 50));
}

console.log(`\n═══════════════════════════════════`);
console.log(`✅ Обновлено:   ${updated}`);
console.log(`⏭️  Пропущено:  ${skipped}`);
console.log(`⚠️  Не найдено: ${notFound}`);
console.log(`═══════════════════════════════════`);
console.log('\n🎉 Готово! Теперь сайт использует локальные фото из /products/');
