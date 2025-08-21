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

export const items: Item[] = Object.values(modules)
  .map((mod: any) => {
    const def = mod.default;
    const iconComponent: Component =
      typeof def.icon === "function" ? def.icon : () => def.icon;

    return {
      id: def.name.toLowerCase().replace(/\s+/g, ""),
      name: def.name,
      icon: iconComponent,
      class: `_${def.name.toLowerCase().replace(/\s+/g, "")}`,
      component: def.component,
      pos: def.pos,
    };
  })
  .sort((a, b) => a.pos - b.pos);
