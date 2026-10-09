import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const distIndex = resolve("dist/index.html");
const dist404 = resolve("dist/404.html");

if (existsSync(distIndex)) {
  copyFileSync(distIndex, dist404);
  console.log("[postbuild] Copied dist/index.html -> dist/404.html for SPA fallback.");
} else {
  console.warn("[postbuild] dist/index.html not found, skipping 404.html generation.");
}
