import { onMount, onCleanup, createSignal, Show } from "solid-js";
import { HiOutlineCog6Tooth } from "solid-icons/hi";
import { useNavigate } from "@solidjs/router";

export default function Header(props: {
  progress: () => number;
  sessionData: any;
  setSession: any;
  setApiUrl: any;
  showSettings: (value: boolean) => void;
  styles: { [key: string]: string } | null;
}) {
  let dropdownRef: HTMLDivElement | undefined;
  let progressBarRef: HTMLDivElement | null = null;
  const [open, setOpen] = createSignal<boolean>(false);
  const navigate = useNavigate();
  const [fadeOut, setFadeOut] = createSignal(false);

  const handleClick = (event: MouseEvent) => {
    if (!open()) return;
    if (!dropdownRef?.contains(event.target as Node)) {
      setOpen(false);
    }
  };

  onMount(() => {
    document.addEventListener("mouseup", handleClick);
    const handleTransitionEnd = (e: TransitionEvent) => {
      if (e.propertyName === "transform" && props.progress() === 1) {
        setFadeOut(true);
      }
    };

    if (progressBarRef) {
      progressBarRef.addEventListener("transitionend", handleTransitionEnd);
      onCleanup(
        () =>
          progressBarRef &&
          progressBarRef.removeEventListener(
            "transitionend",
            handleTransitionEnd,
          ),
      );
    }
  });

  onCleanup(() => {
    document.removeEventListener("click", handleClick);
  });

  return (
    <Show when={props.styles}>
      <div class={props.styles!["openlink-s-header"]}>
        <div class={props.styles!["openlink__inner"]}>
          <div class={props.styles!["openlink__gradient"]}></div>
        </div>
        <div class={props.styles!["openlink__container"]}>
          <div class={props.styles!["openlink-pr-user"] + " _animated"}>
            <div class={props.styles!["relative-inline-block"] + " text-left"}>
              <button
                type="button"
                class={props.styles!["openlink__settings"] + " cursor-pointer"}
                onClick={() => setOpen(!open())}
              >
                <HiOutlineCog6Tooth class={props.styles!["icon"]} />
              </button>
              <Show when={open()}>
                <div class={props.styles!["dropdown"]} ref={dropdownRef}>
                  <div class={props.styles!["dropdown-section"]}>
                    <button
                      onClick={() => props.showSettings(true)}
                      class={props.styles!["dropdown-item"]}
                    >
                      Settings
                    </button>
                  </div>
                  <div class={props.styles!["dropdown-section"]}>
                    <button
                      onClick={() => {
                        props.setSession(null);
                        props.setApiUrl("");
                        throw navigate("/login?logout=true");
                      }}
                      class={props.styles!["dropdown-item"]}
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </Show>
            </div>
            <div class={props.styles!["openlink__info"]}>
              <div
                class={props.styles!["openlink__avatar"]}
                style={{
                  "background-image": `url(data:image/webp;base64,${
                    props.sessionData()?.user?.avatar?.photo || "default-avatar-data"
                  })`,
                }}
              ></div>
              <div class={props.styles!["openlink__text"]}>
                Hello,&nbsp;
                <span class={props.styles!["openlink__name"]}>
                  {props.sessionData()?.user?.forename +
                    " " +
                    props.sessionData()?.user?.surname || ""}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class={props.styles!["openlink-progress-wrapper"]}>
          <div
            ref={(el) => (progressBarRef = el)}
            class={props.styles!["openlink-progress-bar"]}
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
