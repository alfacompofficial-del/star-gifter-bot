import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE_URL = "https://alfacomp.uz";
const TODAY = new Date().toISOString().split("T")[0];

const STATIC_ROUTES = [
  { path: "/", changefreq: "daily", priority: "1.0" },
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
  { path: "/category/computers", changefreq: "daily", priority: "0.8" },
  // Informational & Content Pages
  { path: "/about", changefreq: "monthly", priority: "0.6" },
  { path: "/delivery", changefreq: "monthly", priority: "0.6" },
  { path: "/warranty", changefreq: "monthly", priority: "0.6" },
  { path: "/contacts", changefreq: "monthly", priority: "0.7" },
  { path: "/guides", changefreq: "weekly", priority: "0.7" },
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

async function fetchProducts() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://kpuqkdodgcspopidfuat.supabase.co";
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwdXFrZG9kZ2NzcG9waWRmdWF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MjQwMjgsImV4cCI6MjA5MzMwMDAyOH0.OIbSk3jz3uUG6OtQplx1gQK5vaVJ3qq2_sujqUAIeBI";

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/products?select=id,name,category,created_at`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });

    if (!res.ok) {
      console.warn(`[sitemap] Supabase returned status ${res.status}`);
      return [];
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn(`[sitemap] Error fetching products:`, err.message);
    return [];
  }
}

async function generate() {
  const products = await fetchProducts();
  console.log(`[sitemap] Fetched ${products.length} products for sitemap`);

  const entries = [...STATIC_ROUTES];

  // Add all products with their clean SEO URL: /product/{slug}
  for (const product of products) {
    if (!product.id || !product.name) continue;
    const slug = getProductSlug(product.id, product.name);
    entries.push({
      path: `/product/${slug}`,
      changefreq: "weekly",
      priority: "0.9",
      lastmod: product.updated_at ? product.updated_at.split("T")[0] : TODAY,
    });
  }

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...entries.map((entry) =>
      [
        `  <url>`,
        `    <loc>${BASE_URL}${entry.path}</loc>`,
        `    <lastmod>${entry.lastmod || TODAY}</lastmod>`,
        entry.changefreq ? `    <changefreq>${entry.changefreq}</changefreq>` : null,
        entry.priority ? `    <priority>${entry.priority}</priority>` : null,
        `  </url>`,
      ].filter(Boolean).join("\n")
    ),
    `</urlset>`,
  ].join("\n");

  writeFileSync(resolve("public/sitemap.xml"), xml, "utf-8");
  console.log(`sitemap.xml successfully written (${entries.length} entries) with base URL ${BASE_URL}`);
}

generate();