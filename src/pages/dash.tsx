import "../assets/css/main.css";
import { makePersisted } from "@solid-primitives/storage";
import { createSignal, JSXElement } from "solid-js";
import { useEdulink } from "../api/edulink";
import { Show, onMount, createMemo, onCleanup } from "solid-js";
import { createStore } from "solid-js/store";
import Header from "../components/header";
import Footer from "../components/footer";
import Navigation from "../components/navigation";
import { useToast } from "../components/toast";
function Main() {
  const [LoadedComponent, setLoadedComponent] = createSignal<any>(null);
  const edulink = useEdulink();
  const toast = useToast();
  let resetNavFn: () => void = () => {};
  let openNavFn: (idx: number) => void;

  const [state, setState] = createStore<{
    progress: number;
    navWheelAnim: boolean;
    screenWidth: number;
    overlay: JSXElement | null;
  }>({
    progress: 0,
    navWheelAnim: false,
    screenWidth: window.innerWidth,
    overlay: null,
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

  async function loadItemPage(id: string, name: string) {
    try {
      const mod = await import(`../components/items/${id}.tsx`);
      console.log(mod, id);
      if (!mod.default.name && !mod.default.icon && mod.default.pos) {
        openNavFn?.(mod.default.pos);
      }
      setState("progress", 0.3);
      setLoadedComponent(() => (childProps: any) => (
        <mod.default.component
          {...childProps}
          setProgress={(value: number) => setState("progress", value)}
          progress={() => state.progress}
          edulink={edulink}
          setOverlay={(value: JSXElement) => setState("overlay", value)}
        />
      ));

      await waitForWheelTransition();
      setState("navWheelAnim", true);
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

  const [sessionData, setSession] = makePersisted(createSignal<any>({}), {
    storage: sessionStorage,
    name: "sessionData",
  });

  const [apiUrl, setApiUrl] = makePersisted(createSignal<any>(""), {
    storage: sessionStorage,
    name: "apiUrl",
  });

  onMount(() => {
    const handleResize = () => {
      setState("screenWidth", window.innerWidth);
    };

    window.addEventListener("resize", handleResize);

    onCleanup(() => {
      window.removeEventListener("resize", handleResize);
    });
  });

  const maxWidth = createMemo(() =>
    state.screenWidth >= 1400 ? "1200px" : "1000px",
  );
  const setTransform = createMemo(() =>
    state.screenWidth >= 1400
      ? "translate3d(-50%, 0, 0)"
      : "translate3d(-45%, 0, 0)",
  );
  return (
    <Show when={sessionData() && Object.keys(sessionData()).length > 0}>
      <div class="openlink-container">
        <Header
          progress={() => state.progress}
          setSession={setSession}
          setApiUrl={setApiUrl}
          sessionData={sessionData}
        />
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
        />
        <Show when={state.navWheelAnim && LoadedComponent()}>
          {(Comp) => (
            <div
              id="item-box"
              style={{
                position: "absolute",
                top: "100px",
                left: "50%",
                transform: setTransform(),
                height: "100%",
                "max-height": "calc(100vh - 200px)",
                "max-width": maxWidth(),
                width: "100%",
                "z-index": 10,
              }}
            >
              <Comp />
            </div>
          )}
        </Show>
        <Show when={state.overlay !== null}>
          <div class="t-overlay items-center justify-center">
            {state.overlay}
          </div>
        </Show>
        <Footer
          sessionData={sessionData}
          apiUrl={apiUrl}
          setSession={setSession}
          setApiUrl={setApiUrl}
          edulink={edulink}
          loadItemPage={loadItemPage}
        />
      </div>
    </Show>
  );
}

export default Main;
