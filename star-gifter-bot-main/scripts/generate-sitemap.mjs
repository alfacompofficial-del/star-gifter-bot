import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE_URL = "https://star-gift-anon.lovable.app";

const entries = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/download", changefreq: "monthly", priority: "0.7" },
];

const xml = [
  `<?xml version="1.0" encoding="UTF-8"?>`,
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
  ...entries.map((entry) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${entry.path}</loc>`,
      entry.changefreq ? `    <changefreq>${entry.changefreq}</changefreq>` : null,
      entry.priority ? `    <priority>${entry.priority}</priority>` : null,
      `  </url>`,
    ].filter(Boolean).join("\n"),
  ),
  `</urlset>`,
].join("\n");

writeFileSync(resolve("public/sitemap.xml"), xml);
console.log(`sitemap.xml written (${entries.length} entries)`);