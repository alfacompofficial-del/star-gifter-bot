import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";

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
  },
  build: {
    chunkSizeWarningLimit: 1000,
    sourcemap: false, // отключаем sourcemap — экономит ~30-50% памяти при сборке
    minify: false, // Отключаем минификацию, чтобы сборка не падала из-за нехватки оперативной памяти на Render
    cssCodeSplit: true,
    // Разбиваем бандл на чанки — меньше пиковая память при сборке
    rollupOptions: {
      output: {
        manualChunks: {
          // React ядро
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // UI компоненты Radix
          "vendor-radix": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-toast",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-popover",
            "@radix-ui/react-accordion",
          ],
          // Firebase
          "vendor-firebase": ["firebase/app", "firebase/database"],
          // Supabase
          "vendor-supabase": ["@supabase/supabase-js"],
          // Анимации и графики
          "vendor-ui": ["framer-motion", "recharts", "lucide-react"],
          // Формы и утилиты
          "vendor-utils": ["react-hook-form", "@hookform/resolvers", "zod", "date-fns", "clsx", "tailwind-merge"],
          // Query и прочее
          "vendor-query": ["@tanstack/react-query"],
        },
      },
    },
  },
});
