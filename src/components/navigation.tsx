import { Show, For, onMount, createSignal, createMemo } from "solid-js";
import type { Accessor } from "solid-js";
import { createStore } from "solid-js/store";
import { Transition, TransitionGroup } from "solid-transition-group";
import { items } from "../api/items";
import type { EdulinkAPI } from "../api/main";
import type { SessionData } from "../types/auth";

export default function Navigation(props: Readonly<{
  sessionData: Accessor<SessionData>;
  setProgress: (value: number) => void;
  setPrevPos: (value: number | null) => void;
  progress: () => number;
  edulink: EdulinkAPI;
  loadItemPage: any;
  setLoadedComponent: any;
  loadedComponent: any;
  navAnimFinished: (value: boolean) => void;
  onResetNav?: (fn: () => void) => void;
  openNav?: (fn: (idx: number) => void) => void;
  navInitialLoad: (value: boolean) => void;
  theme: string;
}>) {
  let navWheelRef: HTMLDivElement | undefined;
  const [styles, setStyles] = createSignal<{ [key: string]: string } | null>(
    null,
  );
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

  let debounce = (callback: Function, delay: number) => {
    let dTimeout: ReturnType<typeof setTimeout>;
    return () => {
      clearTimeout(dTimeout);
      dTimeout = setTimeout(() => {
        callback();
      }, delay);
    };
  };

  async function getCachedLogoColor(base64: string, name: string) {
    const cacheKey = `logo-color:${name}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) return cached;

    const dominantColor = await new Promise<string>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = `data:*;base64,${base64}`;

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve("rgb(255,255,255)");

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const colorCounts: Record<string, number> = {};
        let maxColor = "";
        let maxCount = 0;
        let transparentCount = 0;
        const totalPixels = data.length / 4;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a === 0) {
            transparentCount++;
            continue;
          }
          const key = `${r},${g},${b}`;
          colorCounts[key] = (colorCounts[key] || 0) + 1;
          if (colorCounts[key] > maxCount) {
            maxCount = colorCounts[key];
            maxColor = key;
          }
        }

        const transparencyRatio = transparentCount / totalPixels;
        const finalColor =
          transparencyRatio > 0.5
            ? "rgb(255,255,255)"
            : maxColor
              ? `rgb(${maxColor})`
              : "rgb(255,255,255)";

        localStorage.setItem(cacheKey, finalColor);
        resolve(finalColor);
      };

      img.onerror = () => resolve("rgb(255,255,255)");
    });

    return dominantColor;
  }

  onMount(async () => {
    props.onResetNav?.(resetNav);
    props.openNav?.(openItem);
    const cssModule = await import(
      `../public/assets/css/${props.theme}/navigation.module.css`
    );
    const normalized: { [key: string]: string } = {
      ...cssModule.default,
      ...cssModule,
    };
    setStyles(normalized);

    const personalMenu = props.sessionData()?.personal_menu || [];
    if (
      personalMenu.length > 0 &&
      props.sessionData()?.apiUrl?.trim().toLowerCase().includes("demo") === false
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

    const logoBase64 = props.sessionData().establishment?.logo;
    const estName = props.sessionData().establishment?.name;
    if (logoBase64 && estName) {
      requestIdleCallback(async () => {
        const color = await getCachedLogoColor(logoBase64, estName);
        setState("logoBG", color);
      });
    }

    globalThis.addEventListener("popstate", () => {
      resetNav(true);
    });

    let doDebounce = debounce(() => updateSlideX(), 300);

    window.addEventListener("resize", () => doDebounce());
    props.navInitialLoad(true)
  });

  const navWheelContainerStyle = () =>
    state.isSlid
      ? {
        transition: "transform 1s cubic-bezier(0.77,0,0.175,1)",
        transform: `translateX(${state.slideX}px)`,
      }
      : {
        transition: "transform 1s cubic-bezier(0.77,0,0.175,1)",
        transform: "none",
      };

  const navWheelListStyle = () => ({
    transition: state.isSlid
      ? "transform 1s cubic-bezier(0.77,0,0.175,1)"
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
    spinToIndex(idx);
  }

  async function resetNav(fromBack?: boolean) {
    props.navAnimFinished(false);
    props.setPrevPos(null)
    props.setProgress(0);
    setState({
      activeIdx: null,
      isSlid: false,
      wheelRotation: 0
    });
    props.setLoadedComponent(null);

    if (fromBack) {
      const url = new URL(globalThis.location.href);
      url.searchParams.delete("page");
      globalThis.history.pushState({}, "", url.toString());
    }
  }

  return (
    <Show when={styles()}>
      <div class={styles()!["nav-wheel"]}>
        <div
          class={`${styles()!["__container"]} ${styles()!["__loaded"]}`}
          id="nav-wheel"
          ref={(el) => (navWheelRef = el)}
          style={navWheelContainerStyle()}
        >
          <div class={styles()!["__artboard"]}></div>

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
                class={styles()!["__logo-wrap"]}
                style={{ "background-color": state.logoBG }}
              >
                <div
                  class={styles()!["__logo"]}
                  style={{
                    "background-image": `url(data:image/webp;base64,${props.sessionData().establishment?.logo || ""})`,
                  }}
                ></div>
              </div>
            </Show>
          </Transition>

          <TransitionGroup
            enterActiveClass={styles()!["transition-enter-active"]}
            exitActiveClass={styles()!["transition-exit-active"]}
            enterClass={styles()!["transition-enter"]}
            enterToClass={styles()!["transition-enter-to"]}
            exitClass={styles()!["transition-exit"]}
            exitToClass={styles()!["transition-exit-to"]}
          >
            <ul
              class={styles()!["__list"]}
              style={navWheelListStyle()}
            >
              <For each={state.userMenu}>
                {(item, i) => {
                  const icon = createMemo(() => {
                    if (!state.isSlid) {
                      return (
                        <span
                          style={{
                            transition: "opacity 0.1s cubic-bezier(0.77,0,0.175,1)",
                          }}
                        >
                          <item.icon />
                        </span>
                      );
                    } else if (state.activeIdx === i()) {
                      return (
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
                      );
                    } else {
                      return null;
                    }
                  });
                  return (
                    <li
                      class={styles()!["__item"]}
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
                      <div class={styles()!["__inner"]}>
                        <a
                          id={
                            state.activeIdx !== i() && state.isSlid
                              ? ""
                              : "nav-back"
                          }
                          class={`
                          ${styles()!["__item-link"]} ${styles()![item.class]}
                        `}
                          href={`/dash/#${item.id}`}
                          title={item.name}
                          onClick={(e) => {
                            e.preventDefault();
                            if (state.isSlid && state.activeIdx === i()) {
                              resetNav(true);
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
                          {icon()}
                        </a>
                      </div>
                    </li>
                  )
                }}
              </For>
            </ul>
          </TransitionGroup>
        </div>
      </div>
    </Show>
  );
}
