import { onMount, createSignal, Show, Setter } from "solid-js";
import { HiOutlineCog6Tooth } from "solid-icons/hi";
import { useNavigate } from "@solidjs/router";

export default function Header(props: {
  setProgress: (value: number) => void;
  progress: () => number;
  sessionData: any;
  setSession: any;
  showSettings: Setter<boolean>;
  loadItemPage: (id: string, name: string, forceOpenNav?: boolean) => void;
  theme: string;
}) {
  let dropdownRef: HTMLDivElement | undefined;
  let buttonRef: HTMLButtonElement | undefined;
  let progressBarRef: HTMLDivElement | null = null;
  const [open, setOpen] = createSignal<boolean>(false);
  const navigate = useNavigate();
  const [fadeOut, setFadeOut] = createSignal<boolean>(false);
  const [update, setUpdate] = createSignal<boolean>(false);
  const [styles, setStyles] = createSignal<{ [key: string]: string } | null>(
    null,
  );

  const handleClick = (event: MouseEvent) => {
    if (!open()) return;
    if (
      !dropdownRef?.contains(event.target as Node) &&
      !buttonRef?.contains(event.target as Node)
    ) {
      setOpen(false);
    }
  };

  onMount(async () => {
    document.addEventListener("mouseup", handleClick);
    const cssModule = await import(
      `../public/assets/css/${props.theme}/header.module.css`
    );
    setStyles({ ...cssModule.default, ...cssModule });
    const handleTransitionEnd = (e: TransitionEvent) => {
      if (e.propertyName === "transform" && props.progress() === 1) {
        setFadeOut(true);
      } else {
        if (fadeOut() !== true) return;
        setFadeOut(false);
      }
    };

    if (progressBarRef) {
      progressBarRef.addEventListener("transitionend", handleTransitionEnd);
    }

    if (window.__TAURI__) {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();
      if (update) {
        setUpdate(true);
        console.log(
          `[INFO] Update available! ${update.version} from ${update.date}`,
        );
      }
    }
  });

  return (
    <Show when={styles()}>
      <div class={styles()!["s-header"]}>
        <div class={styles()!["__inner"]}>
          <div class={styles()!["__gradient"]}></div>
        </div>
        <div class={styles()!["__container"]}>
          <div
            class={`${styles()!["pr-user"]} ${styles()!["_animated"]}`}
          >
            <div class="relative inline-block text-left">
              <button
                ref={buttonRef}
                type="button"
                class={`${styles()!["__settings"]} cursor-pointer`}
                onClick={() => setOpen((prev) => !prev)}
              >
                <HiOutlineCog6Tooth class={styles()!["icon"]} />
                {update() && (
                  <span class="absolute bottom-1 z-50 right-4 h-2 w-2 rounded-full bg-red-500"></span>
                )}
              </button>
              <Show when={open()}>
                <div
                  class={`${styles()!["dropdown"]} absolute mt-2 border left-1 divide-y divide-gray-100 rounded-md shadow-lg min-h-max min-w-max`}
                  ref={dropdownRef}
                >
                  <div class="py-1 z-40">
                    <button
                      // onClick={() => props.showSettings((prev) => !prev)}
                      onClick={() => props.loadItemPage("settings", "Sessages", true)}
                      class="block w-full text-left px-4 py-1 text-sm cursor-pointer"
                    >
                      Settings
                    </button>
                    <button
                      onClick={() => {
                        props.setSession(null);
                        return navigate("/login?logout=true");
                      }}
                      class="block z-50 w-full text-left px-4 py-1 text-sm  cursor-pointer"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </Show>
            </div>
            <div class={styles()!["__info"]}>
              <div
                class={styles()!["__avatar"]}
                style={{
                  "background-image": `url(data:image/webp;base64,${props.sessionData()?.user?.avatar?.photo ||
                    "default-avatar-data"
                    })`,
                }}
              ></div>
              <div class={styles()!["__text"]}>
                Hello,{" "}
                <span class={styles()!["__name"]}>
                  {props.sessionData()?.user?.forename +
                    " " +
                    props.sessionData()?.user?.surname || ""}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class={styles()!["progress-wrapper"]}>
          <div
            ref={(el) => (progressBarRef = el)}
            class={styles()!["progress-bar"]}
            style={{
              transform: `translateX(${((props.progress() ?? 0) - 1) * 100}%)`,
              opacity: fadeOut() ? 0 : 1,
              "pointer-events":
                props.progress() > 0 && props.progress() < 1 ? "auto" : "none",
            }}
          />
        </div>
      </div>
    </Show>
  );
}
