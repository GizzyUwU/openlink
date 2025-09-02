import type { Component } from "solid-js";

const modules = import.meta.glob("../components/items/*.{tsx,jsx,ts,js}", {
  eager: true,
});

export interface Item {
  id: string;
  name: string;
  icon: Component;
  class: string;
  pos: number;
}

export const items: Item[] = Object.entries(modules)
  .map(([path, mod]: [string, any]) => {
    const def = mod.default;

    if (!def || !def.name || !def.icon || typeof def.pos !== "number")
      return null;

    return {
      id: path
        .split("/")
        .pop()!
        .replace(/\.[tj]sx?$/, ""),
      name: def.name,
      icon: def.icon,
      class: `openlink_${def.name.toLowerCase().replace(/\s+/g, "")}`,
      pos: def.pos,
    };
  })
  .filter((item): item is Item => item !== null)
  .sort((a, b) => a.pos - b.pos);
