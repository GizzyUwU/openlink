import { Show, For, onMount, onCleanup } from "solid-js";
import { createStore } from "solid-js/store";
import { Transition, TransitionGroup } from "solid-transition-group";
import { items } from "../api/items";

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
    activeIdx: number | null;
    isSlid: boolean;
    slideX: number;
    wheelRotation: number;
    logoBG: string;
    userMenu: typeof items;
  }>({
    activeIdx: null,
    isSlid: false,
    slideX: 0,
    wheelRotation: 0,
    logoBG: "",
    userMenu: [],
  });

  const updateSlideX = () => {
    if (navWheelRef) {
      setState("slideX", -(window.innerWidth / 2 + 40));
    }
  };

  const spinToIndex = (idx: number) => {
    if (!state.userMenu) return;
    setState("wheelRotation", (idx * 360) / state.userMenu.length);
  };

  onMount(async () => {
    props.onResetNav?.(resetNav);
    props.openNav?.(openItem);
    if (props.loadedComponent) {
      resetNav();
    }

    const personalMenu = props.sessionData()?.personal_menu || [];
    if (
      personalMenu.length > 0 &&
      !props.apiUrl().trim().toLowerCase().includes("demo")
    ) {
      const orderMap = new Map(
        personalMenu.map((menuItem: any, index: number) => [
          menuItem.id,
          index,
        ]),
      );
      const filterAndSort = items
        .filter((item) => orderMap.has(item.id))
        .sort((a, b) => {
          const indexA = Number(orderMap.get(a.id));
          const indexB = Number(orderMap.get(b.id));
          return indexA - indexB;
        });
      setState("userMenu", filterAndSort);
    } else {
      setState("userMenu", items);
    }

    const handleResize = () => {
      if (state.isSlid) {
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

  const navWheelContainerStyle = () =>
    state.isSlid
      ? {
          transition: "transform 1.2s cubic-bezier(0.77,0,0.175,1)",
          transform: `translateX(${state.slideX}px)`,
        }
      : {
          transition: "transform 1.2s cubic-bezier(0.77,0,0.175,1)",
          transform: "none",
        };

  const navWheelListStyle = () => ({
    transition: state.isSlid
      ? "transform 1.2s cubic-bezier(0.77,0,0.175,1)"
      : "none",
    transform: `rotate(${state.wheelRotation}deg)`,
  });

  const getItemStyle = (x: number, y: number) => ({
    position: "absolute" as const,
    left: `calc(50% + ${x}px)`,
    top: `calc(50% + ${y}px)`,
    transform: `translate(-50%, -50%) rotate(${-state.wheelRotation}deg)`,
    transition: state.isSlid
      ? "transform 1.2s cubic-bezier(0.77,0,0.175,1)"
      : "none",
  });

  function openItem(idx: number) {
    updateSlideX();
    setState({
      activeIdx: idx,
      isSlid: true,
    });
    spinToIndex(state.activeIdx!);
  }

  function resetNav() {
    props.navAnimFinished(false);
    setState({
      activeIdx: null,
      isSlid: false,
      wheelRotation: 0,
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
            <Show when={!state.isSlid}>
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
              <For each={state.userMenu}>
                {(item, i) => (
                  <li
                    class={props.styles!["openlink__item"]}
                    style={getItemStyle(
                      166 *
                        Math.cos(
                          0 - i() * ((2 * Math.PI) / state.userMenu.length),
                        ),
                      166 *
                        Math.sin(
                          0 - i() * ((2 * Math.PI) / state.userMenu.length),
                        ),
                    )}
                  >
                    <div class={props.styles!["openlink__inner"]}>
                      <a
                        class={`
                          ${props.styles!["openlink__item-link"]} ${props.styles![item.class]}
                        `}
                        href={`/dash/#${item.id}`}
                        title={item.name}
                        onClick={(e) => {
                          e.preventDefault();
                          if (state.isSlid && state.activeIdx === i()) {
                            resetNav();
                            props.setLoadedComponent(null);
                            props.setProgress(0);
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
                              transition:
                                "opacity 0.1s cubic-bezier(0.77,0,0.175,1)",
                            }}
                          >
                            <item.icon />
                          </span>
                        ) : state.activeIdx !== i() && state.isSlid ? null : (
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
