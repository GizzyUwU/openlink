import { onMount, onCleanup, createSignal, For, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { makePersisted } from "@solid-primitives/storage";
import type { ExamsResponse } from "../../types/api/exams";
import { useToast } from "../toast";
import { TbCertificate } from "solid-icons/tb";
import { Transition } from "solid-transition-group";

function Exams(props: {
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
    entries: ExamsResponse.EntryType[];
    results: ExamsResponse.ResultType[];
    timetable: ExamsResponse.TimetableType[];
    countdown: {
      minutes_to_go?: number | string;
      exam?: string;
      template?: string;
    };
    activePage: "Exam Timetable" | "Exam Entries" | "Exam Results";
  }>({
    entries: [],
    results: [],
    timetable: [],
    countdown: {},
    activePage: "Exam Timetable",
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
      `../../public/assets/css/${props.theme}/exams.module.css`
    );
    const normalized: { [key: string]: string } = {
      ...cssModule.default,
      ...cssModule,
    };
    setStyles(normalized);
    const response: ExamsResponse = await props.edulink.getExams(
      sessionData()?.user?.id,
      sessionData()?.authtoken,
      apiUrl(),
    );

    if (response.result.success) {
      setState({
        entries: response.result.show_entries ? response.result.entries : [],
        results: response.result.show_results ? response.result.results : [],
        timetable: response.result.show_timetable
          ? response.result.timetable
          : [],
        countdown: response.result.show_countdown
          ? response.result.countdown
          : {},
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

  function useTemplate(): string {
    const countdown = state.countdown;
    if (
      !countdown ||
      countdown.minutes_to_go === undefined ||
      !countdown.template ||
      !countdown.exam
    ) {
      return "";
    }

    const template = countdown.template;

    const days = Math.floor(Number(countdown.minutes_to_go) / (60 * 24));
    const hours = Math.floor(
      (Number(countdown.minutes_to_go) % (60 * 24)) / 60,
    );
    const minutes = Number(countdown.minutes_to_go) % 60;

    const data: Record<string, string | number> = {
      exam: countdown.exam,
      days,
      hours,
      minutes,
    };

    return template.replace(/\{(?:a\.)?(\w+)\}/g, (_, key: string) =>
      key in data ? String(data[key]) : `{${key}}`,
    );
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
          <div
            class={
              styles()!["flex"] + " items-center justify-end w-full pr-[10px]"
            }
          >
            <div class={styles()!["flex"] + " space-x-4 mb-2"}>
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
                    class={`text-sm text-white cursor-pointer ${
                      state.activePage === name
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
                    <span>{useTemplate()}af</span>
                  </div>
                </Show>
                <div class={styles()!["t-timetable"]}>
                  <div class={styles()!["t-header"]}>
                    <div class={styles()!["t-header__title"] + " _date_start"}>
                      Date & Start Time
                    </div>
                    <div class={styles()!["t-header__title"] + " _board_level"}>
                      Board & Level
                    </div>
                    <div class={styles()!["t-header__title"] + " _code_exam"}>
                      Code & Exam
                    </div>
                    <div class={styles()!["t-header__title"] + " _room"}>
                      Room
                    </div>
                    <div class={styles()!["t-header__title"] + " _seat"}>
                      Seat
                    </div>
                    <div class={styles()!["t-header__title"] + " _duration"}>
                      Duration
                    </div>
                  </div>
                  <Show when={state.timetable.length > 0}>
                    <For each={state.timetable}>
                      {(data: ExamsResponse.TimetableType) => (
                        <div class={styles()!["t-body"]}>
                          <div class={styles()!["t-row"]}>
                            <div
                              class={
                                styles()!["t-timetable__text"] + " _date_start"
                              }
                            >
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
                                    <div class="_grey">
                                      {formatDate({ date: data.datetime })}
                                    </div>
                                    <span>
                                      {formatDate({
                                        time: true,
                                        date: data.datetime,
                                      })}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div
                              class={
                                styles()!["t-timetable__text"] + " _board_level"
                              }
                            >
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
                                    <div class="_grey">{data.board || "-"}</div>
                                    <span>{data.level || "-"}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div
                              class={
                                styles()!["t-timetable__text"] + " _code_exam"
                              }
                            >
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
                                    <div class="_grey">{data.code || "-"}</div>
                                    <span>{data.title}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div
                              class={styles()!["t-timetable__text"] + " _room"}
                            >
                              {data.room}
                            </div>
                            <div
                              class={styles()!["t-timetable__text"] + " _seat"}
                            >
                              {data.seat}
                            </div>
                            <div
                              class={
                                styles()!["t-timetable__text"] + " _duration"
                              }
                            >
                              {data.duration}
                            </div>
                          </div>
                        </div>
                      )}
                    </For>
                  </Show>
                </div>
              </Show>
              <Show when={state.activePage === "Exam Entries"}>
                <div class={styles()!["t-entries"]}>
                  <div class={styles()!["t-header"]}>
                    <div class={styles()!["t-header__title"] + " _date_start"}>
                      Date & Start Time
                    </div>
                    <div class={styles()!["t-header__title"] + " _board_level"}>
                      Board & Level
                    </div>
                    <div class={styles()!["t-header__title"] + " _code_exam"}>
                      Code & Exam
                    </div>
                  </div>
                  <Show when={state.entries.length > 0}>
                    <For each={state.entries}>
                      {(data: ExamsResponse.EntryType) => (
                        <div class={styles()!["t-body"]}>
                          <div class={styles()!["t-row"]}>
                            <div
                              class={
                                styles()!["t-timetable__text"] + " _date_start"
                              }
                            >
                              {data.season}
                            </div>
                            <div
                              class={
                                styles()!["t-timetable__text"] + " _board_level"
                              }
                            >
                              <div
                                style={{
                                  display: "flex",
                                  "flex-direction": "column",
                                }}
                              >
                                <div class="_grey">{data.board || "-"}</div>
                                <span>{data.level || "-"}</span>
                              </div>
                            </div>
                            <div
                              class={
                                styles()!["t-timetable__text"] + " _code_exam"
                              }
                            >
                              <div
                                style={{
                                  display: "flex",
                                  "flex-direction": "column",
                                }}
                              >
                                <div class="_grey">{data.code || "-"}</div>
                                <span>{data.title}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </For>
                  </Show>
                </div>
              </Show>
              <Show when={state.activePage === "Exam Results"}>
                <div class={styles()!["t-results"]}>
                  <div class={styles()!["t-header"]}>
                    <div class={styles()!["t-header__title"] + " _date"}>
                      Date
                    </div>
                    <div class={styles()!["t-header__title"] + " _board_level"}>
                      Board & Level
                    </div>
                    <div class={styles()!["t-header__title"] + " _code_exam"}>
                      Code & Exam
                    </div>
                    <div class={styles()!["t-header__title"] + " _result"}>
                      Result
                    </div>
                    <div class={styles()!["t-header__title"] + " _equivalent"}>
                      Equivalent
                    </div>
                  </div>
                  <Show when={state.results.length > 0}>
                    <For each={state.results}>
                      {(data: ExamsResponse.ResultType) => (
                        <div class={styles()!["t-body"]}>
                          <div class={styles()!["t-row"]}>
                            <div
                              class={styles()!["t-timetable__text"] + " _date"}
                            >
                              {data.date}
                            </div>
                            <div
                              class={
                                styles()!["t-timetable__text"] + " _board_level"
                              }
                            >
                              <div
                                style={{
                                  display: "flex",
                                  "flex-direction": "column",
                                }}
                              >
                                <div class="_grey">{data.board || "-"}</div>
                                <span>{data.level || "-"}</span>
                              </div>
                            </div>
                            <div
                              class={
                                styles()!["t-timetable__text"] + " _code_exam"
                              }
                            >
                              <div
                                style={{
                                  display: "flex",
                                  "flex-direction": "column",
                                }}
                              >
                                <div class="_grey">{data.code || "-"}</div>
                                <span>{data.title}</span>
                              </div>
                            </div>
                            <div
                              class={
                                styles()!["t-timetable__text"] + " _result"
                              }
                            >
                              {data.result}
                            </div>
                            <div
                              class={
                                styles()!["t-timetable__text"] + " _equivalent"
                              }
                            >
                              {data.equivalent}
                            </div>
                          </div>
                        </div>
                      )}
                    </For>
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
