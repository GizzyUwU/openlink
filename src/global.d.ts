import type { Tauri } from '@tauri-apps/api/tauri';
import { JSXElement } from 'solid-js';

declare global {
  var __TAURI__: Tauri | undefined;
  interface Window {
    toast: ReturnType<typeof import("../components/toast").useToast>;
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
}

export {};