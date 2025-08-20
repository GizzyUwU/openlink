import "../assets/css/main.css";
import { makePersisted } from "@solid-primitives/storage";
import { createSignal } from "solid-js";
import { useEdulink } from "../api/edulink";
import { Show, onMount, createMemo, onCleanup } from "solid-js";
import { createStore } from "solid-js/store";
import Header from "../components/header";
import Footer from "../components/footer";
import Navigation from "../components/navigation";
function Main() {
  const [LoadedComponent, setLoadedComponent] = createSignal<any>(null);
  const edulink = useEdulink();

  const [state, setState] = createStore<{
    progress: number;
    navWheelAnim: boolean;
    screenWidth: number;
  }>({
    progress: 0,
    navWheelAnim: false,
    screenWidth: window.innerWidth,
  });

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
      <div class="container">
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
          navAnimFinished={(value: boolean) => setState("navWheelAnim", value)}
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

        <Footer
          sessionData={sessionData}
          apiUrl={apiUrl}
          setSession={setSession}
          setApiUrl={setApiUrl}
          edulink={edulink}
        />
      </div>
    </Show>
  );
}

export default Main;
