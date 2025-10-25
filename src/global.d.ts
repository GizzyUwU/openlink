// src/global.d.ts
import type { Tauri } from '@tauri-apps/api/tauri';

declare global {
  var __TAURI__: Tauri | undefined;
}

export {};