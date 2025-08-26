import { onMount, onCleanup, createSignal, For, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { makePersisted } from "@solid-primitives/storage";
import type { FormsResponse } from "../../types/api/forms";
import { useToast } from "../toast";
import { AiOutlineForm } from "solid-icons/ai";
import { IoCheckmarkCircleOutline } from "solid-icons/io";
import { ImCross } from "solid-icons/im";
import { Transition } from "solid-transition-group";

function Forms(props: {
  setProgress: (value: number) => void;
  progress: () => number;
  edulink: any;
}) {
  let styleElement: HTMLLinkElement;
  const toast = useToast();
  const [state, setState] = createStore<{
    forms: FormsResponse.FormType[];
  }>({
    forms: [],
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
    const styleUrl = new URL("../../assets/css/forms.css", import.meta.url)
      .href;
    styleElement = document.createElement("link");
    styleElement.rel = "preload";
    styleElement.as = "style";
    styleElement.href = `${styleUrl}?t=${Date.now()}`;
    styleElement.onload = () => {
      styleElement.rel = "stylesheet";
    };
    document.getElementById("item-box")?.appendChild(styleElement);
    const response: FormsResponse = await props.edulink.getForms(
      "learner",
      sessionData()?.authtoken,
      apiUrl(),
    );

    if (response.result.success) {
      setState("forms", response.result.forms);
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
    if (styleElement) {
      styleElement.remove();
    }
    props.setProgress(0);
  });

  function formatDate({
    date,
    time = false,
  }: {
    date: string | Date;
    time?: boolean;
  }): string {
    const d = new Date(date);

    if (time) {
      return d.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

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
      <Show when={props.progress() === 1}>
        <div class="box-container">
          <div class="t-container">
            <div
              class="t-forms"
              style={{ display: "flex", "flex-direction": "column" }}
            >
              <div class="t-header">
                <span class="t-header__title _name">Form Name</span>
                <span class="t-header__title _date">Due Date</span>
                <span class="t-header__title _completed">Completed</span>
              </div>
              <Show when={state.forms.length > 0}>
                <For each={state.forms}>
                  {(data: FormsResponse.FormType) => (
                    <div class="t-body">
                      <div class="t-row">
                        <div class="__text _name">{data.subject || "-"}</div>
                        <div class="__text _date">
                          <div
                            style={{
                              display: "flex",
                              "flex-direction": "column",
                            }}
                          >
                            <span class="_grey">
                              {formatDate({ date: data.due })}
                            </span>
                            <span>
                              {formatDate({
                                time: true,
                                date: data.due,
                              })}
                            </span>
                          </div>
                        </div>
                        <div class="t-timetable__text _completed">
                          {data.submitted ? (
                            data.submitted ? (
                              <IoCheckmarkCircleOutline
                                size="32"
                                color="green"
                              />
                            ) : (
                              <ImCross color="red" size="20" />
                            )
                          ) : (
                            <ImCross color="red" size="20" />
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </For>
              </Show>
            </div>
          </div>
        </div>
      </Show>
    </Transition>
  );
}

export default {
  name: "Forms",
  icon: () => {
    return <AiOutlineForm size={36} />;
  },
  pos: 7,
  component: Forms,
};
