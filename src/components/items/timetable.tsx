import {
  onMount,
  onCleanup,
  createSignal,
  createMemo,
  For,
  Show,
} from "solid-js";
import { createStore } from "solid-js/store";
import { makePersisted } from "@solid-primitives/storage";
import type { TimetableResponse } from "../../types/api/timetable";
import { useToast } from "../toast";
let dropdownRef: HTMLDivElement | undefined;
let buttonRef: HTMLButtonElement | undefined;
import { HiOutlineClock } from "solid-icons/hi";
import { Transition } from "solid-transition-group";
import clsx from "clsx";
function Timetable(props: {
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
    dayPeriods?: TimetableResponse.Period[];
    dayLessons?: TimetableResponse.Lesson[];
    dayName?: string;
    weekName?: string;
    daysOfWeek?: string[];
    weeks?: TimetableResponse.Week[];
    daysThisWeek?: TimetableResponse.Day[];
    weekDropdown?: boolean;
  }>({});
  const [sessionData] = makePersisted(createSignal<any>(null), {
    storage: sessionStorage,
    name: "sessionData",
  });
  const [apiUrl] = makePersisted(createSignal<any>(null), {
    storage: sessionStorage,
    name: "apiUrl",
  });

  const handleClick = (event: MouseEvent) => {
    if (!state.weekDropdown) return;
    if (
      !dropdownRef?.contains(event.target as Node) &&
      !buttonRef?.contains(event.target as Node)
    ) {
      setState("weekDropdown", false);
    }
  };

  onMount(async () => {
    props.setProgress(0.6);
    document.addEventListener("mouseup", handleClick);

    const cssModule = await import(
      `../../public/assets/css/${props.theme}/timetable.module.css`
    );
    const normalized: { [key: string]: string } = {
      ...cssModule.default,
      ...cssModule,
    };
    setStyles(normalized);

    const timetable: TimetableResponse = await props.edulink.getTimetable(
      sessionData()?.user?.id,
      sessionData()?.authtoken,
      apiUrl(),
    );

    if (timetable.result.success) {
      props.setProgress(0.8);
      setState("weeks", timetable.result.weeks);
      const currentWeek =
        timetable.result.weeks.find((w) => w.is_current) ||
        timetable.result.weeks[0];
      const currentDay =
        currentWeek.days.find((d) => d.is_current) || currentWeek.days[0];

      setState("dayName", currentDay.name);
      setState("weekName", currentWeek.name);
      setState("dayPeriods", currentDay.periods);
      setState("dayLessons", currentDay.lessons || []);
      setState("weeks", timetable.result.weeks || []);
      setState("daysThisWeek", currentWeek.days || []);
      console.log(currentWeek.days);
      props.setProgress(1);
    } else {
      toast.showToast(
        "Error",
        timetable.result.error ?? "Unknown error",
        "error",
      );
      props.setProgress(0);
    }
  });

  onCleanup(() => {
    document.removeEventListener("click", handleClick);
    props.setProgress(0);
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
      <Show when={props.progress() === 1 && styles()}>
        <div class={styles()!["box-container"]}>
          <div class="flex items-center justify-between w-full">
            <div class="relative z-10 inline-block text-left">
              <button
                ref={buttonRef}
                type="button"
                onClick={() => setState("weekDropdown", !state.weekDropdown)}
                class={`${styles()!["__nav"]} inline-flex justify-between min-w-[4rem] max-w-xs px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none cursor-pointer`}
              >
                <div>{state.weekName}</div>
                <svg
                  class="w-5 h-5 ml-2 -mr-1"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fill-rule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
              <Show when={state.weekDropdown}>
                <div
                  class={`${styles()!["__dropdown"]} absolute z-10 mt-2 origin-top-right border left-1 border-gray-400 divide-y divide-gray-100 rounded-md shadow-lg min-h-max min-w-max`}
                  ref={dropdownRef}
                >
                  <div class="py-1">
                    <For each={state.weeks}>
                      {(week) => (
                        <button
                          onClick={() => {
                            if (week.name === state.weekName)
                              return setState("weekDropdown", false);
                            const matched = week.days?.[0];
                            setState("weekDropdown", false);
                            setState("dayName", matched?.name);
                            setState("weekName", week?.name);
                            setState("dayPeriods", matched?.periods || []);
                            setState("dayLessons", matched?.lessons || []);
                            setState("daysThisWeek", week.days);
                          }}
                          class="block w-full text-left px-4 py-1 text-sm cursor-pointer"
                        >
                          {week.name}
                        </button>
                      )}
                    </For>
                  </div>
                </div>
              </Show>
            </div>
            <div class="flex space-x-4 pr-[10px]">
              <For each={state.daysThisWeek}>
                {(day) => (
                  <button
                    type="button"
                    onClick={() => {
                      setState("dayName", day.name);
                      const matched = state.daysThisWeek?.find(
                        (d) => d.name === day.name,
                      );
                      setState("dayPeriods", matched?.periods || []);
                      setState("dayLessons", matched?.lessons || []);
                    }}
                    class={`text-sm text-white cursor-pointer ${
                      day.name === state.dayName
                        ? "border-b border-blue-400"
                        : ""
                    }`}
                  >
                    {day.name}
                  </button>
                )}
              </For>
            </div>
          </div>

          <div class={styles()!["t-container"]}>
            <div
              class={styles()!["t-timetable"]}
              style={{ display: "flex", "flex-direction": "column" }}
            >
              <div class={styles()!["t-header"]}>
                <div>Period</div>
                <div>Subject</div>
                <div>Room</div>
                <div>Teacher</div>
                <div>Start</div>
                <div>End</div>
              </div>
              <div class={styles()!["t-body"]}>
                <For each={state.dayPeriods}>
                  {(period) => {
                    const lesson = createMemo(() =>
                      state.dayLessons?.find(
                        (l) => Number(l.period_id) === Number(period.id),
                      ),
                    );

                    return (
                      <div class={styles()!["t-row"]}>
                        <div class={styles()!["_grey"]}>{period.name}</div>
                        <div class={styles()!["_subject"]}>
                          <div
                            style={{
                              display: "flex",
                              "flex-direction": "column",
                            }}
                          >
                            <div>
                              {lesson()?.teaching_group?.subject || "-"}
                            </div>
                            <div class={styles()!["_grey"]}>
                              {lesson()?.teaching_group?.name
                                ? `(${lesson()?.teaching_group.name})`
                                : ""}
                            </div>
                          </div>
                        </div>
                        <div
                          class={clsx(
                            styles()!["t-timetable__text"],
                            styles()!["_room"],
                          )}
                        >
                          {lesson()?.room?.name || "-"}
                        </div>
                        <div
                          class={clsx(
                            styles()!["t-timetable__text"],
                            styles()!["_teacher"],
                          )}
                        >
                          {(() => {
                            const t = lesson()?.teacher ?? lesson()?.teachers;
                            if (!t) return "-";

                            if (Array.isArray(t)) {
                              return t
                                .map((teacher) =>
                                  typeof teacher === "string"
                                    ? teacher
                                    : `${teacher.title ?? ""} ${teacher.forename ?? ""} ${teacher.surname ?? ""}`.trim(),
                                )
                                .join(", ");
                            }

                            return typeof t === "string"
                              ? t
                              : `${t.title ?? ""} ${t.forename ?? ""} ${t.surname ?? ""}`.trim();
                          })()}
                        </div>
                        <div>{period.start_time}</div>
                        <div>{period.end_time}</div>
                      </div>
                    );
                  }}
                </For>
              </div>
            </div>
          </div>
        </div>
      </Show>
    </Transition>
  );
}

export default {
  name: "Timetable",
  icon: () => {
    return <HiOutlineClock size={36} />;
  },
  pos: 1,
  component: Timetable,
};
