import { onMount, createSignal, For, Show, onCleanup } from "solid-js";
import { createStore } from "solid-js/store";
import type { ExamsResponse } from "../../types/api/exams";
import { useToast } from "../toast";
import { TbCertificate } from "solid-icons/tb";
import { Transition } from "solid-transition-group";
import type { SessionData } from "../../types/auth";
import type { EdulinkAPI } from "../../api/main";
import { formatDate } from "../../lib/formatDate";

function Exams(props: Readonly<{
  setProgress: (value: number) => void;
  sessionData: () => SessionData;
  progress: () => number;
  edulink: EdulinkAPI;
  theme: string;
}>) {
  const [styles, setStyles] = createSignal<{ [key: string]: string } | null>(
    null,
  );
  const toast = useToast();
  const [state, setState] = createStore<{
    entries: ExamsResponse.EntryType[];
    results: ExamsResponse.ResultType[];
    timetable: ExamsResponse.TimetableType[];
    countdown: {
      minutes_to_go?: number | string;
      exam?: string;
      template?: string;
    };
    enabled: {
      entries: boolean;
      results: boolean;
      timetable: boolean;
      countdown: boolean;
    };
    activePage: "Exam Timetable" | "Exam Entries" | "Exam Results";
  }>({
    entries: [],
    results: [],
    timetable: [],
    countdown: {},
    enabled: {
      entries: false,
      results: false,
      timetable: false,
      countdown: false,
    },
    activePage: "Exam Timetable",
  });

  onMount(async () => {
    props.setProgress(0.6);
    const cssModule = await import(
      `../../public/assets/css/${props.theme}/exams.module.css`
    );
    const normalized: { [key: string]: string } = {
      ...cssModule.default,
      ...cssModule,
    };
    setStyles(normalized);
    const response: ExamsResponse = await props.edulink.getExams(
      props.sessionData()?.user?.id,
      props.sessionData()?.authtoken,
      props.sessionData()?.apiUrl,
      "timetable",
    );

    if (response.result.success) {
      props.setProgress(0.8);
      setState({
        enabled: {
          timetable: response.result.show_timetable,
          results: response.result.show_results,
          entries: response.result.show_entries,
          countdown: response.result.show_countdown,
        },
        timetable: response.result.show_timetable
          ? response.result.timetable
          : [],
        countdown: response.result.show_countdown
          ? response.result.countdown
          : {},
      });

      props.setProgress(1);
      if (response.result.show_entries) {
        props.edulink
          .getExams(
            props.sessionData()?.user?.id,
            props.sessionData()?.authtoken,
            props.sessionData()?.apiUrl,
            "entries",
          )
          .then((entriesRes: ExamsResponse) => {
            if (entriesRes.result.success) {
              setState("entries", entriesRes.result.entries || []);
            }
          });
      }

      if (response.result.show_results) {
        props.edulink
          .getExams(
            props.sessionData()?.user?.id,
            props.sessionData()?.authtoken,
            props.sessionData()?.apiUrl,
            "results",
          )
          .then((resultsRes: ExamsResponse) => {
            if (resultsRes.result.success) {
              setState("results", resultsRes.result.results || []);
            }
          });
      }
    } else {
      toast.showToast(
        "Error",
        response.result.error ?? "Unknown error",
        "error",
      );
      props.setProgress(0);
    }
  });

  const start = Date.now();
  function useTemplate() {
    const countdown = state.countdown;
    const [text, setText] = createSignal("");
    const initialMinutes = state.countdown?.minutes_to_go ? Number(state.countdown.minutes_to_go) : 0;

    function update() {
      if (!countdown?.template || !countdown?.exam) {
        setText("");
        return;
      }

      const elapsedMinutes = Math.floor((Date.now() - start) / 60_000);
      const minutesLeft = Math.max(initialMinutes - elapsedMinutes, 0);

      const days = Math.floor(minutesLeft / (60 * 24));
      const hours = Math.floor((minutesLeft % (60 * 24)) / 60);
      const minutes = minutesLeft % 60;

      const data: Record<string, string | number> = {
        exam: countdown.exam,
        days,
        hours,
        minutes,
      };

      const formatted = countdown.template.replaceAll(/\{(?:a\.)?(\w+)\}/g, (_, key: string) =>
        key in data ? String(data[key]) : `{${key}}`,
      );

      setText(formatted);
    }

    update();

    const interval = setInterval(update, 1000);
    onCleanup(() => clearInterval(interval))
    return text;
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
          <div class="flex items-center justify-end w-full pr-[10px]">
            <div class="flex space-x-4 mb-2">
              <For
                each={[
                  "Exam Timetable",
                  ...(state.entries.length ? ["Exam Entries"] : []),
                  ...(state.results.length ? ["Exam Results"] : []),
                ]}
              >
                {(name) => (
                  <button
                    type="button"
                    onClick={() => {
                      if (state.activePage === name) return;
                      setState(
                        "activePage",
                        name as
                        | "Exam Timetable"
                        | "Exam Entries"
                        | "Exam Results",
                      );
                    }}
                    class={`text-sm text-white cursor-pointer ${state.activePage === name
                      ? "border-b border-blue-400"
                      : ""
                      }`}
                  >
                    {name}
                  </button>
                )}
              </For>
            </div>
          </div>
          <div class={styles()!["t-container"]}>
            <div
              class={styles()!["t-exams"]}
              style={{ display: "flex", "flex-direction": "column" }}
            >
              <Show when={state.activePage === "Exam Timetable"}>
                <Show
                  when={
                    !!state.countdown.minutes_to_go || !!state.countdown.exam
                  }
                >
                  <div class={styles()!["t-countdown"]}>
                    <span>{useTemplate()()}</span>
                  </div>
                </Show>
                <div class={styles()!["t-header"]}>
                  <div>Date & Start Time</div>
                  <div>Board & Level</div>
                  <div>Code & Exam</div>
                  <div>Room</div>
                  <div>Seat</div>
                  <div>Duration</div>
                </div>
                <Show when={state.timetable.length > 0}>
                  <div class={styles()!["t-body"]}>
                    <For each={state.timetable}>
                      {(data: ExamsResponse.TimetableType) => (
                        <div class={styles()!["t-row"]}>
                          <div class={styles()!["_left"]}>
                            <div
                              style={{
                                display: "flex",
                                "flex-direction": "column",
                              }}
                            >
                              {data.datetime === "TBA" ? (
                                <span>TBA</span>
                              ) : (
                                <>
                                  <div class={styles()!["_grey"]}>
                                    {formatDate({
                                      date: data.datetime,
                                      short: true
                                    })}
                                  </div>
                                  <span>
                                    {formatDate({
                                      date: data.datetime,
                                      time: true
                                    })}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <div class={styles()!["_left"]}>
                            <div
                              style={{
                                display: "flex",
                                "flex-direction": "column",
                              }}
                            >
                              {data.datetime === "TBA" ? (
                                <span>TBA</span>
                              ) : (
                                <>
                                  <div class={styles()!["_grey"]}>
                                    {data.board || "-"}
                                  </div>
                                  <span>{data.level || "-"}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div class={styles()!["_left"]}>
                            <div
                              style={{
                                display: "flex",
                                "flex-direction": "column",
                              }}
                            >
                              {data.datetime === "TBA" ? (
                                <span>TBA</span>
                              ) : (
                                <>
                                  <div class={styles()!["_grey"]}>
                                    {data.code || "-"}
                                  </div>
                                  <span>{data.title}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div class={styles()!["_left"]}>{data.room}</div>
                          <div>{data.seat}</div>
                          <div>{data.duration}</div>
                        </div>
                      )}
                    </For>
                  </div>
                </Show>
              </Show>
              <Show when={state.activePage === "Exam Entries"}>
                <div class={styles()!["t-entries"]}>
                  <div class={styles()!["t-header"]}>
                    <div>Name</div>
                    <div>Board & Level</div>
                    <div>Code & Exam</div>
                  </div>
                  <Show when={state.entries.length > 0}>
                    <div class={styles()!["t-body"]}>
                      <For each={state.entries}>
                        {(data: ExamsResponse.EntryType) => (
                          <div class={styles()!["t-row"]}>
                            <div>
                              {data.season}
                            </div>
                            <div>
                              <div
                                style={{
                                  display: "flex",
                                  "flex-direction": "column",
                                }}
                              >
                                <div class={styles()!["_grey"]}>
                                  {data.board || "-"}
                                </div>
                                <span>{data.level || "-"}</span>
                              </div>
                            </div>
                            <div>
                              <div
                                style={{
                                  display: "flex",
                                  "flex-direction": "column",
                                }}
                              >
                                <div class={styles()!["_grey"]}>
                                  {data.code || "-"}
                                </div>
                                <span>{data.title}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>
                </div>
              </Show>
              <Show when={state.activePage === "Exam Results"}>
                <div class={styles()!["t-results"]}>
                  <div class={styles()!["t-header"]}>
                    <div>Date</div>
                    <div>Board & Level</div>
                    <div>Code & Exam</div>
                    <div>Result</div>
                    <div>Equivalent</div>
                  </div>
                  <Show when={state.results.length > 0}>
                    <div class={styles()!["t-body"]}>
                      <For each={state.results}>
                        {(data: ExamsResponse.ResultType) => (
                          <div class={styles()!["t-row"]}>
                            <div>{data.date}</div>
                            <div>
                              <div
                                style={{
                                  display: "flex",
                                  "flex-direction": "column",
                                }}
                              >
                                <div class={styles()!["_grey"]}>
                                  {data.board || "-"}
                                </div>
                                <span>{data.level || "-"}</span>
                              </div>
                            </div>
                            <div>
                              <div
                                style={{
                                  display: "flex",
                                  "flex-direction": "column",
                                }}
                              >
                                <div class={styles()!["_grey"]}>
                                  {data.code || "-"}
                                </div>
                                <span>{data.title}</span>
                              </div>
                            </div>
                            <div>{data.result}</div>
                            <div>{data.equivalent}</div>
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>
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
  name: "Exams",
  icon: () => {
    return <TbCertificate size={36} />;
  },
  pos: 3,
  component: Exams,
};
