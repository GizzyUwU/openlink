import { onMount, onCleanup, createSignal, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { makePersisted } from "@solid-primitives/storage";
import { useEdulink } from "../../api/edulink";
import { ImCross } from "solid-icons/im";
import { Transition } from "solid-transition-group";
import { IoBriefcaseOutline, IoCheckmarkCircleOutline } from "solid-icons/io";
import { HomeworkResponse } from "../../types/api/homework";
import { useToast } from "../toast";
function Homework(props: {
  setProgress: (value: number) => void;
  progress: () => number;
  theme: string;
}) {
  const [styles, setStyles] = createSignal<{ [key: string]: string } | null>(
    null,
  );
  const edulink = useEdulink();
  const toast = useToast();
  const [state, setState] = createStore<{
    activePage: "current" | "past";
    shownHomework: HomeworkResponse.Items[] | null;
    homework?: {
      current: HomeworkResponse.Items[];
      past: HomeworkResponse.Items[];
    };
  }>({
    activePage: "current",
    shownHomework: null,
  });

  const [sessionData] = makePersisted(createSignal<any>(null), {
    storage: sessionStorage,
    name: "sessionData",
  });
  const [apiUrl] = makePersisted(createSignal<any>(null), {
    storage: sessionStorage,
    name: "apiUrl",
  });

  onMount(async () => {
    const cssModule = await import(
      `../../public/assets/css/${props.theme}/homework.module.css`
    );
    const normalized: { [key: string]: string } = {
      ...cssModule.default,
      ...cssModule,
    };
    setStyles(normalized);
    const response = await edulink.getHomework(
      sessionData()?.authtoken,
      apiUrl(),
    );

    if (response.result.success) {
      setState("homework", response.result.homework);
      setState("shownHomework", response.result.homework.current || []);
      props.setProgress(1);
    } else {
      toast.showToast(
        "Error",
        response.result.error ?? "Unknown error",
        "error",
      );
      props.setProgress(0);
    }
  });

  onCleanup(() => {
    if (document.getElementById("item-styling")) {
      document.getElementById("item-styling")?.remove();
    }
    props.setProgress(0);
  });

  const handleSwap = (tab: "current" | "past") => {
    if (!state.homework) return;
    setState("activePage", tab);
    setState("shownHomework", state.homework[tab]);
  };

  return (
    <Transition
      onEnter={(el, done) => {
        const a = el.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 200,
          easing: "ease",
          fill: "forwards",
          composite: "accumulate",
        });
        a.finished.then(done);
      }}
      onExit={(el, done) => {
        const a = el.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 100,
          easing: "ease",
          composite: "accumulate",
        });
        a.finished.then(done);
      }}
    >
      <Show when={props.progress() === 1 && styles()}>
        <div class={styles()!["box-container"]}>
          <div class="flex items-center justify-end w-full pr-[16px]">
            <div class="flex space-x-4 mb-2">
              <button
                type="button"
                onClick={() => handleSwap("current")}
                class={`text-sm text-white cursor-pointer ${
                  state.activePage === "current"
                    ? "border-b border-blue-400"
                    : ""
                }`}
              >
                Current
              </button>
              <button
                type="button"
                onClick={() => handleSwap("past")}
                class={`text-sm font-medium text-white cursor-pointer ${
                  state.activePage === "past" ? "border-b border-blue-400" : ""
                }`}
              >
                Past
              </button>
            </div>
          </div>
          <div class={styles()!["t-container"]}>
            <div
              class={styles()!["t-homework"]}
              style={{ display: "flex", "flex-direction": "column" }}
            >
              <div class={styles()!["t-header"]}>
                <div>Due Date</div>
                <div>Name</div>
                <div>Subject & Class</div>
                <div>Available</div>
                <div>Submission</div>
                <div>Completed</div>
                <div>Received</div>
              </div>
              <div class={styles()!["t-body"]}>
                {state.shownHomework?.map((data: HomeworkResponse.Items) => (
                  <div class={styles()!["t-row"]}>
                    <div class={styles()!["_due"]}>
                      <div
                        style={{ display: "flex", "flex-direction": "column" }}
                      >
                        <span>
                          {data.due_text
                            ? data.due_text.charAt(0).toUpperCase() +
                              data.due_text.slice(1)
                            : "-"}
                        </span>
                        <span>{data.due_date}</span>
                      </div>
                    </div>
                    <div class={styles()!["_name"]}>{data.activity || "-"}</div>
                    <div class={styles()!["_sub_class"]}>
                      {data.subject || "-"}
                    </div>
                    <div class={styles()!["_available"]}>
                      {data.available_date || "-"}
                    </div>
                    <div class={styles()!["_submission"]}>
                      {data.status || "-"}
                    </div>
                    <div class={styles()!["_status"]}>
                      {data.icon ? (
                        data.icon === "tick" ? (
                          <IoCheckmarkCircleOutline size="32" color="green" />
                        ) : (
                          <ImCross color="red" size="20" />
                        )
                      ) : (
                        "-"
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Show>
    </Transition>
  );
}

export default {
  name: "Homework",
  icon: () => {
    return <IoBriefcaseOutline size={36} />;
  },
  pos: 6,
  component: Homework,
};
