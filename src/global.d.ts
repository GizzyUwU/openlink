import { JSXElement } from 'solid-js';
import type { ToastContextType } from './components/toast';

interface globals {
  __TAURI__?: {
    fs: typeof import("@tauri-apps/plugin-fs");
    path: typeof import("@tauri-apps/api/path");
    dialog: typeof import("@tauri-apps/api/dialog");
    event: typeof import("@tauri-apps/api/event");
    core: typeof import("@tauri-apps/api/core")
  };

  toast: ReturnType<ToastContextType>;
  sessionData: ReturnType<typeof import("./types/auth").SessionData>;
  logger: ReturnType<typeof import("./lib/logger").logger>;
  loadItemPage: (
    id: string,
    name: string,
    forceOpenNav?: boolean
  ) => Promise<void>;
  edulink: ReturnType<typeof import("./api/edulink").useEdulink>;
  setOverlay: (value: JSXElement) => Promise<void>;
}


declare global {
  var __TAURI__: globals["__TAURI__"];
  interface Window extends globals {}
  interface GlobalThis extends globals {}
}

export { };