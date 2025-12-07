import { onMount, createSignal, Show, For, onCleanup, Setter, Accessor } from "solid-js";
import { createStore } from "solid-js/store";
import { Transition } from "solid-transition-group";
import type { SessionData } from "../../types/auth";
import type { EdulinkAPI } from "../../api/main";
import { makePersisted } from "@solid-primitives/storage";
import { FaSolidTrashCan } from 'solid-icons/fa'
import { logger } from "../../lib/logger";
import { parse } from "acorn";

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
    setPlugins: Setter<{ url?: string; fileName?: string; enabled: boolean; }[]>;
    plugins: Accessor<{ url?: string; fileName?: string; enabled: boolean; }[]>;
    setNotificationPermission: Setter<{
        in_app: boolean; desktop: boolean, type: "Immediately even when window/tab is focused" |
        "As soon as window/tab is unfocused" |
        "No Mouse/Keyboard input or unfocused for 1 minute" |
        "No Mouse/Keyboard input or unfocused for 2 minutes" |
        "No Mouse/Keyboard input or unfocused for 5 minutes" |
        "No Mouse/Keyboard input or unfocused for 10 minutes" |
        "No Mouse/Keyboard input or unfocused for 15 minutes" |
        "No Mouse/Keyboard input or unfocused for 20 minutes" |
        "No Mouse/Keyboard input or unfocused for 25 minutes" |
        "No Mouse/Keyboard input or unfocused for 30 minutes",
        allowlist: { id: string; enabled: boolean }[];
    }>;
    notificationPermission: Accessor<{
        in_app: boolean; desktop: boolean, type: "Immediately even when window/tab is focused" |
        "As soon as window/tab is unfocused" |
        "No Mouse/Keyboard input or unfocused for 1 minute" |
        "No Mouse/Keyboard input or unfocused for 2 minutes" |
        "No Mouse/Keyboard input or unfocused for 5 minutes" |
        "No Mouse/Keyboard input or unfocused for 10 minutes" |
        "No Mouse/Keyboard input or unfocused for 15 minutes" |
        "No Mouse/Keyboard input or unfocused for 20 minutes" |
        "No Mouse/Keyboard input or unfocused for 25 minutes" |
        "No Mouse/Keyboard input or unfocused for 30 minutes",
        allowlist: { id: string; enabled: boolean }[];
    }>;
}) {
    const [styles, setStyles] = createSignal<{ [key: string]: string } | null>(
        null,
    );
    const [currentFont, fontSet] = makePersisted(createSignal<any>({}), {
        storage: localStorage,
        name: "font",
    });
    const [cssMetadata, setCSSMetadata] = createSignal<
        { url: string; metadata: Record<string, string | boolean> | null }[]
    >([]);
    const [jsMetadata, setJSMetadata] = createSignal<
        { url?: string; fileName?: string; metadata: Record<string, string | boolean> | null }[]
    >([]);

    const pageList = ["Appearance", "Plugins", "Notifications", "Advanced", "Credits"] as const;
    const [state, setState] = createStore<{
        themeSelection: boolean;
        activePage: (typeof pageList)[number];
        deskNotifications: boolean;
        inAppNotifications: boolean;
    }>({
        themeSelection: false,
        activePage: "Notifications",
        deskNotifications: false,
        inAppNotifications: false
    });

    async function toggleDesktopNotifications() {
        if (globalThis.__TAURI__) {
            const [{ load }, { isPermissionGranted, requestPermission }] = await Promise.all([
                import("@tauri-apps/plugin-store"),
                import("@tauri-apps/plugin-notification")
            ]);
            const store = await load("config.json", { autoSave: false, defaults: {} });
            const configNotifications = await store.get("deskNotifications");
            const permissionGranted = await isPermissionGranted();
            if (Boolean(configNotifications) && Boolean(permissionGranted)) {
                setState("deskNotifications", false)
                store.set("deskNotifications", false);
                store.save();
                return;
            }
            const permission = await requestPermission();
            setState("deskNotifications", permission === "granted")
            store.set("deskNotifications", permission === "granted");
            store.save();
            globalThis.location.reload();
        } else {
            if (!('Notification' in window)) {
                (window as Window).logger.error({ msg: 'This browser does not support notifications.', toast: true });
                return false;
            }

            if (Notification.permission === "granted" && state.deskNotifications === true) {
                setState("deskNotifications", false)
                props.setNotificationPermission(prev => ({
                    ...prev,
                    desktop: false,
                }));
                globalThis.location.reload();
                return;
            }

            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    setState("deskNotifications", true)
                    props.setNotificationPermission(prev => ({
                        ...prev,
                        desktop: true,
                    }));
                    globalThis.location.reload();
                    return;
                } else {
                    (window as Window).logger.warn({ msg: 'Desktop Notifications wasn\'t granted by user/browser.', toast: true });
                    return false;
                }
            });
        }
    }

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
        const urlField = document.getElementById("cssUrl") as HTMLInputElement;
        if (globalThis.__TAURI__) {

        } else {
            props.setUserThemes((prev) => [...(prev ?? []), { url, enabled: false }]);
            const metadata = await parseCSSMetadata(url);
            if (metadata === null) return;
            setCSSMetadata((prev) => [...prev, { url: url, metadata }]);
            urlField!.value = "";
        }
    }

    async function addPluginJS(e: Event & { currentTarget: HTMLFormElement }) {
        e.preventDefault();
        const form = e.currentTarget;
        const url = new FormData(form).get("jsURL") as string;
        const urlField = document.getElementById("jsUrl") as HTMLInputElement;
        if (window.__TAURI__) {
            try {
                fetch(url).then(async (res) => {
                    const { writeTextFile, exists, BaseDirectory } = window.__TAURI__!.fs;
                    const data = await res.text();
                    const metadata = await parseJSMetadata(undefined, data);
                    if (metadata === null) return;
                    const jsonMetadata = metadata ? JSON.parse(JSON.stringify(metadata)) : null;
                    const name = jsonMetadata.name.toLowerCase()
                    const dirExists = await exists('plugins', {
                        baseDir: BaseDirectory.AppData
                    })

                    if (dirExists) {
                        const { readDir } = await import("@tauri-apps/plugin-fs")
                        const files = await readDir('plugins', { baseDir: BaseDirectory.AppData });
                        const matchedFile = files.find(f => f.name.startsWith(name + '.plugin.'));
                        if (matchedFile) return logger.warn("Plugin will not be added because a plugin with same name is already installed.");

                        await writeTextFile("plugins/" + name + ".plugin.enabled.js", data, {
                            baseDir: BaseDirectory.AppData
                        })
                    } else {
                        const { mkdir } = window.__TAURI__!.fs;
                        await mkdir("plugins", {
                            baseDir: BaseDirectory.AppData
                        })

                        await writeTextFile("plugins/" + name + ".plugin.enabled.js", data, {
                            baseDir: BaseDirectory.AppData
                        })
                    }

                    setJSMetadata((prev) => [...prev, { fileName: name, metadata: jsonMetadata, enabled: true }]);
                    urlField!.value = "";
                })
            } catch (err) {
                logger.error((err as Error).stack ?? (err as Error).message);
            }
        } else {
            props.setPlugins((prev) => [...(prev ?? []), { url, enabled: false }]);
            const metadata = await parseJSMetadata(url);
            if (metadata === null) return;
            const jsonMetadata = metadata ? JSON.parse(JSON.stringify(metadata)) : null;
            setJSMetadata((prev) => [...prev, { url, metadata: jsonMetadata, enabled: true }]);
            urlField!.value = "";
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

    async function togglePlugin(url: string | undefined, fileName: string | undefined, e: InputEvent) {
        e.preventDefault();
        const input = e.currentTarget as HTMLInputElement;
        if (window.__TAURI__) {
            if (!fileName) return;
            try {
                const name = fileName.toLowerCase()
                const { readDir } = await import("@tauri-apps/plugin-fs")
                const { readTextFile, BaseDirectory, rename } = window.__TAURI__!.fs;
                const files = await readDir("plugins", { baseDir: BaseDirectory.AppData });
                const pluginFile = files.find((f) =>
                    f.name?.startsWith(name) && f.name.endsWith('.plugin.enabled.js') ||
                    f.name?.endsWith('.plugin.disabled.js')
                );
                if (!pluginFile || !pluginFile.name) return;
                const trimmedFileName = pluginFile.name
                    .replace(/\.plugin\.(enabled|disabled)\.js$/, "");
                const isEnabled = pluginFile.name.endsWith('.plugin.enabled.js');

                const newName = !isEnabled
                    ? `${name}.plugin.enabled.js`
                    : `${name}.plugin.disabled.js`;
                await rename(`plugins/${pluginFile.name}`, `plugins/${newName}`, {
                    oldPathBaseDir: BaseDirectory.AppData,
                    newPathBaseDir: BaseDirectory.AppData,
                });

                props.setPlugins((plugins) =>
                    plugins.map((plugin) =>
                        plugin.fileName === trimmedFileName ? { ...plugin, enabled: !isEnabled ? true : false } : plugin
                    )
                );

                if (!isEnabled) {
                    const fileContents = await readTextFile(`plugins/${newName}`, {
                        baseDir: BaseDirectory.AppData,
                    });

                    const wrapped = fileContents.replace(/^export\s+default/, "exports.default =");
                    const pluginModule: any = {};
                    new Function("exports", wrapped)(pluginModule);
                    if (pluginModule?.default?.execute) {
                        try {
                            await pluginModule.default.execute();
                        } catch (err) {
                            logger.error(`Plugin execution failed: ${newName}`);
                            logger.error(err instanceof Error ? err.message : String(err));
                        }
                    }
                } else return window.location.reload();
            } catch (err) {
                if (err instanceof Error) {
                    console.error("togglePlugin error:", err.message);
                    console.error(err.stack ?? "No stack available");
                } else if (typeof err === "string") {
                    console.error("togglePlugin error:", err);
                } else {
                    console.error("togglePlugin error (object):", JSON.stringify(err, null, 2));
                }
            }
        } else {
            if (!url) return;
            console.log("beep")
            props.setPlugins((plugins) =>
                plugins.map((plugin) =>
                    plugin.url === url ? { ...plugin, enabled: input.checked } : plugin
                )
            );
            const existingLink = document.querySelector<HTMLLinkElement>(`link[data-plugin-url="${url}"]`);
            if (input.checked) {
                const module = await import(/* @vite-ignore */ url);
                if (!module) return;
                if (module.default?.execute) {
                    try {
                        await module.default.execute();
                    } catch (err) {
                        logger.error(`Plugin execution failed: ${url}`);
                        logger.error(
                            err instanceof Error ? err.message : String(err)
                        );

                        window.toast?.showToast(
                            "Plugin Error",
                            `Plugin threw an exception: ${url}`,
                            "error"
                        );
                    }
                } else {
                    logger.info(`No default export with execute() found in: ${url}`);
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


    async function removePluginJS(url: string) {
        if (globalThis.__TAURI__) {

        } else {
            props.setPlugins((plugins) =>
                plugins.filter((plugin) => plugin.url !== url)
            );
            const existingScript = document.querySelector<HTMLLinkElement>(`script[data-plugin-js="${url}"]`);
            if (existingScript) {
                existingScript?.remove();
            }
            setJSMetadata((prev) => prev.filter((item) => item.url !== url));
        }
    }

    async function toggleNotificationAllow(item: { id: string; enabled: boolean }) {
        const allowlist = props.notificationPermission().allowlist;

        const entry = allowlist.find((x) => x.id === item.id);
        if (!entry) return;
        entry.enabled = !entry.enabled;

        props.setNotificationPermission({
            ...props.notificationPermission(),
            allowlist: [...allowlist],
        });
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
        const plugins = props.plugins?.() ?? [];
        if (props.notificationPermission().desktop) setState("deskNotifications", true)
        if (props.notificationPermission().in_app) setState("inAppNotifications", true)
        if (window.__TAURI__) {
            const { readDir, readTextFile, exists, BaseDirectory } = await import("@tauri-apps/plugin-fs")
            const dirExists = await exists('plugins', {
                baseDir: BaseDirectory.AppData
            })

            if (dirExists) {
                const files = await readDir('plugins', { baseDir: BaseDirectory.AppData });
                for (const pluginFile of files) {
                    if (pluginFile.isDirectory) continue;
                    const fileName = pluginFile.name
                        .replace(/\.plugin\.(enabled|disabled)\.js$/, "");
                    const isEnabled = pluginFile.name.match(/\.plugin\.(enabled|disabled)\.js$/)?.[1] === "enabled";
                    console.log(isEnabled)
                    try {
                        const content = await readTextFile(`plugins/${pluginFile.name}`, {
                            baseDir: BaseDirectory.AppData
                        })
                        if (content.length === 0) continue;
                        const metadata = await parseJSMetadata(undefined, content);
                        if (metadata === null) {
                            setJSMetadata((prev) => [...prev, {
                                fileName, metadata: {
                                    name: "Unknown",
                                    blockEnable: true,
                                    author: "Unknown",
                                    description: "Failed to grab metadata for item"
                                }
                            }]);
                        } else {
                            const jsonMetadata = metadata ? JSON.parse(JSON.stringify(metadata)) : null;
                            setJSMetadata((prev) => [...prev, { fileName, metadata: jsonMetadata, enabled: isEnabled }]);
                        }
                    } catch {
                        setJSMetadata((prev) => [...prev, { fileName, metadata: null, enabled: isEnabled }]);
                    }
                }
            }
        } else {
            for (const theme of themes) {
                try {
                    const metadata = await parseCSSMetadata(theme.url);
                    if (metadata === null) {
                        setCSSMetadata((prev) => [...prev, {
                            url: theme.url, metadata: {
                                name: "Unknown",
                                blockEnable: true,
                                author: "Unknown",
                                description: "Failed to grab metadata for item"
                            }
                        }]);
                    } else {
                        setCSSMetadata((prev) => [...prev, { url: theme.url, metadata }]);
                    }
                } catch {
                    setCSSMetadata((prev) => [...prev, { url: theme.url, metadata: null }]);
                }
            }
            for (const plugin of plugins) {
                try {
                    const metadata = await parseJSMetadata(plugin.url);
                    if (metadata === null) {
                        setJSMetadata((prev) => [...prev, {
                            url: plugin.url, metadata: {
                                name: "Unknown",
                                blockEnable: true,
                                author: "Unknown",
                                description: "Failed to grab metadata for item"
                            }
                        }]);
                    } else {
                        setJSMetadata((prev) => [...prev, { url: plugin.url, metadata }]);
                    }
                } catch {
                    setJSMetadata((prev) => [...prev, { url: plugin.url, metadata: null }]);
                }
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
        try {
            const res = await fetch(url);
            if (!res.ok) {
                logger.warn(`Failed to fetch: ${res.status}`);
                return null;
            }
            const text = await res.text();

            const match = text.match(/\/\*\*([\s\S]*?)\*\//);
            if (!match) {
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
        } catch (err) {
            return null;
        }
    }


    function evaluateLiteral(node: any): any {
        switch (node.type) {
            case "ObjectExpression":
                const obj: Record<string, any> = {};
                for (const prop of node.properties) {
                    const key = prop.key.name ?? prop.key.value;
                    obj[key] = evaluateLiteral(prop.value);
                }
                return obj;
            case "ArrayExpression":
                return node.elements.map(evaluateLiteral);
            case "Literal":
                return node.value;
            case "TemplateLiteral":
                return node.quasis.map((q: any) => q.value.cooked).join("");
            case "Identifier":
                return node.name;
            default:
                return null;
        }
    }

    async function parseJSMetadata(url?: string, resText?: string) {
        if (!url && !resText) return;
        try {
            if (url) {
                const res = await fetch(url);
                if (!res.ok) {
                    logger.warn(`Failed to fetch JS: ${res.status}`);
                    return null;
                }
                const code = await res.text();
                const ast = parse(code, { ecmaVersion: "latest", sourceType: "module" }) as any;

                for (const node of ast.body) {
                    if (node.type === "ExportDefaultDeclaration") {
                        const decl = node.declaration;
                        if (decl.type === "ObjectExpression") {
                            return evaluateLiteral(decl);
                        }
                    }
                }

                logger.info("No default export object found.");
                return null;
            } else if (resText) {
                const code = resText;
                const ast = parse(code, { ecmaVersion: "latest", sourceType: "module" }) as any;

                for (const node of ast.body) {
                    if (node.type === "ExportDefaultDeclaration") {
                        const decl = node.declaration;
                        if (decl.type === "ObjectExpression") {
                            return evaluateLiteral(decl);
                        }
                    }
                }

                logger.info("No default export object found.");
                return null;
            }
        } catch (err) {
            logger.warn(`Failed to parse JS metadata: ${err}`);
            return null;
        }
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
                                {((_) => {
                                    const [open, setOpen] = createSignal<boolean>(false);
                                    let buttonRef: HTMLButtonElement | undefined;
                                    let dropdownRef: HTMLDivElement | undefined;

                                    return (
                                        <div class={`p-4`}>
                                            <h1 class="text-white text-left text-base font-bold">Font</h1>
                                            <button
                                                class="text-center p-2 pl-4 pr-4 mr-4 mt-2 rounded-md border border-gray-600 bg-transparent text-white hover:bg-gray-600 cursor-pointer inline-block"
                                                ref={el => {
                                                    if (el) {
                                                        buttonRef = el
                                                        const font = getButtonFont().family;
                                                        el.style.cssText = `font-family: ${font} !important;`;
                                                    }
                                                }}
                                                onClick={() => setOpen((prev) => !prev)}
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
                                                        if (dropdownRef && !dropdownRef.contains(event.target as Node) && buttonRef &&
                                                            !buttonRef.contains(event.target as Node)) {
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
                                            <Show when={Boolean(window.__TAURI__)}>
                                                <button class="text-center p-2 pl-4 pr-4 mr-4 mt-1 rounded-md border border-gray-600 bg-transparent text-white hover:bg-gray-600 cursor-pointer inline-block">
                                                    Open Quick CSS file
                                                </button>
                                                <button class="text-center p-2 pl-4 pr-4 mr-4 mt-1 rounded-md border border-gray-600 bg-transparent text-white hover:bg-gray-600 cursor-pointer inline-block">
                                                    Open in Themes folder
                                                </button>
                                                <div class="my-2 w-90"></div>

                                            </Show>
                                            <p class="text-gray-300 text-left text-base">Enter a URL below to import an unoffical theme style.</p>
                                            <form
                                                onSubmit={(e) => addUserCSS(e)}
                                            >
                                                <input
                                                    class="min-w-[400px] p-2 pl-4 pr-4 mr-4 mt-2 rounded-md border border-gray-600 hover:bg-gray-600 text-white inline-block"
                                                    name="cssURL"
                                                    id="cssUrl"
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
                                                                            <div class="flex items-center gap-x-1.5">
                                                                                <FaSolidTrashCan
                                                                                    class="cursor-pointer text-red-500"
                                                                                    size={16}
                                                                                    onClick={() => removeUserCSS(theme.url)}
                                                                                />
                                                                                <label class="inline-flex items-center cursor-pointer">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        disabled={Boolean(metadata.blockEnable)}
                                                                                        checked={theme.enabled}
                                                                                        class="sr-only peer"
                                                                                        onInput={(e: InputEvent) => toggleUserCSS(theme.url, e)}
                                                                                    />
                                                                                    <div
                                                                                        class="relative w-9 h-5 bg-gray-500 peer-checked:bg-green-500 rounded-full 
                 peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full
                 peer-checked:after:border-buffer after:content-[''] after:absolute after:top-[2px] 
                 after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 
                 after:transition-all peer-checked:bg-brand"
                                                                                    ></div>
                                                                                </label>
                                                                            </div>
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
                                    )
                                })}
                            </Show>
                            <Show when={state.activePage === "Plugins"}>
                                <div class={`p-4`}>
                                    <h1 class="text-white text-left text-base font-bold">Plugin Management</h1>
                                    <p class="text-gray-300 text-left text-base">
                                        Press the cof wheel or info to get more info on a plugin.
                                        <br />
                                        Plugins with a cog wheel have settings you can modify!
                                    </p>
                                    <div class="text-center p-2 pl-4 pr-4 mt-2 mr-4 rounded-md border border-gray-600 bg-transparent text-white hover:bg-gray-600 cursor-pointer inline-block">
                                        Enabled Plugins - {props.plugins().filter(p => p.enabled).length} Total Plugins - {props.plugins().length}
                                    </div>
                                    <Show when={Boolean(window.__TAURI__)}>
                                        <button onClick={async () => {
                                            const [
                                                { revealItemInDir },
                                                { appDataDir, join },
                                                { exists, mkdir, BaseDirectory }
                                            ] = await Promise.all([
                                                import("@tauri-apps/plugin-opener"),
                                                import("@tauri-apps/api/path"),
                                                import("@tauri-apps/plugin-fs")
                                            ]);
                                            const base = await appDataDir();
                                            const plugins = await join(base, "plugins/");
                                            if(!(await exists(plugins))) {
                                                await mkdir("plugins", {
                                                    baseDir: BaseDirectory.AppData
                                                })
                                            }
                                            await revealItemInDir(plugins);
                                        }} class="text-center p-2 pl-4 pr-4 mr-4 mt-2 rounded-md border border-gray-600 bg-transparent text-white hover:bg-gray-600 cursor-pointer inline-block">
                                            Open Plugins Folder
                                        </button>
                                    </Show>
                                    <div class="my-2 w-90"></div>
                                    <p class="text-gray-300 text-left text-base">Enter a URL below to import an plugin.</p>
                                    <form
                                        onSubmit={(e) => addPluginJS(e)}
                                    >
                                        <input
                                            class="min-w-[400px] p-2 pl-4 pr-4 mr-4 mt-2 rounded-md border border-gray-600 hover:bg-gray-600 text-white inline-block"
                                            name="jsURL"
                                            id="jsUrl"
                                            placeholder="https://raw.githubusercontent.com/...[.plugin.js]"
                                        />
                                        <button
                                            type="submit"
                                            class="text-center p-2 pl-4 pr-4 mr-4 mt-2 rounded-md border border-gray-600 bg-transparent text-white hover:bg-gray-600 cursor-pointer inline-block"
                                        >
                                            Import
                                        </button>
                                    </form>
                                    <Show when={jsMetadata().length > 0}>
                                        <For each={jsMetadata()}>
                                            {(item) => {
                                                const plugin = props.plugins().find(
                                                    (p) => p.url === item.url || p.fileName === item.fileName
                                                )!;

                                                const metadata = item.metadata;
                                                return (
                                                    <div class="p-2 pl-4 pr-4 mt-2 mr-4 rounded-md border border-gray-600 bg-transparent text-white hover:bg-gray-600 cursor-pointer inline-block">
                                                        {metadata ? (
                                                            <>
                                                                <div class="flex items-center justify-between w-full gap-x-2">
                                                                    <span>{metadata.name || plugin.url}</span>
                                                                    <div class="flex items-center gap-x-1.5">
                                                                        <FaSolidTrashCan
                                                                            class="cursor-pointer text-red-500"
                                                                            size={16}
                                                                            onClick={() => removePluginJS(plugin.url!)}
                                                                        />
                                                                        <label class="inline-flex items-center cursor-pointer">
                                                                            <input
                                                                                type="checkbox"
                                                                                disabled={Boolean(metadata.blockEnable)}
                                                                                checked={plugin?.enabled}
                                                                                class="sr-only peer"
                                                                                onInput={(e: InputEvent) => togglePlugin(
                                                                                    window.__TAURI__ ? undefined : plugin.url,
                                                                                    window.__TAURI__ ? metadata.name as string : undefined,
                                                                                    e
                                                                                )}
                                                                            />
                                                                            <div
                                                                                class="relative w-9 h-5 bg-gray-500 peer-checked:bg-green-500 rounded-full 
                 peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full
                 peer-checked:after:border-buffer after:content-[''] after:absolute after:top-[2px] 
                 after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 
                 after:transition-all peer-checked:bg-brand"
                                                                            ></div>
                                                                        </label>
                                                                    </div>
                                                                </div>
                                                                by {metadata.author || (Array.isArray(metadata.authors) ? metadata.authors.join(", ") : String(metadata.authors))}
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
                            <Show when={state.activePage === "Notifications"}>
                                {((_) => {
                                    const [timeDropdownOpen, setTimeDropdownOpen] = createSignal<boolean>(false);
                                    let timeDropdownButtonRef: HTMLButtonElement | undefined;
                                    let timeDropdownRef: HTMLDivElement | undefined;
                                    const [typeDropdownOpen, setTypeDropdownOpen] = createSignal<boolean>(false);
                                    let typeDropdownButtonRef: HTMLButtonElement | undefined;
                                    let typeDropdownRef: HTMLDivElement | undefined;

                                    return (
                                        <div class={`p-4`}>
                                            <h1 class="text-white text-left text-base font-bold">Notifications</h1>
                                            <p class="text-gray-300 text-left text-base">
                                                Manage the Notifications openlink sends!
                                            </p>
                                            <button onClick={toggleDesktopNotifications} class="text-center p-2 pl-4 pr-4 mr-4 mt-2 rounded-md border border-gray-600 bg-transparent text-white hover:bg-gray-600 cursor-pointer inline-block">
                                                {state.deskNotifications ? "Disable" : "Enable"} Desktop Notifications
                                            </button>
                                            <button onClick={() => {
                                                setState("inAppNotifications", ((prev) => !prev))
                                                props.setNotificationPermission(prev => ({
                                                    ...prev,
                                                    in_app: !prev.in_app
                                                }))
                                            }} class="text-center p-2 pl-4 pr-4 mr-4 mt-2 rounded-md border border-gray-600 bg-transparent text-white hover:bg-gray-600 cursor-pointer inline-block">
                                                {state.inAppNotifications ? "Disable" : "Enable"} In-App Notifications
                                            </button>
                                            <div class="my-4 w-90"></div>

                                            <p class="text-gray-300 text-left text-base">
                                                When to send Desktop Notifications?
                                            </p>
                                            <button
                                                class="text-center p-2 pl-4 pr-4 mr-4 mt-2 rounded-md border border-gray-600 bg-transparent text-white hover:bg-gray-600 cursor-pointer inline-block"
                                                ref={el => {
                                                    if (el) {
                                                        timeDropdownButtonRef = el
                                                        const font = getButtonFont().family;
                                                        el.style.cssText = `font-family: ${font} !important;`;
                                                    }
                                                }}
                                                onClick={() => setTimeDropdownOpen((prev) => !prev)}
                                            >
                                                {props.notificationPermission().type}
                                                <svg
                                                    aria-hidden="true"
                                                    viewBox="0 0 20 20"
                                                    class="ml-1 h-auto w-[1.5em] inline-block"
                                                    fill="currentColor"
                                                >
                                                    <path fill="currentColor" fill-rule="evenodd" d="M5.72 7.47a.75.75 0 0 1 1.06 0L10 10.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-3.75 3.75a.75.75 0 0 1-1.06 0L5.72 8.53a.75.75 0 0 1 0-1.06" clip-rule="evenodd"></path>
                                                </svg>
                                            </button>
                                            <Show when={timeDropdownOpen()}>
                                                <div ref={el => {
                                                    timeDropdownRef = el;

                                                    const handleClickOutside = (event: MouseEvent) => {
                                                        if (timeDropdownRef && !timeDropdownRef.contains(event.target as Node) && timeDropdownButtonRef &&
                                                            !timeDropdownButtonRef.contains(event.target as Node)) {
                                                            setTimeDropdownOpen(false);
                                                        }
                                                    };

                                                    document.addEventListener("mousedown", handleClickOutside);
                                                    onCleanup(() => {
                                                        document.removeEventListener("mousedown", handleClickOutside);
                                                    });
                                                }} class="fixed p-2 mt-2 w-80 rounded-md border-gray-600 bg-gray-700 text-white z-50">
                                                    <ul class="p-1">
                                                        {["Immediately even when window/tab is focused",
                                                            "As soon as window/tab is unfocused",
                                                            "No Mouse/Keyboard input or unfocused for 1 minute",
                                                            "No Mouse/Keyboard input or unfocused for 2 minutes",
                                                            "No Mouse/Keyboard input or unfocused for 5 minutes",
                                                            "No Mouse/Keyboard input or unfocused for 10 minutes",
                                                            "No Mouse/Keyboard input or unfocused for 15 minutes",
                                                            "No Mouse/Keyboard input or unfocused for 20 minutes",
                                                            "No Mouse/Keyboard input or unfocused for 25 minutes",
                                                            "No Mouse/Keyboard input or unfocused for 30 minutes"].map((text) => (
                                                                <li>
                                                                    <button
                                                                        class="w-full text-left p-2 rounded-md text-white hover:bg-gray-600 cursor-pointer"
                                                                    >
                                                                        {text}
                                                                    </button>
                                                                </li>
                                                            ))}
                                                    </ul>
                                                </div>
                                            </Show>
                                            <div class="my-4 w-90"></div>
                                            <p class="text-gray-300 text-left text-base">
                                                Notify me about...
                                            </p>
                                            <button
                                                class="text-center p-2 pl-4 pr-4 mr-4 mt-2 rounded-md border border-gray-600 bg-transparent text-white hover:bg-gray-600 cursor-pointer inline-block"
                                                ref={el => {
                                                    if (el) {
                                                        timeDropdownButtonRef = el
                                                        const font = getButtonFont().family;
                                                        el.style.cssText = `font-family: ${font} !important;`;
                                                    }
                                                }}
                                                onClick={() => setTypeDropdownOpen((prev) => !prev)}
                                            >
                                                {
                                                    (() => {
                                                        const items = props.notificationPermission()
                                                            .allowlist
                                                            .filter(x => x.enabled)
                                                            .map(x => x.id.charAt(0).toUpperCase() + x.id.slice(1));

                                                        if (items.length === 0) return "Nothing";
                                                        if (items.length === 1) return items[0];
                                                        return items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
                                                    })()
                                                }
                                                <svg
                                                    aria-hidden="true"
                                                    viewBox="0 0 20 20"
                                                    class="ml-1 h-auto w-[1.5em] inline-block"
                                                    fill="currentColor"
                                                >
                                                    <path fill="currentColor" fill-rule="evenodd" d="M5.72 7.47a.75.75 0 0 1 1.06 0L10 10.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-3.75 3.75a.75.75 0 0 1-1.06 0L5.72 8.53a.75.75 0 0 1 0-1.06" clip-rule="evenodd"></path>
                                                </svg>
                                            </button>
                                            <Show when={typeDropdownOpen()}>
                                                <div ref={el => {
                                                    typeDropdownRef = el;

                                                    const handleClickOutside = (event: MouseEvent) => {
                                                        if (typeDropdownRef && !typeDropdownRef.contains(event.target as Node) && typeDropdownButtonRef &&
                                                            !typeDropdownButtonRef.contains(event.target as Node)) {
                                                            setTimeDropdownOpen(false);
                                                        }
                                                    };

                                                    document.addEventListener("mousedown", handleClickOutside);
                                                    onCleanup(() => {
                                                        document.removeEventListener("mousedown", handleClickOutside);
                                                    });
                                                }} class="fixed p-2 mt-2 w-70 rounded-md border-gray-600 bg-gray-700 text-white z-50">
                                                    <ul class="p-1">
                                                        <For each={props.notificationPermission().allowlist}>
                                                            {(item) => {
                                                                const text = item.id.charAt(0).toUpperCase() + item.id.slice(1);

                                                                return (
                                                                    <li>
                                                                        <button class="w-full flex items-center justify-between p-2 rounded-md text-white hover:bg-gray-600 cursor-pointer">
                                                                            <span>{text}</span>

                                                                            <label class="inline-flex items-center cursor-pointer">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    class="sr-only peer"
                                                                                    checked={item.enabled}
                                                                                    onInput={() => toggleNotificationAllow(item)}
                                                                                // onChange={() => ...}
                                                                                />
                                                                                <div
                                                                                    class="relative w-9 h-5 bg-gray-500 peer-checked:bg-green-500 rounded-full
                  after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                  after:bg-white after:rounded-full after:h-4 after:w-4
                  after:transition-all peer-checked:after:translate-x-full"
                                                                                ></div>
                                                                            </label>
                                                                        </button>
                                                                    </li>
                                                                );
                                                            }}
                                                        </For>
                                                    </ul>
                                                </div>
                                            </Show>
                                        </div>
                                    )
                                })}
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
