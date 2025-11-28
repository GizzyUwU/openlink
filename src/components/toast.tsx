import {
  createContext,
  useContext,
  ParentComponent,
  createSignal,
  onCleanup,
  Show
} from "solid-js";
import { HiSolidShieldExclamation } from "solid-icons/hi";
import { makePersisted } from "@solid-primitives/storage";

export type ToastType = "error" | "success" | "warning" | "info";
type json = string | number | boolean | null | json[] | { [key: string]: json };

interface ToastState {
  visible: boolean;
  title: string;
  message: string;
  type: ToastType;
  fadingOut: boolean;
  request?: json,
  response?: json
  onClick?: () => void;
}

export interface ToastContextType {
  showToast: (title: string, message: string, type?: ToastType, request?: json, response?: json) => void;
  hideToast: () => void;
  pauseTimeout: () => void;
  resumeTimeout: () => void;
  toastState: () => ToastState;
  setToastState: (arg: ToastState | ((prev: ToastState) => ToastState)) => void;
}

const ToastContext = createContext<ToastContextType>();

async function getTheme() {
  if (globalThis.__TAURI__) {
    const { load } = await import("@tauri-apps/plugin-store");
    const store = await load("config.json", { autoSave: false, defaults: {} });
    const theme = await store.get("theme");
    if (typeof theme !== "string" || theme.length === 0) return "default";
    return theme;
  } else {
    const [theme] = makePersisted(createSignal<any>({}), {
      storage: localStorage,
      name: "theme",
    });
    if (typeof theme() !== "string" || theme().length === 0) return "default";
    return theme();
  }
}


export const Toast: ParentComponent = (props) => {
  const [toastState, setToastState] = createSignal<ToastState>({
    visible: false,
    title: "",
    message: "",
    type: "error",
    fadingOut: false,
  });

  let timeoutId: any;
  let fadeOutTimeoutId: any;
  let remainingTime = 10000;
  let startTime: number;

  const showToast = (
    title: string,
    message: string,
    type: ToastType = "error",
    request?: json,
    response?: json
  ) => {
    if (timeoutId) clearTimeout(timeoutId);
    if (fadeOutTimeoutId) clearTimeout(fadeOutTimeoutId);
    const titlebar = document.querySelector(".titlebar");
    const topOffset = titlebar ? `${titlebar.clientHeight + 12}px` : "12px";

    const toastContainer = document.querySelector<HTMLElement>("#toast-container");
    if (toastContainer) {
      toastContainer.style.top = topOffset;
    }

    setToastState({
      visible: true,
      title,
      message,
      type,
      onClick: (request || response)
        ? () => setToastState(prev => ({
          ...prev,
          request,
          response
        }))
        : undefined,
      fadingOut: false,
    });


    remainingTime = 10000;
    startTime = Date.now();

    timeoutId = setTimeout(() => {
      hideToast();
    }, remainingTime);
  };


  const pauseTimeout = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      remainingTime = remainingTime - (Date.now() - startTime);
      timeoutId = undefined;
    }
  };

  const resumeTimeout = () => {
    if (!timeoutId && remainingTime > 0 && !toastState().fadingOut) {
      startTime = Date.now();
      timeoutId = setTimeout(() => {
        hideToast();
      }, remainingTime);
    }
  };

  const hideToast = () => {
    setToastState((prev) => ({ ...prev, fadingOut: true }));

    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }

    fadeOutTimeoutId = setTimeout(() => {
      setToastState((prev) => ({ ...prev, visible: false, fadingOut: false }));
    }, 300);
  };

  onCleanup(() => {
    if (timeoutId) clearTimeout(timeoutId)
  })

  const value = {
    showToast,
    hideToast,
    pauseTimeout,
    resumeTimeout,
    toastState,
    setToastState
  };

  return (
    <ToastContext.Provider value={value}>
      {props.children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

const ToastContainer = () => {
  const toast = useToast();
  const removeOverlay = () => {
    toast.setToastState(prev => ({
      ...prev,
      request: undefined,
      response: undefined
    }));
  };

  const container = document.createElement("div");
  document.getElementById("root")?.appendChild(container);
  const overlayContent = () => toast.toastState();
  const hasOverlay = () =>
    (overlayContent().request && Object.keys(overlayContent().request as object).length > 0) ||
    (overlayContent().response && Object.keys(overlayContent().response as object).length > 0);

  return (
    <>
      <Show
        when={hasOverlay()}
      >
        {(_) => {
          const [styles, setStyles] = createSignal<{ [key: string]: string } | null>(
            null,
          );
          (async () => {
            const theme = await getTheme();
            const cssModule = await import(
              `../public/assets/css/${theme}/main.module.css`
            );
            const normalized: { [key: string]: string } = {
              ...cssModule.default,
              ...cssModule,
            };
            setStyles(normalized);
          })()
          return (
            <div
              class={`${styles()?.["t-overlay"]} flex justify-center`}
              onClick={removeOverlay}
            >
              <div
                class={`${styles()?.["basic-overlay"]} rounded-2xl p-6 w-[90%] max-w-lg relative`}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={removeOverlay}
                  class="absolute top-2 right-2 cursor-pointer"
                >
                  ✕
                </button>
                <div>
                  {overlayContent()?.request && (
                    <pre
                      style={{
                        "overflow-x": "auto",
                        "white-space": "pre-wrap",
                        "word-break": "break-word",
                      }}>
                      Request: {JSON.stringify(overlayContent()?.request, null, 2)}
                    </pre>
                  )}
                  <br />
                  {overlayContent()?.response && (
                    <pre
                      style={{
                        "overflow-x": "auto",
                        "white-space": "pre-wrap",
                        "word-break": "break-word",
                      }}>
                      Response: {JSON.stringify(overlayContent()?.response, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )
        }}
      </Show>
      <div
        id="toast-container"
        classList={{
          "toast-visible":
            toast.toastState().visible && !toast.toastState().fadingOut,
          "toast-hidden": toast.toastState().fadingOut,
          "toast-completely-hidden": !toast.toastState().visible,
        }}
      >
        <div
          class={`toast toast-${toast.toastState().type}`}
          onClick={() => {
            const state = toast.toastState();
            if (state.onClick) {
              state.onClick();
            } else {
              toast.hideToast();
            }
          }}

          onMouseEnter={toast.pauseTimeout}
          onMouseLeave={toast.resumeTimeout}
          style={{ cursor: "pointer" }}
        >
          <HiSolidShieldExclamation class="icon" />
          <button class="close-button" onClick={(e) => {
            e.stopPropagation();
            toast.hideToast()
          }}>×</button>
          <div class="title">{toast.toastState().title}</div>
          <div class="message">{toast.toastState().message}</div>
        </div>
      </div>
    </>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within Toast");
  }
  return context;
};
