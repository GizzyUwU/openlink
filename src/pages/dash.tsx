import "../assets/css/main.css";
import { makePersisted } from "@solid-primitives/storage";
import { createSignal } from "solid-js";
import { useEdulink } from "../api/edulink";
import { Show } from "solid-js";
import { Transition } from "solid-transition-group";
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
  }>({
    progress: 0,
    navWheelAnim: false,
  });

  const [sessionData, setSession] = makePersisted(createSignal<any>({}), {
    storage: sessionStorage,
    name: "sessionData",
  });

  const [apiUrl, setApiUrl] = makePersisted(createSignal<any>(""), {
    storage: sessionStorage,
    name: "apiUrl",
  });

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
              ref={(el) => {
                if (el) {
                  const navWheel = document.getElementById("nav-back");
                  const minDistance = 100;

                  el.style.position = "absolute";
                  el.style.height = "100%";
                  el.style.maxHeight = "calc(100vh - 200px)";
                  el.style.maxWidth = "1200px";
                  el.style.width = "100%";
                  el.style.zIndex = "10";
                  el.style.top = "100px";
                  let left = window.innerWidth / 2;
                  if (navWheel) {
                    const rect = navWheel.getBoundingClientRect();
                    if (left - el.offsetWidth / 2 < rect.right + minDistance) {
                      left = rect.right + minDistance + el.offsetWidth / 2;
                    }
                  }
                  const maxLeft = window.innerWidth - el.offsetWidth / 2 - 20;
                  if (left > maxLeft) left = maxLeft;

                  el.style.left = `${left}px`;
                  el.style.transform = "translateX(-50%)";
                }
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
