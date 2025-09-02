import type { Component } from "solid-js";

const modules = import.meta.glob("../components/items/*.{tsx,jsx,ts,js}", {
  eager: true,
});

export interface Item {
  id: string;
  name: string;
  icon: Component;
  class: string;
  component: Component;
  pos: number;
}

export const items: Item[] = Object.entries(modules)
  .map(([path, mod]: [string, any]) => {
    const def = mod.default;
    const fileName = path
      .split("/")
      .pop()!
      .replace(/\.[tj]sx?$/, "");

    if (!def || !def.icon || !def.component || typeof def.pos !== "number") {
      return null;
    }

    const iconComponent: Component =
      typeof def.icon === "function" ? def.icon : () => def.icon;
    console.log(fileName, path);
    return {
      id: fileName,
      name: def.name,
      icon: iconComponent,
      class: `openlink_${fileName.toLowerCase().replace(/\s+/g, "")}`,
      component: def.component,
      pos: def.pos,
    };
  })
  .filter((item): item is Item => item !== null)
  .sort((a, b) => a.pos - b.pos);
