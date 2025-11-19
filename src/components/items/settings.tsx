import { onMount, createSignal, Show, For, onCleanup, Setter, Accessor } from "solid-js";
import { createStore } from "solid-js/store";
// import { useToast } from "../toast";
import { Transition } from "solid-transition-group";
import type { SessionData } from "../../types/auth";
import type { EdulinkAPI } from "../../api/main";
import { makePersisted } from "@solid-primitives/storage";
import { FaSolidTrashCan } from 'solid-icons/fa'

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
        Object.keys(import.meta.glob("../../public/assets/css/*/*.css"))
            .map(path => path.match(/\/css\/([^/]+)\//)?.[1])
            .filter((t): t is string => Boolean(t))
    )
);

function Settings(props: {
    setProgress: (value: number) => void;
    sessionData: () => SessionData;
    progress: () => number;
    edulink: EdulinkAPI;
    theme: string;
    setUserThemes: Setter<{ url: string; enabled: boolean; }[]>;
    userThemes: Accessor<{ url: string; enabled: boolean; }[]>;
}) {
    let dropdownRef: HTMLDivElement | undefined;
    const [open, setOpen] = createSignal(false);
    const [styles, setStyles] = createSignal<{ [key: string]: string } | null>(
        null,
    );
    const [currentFont, fontSet] = makePersisted(createSignal<any>({}), {
        storage: localStorage,
        name: "font",
    });
    const [cssMetadata, setCSSMetadata] = createSignal<
        { url: string; metadata: Record<string, string> | null }[]
    >([]);
    // const toast = useToast();
    // const [state, setState] = createStore<{
    // }>({
    // });

    const pageList = ["Appearance", "Plugins", "Notifications", "Advanced"] as const;
    const [state, setState] = createStore<{
        themeSelection: boolean;
        activePage: (typeof pageList)[number];
    }>({
        themeSelection: false,
        activePage: "Appearance",
    });

    async function setFont(font: string, family: string, url?: string) {
        if (globalThis.__TAURI__) {
            const { load } = await import("@tauri-apps/plugin-store");
            const store = await load("config.json", { autoSave: false, defaults: {} });
            const currentFont = (await store.get("font")) as {
                font: string;
                family: string;
                url?: string;
            } | undefined;
            if (currentFont?.font === font) return;
            store.set("font", { font, family, url });
            await store.save();
            if (currentFont?.url) {
                const existingLink = document.querySelector<HTMLLinkElement>(`link[data-user-font="${currentFont.url}"]`);
                existingLink?.remove();
            }

            if (url) {
                const link = document.createElement("link");
                link.rel = "stylesheet";
                link.href = url;
                link.dataset.userFont = url;
                document.head.appendChild(link);
            }

            const root = document.getElementById("ol-container");
            if (root) {
                root.style.setProperty("font-family", family, "important");
            }
        } else {
            const current = currentFont();
            if (current === font) return;
            fontSet({ font, family, url });
            if (current?.url) {
                const existingLink = document.querySelector<HTMLLinkElement>(`link[data-user-font="${current.url}"]`);
                existingLink?.remove();
            }

            if (url) {
                const link = document.createElement("link");
                link.rel = "stylesheet";
                link.href = url;
                link.dataset.userFont = url;
                document.head.appendChild(link);
            }

            const root = document.getElementById("ol-container");
            if (root) {
                root.style.setProperty("font-family", family, "important");
            }
        }
    }

    async function addUserCSS(e: Event & { currentTarget: HTMLFormElement }) {
        e.preventDefault();
        const form = e.currentTarget;
        const url = new FormData(form).get("cssURL") as string;
        if (globalThis.__TAURI__) {

        } else {
            props.setUserThemes((prev) => [...(prev ?? []), { url, enabled: false }]);
            const metadata = await parseCSSMetadata(url);
            setCSSMetadata((prev) => [...prev, { url: url, metadata }]);
        }
    }

    async function toggleUserCSS(url: string, e: InputEvent) {
        e.preventDefault();
        const input = e.currentTarget as HTMLInputElement;
        if (globalThis.__TAURI__) {

        } else {
            props.setUserThemes((themes) =>
                themes.map((theme) =>
                    theme.url === url ? { ...theme, enabled: input.checked } : theme
                )
            );
            const existingLink = document.querySelector<HTMLLinkElement>(`link[data-user-theme="${url}"]`);
            if (input.checked) {
                if (!existingLink) {
                    const link = document.createElement("link");
                    link.rel = "stylesheet";
                    link.href = url;
                    link.dataset.userTheme = url;
                    document.head.appendChild(link);
                }
            } else {
                existingLink?.remove();
            }
        }
    }

    async function removeUserCSS(url: string) {
        if (globalThis.__TAURI__) {

        } else {
            props.setUserThemes((themes) =>
                themes.filter((theme) => theme.url !== url)
            );
            const existingLink = document.querySelector<HTMLLinkElement>(`link[data-user-theme="${url}"]`);
            if (existingLink) {
                existingLink?.remove();
            }
            setCSSMetadata((prev) => prev.filter((item) => item.url !== url));
        }
    }

    onMount(async () => {
        props.setProgress(0.6);
        const cssModule = await import(
            `../../public/assets/css/${props.theme}/settings-new.module.css`
        );
        const normalized: { [key: string]: string } = {
            ...cssModule.default,
            ...cssModule,
        };
        setStyles(normalized);
        props.setProgress(1)
        const themes = props.userThemes?.() ?? [];
        console.log(themes)
        for (const theme of themes) {
            try {
                const metadata = await parseCSSMetadata(theme.url);
                setCSSMetadata((prev) => [...prev, { url: theme.url, metadata }]);
            } catch {
                setCSSMetadata((prev) => [...prev, { url: theme.url, metadata: null }]);
            }
        }
    });

    const items = [
        { font: "Helvetica Neue", family: `"Helvetica Neue", Helvetica, Arial, sans-serif` },
        { font: "Arial", family: "Arial, Helvetica, sans-serif" },
        { font: "Comic Sans", family: `"Comic Sans MS", "Comic Sans", cursive` },
        { font: "Lato", family: `"Lato", sans-serif`, url: "https://fonts.cdnfonts.com/css/lato" },
        { font: "OpenDyslexic", family: `"OpenDyslexic", sans-serif`, url: "https://fonts.cdnfonts.com/css/opendyslexic" },
        { font: "Roboto", family: `"Roboto", sans-serif`, url: "https://fonts.cdnfonts.com/css/roboto" },
    ];

    function getButtonFont() {
        const font = currentFont();
        if (font && Object.keys(font).length > 0) return font;
        return items[0];
    }

    async function parseCSSMetadata(url: string) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        const text = await res.text();
        const match = text.match(/\/\*\*([\s\S]*?)\*\//);
        if (!match) {
            console.log("No metadata block found.");
            return null;
        }

        const block = match[1];
        const metadata: Record<string, string> = {};
        const regex = /^\s*\*\s*@(\w+)\s+(.*)$/gm;

        let line;
        while ((line = regex.exec(block)) !== null) {
            const key = line[1];
            const value = line[2].trim();
            metadata[key] = value;
        }

        return metadata;
    }

    return (
        <Transition
            onEnter={(el, done) => {
                const a = el.animate([{ opacity: 0 }, { opacity: 1 }], {
                    duration: 200,
                    easing: "ease",
                    fill: "forwards",
                    composite: "accumulate",
                });
                a.finished.then(done);
            }}
            onExit={(el, done) => {
                const a = el.animate([{ opacity: 1 }, { opacity: 0 }], {
                    duration: 100,
                    easing: "ease",
                    composite: "accumulate",
                });
                a.finished.then(done);
            }}
        >
            <Show when={props.progress() === 1 && styles()}>
                <div class={styles()!["box-container"]}>
                    <div class="flex items-center justify-end w-full pr-[10px]">
                        <div class="flex space-x-4 mb-1">
                            <For
                                each={pageList}
                            >
                                {(name: (typeof pageList)[number]) => (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (state.activePage === name) return;
                                            setState("activePage", name)
                                        }}
                                        class={`text-sm text-white cursor-pointer ${state.activePage === name
                                            ? "border-b border-blue-400"
                                            : ""
                                            }`}
                                    >
                                        {name}
                                    </button>
                                )}
                            </For>
                        </div>
                    </div>
                    <div class={styles()!["t-container"]}>
                        <div class={styles()!["settings-container"]}>
                            <Show when={state.activePage === "Appearance"}>
                                <div class={`p-4`}>
                                    <h1 class="text-white text-left text-base font-bold">Font</h1>
                                    <button
                                        class="text-center p-2 pl-4 pr-4 mr-4 mt-2 rounded-md border border-gray-600 bg-transparent text-white hover:bg-gray-600 cursor-pointer inline-block"
                                        ref={el => {
                                            if (el) {
                                                const font = getButtonFont().family;
                                                el.style.cssText = `font-family: ${font} !important;`;
                                            }
                                        }}
                                        onClick={() => setOpen(!open())}
                                    >
                                        {getButtonFont().font}
                                        <svg
                                            aria-hidden="true"
                                            viewBox="0 0 20 20"
                                            class="ml-1 h-auto w-[1.5em] inline-block"
                                            fill="currentColor"
                                        >
                                            <path fill="currentColor" fill-rule="evenodd" d="M5.72 7.47a.75.75 0 0 1 1.06 0L10 10.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-3.75 3.75a.75.75 0 0 1-1.06 0L5.72 8.53a.75.75 0 0 1 0-1.06" clip-rule="evenodd"></path>
                                        </svg>
                                    </button>
                                    <Show when={open()}>
                                        <div ref={el => {
                                            dropdownRef = el;

                                            const handleClickOutside = (event: MouseEvent) => {
                                                if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
                                                    setOpen(false);
                                                }
                                            };

                                            document.addEventListener("mousedown", handleClickOutside);
                                            onCleanup(() => {
                                                document.removeEventListener("mousedown", handleClickOutside);
                                            });
                                        }} class="fixed p-2 mt-2 w-40 rounded-md border-gray-600 bg-gray-700 text-white z-50">
                                            <ul class="p-1">
                                                {items.map(({ font, family, url }) => (
                                                    <li>
                                                        <button
                                                            class="w-full text-left p-2 rounded-md text-white hover:bg-gray-600 cursor-pointer"
                                                            ref={el => {
                                                                if (!el) return
                                                                el.style.cssText = `font-family: ${family} !important;`;
                                                                if (url) {
                                                                    const link = document.createElement("link");
                                                                    link.rel = "stylesheet";
                                                                    link.href = url;
                                                                    document.head.appendChild(link);
                                                                    onCleanup(() => document.head.removeChild(link));
                                                                }
                                                            }}
                                                            onClick={() => {
                                                                setFont(font, family, url)
                                                                setOpen(false);
                                                            }}
                                                        >
                                                            {font}
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </Show>
                                    <div class="my-4 w-90"></div>
                                    <h1 class="text-white text-left text-base font-bold">Offical Themes</h1>
                                    <p class="text-gray-300 text-left text-base">Choose an offical built in theme for Openlink.</p>
                                    <For each={themes}>
                                        {(theme) => (
                                            <div onClick={() => setTheme(theme)} class="text-center p-2 pl-4 pr-4 mt-2 mr-4 rounded-md border border-gray-600 bg-transparent text-white hover:bg-gray-600 cursor-pointer inline-block">
                                                {theme}
                                            </div>
                                        )}
                                    </For>
                                    <div class="my-4 w-90"></div>
                                    <h1 class="text-white text-left text-base font-bold">Custom Themes</h1>
                                    <Show when={Boolean(!window.__TAURI__)}>
                                        <button class="text-center p-2 pl-4 pr-4 mr-4 mt-2 rounded-md border border-gray-600 bg-transparent text-white hover:bg-gray-600 cursor-pointer inline-block">
                                            Open Quick CSS file
                                        </button>
                                        <button class="text-center p-2 pl-4 pr-4 mr-4 mt-2 rounded-md border border-gray-600 bg-transparent text-white hover:bg-gray-600 cursor-pointer inline-block">
                                            Open in Themes folder
                                        </button>
                                        <div class="my-4 w-90"></div>
                                    </Show>
                                    <p class="text-gray-300 text-left text-base">Enter a URL below to import an unoffical theme style.</p>
                                    <form
                                        onSubmit={(e) => addUserCSS(e)}
                                    >
                                        <input
                                            class="min-w-[400px] p-2 pl-4 pr-4 mr-4 mt-2 rounded-md border border-gray-600 hover:bg-gray-600 text-white inline-block"
                                            name="cssURL"
                                            placeholder="https://raw.githubusercontent.com/...[.theme.css]"
                                        />
                                        <button
                                            type="submit"
                                            class="text-center p-2 pl-4 pr-4 mr-4 mt-2 rounded-md border border-gray-600 bg-transparent text-white hover:bg-gray-600 cursor-pointer inline-block"
                                        >
                                            Import
                                        </button>
                                    </form>
                                    <Show when={cssMetadata().length > 0}>
                                        <For each={cssMetadata()}>
                                            {(item) => {
                                                const theme = props.userThemes().find((t) => t.url === item.url)!;
                                                const metadata = item.metadata;

                                                return (
                                                    <div class="p-2 pl-4 pr-4 mt-2 mr-4 rounded-md border border-gray-600 bg-transparent text-white hover:bg-gray-600 cursor-pointer inline-block">
                                                        {metadata ? (
                                                            <>
                                                                <div class="flex items-center justify-between w-full">
                                                                    <span>{metadata.name || theme.url}</span>
                                                                    <FaSolidTrashCan class="cursor-pointer text-red-500 -mr-6" size={16} onClick={() => removeUserCSS(theme.url)} />
                                                                    <label class="inline-flex items-center cursor-pointer -mr-1">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={theme.enabled}
                                                                            class="sr-only peer"
                                                                            onInput={(e: InputEvent) => toggleUserCSS(theme.url, e)}
                                                                        />
                                                                        <div class="relative w-9 h-5 bg-gray-500 peer-checked:bg-green-500 rounded-full peer 
                    peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full
                    peer-checked:after:border-buffer after:content-[''] after:absolute after:top-[2px] 
                    after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 
                    after:transition-all peer-checked:bg-brand"></div>
                                                                    </label>

                                                                </div>
                                                                by {metadata.author}
                                                                <br />
                                                                <p>{metadata.description}</p>
                                                            </>
                                                        ) : (
                                                            "Loading…"
                                                        )}
                                                    </div>
                                                );
                                            }}
                                        </For>
                                    </Show>
                                </div>
                            </Show>
                            <Show when={false}>
                                <div class={`p-4`}>
                                    <h1 class="text-white text-left text-base font-bold">Plugin Management</h1>
                                    <p class="text-gray-300 text-left text-base">
                                        Press the cof wheel or info to get more info on a plugin.
                                        <br />
                                        Plugins with a cog wheel have settings you can modify!
                                    </p>
                                    <button
                                        class="text-center p-2 pl-4 pr-4 mr-4 mt-2 rounded-md border border-gray-600 bg-transparent text-white hover:bg-gray-600 cursor-pointer inline-block"
                                        ref={el => {
                                            if (el) {
                                                const font = getButtonFont().family;
                                                el.style.cssText = `font-family: ${font} !important;`;
                                            }
                                        }}
                                        onClick={() => setOpen(!open())}
                                    >
                                        {getButtonFont().font}
                                        <svg
                                            aria-hidden="true"
                                            viewBox="0 0 20 20"
                                            class="ml-1 h-auto w-[1.5em] inline-block"
                                            fill="currentColor"
                                        >
                                            <path fill="currentColor" fill-rule="evenodd" d="M5.72 7.47a.75.75 0 0 1 1.06 0L10 10.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-3.75 3.75a.75.75 0 0 1-1.06 0L5.72 8.53a.75.75 0 0 1 0-1.06" clip-rule="evenodd"></path>
                                        </svg>
                                    </button>
                                    <div class="text-center p-2 pl-4 pr-4 mt-2 mr-4 rounded-md border border-gray-600 bg-transparent text-white hover:bg-gray-600 cursor-pointer inline-block">
                                        Enabled Plugins - 0 Total Plugins - 0
                                    </div>
                                    <Show when={open()}>
                                        <div ref={el => {
                                            dropdownRef = el;

                                            const handleClickOutside = (event: MouseEvent) => {
                                                if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
                                                    setOpen(false);
                                                }
                                            };

                                            document.addEventListener("mousedown", handleClickOutside);
                                            onCleanup(() => {
                                                document.removeEventListener("mousedown", handleClickOutside);
                                            });
                                        }} class="fixed p-2 mt-2 w-40 rounded-md border-gray-600 bg-gray-700 text-white z-50">
                                            <ul class="p-1">
                                                {items.map(({ font, family, url }) => (
                                                    <li>
                                                        <button
                                                            class="w-full text-left p-2 rounded-md text-white hover:bg-gray-600 cursor-pointer"
                                                            ref={el => {
                                                                if (!el) return
                                                                el.style.cssText = `font-family: ${family} !important;`;
                                                                if (url) {
                                                                    const link = document.createElement("link");
                                                                    link.rel = "stylesheet";
                                                                    link.href = url;
                                                                    document.head.appendChild(link);
                                                                    onCleanup(() => document.head.removeChild(link));
                                                                }
                                                            }}
                                                            onClick={() => {
                                                                setFont(font, family, url)
                                                                setOpen(false);
                                                            }}
                                                        >
                                                            {font}
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </Show>
                                    <div class="my-4 w-90"></div>
                                    <h1 class="text-white text-left text-base font-bold">Offical Themes</h1>
                                    <p class="text-gray-300 text-left text-base">Choose an offical built in theme for Openlink.</p>
                                    <For each={themes}>
                                        {(theme) => (
                                            <div onClick={() => setTheme(theme)} class="text-center p-2 pl-4 pr-4 mt-2 mr-4 rounded-md border border-gray-600 bg-transparent text-white hover:bg-gray-600 cursor-pointer inline-block">
                                                {theme}
                                            </div>
                                        )}
                                    </For>
                                    <div class="my-4 w-90"></div>
                                    <h1 class="text-white text-left text-base font-bold">Custom Themes</h1>
                                    <Show when={Boolean(!window.__TAURI__)}>
                                        <button class="text-center p-2 pl-4 pr-4 mr-4 mt-2 rounded-md border border-gray-600 bg-transparent text-white hover:bg-gray-600 cursor-pointer inline-block">
                                            Open Quick CSS file
                                        </button>
                                        <button class="text-center p-2 pl-4 pr-4 mr-4 mt-2 rounded-md border border-gray-600 bg-transparent text-white hover:bg-gray-600 cursor-pointer inline-block">
                                            Open in Themes folder
                                        </button>
                                        <div class="my-4 w-90"></div>
                                    </Show>
                                    <p class="text-gray-300 text-left text-base">Enter a URL below to import an unoffical theme style.</p>
                                    <form
                                        onSubmit={(e) => addUserCSS(e)}
                                    >
                                        <input
                                            class="min-w-[400px] p-2 pl-4 pr-4 mr-4 mt-2 rounded-md border border-gray-600 hover:bg-gray-600 text-white inline-block"
                                            name="cssURL"
                                            placeholder="https://raw.githubusercontent.com/...[.theme.css]"
                                        />
                                        <button
                                            type="submit"
                                            class="text-center p-2 pl-4 pr-4 mr-4 mt-2 rounded-md border border-gray-600 bg-transparent text-white hover:bg-gray-600 cursor-pointer inline-block"
                                        >
                                            Import
                                        </button>
                                    </form>
                                    <Show when={cssMetadata().length > 0}>
                                        <For each={cssMetadata()}>
                                            {(item) => {
                                                const theme = props.userThemes().find((t) => t.url === item.url)!;
                                                const metadata = item.metadata;

                                                return (
                                                    <div class="p-2 pl-4 pr-4 mt-2 mr-4 rounded-md border border-gray-600 bg-transparent text-white hover:bg-gray-600 cursor-pointer inline-block">
                                                        {metadata ? (
                                                            <>
                                                                <div class="flex items-center justify-between w-full">
                                                                    <span>{metadata.name || theme.url}</span>
                                                                    <FaSolidTrashCan class="cursor-pointer text-red-500 -mr-6" size={16} onClick={() => removeUserCSS(theme.url)} />
                                                                    <label class="inline-flex items-center cursor-pointer -mr-1">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={theme.enabled}
                                                                            class="sr-only peer"
                                                                            onInput={(e: InputEvent) => toggleUserCSS(theme.url, e)}
                                                                        />
                                                                        <div class="relative w-9 h-5 bg-gray-500 peer-checked:bg-green-500 rounded-full peer 
                    peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full
                    peer-checked:after:border-buffer after:content-[''] after:absolute after:top-[2px] 
                    after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 
                    after:transition-all peer-checked:bg-brand"></div>
                                                                    </label>

                                                                </div>
                                                                by {metadata.author}
                                                                <br />
                                                                <p>{metadata.description}</p>
                                                            </>
                                                        ) : (
                                                            "Loading…"
                                                        )}
                                                    </div>
                                                );
                                            }}
                                        </For>
                                    </Show>
                                </div>
                            </Show>
                        </div>
                    </div>
                </div>
            </Show>
        </Transition>
    );
}

export default {
    name: "Settings",
    component: Settings,
    pos: 1
};
