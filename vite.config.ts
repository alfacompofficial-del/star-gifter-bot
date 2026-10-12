import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Гарантирует, что в бандле будет одна копия React
    dedupe: ["react", "react-dom"],
  },
  build: {
    chunkSizeWarningLimit: 800,
    sourcemap: false,
    minify: "esbuild",
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return;

          // Только библиотеки, которые НЕ зависят от React
          if (id.includes("/node_modules/three/")) {
            return "vendor-three";
          }
          if (id.includes("/node_modules/firebase/") || id.includes("/node_modules/@firebase/")) {
            return "vendor-firebase";
          }
          if (id.includes("/node_modules/@supabase/")) {
            return "vendor-supabase";
          }

          // Всё остальное (React, router, radix, motion, recharts, icons и т.д.)
          // оставляем Vite/Rollup: он сам расставит зависимости без циклов
        },
      },
    },
  },
});
это vite.config.ts
