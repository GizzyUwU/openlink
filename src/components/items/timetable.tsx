import { onMount, onCleanup, createSignal, For, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { makePersisted } from "@solid-primitives/storage";
import type { TimetableResponse } from "../../types/api/timetable";
import { useToast } from "../toast";
let dropdownRef: HTMLDivElement | undefined;
import { HiOutlineClock } from "solid-icons/hi";
import { Transition } from "solid-transition-group";

function Timetable(props: {
  setProgress: (value: number) => void;
  progress: () => number;
  edulink: any;
}) {
  let styleElement: HTMLLinkElement;
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
    if (!dropdownRef?.contains(event.target as Node)) {
      setState("weekDropdown", false);
    }
  };

  onMount(async () => {
    const styleUrl = new URL("../../assets/css/behaviour.css", import.meta.url)
      .href;
    styleElement = document.createElement("link");
    styleElement.rel = "preload";
    styleElement.as = "style";
    styleElement.href = `${styleUrl}?t=${Date.now()}`;
    styleElement.onload = () => {
      styleElement.rel = "stylesheet";
    };
    document.getElementById("item-box")?.appendChild(styleElement);

    const timetablePromise = props.edulink.getTimetable(
      sessionData()?.user?.id,
      sessionData()?.authtoken,
      apiUrl(),
    );

    const timetable: TimetableResponse = await timetablePromise;
    if (timetable.result.success) {
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
    if (styleElement) {
      styleElement.remove();
    }
    document.removeEventListener("click", handleClick);
    props.setProgress(0);
  });

  function getLessonForPeriod(periodId: number | string) {
    return state.dayLessons?.find((l) => l.period_id == periodId);
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
          <div class="flex items-center justify-between w-full">
            <div class="relative inline-block text-left">
              <button
                type="button"
                onClick={() => setState("weekDropdown", !state.weekDropdown)}
                class="__nav inline-flex justify-between min-w-[4rem] max-w-xs px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none cursor-pointer"
              >
                <span>{state.weekName}</span>
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
                  class="absolute z-10 mt-2 origin-top-right bg-white border left-1 border-gray-400 divide-y divide-gray-100 rounded-md shadow-lg min-h-max min-w-max"
                  ref={dropdownRef}
                >
                  <div class="py-1">
                    <For each={state.weeks}>
                      {(week) => (
                        <button
                          onClick={() => {
                            console.log(week.name, state.weekName);
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
                          class="block w-full text-left px-4 py-1 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
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

          <div class="t-container">
            <div
              class="t-timetable"
              style={{ display: "flex", "flex-direction": "column" }}
            >
              <div class="t-header">
                <span class="t-header__title _period">Period</span>
                <span class="t-header__title _subject">Subject</span>
                <span class="t-header__title _room">Room</span>
                <span class="t-header__title _teacher">Teacher</span>
                <span class="t-header__title _start">Start</span>
                <span class="t-header__title _end">End</span>
              </div>
              <div class="t-body">
                {state.dayPeriods?.map((period) => {
                  const lesson = getLessonForPeriod(period.id);
                  return (
                    <div class="t-row">
                      <span class="t-timetable__text _period _grey">
                        {period.name}
                      </span>
                      <span class="t-timetable__text _subject">
                        <div
                          style={{
                            display: "flex",
                            "flex-direction": "column",
                          }}
                        >
                          <span>{lesson?.teaching_group?.subject || "-"}</span>
                          <span class="_grey">
                            {lesson?.teaching_group?.name
                              ? `(${lesson.teaching_group.name})`
                              : ""}
                          </span>
                        </div>
                      </span>
                      <span class="t-timetable__text _room">
                        {lesson?.room?.name || "-"}
                      </span>
                      <span class="t-timetable__text _teacher">
                        {(() => {
                          const t = lesson?.teacher ?? lesson?.teachers;
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
                      </span>
                      <span class="t-timetable__text _start">
                        {period.start_time}
                      </span>
                      <span class="t-timetable__text _end">
                        {period.end_time}
                      </span>
                    </div>
                  );
                })}
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
