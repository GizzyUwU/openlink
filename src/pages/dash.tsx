import { makePersisted } from "@solid-primitives/storage";
import { createSignal, JSXElement, Setter } from "solid-js";
import { useEdulink } from "../api/edulink";
import { Show, onMount, createMemo, onCleanup } from "solid-js";
import { createStore } from "solid-js/store";
import Header from "../components/header";
import Footer from "../components/footer";
import Settings from "../components/settings";
import Navigation from "../components/navigation";
import { useToast } from "../components/toast";
import type { ClubsResponse } from "../types/api/clubs";

function Main() {
  const [LoadedComponent, setLoadedComponent] = createSignal<any>(null);
  const edulink = useEdulink();
  const toast = useToast();
  let resetNavFn: () => void = () => {};
  let openNavFn: (idx: number) => void;
  const [styles, setStyles] = createSignal<{ [key: string]: string } | null>(
    null,
  );

  async function getTheme() {
    if (window.__TAURI__) {
      const { load } = await import("@tauri-apps/plugin-store");
      const store = await load("users.json", { autoSave: false, defaults: {} });
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

  const [state, setState] = createStore<{
    progress: number;
    navWheelAnim: boolean;
    screenWidth: number;
    overlay: JSXElement | null;
    showSettings: boolean;
    theme: string;
    updateAvailable: boolean;
    clubData: ClubsResponse.ClubType[];
  }>({
    progress: 0,
    navWheelAnim: false,
    screenWidth: window.innerWidth,
    overlay: null,
    showSettings: false,
    theme: "default",
    updateAvailable: false,
    clubData: [],
  });

  const [sessionData, setSession] = makePersisted(createSignal<any>({}), {
    storage: sessionStorage,
    name: "sessionData",
  });

  const [apiUrl, setApiUrl] = makePersisted(createSignal<any>(""), {
    storage: sessionStorage,
    name: "apiUrl",
  });

  function waitForWheelTransition() {
    return new Promise<void>((resolve) => {
      const navWheelRef = document.getElementById("nav-wheel");
      if (!navWheelRef) return resolve();

      const handler = () => {
        navWheelRef?.removeEventListener("transitionend", handler);
        resolve();
      };

      navWheelRef.addEventListener("transitionend", handler, { once: true });
    });
  }

  async function loadItemPage(
    id: string,
    name: string,
    forceOpenNav?: boolean,
  ) {
    try {
      if (LoadedComponent()) {
        setLoadedComponent(null);
      }
      const mod = await import(`../components/items/${id}.tsx`);
      if (forceOpenNav) {
        openNavFn?.(mod.default.pos - 1);
      }
      setState("progress", 0.3);
      setLoadedComponent(() => (childProps: any) => (
        <mod.default.component
          {...childProps}
          setProgress={(value: number) => setState("progress", value)}
          progress={() => state.progress}
          sessionData={sessionData}
          edulink={edulink}
          setOverlay={(value: JSXElement) => setState("overlay", value)}
          theme={state.theme}
          clubData={state.clubData}
        />
      ));

      await waitForWheelTransition();
      setState("navWheelAnim", true);
      const url = new URL(window.location.href);
      url.searchParams.set("page", id);
      window.history.pushState({}, "", url.toString());
    } catch (err) {
      console.error(
        `Failed to load component: ../components/items/${id}.tsx`,
        err,
      );

      resetNavFn();
      setLoadedComponent(null);
      const prev = document.getElementById("item-box");
      if (prev) prev.remove();
      toast.showToast("Error!", `${name} failed to open.`, "error");
    }
  }

  onMount(async () => {
    await getTheme().then((theme) => setState("theme", theme));
    const cssModule = await import(
      `../public/assets/css/${state.theme}/main.module.css`
    );
    const normalized: { [key: string]: string } = {
      ...cssModule.default,
      ...cssModule,
    };
    setStyles(normalized);

    if (window.__TAURI__) {
      try {
        const { check } = await import("@tauri-apps/plugin-updater");
        const update = await check();
        if (update) {
          setState("updateAvailable", true);
          console.log(
            `[INFO] Update available! ${update.version} from ${update.date}`,
          );
        }
      } catch (err) {
        console.log("[INFO] Skipping update check:", err);
      }
    }

    const clubData = await edulink.getClubs(
      true,
      sessionData()?.user?.id,
      sessionData()?.authtoken,
      apiUrl(),
    );
    console.log(clubData);
    if (clubData.result.success) {
      setState("clubData", clubData.result.clubs);
    }

    const handleResize = () => {
      setState("screenWidth", window.innerWidth);
    };

    window.addEventListener("resize", handleResize);

    onCleanup(() => {
      window.removeEventListener("resize", handleResize);
    });
    const url = new URL(window.location.href);
    const page = url.searchParams.get("page");
    if (page !== null) {
      const loadHandler = async () => {
        await loadItemPage(page, page, true);
        window.removeEventListener("load", loadHandler);
      };
      window.addEventListener("load", loadHandler);
    }
  });

  const maxWidth = createMemo(() =>
    state.screenWidth >= 1400 ? "1200px" : "1000px",
  );

  const setTransform = createMemo(() =>
    state.screenWidth >= 1400
      ? "translate3d(-50%, 0, 0)"
      : "translate3d(-45%, 0, 0)",
  );

  const changeSettingsState: Setter<boolean> = (valueOrFn) => {
    setState("showSettings", (prev) =>
      typeof valueOrFn === "function"
        ? (valueOrFn as (prev: boolean) => boolean)(prev)
        : valueOrFn,
    );
  };

  return (
    <Show when={sessionData() && Object.keys(sessionData()).length > 0}>
      <div class="openlink-container">
        <Header
          progress={() => state.progress}
          setSession={setSession}
          setApiUrl={setApiUrl}
          sessionData={sessionData}
          setProgress={(value: number) => setState("progress", value)}
          showSettings={changeSettingsState}
          styles={styles() || {}}
        />
        <Show when={state.showSettings}>
          <Settings
            progress={() => state.progress}
            setSession={setSession}
            setApiUrl={setApiUrl}
            sessionData={sessionData}
            setOverlay={(value: JSXElement) => setState("overlay", value)}
            showSettings={changeSettingsState}
            styles={styles() || {}}
          />
        </Show>
        <Navigation
          sessionData={sessionData}
          apiUrl={apiUrl}
          setSession={setSession}
          setApiUrl={setApiUrl}
          setProgress={(value: number) => setState("progress", value)}
          progress={() => state.progress}
          edulink={edulink}
          setLoadedComponent={setLoadedComponent}
          loadedComponent={LoadedComponent}
          loadItemPage={loadItemPage}
          navAnimFinished={(value: boolean) => setState("navWheelAnim", value)}
          onResetNav={(fn) => (resetNavFn = fn)}
          openNav={(fn) => (openNavFn = fn)}
          styles={styles()}
        />
        <Show when={state.navWheelAnim && LoadedComponent()}>
          {(Comp) => {
            let itemBoxEl: HTMLDivElement | undefined;

            const positionItemBox = () => {
              if (!itemBoxEl) return;
              const navEl = document.getElementById("nav-back");
              if (!navEl) return;

              const minGap = 20;
              if (!itemBoxEl) return;
              itemBoxEl.style.transform = setTransform();

              const navRect = navEl.getBoundingClientRect();
              const boxRect = itemBoxEl.getBoundingClientRect();
              const distance = boxRect.left - navRect.right;

              let extraShift = 0;
              if (distance < minGap) extraShift = minGap - distance;

              itemBoxEl.style.transform = `${setTransform()} translateX(${extraShift}px)`;
            };

            onMount(() => {
              positionItemBox();

              let debounce = (callback: Function, delay: number) => {
                let myTimeout: ReturnType<typeof setTimeout>;
                return () => {
                  clearTimeout(myTimeout);
                  myTimeout = setTimeout(() => {
                    callback();
                  }, delay);
                };
              };

              let doDebounce = debounce(() => positionItemBox(), 1010);
              window.addEventListener("resize", () => doDebounce());

              onCleanup(() => {
                window.removeEventListener("resize", doDebounce);
              });
            });
            return (
              <div
                id="item-box"
                ref={(el) => (itemBoxEl = el)}
                style={{
                  position: "fixed",
                  top: "100px",
                  left: "50%",
                  transform: setTransform(),
                  height: "100%",
                  "max-height": "calc(100vh - 200px)",
                  "max-width": maxWidth(),
                  width: "100%",
                }}
              >
                <Comp />
              </div>
            );
          }}
        </Show>

        <Show when={state.overlay !== null}>
          <div
            class={`${styles()?.["t-overlay"]} flex justify-center`}
            onMouseUp={() => {
              changeSettingsState(false);
              setState("overlay", null);
            }}
          >
            <div onMouseUp={(e) => e.stopPropagation()}>{state.overlay}</div>
          </div>
        </Show>

        <Footer
          sessionData={sessionData}
          apiUrl={apiUrl}
          setSession={setSession}
          setApiUrl={setApiUrl}
          edulink={edulink}
          loadItemPage={loadItemPage}
          styles={styles()}
          clubData={state.clubData}
        />
      </div>
    </Show>
  );
}

export default Main;
