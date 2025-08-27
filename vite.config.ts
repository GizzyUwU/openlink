import { defineConfig, Plugin } from "vite";
import solid from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";
// req.method.eq:"POST" AND req.host.cont:"edulinkone"
const host = process.env.TAURI_DEV_HOST;

const noCssDevInjection: Plugin = {
  name: "no-css-dev-injection",
  enforce: "pre",
  resolveId(id) {
    if (id.endsWith(".css")) {
      return id; // treat CSS imports as normal files, don't transform
    }
    return null;
  },
  load(id) {
    if (id.endsWith(".css")) {
      return ""; // return empty content so Vite won't inject
    }
    return null;
  },
};

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [tailwindcss(), solid()],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  optimizeDeps: {
    include: ["@tauri-apps/api"],
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
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
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
