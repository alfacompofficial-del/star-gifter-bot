import { writeFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const BASE_URL = "https://alfacomp.uz";
const TODAY = new Date().toISOString().split("T")[0];

const STATIC_ROUTES = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/catalog", changefreq: "daily", priority: "0.9" },
  // Category Landing Pages
  { path: "/category/ups", changefreq: "daily", priority: "0.8" },
  { path: "/category/monitors", changefreq: "daily", priority: "0.8" },
  { path: "/category/components", changefreq: "daily", priority: "0.8" },
  { path: "/category/networking", changefreq: "daily", priority: "0.8" },
  { path: "/category/wifi-routers", changefreq: "daily", priority: "0.8" },
  { path: "/category/all-in-one", changefreq: "daily", priority: "0.8" },
  { path: "/category/accessories", changefreq: "daily", priority: "0.8" },
  { path: "/category/mounts", changefreq: "daily", priority: "0.8" },
  { path: "/category/deco", changefreq: "daily", priority: "0.8" },
  { path: "/category/speakers", changefreq: "daily", priority: "0.8" },
  { path: "/category/mice", changefreq: "daily", priority: "0.8" },
  { path: "/category/videocards", changefreq: "daily", priority: "0.8" },
  { path: "/category/computers", changefreq: "daily", priority: "0.8" },
  // Informational & Content Pages
  { path: "/about", changefreq: "monthly", priority: "0.6" },
  { path: "/delivery", changefreq: "monthly", priority: "0.6" },
  { path: "/warranty", changefreq: "monthly", priority: "0.6" },
  { path: "/contacts", changefreq: "monthly", priority: "0.7" },
  { path: "/guides", changefreq: "weekly", priority: "0.7" },
  { path: "/download", changefreq: "monthly", priority: "0.7" },
];

// Transliteration helper for Russian characters
const RU_TO_LATIN = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
  ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
  я: "ya",
};

function slugify(text) {
  if (!text) return "";
  return text
    .toLowerCase()
    .split("")
    .map((char) => RU_TO_LATIN[char] ?? char)
    .join("")
    .replace(/["'«»]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function getProductSlug(id, name) {
  const base = slugify(name);
  return `${base}-${id}`;
}

function escapeXml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizeImageUrl(img) {
  if (!img) return null;
  const trimmed = String(img).trim();
  if (!trimmed || trimmed.startsWith("data:")) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("/")) return `${BASE_URL}${trimmed}`;
  return `${BASE_URL}/${trimmed}`;
}

async function fetchProducts() {
  // Use active production Supabase database
  const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://vtlzfcjxpnrsqlsrvyer.supabase.co";
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_Ieiof0ojLifGDUpgD6ldVA_utmqM2nZ";

  console.log(`[sitemap] Fetching products from primary database: ${supabaseUrl}`);
  let lastErr = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/products?select=id,name,category,created_at,image&order=id.asc`, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Supabase returned HTTP status ${res.status} (${res.statusText})`);
      }

      const data = await res.json();
      if (!Array.isArray(data) || data.length < 50) {
        throw new Error(`Incomplete product dataset received: got ${Array.isArray(data) ? data.length : typeof data} products`);
      }

      return data;
    } catch (err) {
      lastErr = err;
      console.warn(`[sitemap] Attempt ${attempt}/3 failed: ${err.message}. Retrying...`);
      if (attempt < 3) await new Promise((r) => setTimeout(r, 1000));
    }
  }

  console.error(`[sitemap] CRITICAL ERROR fetching products for sitemap:`, lastErr?.message);
  process.exit(1);
}

async function generate() {
  const products = await fetchProducts();
  console.log(`[sitemap] Successfully fetched ${products.length} valid products from primary database`);

  const entries = [
    {
      ...STATIC_ROUTES[0],
      image: `${BASE_URL}/banner.jpg`,
      imageTitle: "AlfaComp — Магазин компьютеров и мониторов в Ташкенте",
      imageCaption: "Купить игровой компьютер, мониторы 2K/4K, комплектующие в Ташкенте с гарантией — AlfaComp.uz",
    },
    ...STATIC_ROUTES.slice(1),
  ];
  const seenSlugs = new Set();

  // Add all products with their clean SEO URL: /product/{slug} and image metadata for Google/Yandex Images
  for (const product of products) {
    if (!product.id || !product.name) {
      console.error(`[sitemap] CRITICAL: Invalid product data detected:`, product);
      process.exit(1);
    }
    const slug = getProductSlug(product.id, product.name);
    if (seenSlugs.has(slug)) {
      console.error(`[sitemap] CRITICAL: Duplicate product slug detected: "${slug}"`);
      process.exit(1);
    }
    seenSlugs.add(slug);

    const imageUrl = normalizeImageUrl(product.image);

    entries.push({
      path: `/product/${slug}`,
      changefreq: "weekly",
      priority: "0.9",
      lastmod: TODAY,
      image: imageUrl,
      imageTitle: `${product.name} — купить в Ташкенте | AlfaComp`,
      imageCaption: `Оригинальный ${product.name} в Ташкенте по выгодной цене с официальной гарантией и быстрой доставкой по Узбекистану в AlfaComp.uz`,
    });
  }

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`,
    ...entries.map((entry) => {
      const parts = [
        `  <url>`,
        `    <loc>${BASE_URL}${entry.path}</loc>`,
        `    <lastmod>${entry.lastmod || TODAY}</lastmod>`,
      ];
      if (entry.changefreq) parts.push(`    <changefreq>${entry.changefreq}</changefreq>`);
      if (entry.priority) parts.push(`    <priority>${entry.priority}</priority>`);
      if (entry.image) {
        parts.push(`    <image:image>`);
        parts.push(`      <image:loc>${escapeXml(entry.image)}</image:loc>`);
        if (entry.imageTitle) {
          parts.push(`      <image:title>${escapeXml(entry.imageTitle)}</image:title>`);
        }
        if (entry.imageCaption) {
          parts.push(`      <image:caption>${escapeXml(entry.imageCaption)}</image:caption>`);
        }
        parts.push(`    </image:image>`);
      }
      parts.push(`  </url>`);
      return parts.join("\n");
    }),
    `</urlset>`,
  ].join("\n");

  const outputPath = resolve("public/sitemap.xml");
  writeFileSync(outputPath, xml, "utf-8");
  const withImagesCount = entries.filter((e) => e.image).length;
  console.log(`[sitemap] sitemap.xml successfully written (${entries.length} URLs, ${withImagesCount} with Google/Yandex images) with base URL ${BASE_URL}`);
}

generate();