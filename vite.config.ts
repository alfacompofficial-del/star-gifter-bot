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
    dedupe: ["react", "react-dom"],
  },
  build: {
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
    minify: "esbuild",
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return;

          // Только библиотеки БЕЗ зависимости от React — безопасно изолировать
          if (id.includes("three")) {
            return "vendor-three";
          }
          if (id.includes("firebase") || id.includes("@firebase")) {
            return "vendor-firebase";
          }
          if (id.includes("@supabase")) {
            return "vendor-supabase";
          }

          // ВСЕ React-зависимые библиотеки (recharts, framer-motion, radix, router,
          // lucide, react-hook-form и т.д.) — НЕ разделяем вручную.
          // Rollup сам расставит их в правильном порядке без circular TDZ ошибок.
        },
      },
    },
  },
});
