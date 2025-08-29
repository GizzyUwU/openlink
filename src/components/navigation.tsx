import { createEffect, Show, For, onMount, onCleanup } from "solid-js";
import { createStore } from "solid-js/store";
import { Transition, TransitionGroup } from "solid-transition-group";
import { items } from "../api/items";
import clsx from "clsx";

export default function Navigation(props: {
  sessionData: any;
  apiUrl: any;
  setSession: any;
  setApiUrl: any;
  setProgress: (value: number) => void;
  progress: () => number;
  edulink: any;
  loadItemPage: any;
  setLoadedComponent: any;
  loadedComponent: any;
  navAnimFinished: (value: boolean) => void;
  onResetNav?: (fn: () => void) => void;
  openNav?: (fn: (idx: number) => void) => void;
  styles: { [key: string]: string } | null;
}) {
  let navWheelRef: HTMLDivElement | undefined;

  const [state, setState] = createStore<{
    showBack: boolean;
    activeIdx: number | null;
    isAnimating: boolean;
    isSlid: boolean;
    slideX: number;
    wheelRotaton: number;
    logoOpacity: number;
    isLogoGone: boolean;
    navSlid: boolean;
    itemOpacity: number[];
    logoBG: string;
  }>({
    showBack: false,
    activeIdx: null,
    isAnimating: false,
    isSlid: false,
    slideX: 0,
    wheelRotaton: 0,
    logoOpacity: 1,
    isLogoGone: false,
    navSlid: false,
    itemOpacity: Array(items.length).fill(1),
    logoBG: "",
  });

  const updateSlideX = () => {
    if (navWheelRef) {
      setState("slideX", -(window.innerWidth / 2 + 40));
    }
  };

  const spinToIndex = (idx: number) => {
    setState("wheelRotaton", (idx * 360) / items.length);
  };

  onMount(async () => {
    props.onResetNav?.(resetNav);
    props.openNav?.(openItem);
    if (props.loadedComponent) {
      resetNav();
    }

    const handleResize = () => {
      if (state.isSlid && state.isLogoGone) {
        updateSlideX();
      }
    };

    window.addEventListener("resize", handleResize);

    onCleanup(() => {
      window.removeEventListener("resize", handleResize);
    });

    const logoBase64 = props.sessionData().establishment?.logo;
    if (!logoBase64) return;

    const dominantColor = await new Promise<string | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = `data:*;base64,${logoBase64}`;

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const colorCounts: Record<string, number> = {};
        let maxColor = "";
        let maxCount = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a === 0) continue;

          const key = `${r},${g},${b}`;
          colorCounts[key] = (colorCounts[key] || 0) + 1;

          if (colorCounts[key] > maxCount) {
            maxCount = colorCounts[key];
            maxColor = key;
          }
        }

        resolve(maxColor ? `rgb(${maxColor})` : null);
      };

      img.onerror = () => resolve(null);
    });

    if (dominantColor) setState("logoBG", dominantColor);
  });

  createEffect(() => {
    if (state.isSlid) {
      if (!state.isLogoGone) updateSlideX();
      setState({
        logoOpacity: 0,
        itemOpacity: Array(items.length).fill(0),
        isLogoGone: true,
      });

      setTimeout(() => setState("isSlid", true), 600);
    } else {
      setState({
        slideX: 0,
        isLogoGone: false,
        isSlid: false,
        logoOpacity: 0,
        itemOpacity: Array(items.length).fill(0),
      });

      setTimeout(() => {
        setState({
          logoOpacity: 1,
          itemOpacity: Array(items.length).fill(1),
        });
      }, 10);
    }

    if (state.isSlid && typeof state.activeIdx === "number") {
      spinToIndex(state.activeIdx!);
    } else if (!state.isSlid) {
      setState("wheelRotaton", 0);
    }

    const idx = state.activeIdx;
    const navActive =
      state.isSlid && state.isLogoGone && typeof idx === "number";
    setState("showBack", navActive);
    setState("showBack", state.isSlid && typeof idx === "number");
  });

  const navWheelContainerStyle = () =>
    state.isAnimating
      ? {
          transition: "transform 1.2s cubic-bezier(0.77,0,0.175,1)",
          transform: `translateX(${state.slideX}px)`,
        }
      : {
          transition: "transform 1.2s cubic-bezier(0.77,0,0.175,1)",
          transform: "none",
        };

  const navWheelListStyle = () => ({
    transition: state.isAnimating
      ? "transform 1.2s cubic-bezier(0.77,0,0.175,1)"
      : "none",
    transform: `rotate(${state.wheelRotaton}deg)`,
  });

  const getItemStyle = (x: number, y: number) => ({
    position: "absolute" as const,
    left: `calc(50% + ${x}px)`,
    top: `calc(50% + ${y}px)`,
    transform: `translate(-50%, -50%) rotate(${-state.wheelRotaton}deg)`,
    transition: state.isAnimating
      ? "transform 1.2s cubic-bezier(0.77,0,0.175,1)"
      : "none",
  });

  function openItem(idx: number) {
    setState({
      activeIdx: idx,
      isAnimating: true,
      isSlid: true,
    });
  }

  function resetNav() {
    props.navAnimFinished(false);
    setState({
      activeIdx: null,
      isAnimating: false,
      isSlid: false,
      showBack: false,
    });
    props.setLoadedComponent(null);

    const prev = document.getElementById("item-box");
    if (prev) prev.remove();
  }

  return (
    <Show when={props.styles}>
      <div class={props.styles!["openlink-nav-wheel"]}>
        <div
          class={`${props.styles!["openlink__container"]} ${props.styles!["openlink__loaded"]}`}
          id="nav-wheel"
          ref={(el) => (navWheelRef = el)}
          style={navWheelContainerStyle()}
        >
          <div class={props.styles!["openlink__artboard"]}></div>

          <Transition
            appear={false}
            onExit={(el: Element, done) => {
              const anim = (el as HTMLElement).animate(
                [{ opacity: 1 }, { opacity: 0 }],
                {
                  duration: 400,
                  easing: "cubic-bezier(0.77,0,0.175,1)",
                  fill: "forwards",
                },
              );
              anim.finished.then(done);
            }}
            onEnter={(el: Element, done) => {
              const anim = (el as HTMLElement).animate(
                [{ opacity: 0 }, { opacity: 1 }],
                {
                  duration: 400,
                  easing: "cubic-bezier(0.77,0,0.175,1)",
                  fill: "forwards",
                },
              );
              anim.finished.then(done);
            }}
          >
            <Show when={!state.isLogoGone}>
              <div
                class={props.styles!["openlink__logo-wrap"]}
                style={{ "background-color": state.logoBG }}
              >
                <div
                  class={props.styles!["openlink__logo"]}
                  style={{
                    "background-image": `url(data:image/webp;base64,${props.sessionData().establishment?.logo || ""})`,
                  }}
                ></div>
              </div>
            </Show>
          </Transition>

          <TransitionGroup
            enterActiveClass={props.styles!["transition-enter-active"]}
            exitActiveClass={props.styles!["transition-exit-active"]}
            enterClass={props.styles!["transition-enter"]}
            enterToClass={props.styles!["transition-enter-to"]}
            exitClass={props.styles!["transition-exit"]}
            exitToClass={props.styles!["transition-exit-to"]}
          >
            <ul
              class={props.styles!["openlink__list"]}
              style={navWheelListStyle()}
            >
              <For each={items}>
                {(item, i) => (
                  <li
                    class={props.styles!["openlink__item"]}
                    style={getItemStyle(
                      166 * Math.cos(0 - i() * ((2 * Math.PI) / items.length)),
                      166 * Math.sin(0 - i() * ((2 * Math.PI) / items.length)),
                    )}
                  >
                    <div class={props.styles!["openlink__inner"]}>
                      <a
                        class={clsx(
                          props.styles!["openlink__item-link"],
                          props.styles![item.class],
                        )}
                        href={`/dash/#${item.id}`}
                        title={item.name}
                        onClick={(e) => {
                          e.preventDefault();
                          if (state.isSlid && state.activeIdx === i()) {
                            resetNav();
                            props.setLoadedComponent(null);
                            const prev = document.getElementById("item-box");
                            if (prev) prev.remove();
                          } else {
                            openItem(i());
                            spinToIndex(i());
                            props.loadItemPage(item.id, item.name);
                          }
                        }}
                      >
                        {!state.isSlid ? (
                          <span
                            style={{
                              opacity: state.itemOpacity[i()],
                              transition:
                                "opacity 0.1s cubic-bezier(0.77,0,0.175,1)",
                            }}
                            onTransitionEnd={() => {
                              if (state.isSlid && state.activeIdx === i())
                                setState("showBack", true);
                            }}
                          >
                            <item.icon />
                          </span>
                        ) : state.activeIdx !== i() && state.showBack ? (
                          true
                        ) : (
                          <>
                            <div id="nav-back"></div>
                            <svg
                              width="36"
                              height="36"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              style={{
                                opacity: 1,
                                transition:
                                  "opacity 0.2s cubic-bezier(0.77,0,0.175,1)",
                              }}
                            >
                              <path d="M15 18l-6-6 6-6" />
                            </svg>
                          </>
                        )}
                      </a>
                    </div>
                  </li>
                )}
              </For>
            </ul>
          </TransitionGroup>
        </div>
      </div>
    </Show>
  );
}
