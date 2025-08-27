import { onMount, onCleanup, createSignal, Show, For } from "solid-js";
import { makePersisted } from "@solid-primitives/storage";
import { useEdulink } from "../../api/edulink";
import { useToast } from "../toast";
import { AiOutlineLineChart } from "solid-icons/ai";
import { Transition } from "solid-transition-group";
import { createStore } from "solid-js/store";
import type { AttendanceResponse } from "../../types/api/attendance";
import type ApexCharts from "apexcharts";
import { SolidApexCharts } from "solid-apexcharts";
function Attendance(props: {
  setProgress: (value: number) => void;
  progress: () => number;
  theme: string;
}) {
  let chartRef: ApexCharts;
  const [styles, setStyles] = createSignal<{ [key: string]: string } | null>(
    null,
  );
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
    activePage: "Lesson Academic Year",
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
      `../../public/assets/css/${props.theme}/attendance.module.css`
    );
    const normalized: { [key: string]: string } = {
      ...cssModule.default,
      ...cssModule,
    };
    setStyles(normalized);
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
    if (document.getElementById("item-styling")) {
      document.getElementById("item-styling")?.remove();
    }
    props.setProgress(0);
  });

  function calculatePercent(
    present: number,
    unauthorised: number,
    absent: number,
    late?: number,
  ) {
    const total = present + unauthorised + absent + (late ?? 0);
    if (total === 0) {
      return late !== undefined
        ? { present: 0, unauthorised: 0, absent: 0, late: 0 }
        : { present: 0, unauthorised: 0, absent: 0 };
    }

    const presentPercentage = ((present / total) * 100).toFixed(2);
    const unauthorisedPercentage = ((unauthorised / total) * 100).toFixed(2);
    const absentPercentage = ((absent / total) * 100).toFixed(2);

    if (late) {
      const latePercentage = ((late / total) * 100).toFixed(2);
      return {
        present: parseFloat(presentPercentage),
        unauthorised: parseFloat(unauthorisedPercentage),
        absent: parseFloat(absentPercentage),
        late: parseFloat(latePercentage),
      };
    }

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
      <Show when={props.progress() === 1 && state.statutory && styles()}>
        <div class={styles()!["box-container"]}>
          <div class="flex items-center text-white justify-end w-full pr-[10px]">
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
                      console.log(name);
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
          <div class={styles()!["t-container"]}>
            <Show when={state.activePage !== "Lesson Academic Year"}>
              <div class={styles()!["t-attendance"]}>
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
                        <div class={styles()!["attendance__statutory-left"]}>
                          {Object.values(
                            state.currentMonthStatutory[0].values,
                          ).every((v) => v === 0) ? (
                            <div
                              class={`${styles()!["t-attendance"]} flex items-center justify-center h-full`}
                            >
                              <h1 class="text-center font-bold text-xl">
                                No Data
                              </h1>
                            </div>
                          ) : (
                            <div class={styles()!["b-graph"]}>
                              <div class={styles()!["b-graph__graph"]}>
                                <SolidApexCharts
                                  ref={chartRef!}
                                  type="donut"
                                  width={210}
                                  height={210}
                                  series={[
                                    percent.present ?? 0,
                                    percent.unauthorised ?? 0,
                                    percent.absent ?? 0,
                                  ]}
                                  options={{
                                    chart: { animations: { enabled: false } },
                                    labels: [
                                      "Present",
                                      "Unauthorized",
                                      "Absent",
                                    ],
                                    colors: [
                                      "rgb(44, 201, 145)",
                                      "rgb(238, 84, 59)",
                                      "rgb(252, 185, 66)",
                                    ],
                                    dataLabels: { enabled: false },
                                    markers: { size: 0 },
                                    plotOptions: {
                                      pie: {
                                        donut: {
                                          size: "54%",
                                          labels: { show: false },
                                        },
                                        expandOnClick: false,
                                      },
                                    },
                                    legend: { show: false },
                                  }}
                                />
                              </div>
                              <div class={styles()!["b-graph__aliases"]}>
                                <div class={styles()!["__alias"]}>
                                  <div
                                    class={styles()!["marker"]}
                                    style="border-color: rgb(44, 201, 145);"
                                  />
                                  Present{" "}
                                  <div class={styles()!["__value"]}>
                                    {percent.present ?? 0}%
                                  </div>
                                </div>
                                <div class={styles()!["__alias"]}>
                                  <div
                                    class={styles()!["marker"]}
                                    style="border-color: rgb(238, 84, 59);"
                                  />
                                  Unauthorized{" "}
                                  <div class={styles()!["__value"]}>
                                    {percent.unauthorised ?? 0}%
                                  </div>
                                </div>
                                <div class={styles()!["__alias"]}>
                                  <div
                                    class={styles()!["marker"]}
                                    style="border-color: rgb(252, 185, 66);"
                                  />
                                  Absent{" "}
                                  <div class={styles()!["__value"]}>
                                    {percent.absent ?? 0}%
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        <div class={styles()!["attendance__statutory-right"]}>
                          <div class={styles()!["t-header"]}>
                            <div>Description</div>
                            <div>Date</div>
                            <div>Type</div>
                            <div>Period</div>
                          </div>
                          <div class={styles()!["t-body"]}>
                            <For
                              each={state.currentMonthStatutory[0].exceptions}
                            >
                              {(exception) => (
                                <div class={styles()!["t-row"]}>
                                  <div
                                    class={
                                      styles()!["_description"] +
                                      " " +
                                      styles()!["_grey"]
                                    }
                                  >
                                    {exception.description}
                                  </div>
                                  <div class={styles()!["_grey"]}>
                                    {exception.date}
                                  </div>
                                  <div
                                    class={
                                      styles()!["_type"] +
                                      " " +
                                      styles()!["_grey"]
                                    }
                                  >
                                    {exception.type}
                                  </div>
                                  <div
                                    class={
                                      styles()!["_period"] +
                                      " " +
                                      styles()!["_grey"]
                                    }
                                  >
                                    {exception.period}
                                  </div>
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
                        <div class={styles()!["attendance__statutory-left"]}>
                          {Object.values(
                            state.currentMonthStatutory[0].values,
                          ).every((v) => v === 0) ? (
                            <div class="w-full h-full flex items-center justify-center">
                              <h1 class="font-bold text-xl">No Data</h1>
                            </div>
                          ) : (
                            <div class={styles()!["b-graph"]}>
                              <div class={styles()!["b-graph__graph"]}>
                                <SolidApexCharts
                                  ref={chartRef!}
                                  type="donut"
                                  width={210}
                                  height={210}
                                  series={[
                                    percent.present,
                                    percent.unauthorised,
                                    percent.absent,
                                  ]}
                                  options={{
                                    chart: {
                                      animations: {
                                        enabled: false,
                                      },
                                    },
                                    labels: [
                                      "Present",
                                      "Unauthorized",
                                      "Absent",
                                    ],
                                    colors: [
                                      "rgb(44, 201, 145)",
                                      "rgb(238, 84, 59)",
                                      "rgb(252, 185, 66)",
                                    ],
                                    dataLabels: {
                                      enabled: false,
                                    },
                                    markers: {
                                      size: 0,
                                    },
                                    plotOptions: {
                                      pie: {
                                        donut: {
                                          size: "54%",
                                          labels: {
                                            show: false,
                                          },
                                        },
                                        expandOnClick: false,
                                      },
                                    },
                                    legend: {
                                      show: false,
                                    },
                                  }}
                                />
                              </div>
                              <div class={styles()!["b-graph__aliases"]}>
                                <div class={styles()!["__alias"]}>
                                  <div
                                    class={styles()!["marker"]}
                                    style="border-color: rgb(44, 201, 145);"
                                  />
                                  Present{" "}
                                  <div class={styles()!["__value"]}>
                                    {percent.present ?? 0}%
                                  </div>
                                </div>
                                <div class={styles()!["__alias"]}>
                                  <div
                                    class={styles()!["marker"]}
                                    style="border-color: rgb(238, 84, 59);"
                                  />
                                  Unauthorized{" "}
                                  <div class={styles()!["__value"]}>
                                    {percent.unauthorised ?? 0}%
                                  </div>
                                </div>
                                <div class={styles()!["__alias"]}>
                                  <div
                                    class={styles()!["marker"]}
                                    style="border-color: rgb(252, 185, 66);"
                                  />
                                  Absent{" "}
                                  <div class={styles()!["__value"]}>
                                    {percent.absent ?? 0}%
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        <div class={styles()!["attendance__statutory-right"]}>
                          <div class={styles()!["t-header"]}>
                            <div>Description</div>
                            <div>Date</div>
                            <div>Type</div>
                            <div>Period</div>
                          </div>
                          <div class={styles()!["t-body"]}>
                            <For
                              each={state.currentMonthStatutory.flatMap(
                                (s) => s.exceptions,
                              )}
                            >
                              {(exception) => (
                                <div class={styles()!["t-row"]}>
                                  <div
                                    class={
                                      styles()!["_description"] +
                                      " " +
                                      styles()!["_grey"]
                                    }
                                  >
                                    {exception.description}
                                  </div>
                                  <div class={styles()!["_grey"]}>
                                    {exception.date}
                                  </div>
                                  <div
                                    class={
                                      styles()!["_type"] +
                                      " " +
                                      styles()!["_grey"]
                                    }
                                  >
                                    {exception.type}
                                  </div>
                                  <div
                                    class={
                                      styles()!["_period"] +
                                      " " +
                                      styles()!["_grey"]
                                    }
                                  >
                                    {exception.period}
                                  </div>
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
            </Show>
            <Show when={state.activePage === "Lesson Academic Year"}>
              {state.lessons.length > 0 ? (
                <div class={styles()!["progress-attendance"]}>
                  <For each={state.lessons}>
                    {(lesson) => {
                      const percent = calculatePercent(
                        lesson.values.present,
                        lesson.values.unauthorised,
                        lesson.values.absent,
                        lesson.values.late,
                      );

                      return (
                        <ul>
                          <li class={styles()!["__progress-item"]}>
                            <div class={styles()!["__title"]}>
                              {lesson.subject || "-"}
                            </div>
                            <div class={styles()!["b-graph"]}>
                              <div class={styles()!["b-graph__graph"]}>
                                <SolidApexCharts
                                  ref={chartRef!}
                                  type="donut"
                                  width={210}
                                  height={210}
                                  series={[
                                    percent.present,
                                    percent.unauthorised,
                                    percent.absent,
                                    percent.late ?? 0,
                                  ]}
                                  options={{
                                    chart: { animations: { enabled: false } },
                                    labels: [
                                      "Present",
                                      "Unauthorized",
                                      "Absent",
                                      "Late",
                                    ],
                                    colors: [
                                      "rgb(44, 201, 145)",
                                      "rgb(238, 84, 59)",
                                      "rgb(252, 185, 66)",
                                      "rgb(133, 209, 253)",
                                    ],
                                    dataLabels: { enabled: false },
                                    markers: { size: 0 },
                                    plotOptions: {
                                      pie: {
                                        donut: {
                                          size: "54%",
                                          labels: { show: false },
                                        },
                                        expandOnClick: false,
                                      },
                                    },
                                    legend: { show: false },
                                  }}
                                />
                              </div>
                              <div class={styles()!["b-graph__aliases"]}>
                                <div class={styles()!["__alias"]}>
                                  <div
                                    class={styles()!["marker"]}
                                    style="border-color: rgb(44, 201, 145);"
                                  />
                                  Present{" "}
                                  <div class={styles()!["__value"]}>
                                    {percent.present ?? 0}%
                                  </div>
                                </div>
                                <div class={styles()!["__alias"]}>
                                  <div
                                    class={styles()!["marker"]}
                                    style="border-color: rgb(238, 84, 59);"
                                  />
                                  Unauthorized{" "}
                                  <div class={styles()!["__value"]}>
                                    {percent.unauthorised ?? 0}%
                                  </div>
                                </div>
                                <div class={styles()!["__alias"]}>
                                  <div
                                    class={styles()!["marker"]}
                                    style="border-color: rgb(252, 185, 66);"
                                  />
                                  Absent{" "}
                                  <div class={styles()!["__value"]}>
                                    {percent.absent}%
                                  </div>
                                </div>
                                <div class={styles()!["__alias"]}>
                                  <div
                                    class={styles()!["marker"]}
                                    style="border-color: rgb(133, 209, 253);"
                                  />
                                  Late{" "}
                                  <div class={styles()!["__value"]}>
                                    {percent.late ?? 0}%
                                  </div>
                                </div>
                              </div>
                            </div>
                          </li>
                        </ul>
                      );
                    }}
                  </For>
                </div>
              ) : (
                <div
                  class={`${styles()!["t-attendance"]} flex items-center justify-center h-full`}
                >
                  <h1 class="text-center font-bold text-xl">No Data</h1>
                </div>
              )}
            </Show>
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
  pos: 6,
  component: Attendance,
};
