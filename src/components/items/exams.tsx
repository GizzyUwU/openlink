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
}) {
  let styleElement: HTMLLinkElement;
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
    const styleUrl = new URL("../../assets/css/exams.css", import.meta.url)
      .href;
    styleElement = document.createElement("link");
    styleElement.rel = "preload";
    styleElement.as = "style";
    styleElement.href = `${styleUrl}?t=${Date.now()}`;
    styleElement.onload = () => {
      styleElement.rel = "stylesheet";
    };
    document.getElementById("item-box")?.appendChild(styleElement);
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
          <div class="t-container">
            <div
              class="t-exams"
              style={{ display: "flex", "flex-direction": "column" }}
            >
              <Show when={state.activePage === "Exam Timetable"}>
                <Show
                  when={
                    !!state.countdown.minutes_to_go || !!state.countdown.exam
                  }
                >
                  <div class="t-countdown">
                    <span>{useTemplate()}af</span>
                  </div>
                </Show>
                <div class="t-timetable">
                  <div class="t-header">
                    <span class="t-header__title _date_start">
                      Date & Start Time
                    </span>
                    <span class="t-header__title _board_level">
                      Board & Level
                    </span>
                    <span class="t-header__title _code_exam">Code & Exam</span>
                    <span class="t-header__title _room">Room</span>
                    <span class="t-header__title _seat">Seat</span>
                    <span class="t-header__title _duration">Duration</span>
                  </div>
                  <Show when={state.timetable.length > 0}>
                    <For each={state.timetable}>
                      {(data: ExamsResponse.TimetableType) => (
                        <div class="t-body">
                          <div class="t-row">
                            <div class="t-timetable__text _date_start">
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
                                    <span class="_grey">
                                      {formatDate({ date: data.datetime })}
                                    </span>
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
                            <div class="t-timetable__text _board_level">
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
                                    <span class="_grey">
                                      {data.board || "-"}
                                    </span>
                                    <span>{data.level || "-"}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div class="t-timetable__text _code_exam">
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
                                    <span class="_grey">
                                      {data.code || "-"}
                                    </span>
                                    <span>{data.title}</span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div class="t-timetable__text _room">
                              {data.room}
                            </div>
                            <div class="t-timetable__text _seat">
                              {data.seat}
                            </div>
                            <div class="t-timetable__text _duration">
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
                <div class="t-entries">
                  <div class="t-header">
                    <span class="t-header__title _date_start">
                      Date & Start Time
                    </span>
                    <span class="t-header__title _board_level">
                      Board & Level
                    </span>
                    <span class="t-header__title _code_exam">Code & Exam</span>
                  </div>
                  <Show when={state.entries.length > 0}>
                    <For each={state.entries}>
                      {(data: ExamsResponse.EntryType) => (
                        <div class="t-body">
                          <div class="t-row">
                            <div class="t-timetable__text _date_start">
                              {data.season}
                            </div>
                            <div class="t-timetable__text _board_level">
                              <div
                                style={{
                                  display: "flex",
                                  "flex-direction": "column",
                                }}
                              >
                                <span class="_grey">{data.board || "-"}</span>
                                <span>{data.level || "-"}</span>
                              </div>
                            </div>
                            <div class="t-timetable__text _code_exam">
                              <div
                                style={{
                                  display: "flex",
                                  "flex-direction": "column",
                                }}
                              >
                                <span class="_grey">{data.code || "-"}</span>
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
                <div class="t-results">
                  <div class="t-header">
                    <span class="t-header__title _date">Date</span>
                    <span class="t-header__title _board_level">
                      Board & Level
                    </span>
                    <span class="t-header__title _code_exam">Code & Exam</span>
                    <span class="t-header__title _result">Result</span>
                    <span class="t-header__title _equivalent">Equivalent</span>
                  </div>
                  <Show when={state.results.length > 0}>
                    <For each={state.results}>
                      {(data: ExamsResponse.ResultType) => (
                        <div class="t-body">
                          <div class="t-row">
                            <div class="t-timetable__text _date">
                              {data.date}
                            </div>
                            <div class="t-timetable__text _board_level">
                              <div
                                style={{
                                  display: "flex",
                                  "flex-direction": "column",
                                }}
                              >
                                <span class="_grey">{data.board || "-"}</span>
                                <span>{data.level || "-"}</span>
                              </div>
                            </div>
                            <div class="t-timetable__text _code_exam">
                              <div
                                style={{
                                  display: "flex",
                                  "flex-direction": "column",
                                }}
                              >
                                <span class="_grey">{data.code || "-"}</span>
                                <span>{data.title}</span>
                              </div>
                            </div>
                            <div class="t-timetable__text _result">
                              {data.result}
                            </div>
                            <div class="t-timetable__text _equivalent">
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
