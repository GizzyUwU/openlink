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
      `../../public/assets/css/${props.theme}/forms.module.css`
    );
    const normalized: { [key: string]: string } = {
      ...cssModule.default,
      ...cssModule,
    };
    setStyles(normalized);
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
    if (document.getElementById("item-styling")) {
      document.getElementById("item-styling")?.remove();
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
                        <div class={styles()!["_name"]}>
                          {data.subject || "-"}
                        </div>
                        <div>
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
                              {formatDate({ time: true, date: data.due })}
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
