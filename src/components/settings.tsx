import { createSignal, JSXElement } from "solid-js";
import { makePersisted } from "@solid-primitives/storage";
const themeImports = import.meta.glob("../public/assets/css/*/*.css", { eager: true });

async function setTheme(theme: string) {
  if (window.__TAURI__) {
    const { load } = await import("@tauri-apps/plugin-store");
    const store = await load("users.json", { autoSave: false });
    console.log(theme);
    store.set("theme", theme);
    await store.save();
    window.location.reload();
  } else {
    const [, themeSet] = makePersisted(createSignal<any>({}), {
      storage: localStorage,
      name: "theme",
    });
    themeSet(theme);
  }
}

const themes = Array.from(
  new Set(
    Object.keys(themeImports)
      .map((path) => {
        const match = path.match(/\/css\/([^/]+)\//);
        return match ? match[1] : undefined;
      })
      .filter((t): t is string => !!t),
  ),
);

export default function Settings(props: {
  progress: () => number;
  sessionData: any;
  setSession: any;
  setApiUrl: any;
  setOverlay: (value: JSXElement) => void;
}) {
  props.setOverlay(
    <div class="bg-white rounded-2xl p-6 w-[90%] max-w-lg relative">
      <button
        type="button"
        onClick={() => props.setOverlay(null)}
        class="absolute top-2 right-2 text-gray-500 hover:text-black"
      >
        ✕
      </button>
      <h2 class="text-xl text-center mb-4">Settings</h2>

      <div class="space-y-2">
        <h3 class="text-lg font-semibold">Available Themes</h3>
        <ul class="list-disc pl-6">
          {themes.map((theme) => (
            <li onClick={() => setTheme(theme ?? "default")}>
              {theme?.charAt(0).toUpperCase() + theme?.slice(1)}
            </li>
          ))}
        </ul>
      </div>
    </div>,
  );

  return <></>;
}
