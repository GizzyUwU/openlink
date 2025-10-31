import { makePersisted } from "@solid-primitives/storage";
import { createSignal, Setter, Show, lazy, onMount, createMemo, onCleanup } from "solid-js";
import { useEdulink } from "../api/edulink";
import { useNavigate } from "@solidjs/router";
import { createStore } from "solid-js/store";
const Navigation = lazy(() => import("../components/navigation"));
import Header from "../components/header";
import Footer from "../components/footer";
import Settings from "../components/settings";
import { useToast } from "../components/toast";
import type { ClubsResponse } from "../types/api/clubs";
import type { StatusResponse } from "../types/auth";
import type { SessionData } from "../types/auth";
import type { Accessor, JSXElement } from "solid-js";

function waitForWheelTransition() {
  return new Promise<void>((resolve) => {
    const navWheelRef = document.getElementById("nav-wheel");
    if (!navWheelRef) return resolve();

    const computed = getComputedStyle(navWheelRef);
    const duration = Number.parseFloat(computed.transitionDuration) * 1000;
    const delay = Number.parseFloat(computed.transitionDelay) * 1000;
    const total = duration + delay;

    if (total === 0) {
      return resolve();
    }

    const handler = () => {
      clearTimeout(fallback);
      navWheelRef.removeEventListener("transitionend", handler);
      resolve();
    };

    const fallback = setTimeout(() => {
      navWheelRef.removeEventListener("transitionend", handler);
      resolve();
    }, total + 50);

    navWheelRef.addEventListener("transitionend", handler, { once: true });
  });
}

