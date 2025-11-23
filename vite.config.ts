import { defineConfig, type PluginOption } from "vite";
import solid from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";
import checker from "vite-plugin-checker"
const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss() as PluginOption,
    solid() as PluginOption,
    checker({
      typescript: true, overlay: {
        initialIsOpen: false
      }
    }) as PluginOption
  ],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
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
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    cssCodeSplit: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes("chart.js")) return "chart.js";
            if (id.includes('solid-js')) return 'solid';
            if (id.includes('tailwindcss')) return 'tailwind';
            return 'vendor';
          }
          if (id.includes('src/components/')) return 'components';
        },
      }
    },
    chunkSizeWarningLimit: 700,
  },
});
