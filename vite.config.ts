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
    // Одна копия React в бандле
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

          // Cross-platform: использую includes без слешей (работает на Win и Linux)
          if (id.includes("three")) {
            return "vendor-three";
          }
          if (id.includes("firebase") || id.includes("@firebase")) {
            return "vendor-firebase";
          }
          if (id.includes("@supabase")) {
            return "vendor-supabase";
          }
          if (id.includes("framer-motion")) {
            return "vendor-motion";
          }
          if (
            id.includes("react-router-dom") ||
            id.includes("react-router") ||
            id.includes("@remix-run")
          ) {
            return "vendor-router";
          }
          if (id.includes("recharts") || id.includes("d3-")) {
            return "vendor-charts";
          }
          if (id.includes("@radix-ui")) {
            return "vendor-radix";
          }
          if (id.includes("lucide-react")) {
            return "vendor-icons";
          }
          if (id.includes("react") || id.includes("react-dom")) {
            return "vendor-react";
          }
        },
      },
    },
  },
});
