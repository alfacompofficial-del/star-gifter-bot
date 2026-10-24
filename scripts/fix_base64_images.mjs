import fs from 'fs';
import path from 'path';

const SUPABASE_URL = 'https://vtlzfcjxpnrsqlsrvyer.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Ieiof0ojLifGDUpgD6ldVA_utmqM2nZ';

async function fetchProduct(id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/products?select=id,name,image&id=eq.${id}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  const data = await res.json();
  return data[0];
}

async function updateProductImage(id, newImageUrl) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ image: newImageUrl }),
  });
  return res.ok;
}

async function run() {
  console.log('=== Конвертация base64 картинок товаров 108 и 166 в статические файлы ===');
  const productsDir = path.resolve('public/products');

  // Product 108
  console.log('Загрузка товара 108...');
  const p108 = await fetchProduct(108);
  if (p108 && p108.image && p108.image.startsWith('data:')) {
    const base64Data = p108.image.split(',')[1];
    const filename = '108_PARTY_BOX_2_Microphone.jpg';
    const filePath = path.join(productsDir, filename);
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
    console.log(`Сохранен файл: ${filePath} (${(fs.statSync(filePath).size / 1024).toFixed(1)} КБ)`);

    const newUrl = `/products/${filename}`;
    const ok = await updateProductImage(108, newUrl);
    console.log(`Обновление в Supabase для ID 108: ${ok ? 'УСПЕШНО' : 'ОШИБКА'}`);
  } else {
    console.log('Товар 108 не требует обновления или уже обновлен.');
  }

  // Product 166
  console.log('Загрузка товара 166...');
  const p166 = await fetchProduct(166);
  if (p166 && p166.image && p166.image.startsWith('data:')) {
    const base64Data = p166.image.split(',')[1];
    const filename = '166_RTX_5090_ASUS_TUF.png';
    const filePath = path.join(productsDir, filename);
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
    console.log(`Сохранен файл: ${filePath} (${(fs.statSync(filePath).size / 1024).toFixed(1)} КБ)`);

    const newUrl = `/products/${filename}`;
    const ok = await updateProductImage(166, newUrl);
    console.log(`Обновление в Supabase для ID 166: ${ok ? 'УСПЕШНО' : 'ОШИБКА'}`);
  } else {
    console.log('Товар 166 не требует обновления или уже обновлен.');
  }

  console.log('Готово!');
}

run().catch(console.error);
