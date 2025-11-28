import { onMount, createSignal, For, Show } from "solid-js";
import { createStore } from "solid-js/store";
import type { FormsResponse } from "../../types/api/forms";
import { useToast } from "../toast";
import { AiOutlineForm } from "solid-icons/ai";
import { IoCheckmarkCircleOutline } from "solid-icons/io";
import { ImCross } from "solid-icons/im";
import { Transition } from "solid-transition-group";
import type { SessionData } from "../../types/auth";
import type { EdulinkAPI } from "../../api/main";
import { formatDate } from "../../lib/formatDate";

function Forms(props: {
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
    forms: FormsResponse.FormType[];
  }>({
    forms: [],
  });

  onMount(async () => {
    props.setProgress(0.6);
    const cssModule = await import(
      `../../public/assets/css/${props.theme}/forms.module.css`
    );
    const normalized: { [key: string]: string } = {
      ...cssModule.default,
      ...cssModule,
    };
    setStyles(normalized);
    const response: FormsResponse = await props.edulink.getForms(
      "learner",
      props.sessionData()?.authtoken,
      props.sessionData()?.apiUrl,
      window.toast
    );

    if (response.result.success) {
      props.setProgress(0.8);
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
          <div class={styles()!["t-container"]}>
            <div
              class={styles()!["t-forms"]}
              style={{ display: "flex", "flex-direction": "column" }}
            >
              <div class={styles()!["t-header"]}>
                <div>Form Name</div>
                <div>Due Date</div>
                <div>Completed</div>
              </div>
              <Show when={state.forms.length > 0}>
                <div class={styles()!["t-body"]}>
                  <For each={state.forms}>
                    {(data: FormsResponse.FormType) => (
                      <div class={styles()!["t-row"]}>
                        <div class={styles()!["_left"]}>
                          {data.subject || "-"}
                        </div>
                        <div>
                          <div
                            style={{
                              display: "flex",
                              "flex-direction": "column",
                            }}
                          >
                            <span class={styles()!["_grey"]}>
                              {formatDate({
                                date: data.due,
                                short: true
                              })}
                            </span>
                            <span>
                              {formatDate({
                                date: data.due,
                                time: true
                              })}
                            </span>
                          </div>
                        </div>
                        <div>
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
                    )}
                  </For>
                </div>
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
