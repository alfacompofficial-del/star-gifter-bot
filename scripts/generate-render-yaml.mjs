import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const MAP = {
  "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "yo", "ж": "zh",
  "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o",
  "п": "p", "р": "r", "с": "s", "т": "t", "у": "u", "ф": "f", "х": "kh", "ц": "ts",
  "ч": "ch", "ш": "sh", "щ": "shch", "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya"
};

function slugify(t) {
  if (!t) return "";
  return t.toLowerCase().split("").map(c => MAP[c] ?? c).join("")
    .replace(/['''<>{}|`^\[\]]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

const CATEGORIES = [
  "monitors", "ups", "components", "all-in-one", "accessories",
  "speakers", "mounts", "deco", "wifi-routers", "mice",
  "videocards", "computers"
];

async function generate() {
  const u = process.env.VITE_SUPABASE_URL || "https://vtlzfcjxpnrsqlsrvyer.supabase.co";
  const k = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_Ieiof0ojLifGDUpgD6ldVA_utmqM2nZ";
  
  console.log("[render-yaml] Fetching products...");
  const r = await fetch(u + "/rest/v1/products?select=id,name&order=id.asc", {
    headers: { apikey: k, Authorization: "Bearer " + k }
  });
  if (!r.ok) throw new Error("HTTP " + r.status);
  const products = await r.json();
  console.log("[render-yaml] Got " + products.length + " products");

  const routes = [];

  // Category redirects
  for (const cat of CATEGORIES) {
    routes.push(`      - type: redirect\n        source: /category/${cat}\n        destination: /category/${cat}/\n        statusCode: 301`);
  }

  // Product redirects: /product/:slug (no slash) -> /product/:slug/ (with slash 301)
  for (const p of products) {
    if (!p.id || !p.name) continue;
    const s = slugify(p.name) + "-" + p.id;
    routes.push(`      - type: redirect\n        source: /product/${s}\n        destination: /product/${s}/\n        statusCode: 301`);
    // Also support pure ID redirect /product/:id -> /product/:slug/
    routes.push(`      - type: redirect\n        source: /product/${p.id}\n        destination: /product/${s}/\n        statusCode: 301`);
  }

  // SPA fallback rewrite
  routes.push(`      # SPA fallback — must come LAST\n      - type: rewrite\n        source: /*\n        destination: /index.html`);

  const yaml = `services:
  - type: static
    name: alfacomp-store
    buildCommand: npm ci --no-audit && NODE_OPTIONS="--max-old-space-size=4096" npm run build
    staticPublishPath: dist
    envVars:
      - key: NODE_ENV
        value: production
      - key: VITE_SUPABASE_URL
        sync: false
      - key: VITE_SUPABASE_PUBLISHABLE_KEY
        sync: false
      - key: VITE_SUPABASE_PROJECT_ID
        sync: false
      - key: VITE_GEMINI_API_KEY
        sync: false
      - key: VITE_GEMINI_MODEL
        sync: false
      - key: BOT_TOKEN
        sync: false
    routes:
${routes.join("\n")}
`;

  writeFileSync(resolve(ROOT, "render.yaml"), yaml, "utf-8");
  console.log("[render-yaml] Successfully wrote " + routes.length + " routes to render.yaml");
}

generate().catch(err => {
  console.error("[render-yaml] Error:", err.message);
  process.exit(1);
});
