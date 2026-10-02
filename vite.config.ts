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
  },
  build: {
    chunkSizeWarningLimit: 800,
    sourcemap: false,
    minify: "esbuild",
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("recharts")) {
              return "vendor-recharts";
            }
            if (id.includes("framer-motion")) {
              return "vendor-motion";
            }
            if (id.includes("lucide-react")) {
              return "vendor-icons";
            }
            if (id.includes("@radix-ui")) {
              return "vendor-radix";
            }
            if (id.includes("@supabase")) {
              return "vendor-supabase";
            }
            if (id.includes("firebase")) {
              return "vendor-firebase";
            }
            if (id.includes("react-router-dom") || id.includes("react-dom") || id.includes("react")) {
              return "vendor-react";
            }
            if (id.includes("@tanstack")) {
              return "vendor-query";
            }
            return "vendor";
          }
        },
      },
    },
  },
});
