/**
 * Показывает список товаров из Supabase
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vtlzfcjxpnrsqlsrvyer.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Ieiof0ojLifGDUpgD6ldVA_utmqM2nZ';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const { data: products, error } = await supabase
  .from('products')
  .select('id, name, image, category')
  .order('id', { ascending: true });

if (error) {
  console.error('❌ Ошибка:', error.message);
  process.exit(1);
}

console.log(`📦 Найдено ${products.length} товаров`);
products.forEach(p => {
  const isExternal = p.image && (p.image.startsWith('http://') || p.image.startsWith('https://'));
  const status = isExternal ? '🌐 ВНЕШНИЙ' : '✅ ЛОКАЛЬНЫЙ';
  console.log(`[${String(p.id).padStart(3)}] ${status} | ${p.name}`);
  if (isExternal) console.log(`       URL: ${p.image}`);
});
