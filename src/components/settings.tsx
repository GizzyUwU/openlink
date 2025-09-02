import { createSignal, JSXElement, Show, Setter } from "solid-js";
import { makePersisted } from "@solid-primitives/storage";
const themeImports = import.meta.glob("../public/assets/css/*/*.css", {
  eager: true,
});

async function setTheme(theme: string) {
  if (window.__TAURI__) {
    const { load } = await import("@tauri-apps/plugin-store");
    const store = await load("users.json", { autoSave: false });
    store.set("theme", theme);
    await store.save();
    window.location.reload();
  } else {
    const [, themeSet] = makePersisted(createSignal<any>({}), {
      storage: localStorage,
      name: "theme",
    });
    themeSet(theme);
    window.location.reload();
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
  styles: { [key: string]: string } | null;
  showSettings: Setter<boolean>;
}) {
  const [themeSelection, triggerSelection] = createSignal<boolean>(false);

  props.setOverlay(
    <div
      class={`${props.styles!["settings"]} rounded-2xl p-6 w-[90%] max-w-lg relative`}
    >
      <button
        type="button"
        onClick={() => {
          props.setOverlay(null);
          props.showSettings(false);
        }}
        class={`${props.styles!["close"]} absolute top-2 right-2`}
      >
        ✕
      </button>
      <h2 class="text-xl text-center mb-4">Settings</h2>

      <div class={`${props.styles!["theme-selector"]} text-center`}>
        <button
          type="button"
          onClick={() => triggerSelection((prev) => !prev)}
          class={`${props.styles!["theme-button"]}`}
        >
          Available Themes<i class={props.styles!["dropdown-arrow"]}></i>
        </button>
        <Show when={themeSelection()}>
          <ul class={props.styles!["dropdown-menu"]}>
            {themes.map((theme) => (
              <li class={props.styles!["item"]} onClick={() => setTheme(theme)}>
                {theme}
              </li>
            ))}
          </ul>
        </Show>
      </div>
    </div>,
  );

  return <></>;
}
