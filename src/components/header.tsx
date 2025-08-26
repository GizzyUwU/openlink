import { onMount, onCleanup, createSignal, Show } from "solid-js";
import { HiOutlineCog6Tooth } from "solid-icons/hi";
import { useNavigate } from "@solidjs/router";

export default function Header(props: {
  progress: () => number;
  sessionData: any;
  setSession: any;
  setApiUrl: any;
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
    <div class="openlink-s-header">
      <div class="openlink__inner">
        <div class="openlink__gradient"></div>
      </div>
      <div class="openlink__container">
        <div class="openlink-pr-user _animated">
          <div class="relative inline-block text-left">
            <button
              type="button"
              class="openlink__settings cursor-pointer"
              onClick={() => setOpen(!open())}
            >
              <HiOutlineCog6Tooth class="w-6 h-6 text-white" />
            </button>
            <Show when={open()}>
              <div
                class="absolute z-10 mt-2 origin-top-right bg-white border left-1 border-gray-400 divide-y divide-gray-100 rounded-md shadow-lg min-h-max min-w-max"
                ref={dropdownRef}
              >
                <div class="py-1">
                  <button
                    onClick={() => {
                      props.setSession(null);
                      props.setApiUrl("");
                      throw navigate("/login?logout=true");
                    }}
                    class="block w-full text-left px-4 py-1 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </Show>
          </div>
          <div class="openlink__info">
            <div
              class="openlink__avatar"
              style={{
                "background-image": `url(data:image/webp;base64,${props.sessionData()?.user?.avatar?.photo || "default-avatar-data"})`,
              }}
            ></div>
            <div class="openlink__text">
              Hello,&nbsp;
              <span class="openlink__name">
                {props.sessionData()?.user?.forename +
                  " " +
                  props.sessionData()?.user?.surname || ""}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div class="openlink-progress-wrapper">
        <div
          ref={(el) => (progressBarRef = el)}
          class="openlink-progress-bar"
          style={{
            transform: `translateX(${((props.progress() ?? 0) - 1) * 100}%)`,
            opacity: fadeOut() ? 0 : 1,
            "pointer-events":
              props.progress() > 0 && props.progress() < 1 ? "auto" : "none",
          }}
        />
      </div>
    </div>
  );
}
