import { createSignal, JSXElement, Show, createRoot, Setter, onMount } from "solid-js";
import { createStore } from "solid-js/store";
import { makePersisted } from "@solid-primitives/storage";
import {
  isPermissionGranted,
  requestPermission,
} from '@tauri-apps/plugin-notification';

async function setTheme(theme: string) {
  if (globalThis.__TAURI__) {
    const { load } = await import("@tauri-apps/plugin-store");
    const store = await load("config.json", { autoSave: false, defaults: {} });
    const currentTheme = await store.get("theme");
    if (currentTheme === theme) return;
    store.set("theme", theme);
    await store.save();
    globalThis.location.reload();
  } else {
    const [currentTheme, themeSet] = makePersisted(createSignal<any>({}), {
      storage: localStorage,
      name: "theme",
    });
    if (currentTheme() === theme) return;
    themeSet(theme);
    globalThis.location.reload();
  }
}

const themes = Array.from(
  new Set(
    Object.keys(import.meta.glob("../public/assets/css/*/*.css"))
      .map(path => path.match(/\/css\/([^/]+)\//)?.[1])
      .filter((t): t is string => Boolean(t))
  )
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

export default function Settings(props: Readonly<{
  progress: () => number;
  sessionData: any;
  setOverlay: (value: JSXElement) => void;
  showSettings: Setter<boolean>;
  theme: string;
}>) {
  const [state, setState] = createStore<{
    themeSelection: boolean;
    update: { version: string } | null;
    notificationPermission: boolean | null;
  }>({
    themeSelection: false,
    update: null,
    notificationPermission: false
  })
  const [styles, setStyles] = createSignal<{ [key: string]: string } | null>(
    null,
  );

  onMount(async () => {
    const cssModule = await import(
      `../public/assets/css/${props.theme}/settings.module.css`
    );
    console.log(props.theme)
    setStyles({ ...cssModule.default, ...cssModule });
    console.log(styles())
    if (globalThis.__TAURI__) {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();
      const { load } = await import("@tauri-apps/plugin-store");
      const store = await load("config.json", { autoSave: false, defaults: {} });
      const configNotifications = await store.get("notifications");
      const permissionGranted = await isPermissionGranted();
      setState("notificationPermission", Boolean(permissionGranted && configNotifications));
      if (update) {
        setState("update", { version: update.version });
        console.log(
          `[INFO] Update available! ${update.currentVersion} to ${update.version} from ${update.date}`,
        );
      } else {
        setState("update", { version: "latest" });
      }
    }
    createRoot(() => {
      props.setOverlay(
        <div
          class={`${styles()!["settings"]} rounded-2xl p-6 w-[90%] max-w-lg relative`}
        >
          <button
            type="button"
            onClick={() => {
              props.setOverlay(null);
              props.showSettings(false);
            }}
            class={`${styles()!["close"]} absolute top-2 right-2 cursor-pointer`}
          >
            ✕
          </button>
          <h2 class="text-xl text-center">Settings</h2>
          {(() => {
            if (globalThis.__TAURI__) {
              let updateText: string;

              if (state.update === null) {
                updateText = "Checking for updates...";
              } else if (state.update?.version === "latest") {
                updateText = "Latest Version";
              } else {
                updateText = `Version ${state.update?.version} available.`;
              }

              return <h2 class="text-[16px] text-center mb-4">{updateText}</h2>;
            } else {
              return <h2 class="mb-2">&nbsp;</h2>;
            }
          })()}
          <Show when={state.update !== null && state.update?.version !== "latest"}>
            <button
              type="button"
              onClick={() => updateToLatest()}
              class={`${styles()!["update-button"]} mb-4`}
            >
              Update to Latest
            </button>
          </Show>
          <Show when={globalThis.__TAURI__}>
            <button
              type="button"
              onClick={async () => {
                const { load } = await import("@tauri-apps/plugin-store");
                const store = await load("config.json", { autoSave: false, defaults: {} });
                console.log(store)
                if (state.notificationPermission === false) {
                  const permission = await requestPermission();
                  setState("notificationPermission", permission === "granted")
                  store.set("notifications", true);
                  await store.save();
                  globalThis.location.reload();
                } else {
                  store.set("notifications", false);
                  await store.save();
                  globalThis.location.reload();
                }
              }}
              class={`${styles()!["update-button"]} mb-4`}
            >
              {state.notificationPermission === false ? "Allow Notifications?" : "Deny Notification?"}
            </button>
          </Show>
          <div class={`${styles()!["theme-selector"]} text-center`}>
            <button
              type="button"
              onClick={() => setState("themeSelection", ((prev) => !prev))}
              class={`${styles()!["theme-button"]}`}
            >
              Available Themes<i class={styles()!["dropdown-arrow"]}></i>
            </button>
            <Show when={state.themeSelection}>
              <ul class={styles()!["dropdown-menu"]}>
                {themes.map((theme) => (
                  <li onClick={() => setTheme(theme)} class={styles()!["item"]}>
                    <button
                      type="button"
                      class={styles()!["button"] + " cursor-pointer"}
                    >
                      {theme}
                    </button>
                  </li>
                ))}
              </ul>
            </Show>
          </div>
        </div>
      );
    })
  });

  return <></>;
}
