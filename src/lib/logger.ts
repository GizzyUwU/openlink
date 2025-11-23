import { warn, debug, trace, info, error } from '@tauri-apps/plugin-log';
type LoggerMethods = 'log' | 'debug' | 'info' | 'warn' | 'error' | 'trace';
type LogInput = string | { title?: string; msg: string; toast?: boolean };
const isTauri = typeof globalThis !== 'undefined' && Boolean((globalThis as any).__TAURI__);

async function callTauri(
    fn: 'warn' | 'debug' | 'trace' | 'info' | 'error',
    msg: string
) {
    if (!isTauri) return;
    try {
        switch (fn) {
            case 'warn':
                await warn(msg);
                break;
            case 'debug':
                await debug(msg);
                break;
            case 'trace':
                await trace(msg);
                break;
            case 'info':
                await info(msg);
                break;
            case 'error':
                await error(msg);
                break;
        }
    } catch { }
}

export const logger: Record<LoggerMethods, (input: LogInput) => Promise<void>> = {
    log: async (input) => {
        const { msg } = typeof input === "string" ? { msg: input } : input;
        console.log(msg);
        await callTauri("info", msg);
    },
    debug: async (input) => {
        const { msg } = typeof input === "string" ? { msg: input } : input;
        console.debug(msg);
        await callTauri("debug", msg);
    },
    info: async (input) => {
        const { msg, title = "Info", toast } = typeof input === "string" ? { msg: input } : input;
        console.info(msg);
        if (toast && window.toast) {
            window.toast.showToast(title, msg, "info");
        }
        await callTauri("info", msg);
    },
    warn: async (input) => {
        const { msg, title = "Warn", toast } = typeof input === "string" ? { msg: input } : input;
        console.warn(msg);
        if (toast && window.toast) {
            window.toast.showToast(title, msg, "warning");
        }
        await callTauri("warn", msg);
    },
    error: async (input) => {
        const { msg, title = "Error", toast } = typeof input === "string" ? { msg: input } : input;
        console.error(msg);
        if (toast && window.toast) {
            window.toast.showToast(title, msg, "error");
        }
        await callTauri("error", msg);
    },
    trace: async (input) => {
        const { msg } = typeof input === "string" ? { msg: input } : input;
        console.trace(msg);
        await callTauri("trace", msg);
    },
};