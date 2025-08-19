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
        <Transition
          onEnter={(el, done) => {
            const a = el.animate(
              [{ opacity: 0 }, { opacity: 1 }, { easing: "ease" }],
              {
                duration: 100,
                composite: "accumulate",
              },
            );
            a.finished.then(done);
            const navWheel = document.getElementById("nav-back");
            if (navWheel) {
              const rect = navWheel.getBoundingClientRect();
              const elHtml = el as HTMLElement;
              elHtml.style.transform = "none";
              elHtml.style.position = "absolute";

              const minDistance = 80;

              let running = true;

              function updatePosition() {
                if (!running) return;

                if (navWheel) {
                  const rect = navWheel.getBoundingClientRect();

                  // Minimum distance from back button
                  let left = rect.right + minDistance;

                  // Keep it inside viewport
                  const maxLeft = window.innerWidth - elHtml.offsetWidth - 20;
                  if (left > maxLeft) left = maxLeft;

                  elHtml.style.left = `${left}px`;
                }

                requestAnimationFrame(updatePosition);
              }

              // Start updating position
              updatePosition();

              // Stop updating when element is removed
              el.addEventListener("transitionend", () => {
                running = false;
              });
            }
          }}
          onExit={(el, done) => {
            const a = el.animate(
              [{ opacity: 1 }, { opacity: 0 }, { easing: "ease" }],
              {
                duration: 100,
                composite: "accumulate",
              },
            );
            a.finished.then(done);
          }}
        >
          <Show when={state.navWheelAnim && LoadedComponent()}>
            {(Comp) => (
              <div
                id="item-box"
                style={{
                  position: "absolute",
                  top: "100px",
                  left: "50%",
                  transform: "translate3d(-50%, 0, 0)",
                  height: "100%",
                  "max-height": "calc(100vh - 200px)",
                  "max-width": "1200px",
                  width: "100%",
                  "z-index": 10,
                }}
              >
                <Comp />
              </div>
            )}
          </Show>
        </Transition>
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
