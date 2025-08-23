import { onMount, onCleanup, createSignal, Show, For } from "solid-js";
import { makePersisted } from "@solid-primitives/storage";
import { useEdulink } from "../../api/edulink";
import { useToast } from "../toast";
import { AiOutlineLineChart } from "solid-icons/ai";
import { Transition } from "solid-transition-group";
import { createStore } from "solid-js/store";
import type { AttendanceResponse } from "../../types/api/attendance";
import { Pie } from "solid-chartjs";

function Attendance(props: {
  setProgress: (value: number) => void;
  progress: () => number;
}) {
  let styleElement: HTMLLinkElement;
  const edulink = useEdulink();
  const toast = useToast();
  const [state, setState] = createStore<{
    lessons: AttendanceResponse.LessonType[];
    currentMonthStatutory: AttendanceResponse.StatutoryType[];
    statutory: AttendanceResponse.StatutoryType[];
    todaySessions: AttendanceResponse.SessionsType[];
    activePage:
      | "Lesson Academic Year"
      | "Statutory Month"
      | "Statutory Academic Year";
  }>({
    lessons: [],
    currentMonthStatutory: [],
    statutory: [],
    todaySessions: [],
    activePage: "Statutory Month",
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
    const styleUrl = new URL("../../assets/css/attendance.css", import.meta.url)
      .href;
    styleElement = document.createElement("link");
    styleElement.rel = "preload";
    styleElement.as = "style";
    styleElement.href = `${styleUrl}?t=${Date.now()}`;
    styleElement.onload = () => {
      styleElement.rel = "stylesheet";
    };
    document.getElementById("item-box")?.appendChild(styleElement);

    const response = await edulink.getAttendance(
      sessionData()?.user?.id,
      sessionData()?.authtoken,
      apiUrl(),
    );

    if (response.result.success) {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      const currentMonthStatutory = response.result.statutory.filter(
        (s: AttendanceResponse.StatutoryType) => s.month === currentMonth,
      );
      setState({
        lessons: response.result.lesson,
        statutory: response.result.statutory,
        todaySessions: response.result.today?.sessions,
        currentMonthStatutory:
          currentMonthStatutory.length > 0
            ? currentMonthStatutory
            : response.result.statutory,
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
    styleElement.remove();
    props.setProgress(0);
  });

  function calculatePercent(
    present: number,
    unauthorised: number,
    absent: number,
  ) {
    const total = present + unauthorised + absent;

    const presentPercentage = ((present / total) * 100).toFixed(2);
    const unauthorisedPercentage = ((unauthorised / total) * 100).toFixed(2);
    const absentPercentage = ((absent / total) * 100).toFixed(2);

    return {
      present: parseFloat(presentPercentage),
      unauthorised: parseFloat(unauthorisedPercentage),
      absent: parseFloat(absentPercentage),
    };
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
      <Show when={props.progress() === 1 && state.statutory}>
        <div class="box-container">
          <div class="flex items-center justify-end w-full pr-[10px]">
            <div class="flex space-x-4 mb-2">
              <For
                each={
                  [
                    "Lesson Academic Year",
                    "Statutory Month",
                    "Statutory Academic Year",
                  ] as const
                }
              >
                {(name) => (
                  <button
                    type="button"
                    onClick={() => {
                      if (state.activePage === name) return;
                      setState("activePage", name);
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
            <div class="t-attendance">
              <Show when={state.activePage === "Statutory Month"}>
                {(() => {
                  const values = state.currentMonthStatutory[0]?.values ?? {
                    present: 0,
                    unauthorised: 0,
                    absent: 0,
                  };
                  const percent = calculatePercent(
                    values.present,
                    values.unauthorised,
                    values.absent,
                  );

                  return (
                    <>
                      <div class="attendance__statutory-left">
                        <div class="b-graph">
                          <div class="b-graph__graph">
                            <Pie
                              type="doughnut"
                              height={210}
                              width={210}
                              labels="meow"
                              data={{
                                datasets: [
                                  {
                                    data: [
                                      percent.present,
                                      percent.unauthorised,
                                      percent.absent,
                                    ],
                                    backgroundColor: [
                                      "rgb(44, 201, 145)",
                                      "rgb(238, 84, 59)",
                                      "rgb(252, 185, 66)",
                                    ],
                                    hoverOffset: 4,
                                  },
                                ],
                              }}
                            />
                          </div>
                          <div class="b-graph__aliases">
                            <div class="__alias">
                              <span
                                class="marker"
                                style="border-color: rgb(44, 201, 145);"
                              />
                              Present{" "}
                              <span class="__value">
                                {percent.present ?? 0}%
                              </span>
                            </div>
                            <div class="__alias">
                              <span
                                class="marker"
                                style="border-color: rgb(238, 84, 59);"
                              />
                              Unauthorized{" "}
                              <span class="__value">
                                {percent.unauthorised ?? 0}%
                              </span>
                            </div>
                            <div class="__alias">
                              <span
                                class="marker"
                                style="border-color: rgb(252, 185, 66);"
                              />
                              Absent{" "}
                              <span class="__value">
                                {percent.absent ?? 0}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div class="attendance__statutory-right">
                        <div class="t-header">
                          <span class="t-header__title _description">
                            Description
                          </span>
                          <span class="t-header__title _date">Date</span>
                          <span class="t-header__title _type">Type</span>
                          <span class="t-header__title _period">Period</span>
                        </div>
                        <div class="t-body">
                          <For each={state.currentMonthStatutory[0].exceptions}>
                            {(exception) => (
                              <div class="t-row">
                                <span class="t-timetable__text _description _grey">
                                  {exception.description}
                                </span>
                                <span class="t-timetable__text _description _grey">
                                  {exception.date}
                                </span>
                                <span class="t-timetable__text _description _grey">
                                  {exception.type}
                                </span>
                                <span class="t-timetable__text _description _grey">
                                  {exception.period}
                                </span>
                              </div>
                            )}
                          </For>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </Show>
              <Show when={state.activePage === "Statutory Academic Year"}>
                {(() => {
                  const totals = state.statutory.reduce(
                    (acc, item) => {
                      const values = item.values ?? {
                        present: 0,
                        unauthorised: 0,
                        absent: 0,
                      };
                      acc.present += values.present;
                      acc.unauthorised += values.unauthorised;
                      acc.absent += values.absent;
                      return acc;
                    },
                    { present: 0, unauthorised: 0, absent: 0 },
                  );
                  const percent = calculatePercent(
                    totals.present,
                    totals.unauthorised,
                    totals.absent,
                  );

                  return (
                    <>
                      <div class="attendance__statutory-left">
                        <div class="b-graph">
                          <div class="b-graph__graph">
                            <Pie
                              type="doughnut"
                              height={210}
                              width={210}
                              labels="meow"
                              data={{
                                datasets: [
                                  {
                                    data: [
                                      percent.present,
                                      percent.unauthorised,
                                      percent.absent,
                                    ],
                                    backgroundColor: [
                                      "rgb(44, 201, 145)",
                                      "rgb(238, 84, 59)",
                                      "rgb(252, 185, 66)",
                                    ],
                                    hoverOffset: 4,
                                  },
                                ],
                              }}
                            />
                          </div>
                          <div class="b-graph__aliases">
                            <div class="__alias">
                              <span
                                class="marker"
                                style="border-color: rgb(44, 201, 145);"
                              />
                              Present{" "}
                              <span class="__value">
                                {percent.present ?? 0}%
                              </span>
                            </div>
                            <div class="__alias">
                              <span
                                class="marker"
                                style="border-color: rgb(238, 84, 59);"
                              />
                              Unauthorized{" "}
                              <span class="__value">
                                {percent.unauthorised ?? 0}%
                              </span>
                            </div>
                            <div class="__alias">
                              <span
                                class="marker"
                                style="border-color: rgb(252, 185, 66);"
                              />
                              Absent{" "}
                              <span class="__value">
                                {percent.absent ?? 0}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div class="attendance__statutory-right">
                        <div class="t-header">
                          <span class="t-header__title _description">
                            Description
                          </span>
                          <span class="t-header__title _date">Date</span>
                          <span class="t-header__title _type">Type</span>
                          <span class="t-header__title _period">Period</span>
                        </div>
                        <div class="t-body">
                          <For
                            each={state.currentMonthStatutory.flatMap(
                              (s) => s.exceptions,
                            )}
                          >
                            {(exception) => (
                              <div class="t-row">
                                <span class="t-timetable__text _description _grey">
                                  {exception.description}
                                </span>
                                <span class="t-timetable__text _description _grey">
                                  {exception.date}
                                </span>
                                <span class="t-timetable__text _description _grey">
                                  {exception.type}
                                </span>
                                <span class="t-timetable__text _description _grey">
                                  {exception.period}
                                </span>
                              </div>
                            )}
                          </For>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </Show>
            </div>
          </div>
        </div>
      </Show>
    </Transition>
  );
}

export default {
  name: "Attendance",
  icon: () => {
    return <AiOutlineLineChart size={36} />;
  },
  pos: 4,
  component: Attendance,
};
