import {
  createContext,
  useContext,
  ParentComponent,
  createSignal,
} from "solid-js";
import { HiSolidShieldExclamation } from "solid-icons/hi";

export type ToastType = "error" | "success" | "warning" | "info";

interface ToastState {
  visible: boolean;
  title: string;
  message: string;
  type: ToastType;
  fadingOut: boolean;
}

interface ToastContextType {
  showToast: (title: string, message: string, type?: ToastType) => void;
  hideToast: () => void;
  pauseTimeout: () => void;
  resumeTimeout: () => void;
  toastState: () => ToastState;
}

const ToastContext = createContext<ToastContextType>();

export const Toast: ParentComponent = (props) => {
  const [toastState, setToastState] = createSignal<ToastState>({
    visible: false,
    title: "",
    message: "",
    type: "error",
    fadingOut: false,
  });

  let timeoutId: number | undefined;
  let fadeOutTimeoutId: number | undefined;
  let remainingTime = 10000;
  let startTime: number;

  const showToast = (
    title: string,
    message: string,
    type: ToastType = "error",
  ) => {
    if (timeoutId) clearTimeout(timeoutId);
    if (fadeOutTimeoutId) clearTimeout(fadeOutTimeoutId);

    setToastState({
      visible: true,
      title,
      message,
      type,
      fadingOut: false,
    });

    // Reset timing
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

  const value = {
    showToast,
    hideToast,
    pauseTimeout,
    resumeTimeout,
    toastState,
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
  return (
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
        onClick={toast.hideToast}
        onMouseEnter={toast.pauseTimeout}
        onMouseLeave={toast.resumeTimeout}
        style={{ cursor: "pointer" }}
      >
        <HiSolidShieldExclamation class="icon" />
        <div class="title">{toast.toastState().title}</div>
        <div class="message">{toast.toastState().message}</div>
        <button class="close-button">×</button>
      </div>
    </div>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within Toast");
  }
  return context;
};
