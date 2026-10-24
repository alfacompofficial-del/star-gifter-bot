import fs from "fs";
import path from "path";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://vtlzfcjxpnrsqlsrvyer.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_Ieiof0ojLifGDUpgD6ldVA_utmqM2nZ";

const OUTPUT_DIR = path.resolve("./product_photos");

function sanitizeFilename(name) {
  return name
    .replace(/[<>:"/\\|?*]+/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 60);
}

function getExtension(url) {
  try {
    const cleanUrl = url.split("?")[0];
    const ext = path.extname(cleanUrl).toLowerCase();
    if (ext && [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) {
      return ext;
    }
  } catch {}
  return ".jpg";
}

async function run() {
  console.log("=== Скачивание фотографий всех товаров AlfaComp ===");
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log("Получение списка товаров из базы Supabase...");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/products?select=id,name,category,image&order=id.asc`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Ошибка загрузки товаров: HTTP ${res.status}`);
  }

  const products = await res.json();
  console.log(`Найдено товаров: ${products.length}`);

  let downloadedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const padId = String(p.id).padStart(3, "0");
    const safeName = sanitizeFilename(p.name || `product_${p.id}`);
    const imgUrl = (p.image || "").trim();

    if (!imgUrl || !imgUrl.startsWith("http")) {
      console.log(`[${i + 1}/${products.length}] Пропуск #${p.id} (${p.name}): некорректный URL картинки`);
      skippedCount++;
      continue;
    }

    const ext = getExtension(imgUrl);
    const fileName = `${padId}_${safeName}${ext}`;
    const filePath = path.join(OUTPUT_DIR, fileName);

    // Skip if already downloaded
    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 1024) {
      downloadedCount++;
      continue;
    }

    try {
      const imgRes = await fetch(imgUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      if (!imgRes.ok) {
        console.warn(`[${i + 1}/${products.length}] ❌ Не удалось скачать #${p.id} (${imgRes.status})`);
        skippedCount++;
        continue;
      }

      const buffer = Buffer.from(await imgRes.arrayBuffer());
      fs.writeFileSync(filePath, buffer);
      downloadedCount++;
      console.log(`[${i + 1}/${products.length}] ✔ Скачано: ${fileName} (${(buffer.length / 1024).toFixed(1)} КБ)`);
    } catch (err) {
      console.warn(`[${i + 1}/${products.length}] ❌ Ошибка скачивания #${p.id}: ${err.message}`);
      skippedCount++;
    }
  }

  console.log("\n==================================================");
  console.log(`Готово! Успешно скачано: ${downloadedCount} фото.`);
  if (skippedCount > 0) {
    console.log(`Пропущено/ошибок: ${skippedCount}`);
  }
  console.log(`Папка с фотографиями: ${OUTPUT_DIR}`);
  console.log("==================================================");
}

run().catch((e) => {
  console.error("Критическая ошибка:", e);
});
