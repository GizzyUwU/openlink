import { onMount, createSignal, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { Transition } from "solid-transition-group";
import { Icon } from "@iconify-icon/solid";
import { IoBriefcaseOutline, IoCheckmarkCircleOutline } from "solid-icons/io";
import { HomeworkResponse } from "../../types/api/homework";
import { useToast } from "../toast";
import type { SessionData } from "../../types/auth";
import type { EdulinkAPI } from "../../api/main";

function Homework(props: {
  setProgress: (value: number) => void;
  sessionData: () => SessionData;
  progress: () => number;
  edulink: EdulinkAPI;
  theme: string;
}) {
  const [styles, setStyles] = createSignal<{ [key: string]: string } | null>(
    null,
  );
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



  onMount(async () => {
    props.setProgress(0.6);
    const cssModule = await import(
      `../../public/assets/css/${props.theme}/homework.module.css`
    );
    const normalized: { [key: string]: string } = {
      ...cssModule.default,
      ...cssModule,
    };
    setStyles(normalized);
    const response = await props.edulink.getHomework(
      props.sessionData()?.authtoken,
      props.sessionData()?.apiUrl,
      window.toast
    );

    if (response.result.success) {
      props.setProgress(0.8);
      const parseDueDate = (dateStr: string) => {
        if (!dateStr) return Infinity;
        const [year, month, day] = dateStr.trim().split("-").map(Number);
        return new Date(year, month - 1, day).getTime();
      };

      const sortCurrent = (
        a: HomeworkResponse.Items,
        b: HomeworkResponse.Items,
      ) => {
        const now = Date.now();
        return (
          parseDueDate(a.due_date) - now - (parseDueDate(b.due_date) - now)
        );
      };

      const sortPast = (a: HomeworkResponse.Items, b: HomeworkResponse.Items) =>
        parseDueDate(b.due_date) - parseDueDate(a.due_date);

      const currentHomework = [
        ...(response.result.homework.current || []),
      ].sort(sortCurrent);
      const pastHomework = [...(response.result.homework.past || [])].sort(
        sortPast,
      );

      setState({
        homework: {
          current: currentHomework,
          past: pastHomework,
        },
        shownHomework: currentHomework,
      });
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

  const handleSwap = (tab: "current" | "past") => {
    if (!state.homework) return;
    setState({
      activePage: tab,
      shownHomework: state.homework[tab],
    });
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
                class={`text-sm text-white cursor-pointer ${state.activePage === "current"
                  ? "border-b border-blue-400"
                  : ""
                  }`}
              >
                Current
              </button>
              <button
                type="button"
                onClick={() => handleSwap("past")}
                class={`text-sm font-medium text-white cursor-pointer ${state.activePage === "past" ? "border-b border-blue-400" : ""
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
                  <div
                    class={`${styles()!["t-row"]} ${data.completed ? `${styles()!["completed"]}` : ""} ${!data.completed && data.due_date === new Date().toISOString().split("T")[0] ? styles()!["due-today"] : ""}`}
                    style={{
                      "padding-top": `${Math.min(12 + data.activity.length * 0.15, 6) }px`,
                      "padding-bottom": `${Math.min(12 + data.activity.length * 0.15, 6) }px`,
                    }}
                  >
                    <div class={styles()!["_left"]}>
                      <div
                        style={{ display: "flex", "flex-direction": "column" }}
                      >
                        <span>
                          {data.due_text
                            ? data.due_text.charAt(0).toUpperCase() +
                            data.due_text.slice(1)
                            : "-"}
                        </span>
                        <span class={styles()!["_grey"]}>{data.due_date}</span>
                      </div>
                    </div>
                    <div class={styles()!["_left"]}>{data.activity || "-"}</div>
                    <div class={styles()!["_left"]}>
                      {data.subject || "-"}
                    </div>
                    <div class={styles()!["_left"]}>
                      {data.available_date || "-"}
                    </div>
                    <div class={styles()!["_left"]}>
                      {data.status || "-"}
                    </div>
                    <div class={styles()!["_status"]}>
                        {data.completed ? (
                          <IoCheckmarkCircleOutline
                            size="32"
                            class={styles()!["check-color"]}
                          />
                        ) : (
                          <Icon
                            icon="maki:cross"
                            width="32"
                            height="32"
                            class={styles()!["cross-color"]}
                          />
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
