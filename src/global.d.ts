import type { Tauri } from '@tauri-apps/api/tauri';
import { JSXElement } from 'solid-js';
import type { ToastContextType } from './components/toast';

declare global {
  var __TAURI__: Tauri | undefined;
  interface Window {
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
}

export {};