function Main(props: Readonly<{ status: StatusResponse["result"] | null }>) {
  const [LoadedComponent, setLoadedComponent] = createSignal<any>(null);
  const edulink = useEdulink();
  const toast = useToast();
  const navigate = useNavigate();
  let resetNavFn: () => void = () => { };
  let openNavFn: ((idx: number) => void) | null = null;
  const [styles, setStyles] = createSignal<{ [key: string]: string } | null>(
    null,
  );

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

  const [state, setState] = createStore<{
    progress: number;
    navWheelAnim: boolean;
    screenWidth: number;
    overlay: JSXElement | null;
    showSettings: boolean;
    theme: string;
    updateAvailable: boolean;
    clubData: ClubsResponse.ClubType[];
    prevPos: number | null;
    navInitalLoadDone: boolean;
  }>({
    progress: 0,
    navWheelAnim: false,
    screenWidth: window.innerWidth,
    overlay: null,
    showSettings: false,
    theme: "default",
    updateAvailable: false,
    clubData: [],
    prevPos: null,
    navInitalLoadDone: false
  });
  const [sessionData, setSession] = makePersisted(createSignal<SessionData | null>(null), {
    storage: sessionStorage,
    name: "sessionData",
  });

  async function loadItemPage(
    id: string,
    name: string,
    forceOpenNav?: boolean,
  ) {
    try {
      if (LoadedComponent()) {
        setLoadedComponent(null);
      }
      if (state.navWheelAnim) setState("navWheelAnim", false);
      const mod = await import(`../components/items/${id}.tsx`);
      const targetPos = mod.default.pos - 1;

      if (forceOpenNav) {
        while (state.navInitalLoadDone === false) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        openNavFn?.(targetPos)
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

      if (state.prevPos !== targetPos) {
        await waitForWheelTransition();
        setState("prevPos", targetPos)
      }
      setState("navWheelAnim", true);
      const url = new URL(globalThis.location.href);
      url.searchParams.set("page", id);
      globalThis.history.pushState({}, "", url.toString());
    } catch (err) {
      console.error(
        `Failed to load component: ../components/items/${id}tsx`,
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
    const handleResize = () => setState("screenWidth", window.innerWidth);
    window.addEventListener("resize", handleResize);
    onCleanup(() => window.removeEventListener("resize", handleResize));
    if (navigator.onLine === false) {
      const parsedUrl = new URL(globalThis.location.href);
      const pathname = parsedUrl.pathname.split("/").find(Boolean);
      if (pathname![0].startsWith("demo")) {
        toast.showToast(
          "No Network Connection",
          "There is no active network connection! Please connect to a network to be able to use all the features.",
          "error",
        );
        return navigate("/login");
      }
    } else {
      const theme = await getTheme();
      setState("theme", theme);

      const cssModule = await import(
        `../public/assets/css/${state.theme}/main.module.css`
      );
      const normalized: { [key: string]: string } = {
        ...cssModule.default,
        ...cssModule,
      };
      setStyles(normalized);

      if (globalThis.__TAURI__) {
        try {
          const { check } = await import("@tauri-apps/plugin-updater");
          const update = await check();
          if (update) setState("updateAvailable", true);
        } catch { }
      }

      edulink.getClubs(
        true,
        sessionData()?.user?.id,
        sessionData()?.authtoken,
        sessionData()?.apiUrl,
      ).then((clubData: ClubsResponse) => {
        if (clubData.result.success) {
          setState("clubData", clubData.result.clubs);
        }
      }).catch((err: Error) => {
        console.error("Failed to fetch clubs:", err);
      });

      const url = new URL(globalThis.location.href);
      const page = url.searchParams.get("page");
      if (page !== null) {
        const loadHandler = async () => {
          await loadItemPage(page, page, true);
          window.removeEventListener("load", loadHandler);
        };

        if (document.readyState === "complete") {
          loadHandler();
        } else {
          window.addEventListener("load", loadHandler);
        }
      }
    }

    globalThis.addEventListener('offline', () => {
      const parsedUrl = new URL(globalThis.location.href);
      const pathname = parsedUrl.pathname.split("/").find(Boolean);
      if (pathname![0].startsWith("demo")) {
        toast.showToast(
          "No Network Connection",
          "There is no active network connection! Please connect to a network to be able to use all the features.",
          "error",
        );
        return navigate("/login");
      }
    })

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
    <Show when={sessionData() !== null && Object.keys(sessionData() ?? {}).length > 0 && styles()}>
      <div>
        <Header
          progress={() => state.progress}
          setSession={setSession}
          sessionData={sessionData}
          setProgress={(value: number) => setState("progress", value)}
          showSettings={changeSettingsState}
          theme={state.theme}
        />
        <Show when={state.showSettings}>
          <Settings
            progress={() => state.progress}
            sessionData={sessionData}
            setOverlay={(value: JSXElement) => setState("overlay", value)}
            showSettings={changeSettingsState}
            theme={state.theme}
          />
        </Show>
        <Navigation
          sessionData={sessionData as Accessor<SessionData>}
          setProgress={(value: number) => setState("progress", value)}
          setPrevPos={(value: number | null) => setState("prevPos", value)}
          progress={() => state.progress}
          edulink={edulink}
          setLoadedComponent={setLoadedComponent}
          loadedComponent={LoadedComponent}
          loadItemPage={loadItemPage}
          navAnimFinished={(value: boolean) => setState("navWheelAnim", value)}
          onResetNav={(fn) => (resetNavFn = fn)}
          openNav={(fn) => (openNavFn = fn)}
          navInitialLoad={(value: boolean) => setState("navInitalLoadDone", value)}
          theme={state.theme}
        />
        <Show when={state.navWheelAnim && LoadedComponent()}>
          {(Comp) => {
            let itemBoxEl: HTMLDivElement | undefined;
            let footerEl: HTMLElement | null = null;

            const [footerHeight, setFooterHeight] = createSignal(0);

            const positionItemBox = () => {
              if (!itemBoxEl) return;
              const navEl = document.getElementById("nav-back");
              if (!navEl) return;
              const minGap = 20;

              itemBoxEl.style.transform = setTransform();

              const navRect = navEl.getBoundingClientRect();
              const boxRect = itemBoxEl.getBoundingClientRect();
              const distance = boxRect.left - navRect.right;

              let extraShift = 0;
              if (distance < minGap) extraShift = minGap - distance;

              itemBoxEl.style.transform = `${setTransform()} translateX(${extraShift}px)`;
            };

            onMount(() => {
              footerEl = document.getElementById("footer");

              if (footerEl) {
                const updateFooterHeight = () => {
                  const rect = footerEl!.getBoundingClientRect();
                  setFooterHeight(rect.height);
                };

                requestAnimationFrame(updateFooterHeight);
                const roFooter = new ResizeObserver(updateFooterHeight);
                roFooter.observe(footerEl);

                onCleanup(() => roFooter.disconnect());
              }
              const handle = () => requestAnimationFrame(positionItemBox);
              handle();

              const resizeHandler = async () => {
                await waitForWheelTransition();
                requestAnimationFrame(handle);
              };
              window.addEventListener("resize", resizeHandler);

              const roBox = new ResizeObserver(handle);
              if (itemBoxEl) roBox.observe(itemBoxEl);

              onCleanup(() => {
                window.removeEventListener("resize", resizeHandler);
                roBox.disconnect();
              });
            });

            return (
              <div
                id="item-box"
                ref={(el) => (itemBoxEl = el)}
                style={{
                  position: "fixed",
                  left: "50%",
                  transform: setTransform(),
                  height: "100%",
                  "max-height": `calc(100vh - ${footerHeight() + 140}px)`,
                  "max-width": maxWidth(),
                  "margin-top": "20px",
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
            onClose={() => {
              changeSettingsState(false);
              setState("overlay", null);
            }}
          >
            <div>
              {state.overlay}
            </div>
          </div>
        </Show>

        <Footer
          sessionData={sessionData as Accessor<SessionData>}
          setSession={setSession}
          edulink={edulink}
          loadItemPage={loadItemPage}
          clubData={state.clubData}
          status={props.status}
          theme={state.theme}
        />
      </div>
    </Show>
  );
}

export default Main;
