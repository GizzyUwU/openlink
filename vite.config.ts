import { defineConfig, Plugin } from "vite";
import solid from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";
import checker from "vite-plugin-checker"
const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [tailwindcss(), solid(), checker({ typescript: true /** or an object config */ })],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  setupFiles: [
    './src/setup.ts'
  ],
  optimizeDeps: {
    include: ["@tauri-apps/api"],
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
        protocol: "ws",
        host,
        port: 1421,
      }
      : undefined,
  },
  build: {
    target: "esnext",
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          apexcharts: ["apexcharts"],
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
}));
