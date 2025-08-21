import {
  createEffect,
  createSignal,
  Show,
  For,
  onMount,
  onCleanup,
  Component,
} from "solid-js";
import { createStore } from "solid-js/store";
import { useToast } from "./toast";
import { HiOutlineClock, HiSolidLink } from "solid-icons/hi";
import { AiOutlineLineChart, AiOutlineForm } from "solid-icons/ai";
import { TbCertificate } from "solid-icons/tb";
import { RiSystemErrorWarningLine } from "solid-icons/ri";
import { FaSolidPersonRunning } from "solid-icons/fa";
import { Transition, TransitionGroup } from "solid-transition-group";
import { useEdulink } from "../api/edulink";

type Item = {
  id: string;
  name: string;
  icon: Component;
  class: string;
  component: Component;
  pos: number;
};

export default function Navigation(props: {
  sessionData: any;
  apiUrl: any;
  setSession: any;
  setApiUrl: any;
  setProgress: (value: number) => void;
  progress: () => number;
  edulink: any;
  setLoadedComponent: any;
  loadedComponent: any;
  navAnimFinished: (value: boolean) => void;
}) {
  let navWheelRef: HTMLDivElement | undefined;
  const edulink = useEdulink();
  const toast = useToast();
  const [items, setItems] = createSignal<Item[]>([]);

  // const items = [
  //   {
  //     id: "timetable",
  //     name: "Timetable",
  //     icon: <HiOutlineClock size={36} />,
  //     class: "_timetable",
  //   },
  //   {
  //     id: "documents",
  //     name: "Documents",
  //     icon: <AiOutlineFileText size={36} />,
  //     class: "_documents",
  //   },
  //   {
  //     id: "exams",
  //     name: "Exams",
  //     icon: <TbCertificate size={36} />,
  //     class: "_exams",
  //   },
  //   {
  //     id: "behaviour",
  //     name: "Behaviour",
  //     icon: <RiSystemErrorWarningLine size={36} />,
  //     class: "_behaviour",
  //   },
  //   {
  //     id: "achievement",
  //     name: "Achievement",
  //     icon: <AiOutlineTrophy size={36} />,
  //     class: "_achievement",
  //   },
  //   {
  //     id: "attendance",
  //     name: "Attendance",
  //     icon: <AiOutlineLineChart size={36} />,
  //     class: "_attendance_absencemanagement",
  //   },
  //   {
  //     id: "homework",
  //     name: "Homework",
  //     icon: <IoBriefcaseOutline size={36} />,
  //     class: "_homework",
  //   },
  //   {
  //     id: "forms",
  //     name: "Forms",
  //     icon: <AiOutlineForm size={36} />,
  //     class: "_forms",
  //   },
  //   {
  //     id: "links",
  //     name: "Links",
  //     icon: <HiSolidLink size={36} />,
  //     class: "_links",
  //   },
  //   {
  //     id: "clubs",
  //     name: "Clubs",
  //     icon: <FaSolidPersonRunning size={36} />,
  //     class: "_clubs",
  //   },
  //   {
  //     id: "account",
  //     name: "Account Info",
  //     icon: <VsAccount size={36} />,
  //     class: "_account",
  //   },
  // ];

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
    itemOpacity: Array(items().length).fill(1),
    logoBG: "",
  });

  function waitForWheelTransition() {
    return new Promise<void>((resolve) => {
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
      const idx = state.activeIdx;
      const mod = await import(`../components/items/${id}.tsx`);

      if (idx !== null) {
        setState({
          activeIdx: idx,
          isAnimating: true,
          isSlid: true,
        });
        spinToIndex(idx);
      }
      props.setProgress(0.3);
      props.setLoadedComponent(() => (childProps: any) => (
        <mod.default.component
          {...childProps}
          setProgress={props.setProgress}
          progress={props.progress}
          edulink={edulink}
        />
      ));

      if (typeof idx === "number") {
        setState("showBack", true);
      }

      await waitForWheelTransition();
      props.navAnimFinished(true);
    } catch (err) {
      console.error(
        `Failed to load component: ../components/items/${id}.tsx`,
        err,
      );
      setState({
        isAnimating: false,
        isSlid: false,
        activeIdx: null,
        showBack: false,
      });
      props.setLoadedComponent(null);
      const prev = document.getElementById("item-box");
      if (prev) prev.remove();
      toast.showToast("Error!", `${name} failed to open.`, "error");
    }
  }

  const updateSlideX = () => {
    if (navWheelRef) {
      setState("slideX", -(window.innerWidth / 2 + 40));
    }
  };

  const spinToIndex = (idx: number) => {
    setState("wheelRotaton", (idx * 360) / items().length);
  };

  onMount(async () => {
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

    const modules = import.meta.glob("../components/items/*.{tsx,jsx,ts,js}");
    for (const loader of Object.values(modules)) {
      loader().then((mod: any) => {
        const def = mod.default;
        const iconComponent: Component =
          typeof def.icon === "function" ? def.icon : () => def.icon;

        const newItem: Item = {
          id: def.name.toLowerCase().replace(/\s+/g, ""),
          name: def.name,
          icon: iconComponent,
          class: `_${def.name.toLowerCase().replace(/\s+/g, "")}`,
          component: def.component,
          pos: def.pos,
        };

        setItems((prev) => {
          const newArr = [...prev, newItem];
          newArr.sort((a, b) => a.pos - b.pos);
          return newArr;
        });
      });
    }

    const logoBase64 = props.sessionData().establishment?.logo;
    if (!logoBase64) return;

    const dominantColor = await new Promise<string | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = `data:image/webp;base64,${logoBase64}`;

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
        itemOpacity: Array(items().length).fill(0),
        isLogoGone: true,
      });

      setTimeout(() => setState("isSlid", true), 600);
    } else {
      setState({
        slideX: 0,
        isLogoGone: false,
        isSlid: false,
        logoOpacity: 0,
        itemOpacity: Array(items().length).fill(0),
      });

      setTimeout(() => {
        setState({
          logoOpacity: 1,
          itemOpacity: Array(items().length).fill(1),
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
    <div class="nav-wheel">
      <div
        class="__container __loaded"
        id="nav-wheel"
        ref={(el) => (navWheelRef = el)}
        style={navWheelContainerStyle()}
      >
        <div class="__artboard"></div>
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
              class="__logo-wrap"
              style={{
                "background-color": state.logoBG,
              }}
            >
              <div
                class="__logo"
                style={{
                  "background-image": `url(data:image/webp;base64,${props.sessionData().establishment?.logo || ""})`,
                }}
              ></div>
            </div>
          </Show>
        </Transition>

        <TransitionGroup
          enterActiveClass="transition-opacity duration-200 ease-[cubic-bezier(0.77,0,0.175,1)]"
          exitActiveClass="transition-opacity duration-200 ease-[cubic-bezier(0.77,0,0.175,1)]"
          enterClass="opacity-0"
          enterToClass="opacity-100"
          exitClass="opacity-100"
          exitToClass="opacity-0"
        >
          <ul class="__list" style={navWheelListStyle()}>
            <For each={items()}>
              {(item, i) => (
                <li
                  class="__item"
                  style={getItemStyle(
                    166 * Math.cos(0 - i() * ((2 * Math.PI) / items().length)),
                    166 * Math.sin(0 - i() * ((2 * Math.PI) / items().length)),
                  )}
                >
                  <div class="__inner">
                    <a
                      class={`__item-link ${item.class}`}
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
                          loadItemPage(item.id, item.name);
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
  );
}
