export async function injectUserCSS() {
    let css: string | null = null;
    if (window.__TAURI__) {
        const { load } = await import("@tauri-apps/plugin-store");
        const store = await load("config.json", { autoSave: false, defaults: {} });
        const result = await store.get("injectCSS");
        css = typeof result === "string" ? result : null;
    } else {
        css = localStorage.getItem("injectCSS");
    }

    if (!css) return false;
    const trimmed = css.trim();
    const urlRegex = /^(https?:\/\/|file:\/\/|data:text\/css)/i;
    const cssRegex = /[{};:]/;

    if (urlRegex.test(trimmed)) {
        try {
            if (trimmed.startsWith("data:text/css")) {
                const [, encoded] = trimmed.split(",", 2);
                css = decodeURIComponent(encoded);
            } else {
                const response = await fetch(trimmed);
                if (!response.ok) throw new Error(`Failed to fetch CSS from ${trimmed}`);
                css = await response.text();
            }
        } catch (err) {
            console.error("Error fetching CSS:", err);
            return false;
        }
    } else if (!cssRegex.test(css)) {
        return false;
    }

    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
}
