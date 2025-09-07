import { createSignal, JSXElement, Show, Setter, onMount } from "solid-js";
import { makePersisted } from "@solid-primitives/storage";
const themeImports = import.meta.glob("../public/assets/css/*/*.css", {
  eager: true,
});

async function setTheme(theme: string) {
  if (window.__TAURI__) {
    const { load } = await import("@tauri-apps/plugin-store");
    const store = await load("users.json", { autoSave: false, defaults: {} });
    const currentTheme = await store.get("theme");
    if (currentTheme === theme) return;
    store.set("theme", theme);
    await store.save();
    window.location.reload();
  } else {
    const [currentTheme, themeSet] = makePersisted(createSignal<any>({}), {
      storage: localStorage,
      name: "theme",
    });
    if (currentTheme() === theme) return;
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

const updateToLatest = async () => {
  const { check } = await import("@tauri-apps/plugin-updater");
  const { relaunch } = await import("@tauri-apps/plugin-process");
  const update = await check();
  if (update) {
    let downloaded = 0;
    let contentLength = 0;
    await update.downloadAndInstall((event) => {
      switch (event.event) {
        case "Started":
          contentLength = event.data.contentLength ?? 0;
          console.log(
            `[INFO] Update started downloading - file size: ${event.data.contentLength} bytes`,
          );
          break;
        case "Progress":
          downloaded += event.data.chunkLength;
          console.log(`[INFO] Downloaded ${downloaded}/${contentLength} bytes`);
          break;
        case "Finished":
          console.log("[INFO] Finished downloading update");
          break;
      }
    });

    console.log("[INFO] Installed update succesfully relaunching app");
    await relaunch();
  }
};

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
  const [update, setUpdate] = createSignal<{ version?: string | number }>({});
  onMount(async () => {
    if (window.__TAURI__) {
      const { check } = await import("@tauri-apps/plugin-updater");
      // const { relaunch } = await import("@tauri-apps/plugin-process");
      const update = await check();
      if (update) {
        setUpdate({ version: update.version });
        console.log(
          `[INFO] Update available! ${update.version} from ${update.date}`,
        );
      } else {
        setUpdate({ version: "1.0.0" });
      }
    }
  });

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
      <h2 class="text-xl text-center">Settings</h2>
      <h2 class="text-[16px] text-center mb-4">
        {update().version
          ? `Version ${update().version} available.`
          : "Latest Version"}
      </h2>
      <Show when={update().version}>
        <button
          type="button"
          onClick={() => updateToLatest()}
          class={`${props.styles!["update-button"]} mb-4`}
        >
          Update to Latest
        </button>
      </Show>
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
