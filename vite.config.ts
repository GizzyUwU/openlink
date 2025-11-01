import { defineConfig, Plugin } from "vite";
import solid from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";
import checker from "vite-plugin-checker"
const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    solid(),
    checker({ typescript: true }),
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
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes("solid-apexcharts")) return "solid-apexcharts";
            if (id.includes("apexcharts")) return "apexcharts";
            if (id.includes('solid-js')) return 'solid';
            if (id.includes('tailwindcss')) return 'tailwind';
            return 'vendor';
          }
          if (id.includes('src/components/')) return 'components';
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
});
