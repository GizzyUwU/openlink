import {
  onMount,
  onCleanup,
  createSignal,
  createMemo,
  For,
  Show,
  batch
} from "solid-js";
import { createStore, produce } from "solid-js/store";
import type { TimetableResponse } from "../../types/api/timetable";
import { useToast } from "../toast";
let dropdownRef: HTMLDivElement | undefined;
let buttonRef: HTMLButtonElement | undefined;
import { HiOutlineClock } from "solid-icons/hi";
import { Transition } from "solid-transition-group";
import type { ClubResponse, ClubsResponse } from "../../types/api/clubs";
import type { SessionData } from "../../types/auth";
import type { EdulinkAPI } from "../../api/main";
import { ExamsResponse } from "../../types/api/exams";

function Timetable(props: Readonly<{
  setProgress: (value: number) => void;
  progress: () => number;
  sessionData: () => SessionData;
  edulink: EdulinkAPI;
  theme: string;
  clubData: ClubsResponse.ClubType[];
}>) {
  const [styles, setStyles] = createSignal<{ [key: string]: string } | null>(
    null,
  );
  const toast = useToast();
  const [state, setState] = createStore<{
    currentDay?: TimetableResponse.Day;
    currentWeek?: TimetableResponse.Week;
    weeks?: TimetableResponse.Week[];
    weekDropdown?: boolean;
  }>({});

  const currentDay = createMemo(() => state.currentDay);


  const currentWeeksClubs = createMemo(() => {
    const week = state.currentWeek;
    if (!week) return {};
    return props.clubData.reduce((acc, club) => {
      if (!club?.next_session) return acc;
      const date = new Date(club.next_session).toISOString().split("T")[0];
      if (week.days.some((d) => d.date === date)) {
        const clubsForDate = acc[date] ??= [];
        clubsForDate.push(club);
      }
      return acc;
    }, {} as Record<string, ClubsResponse.ClubType[]>);
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

  async function insertNewPeriod({
    day = currentDay(),
    periodData,
  }: {
    day?: TimetableResponse.Day;
    periodData: TimetableResponse.Period;
  }) {
    if (!day || !periodData) {
      console.error("[Insert New Period] Missing day or periodData");
      return false;
    }
    const existing = day.periods.find(
      (p) => p.start_time === periodData.start_time && p.end_time === periodData.end_time
    );
    if (existing) {
      console.warn("[Insert New Period] Period already exists at this time");
      return false;
    }

    const toMinutes = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };

    batch(() => {
      setState(
        produce((state) => {
          if (!state.weeks) return;
          const weekIndex = state.weeks.findIndex((w) =>
            w.days.some((d) => d.date === day.date)
          );
          if (weekIndex === -1) return;
          const dayIndex = state.weeks[weekIndex].days.findIndex((d) => d.date === day.date);
          if (dayIndex === -1) return;

          let newPeriods: TimetableResponse.Period[] = [];
          const newStart = toMinutes(periodData.start_time);
          const newEnd = toMinutes(periodData.end_time);

          for (const p of day.periods) {
            const start = toMinutes(p.start_time);
            const end = toMinutes(p.end_time);

            if (end <= newStart || start >= newEnd) {
              newPeriods.push({ ...p });
            } else if (start < newStart && end > newEnd) {
              newPeriods.push({ ...p, end_time: periodData.start_time });
              newPeriods.push({ ...p, start_time: periodData.end_time });
            } else if (start < newStart && end <= newEnd) {
              newPeriods.push({ ...p, end_time: periodData.start_time });
            } else if (start >= newStart && end > newEnd) {
              newPeriods.push({ ...p, start_time: periodData.end_time });
            }
          }

          let inserted = false;
          for (let i = 0; i < newPeriods.length; i++) {
            const p = newPeriods[i];
            const start = toMinutes(p.start_time);
            const end = toMinutes(p.end_time);
            if (newStart < start || (newStart === start && newEnd < end)) {
              newPeriods.splice(i, 0, { ...periodData });
              inserted = true;
              break;
            }
          }
          if (!inserted) newPeriods.push({ ...periodData });

          state.weeks[weekIndex].days[dayIndex] = { ...day, periods: newPeriods };
          if (state.currentDay?.date === day.date) {
            state.currentDay = { ...day, periods: newPeriods };
          }
        })
      );
    });
  }

  async function insertNewLesson({
    day = currentDay(),
    lessonData,
    overwrite = false,
  }: {
    day?: TimetableResponse.Day;
    lessonData: TimetableResponse.Lesson;
    overwrite?: boolean;
  }) {
    if (!day || !lessonData) {
      console.error("[Insert New Lesson] Missing day or lessonData");
      return false;
    }

    const periodExists = day.periods.some((p) => Number(p.id) === Number(lessonData.period_id));
    if (!periodExists) {
      console.error("[Insert New Lesson] Cannot insert into non-existent period");
      return false;
    }

    const existingLesson = day.lessons.find(
      (l) => Number(l.period_id) === Number(lessonData.period_id)
    );

    if (existingLesson && !overwrite) {
      console.warn("[Insert New Lesson] Lesson already exists and overwrite=false");
      return false;
    }

    batch(() => {
      setState(
        produce((state) => {
          if (!state.weeks) return;
          for (const week of state.weeks) {
            const d = week.days.find((d) => d.date === day.date);
            if (!d) continue;

            const idx = d.lessons.findIndex(
              (l) => l.period_id === lessonData.period_id
            );
            if (idx >= 0) {
              d.lessons[idx] = lessonData;
            } else {
              d.lessons.push(lessonData);
            }
            if (state.currentDay?.date === d.date) {
              state.currentDay = d;
            }
            if (state.currentWeek?.name === week.name) {
              state.currentWeek = week;
            }

            break;
          }
        })
      );
    });
  }

  function updatedDay(day: TimetableResponse.Day) {
    return state.weeks
      ?.find(w => w.days.some(d => d.date === day.date))
      ?.days.find(d => d.date === day.date);
  }


  async function insertClubs() {
    if (state.weeks === undefined) return;
    for (const week of state.weeks) {
      for (const day of week.days) {
        const dayClubs = currentWeeksClubs()[day.date] ?? [];
        if (!dayClubs.length || !day.periods || !day.lessons) continue;
        const updatedPeriods = [...day.periods];

        const clubDetailsList: ClubResponse[] = await Promise.all(
          dayClubs.map((club) =>
            props.edulink.getClub(
              club.id,
              props.sessionData()?.authtoken,
              props.sessionData()?.apiUrl
            )
          )
        );

        for (let i = 0; i < dayClubs.length; i++) {
          const club = dayClubs[i];
          const clubDetails = clubDetailsList[i];
          const session = clubDetails.result.club.sessions?.find(
            (s) => s.start_time === club.next_session
          );
          if (!session) continue;

          const startTime = session.start_time.split(" ")[1]?.slice(0, 5);
          const endTime = session.end_time.split(" ")[1]?.slice(0, 5);
          if (!startTime || !endTime) continue;

          const alreadyExists = updatedPeriods.some(
            (p) => p.start_time === startTime && p.end_time === endTime
          );


          if (alreadyExists === false) {
            const newPeriod: TimetableResponse.Period = {
              id: club.id,
              name: `${day.name}:Club`,
              start_time: startTime,
              end_time: endTime,
            };

            await insertNewPeriod({ day: updatedDay(day), periodData: newPeriod });
            updatedPeriods.push(newPeriod);
          }

          const rawLeaders = clubDetails.result.club.leaders_names;
          let leaders: string[] = [];

          if (Array.isArray(rawLeaders)) {
            leaders = rawLeaders.filter((n): n is string => !!n);
          } else if (rawLeaders) {
            leaders = [rawLeaders];
          }

          const matchingPeriod = updatedPeriods.find(
            (p) => p.start_time === startTime && p.end_time === endTime
          );

          const clubLesson: TimetableResponse.Lesson = {
            description: club.name,
            period_id:  Number(matchingPeriod?.id),
            room: { id: 1, name: club.location || "TBD" },
            room_id: 1,
            teacher: leaders,
            teaching_group: { id: 1, name: "", subject: club.name },
          };

          await insertNewLesson({ day: updatedDay(day), lessonData: clubLesson, overwrite: true });
        }
      }
    }
  }

  async function insertExams(data: ExamsResponse.TimetableType[]) {
    if (state.weeks === undefined) return;
    for (const week of state.weeks) {
      for (const day of week.days) {
        const dayExams = (data.filter(item => item.datetime.startsWith(day.date))) ?? [];
        if (!dayExams.length || !day.periods || !day.lessons) continue;
        const updatedPeriods = [...day.periods];

        for (const exam of dayExams) {
          const hoursMatch = /(\d+)\s*hr/.exec(exam.duration);
          const minutesMatch = /(\d+)\s*m/.exec(exam.duration);
          const h = hoursMatch ? Number(hoursMatch[1]) : 0;
          const m = minutesMatch ? Number(minutesMatch[1]) : 0;
          const end = new Date(new Date(exam.datetime).getTime() + (h * 3600 + m * 60) * 1000);
          const startTime = new Date(exam.datetime).toTimeString().slice(0, 5);
          const endTime = end.toTimeString().slice(0, 5);
          const periodId = Number(startTime.replace(":", "") + endTime.replace(":", ""));
          const alreadyExists = updatedPeriods.some(
            (p) => p.start_time === startTime && p.end_time === endTime
          );

          if (alreadyExists === false) {
            const newPeriod: TimetableResponse.Period = {
              id: periodId,
              name: `Exam`,
              start_time: startTime,
              end_time: endTime,
            };
            await insertNewPeriod({ day: updatedDay(day), periodData: newPeriod });
            updatedPeriods.push(newPeriod);
          }

          const matchingPeriod = updatedPeriods.find(
            (p) => p.start_time === startTime && p.end_time === endTime
          );

          const clubLesson: TimetableResponse.Lesson = {
            description: "",
            period_id: Number(matchingPeriod?.id ?? periodId),
            room: { id: 1, name: `${exam.room} - ${exam.seat}` || "TBD" },
            room_id: 1,
            teacher: ["EXAMINATION"],
            teaching_group: { id: 1, name: String(exam.code), subject: String(exam.title) },
          };
          await insertNewLesson({ day: updatedDay(day), lessonData: clubLesson, overwrite: true });
        }
      }
    }
  }

  onMount(async () => {
    props.setProgress(0.6);
    document.addEventListener("mouseup", handleClick);
    const cssModule = await import(
      `../../public/assets/css/${props.theme}/timetable.module.css`
    );
    setStyles({ ...cssModule.default, ...cssModule });

    const timetable: TimetableResponse = await props.edulink.getTimetable(
      props.sessionData()?.user?.id,
      props.sessionData()?.authtoken,
      props.sessionData()?.apiUrl,
    );

    const waitExamTimetable: Promise<ExamsResponse> = props.edulink.getExams(
      props.sessionData()?.user?.id,
      props.sessionData()?.authtoken,
      props.sessionData()?.apiUrl,
      "timetable",
    );

    if (!timetable.result.success) {
      toast.showToast(
        "Error",
        timetable.result.error ?? "Unknown error",
        "error",
      );
      props.setProgress(0);
      return;
    }

    props.setProgress(0.8);
    const validWeeks = timetable.result.weeks.map((week) => ({
      ...week,
      days: week.days.filter(
        (d) =>
          d &&
          Array.isArray(d.periods) &&
          Array.isArray(d.lessons) &&
          (d.periods.length > 0 || d.lessons.length > 0)
      ),
    })).filter(week => week.days.length > 0);

    const currentWeekData =
      validWeeks.find((w) => w.is_current === true || w.name === "Current") ||
      validWeeks[0] ||
      { days: [], name: "Unknown" };

    batch(() => {
      setState({
        weeks: validWeeks,
        currentWeek: currentWeekData,
        currentDay:
          currentWeekData.days.find((d) => d.is_current) || currentWeekData.days[0],
      });
    });

    props.setProgress(1);
    if ((state.currentWeek?.days?.length ?? 0) > 0 && Object.keys(currentWeeksClubs()).length > 0) await insertClubs()
    const examTimetable = await waitExamTimetable;
    if ((state.currentWeek?.days?.length ?? 0) > 0 && examTimetable.result.timetable.length > 0) await insertExams(examTimetable.result.timetable)
  });

  onCleanup(() => {
    document.removeEventListener("click", handleClick);
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
                class={`${styles()!["__nav"]} inline-flex justify-between min-w-16 max-w-xs px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none cursor-pointer`}
              >
                <div>{state.currentWeek?.name}</div>
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
                            if (week.name === state.currentWeek?.name)
                              return setState("weekDropdown", false);

                            const validDays = week?.days?.filter((d: TimetableResponse.Day) => d.lessons?.length || d.periods?.length) ?? []
                            batch(() => {
                              setState(
                                produce((state) => {
                                  state.weekDropdown = false;
                                  state.currentWeek = {
                                    ...week,
                                    days: validDays.length ? validDays : [],
                                  };
                                  state.currentDay = week.days?.[0];
                                }))
                            })
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
              <For each={state.currentWeek?.days}>
                {(day) => (
                  <button
                    type="button"
                    onClick={async () => {
                      batch(() => {
                        setState(
                          produce((state) => {
                            if (!state.currentWeek) return;

                            state.currentWeek.days = state.currentWeek.days.map((d) =>
                              d.date === day.date
                                ? { ...d }
                                : d
                            );

                            state.currentDay = { ...day };
                          })
                        );
                      });
                    }}

                    class={`text-sm text-white cursor-pointer ${day.name === state.currentDay?.name
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
                <For each={state.currentDay?.periods}>
                  {(period) => {
                    const lesson = createMemo(() =>
                      state.currentDay?.lessons?.find(
                        (l) => Number(l.period_id) === Number(period.id),
                      ),
                    );

                    return (
                      <div class={styles()!["t-row"]}>
                        <div class={styles()!["_grey"]}>{period.name}</div>
                        <div class={styles()!["_left"]}>
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
                                ? `(${lesson()?.teaching_group?.name})`
                                : ""}
                            </div>
                          </div>
                        </div>
                        <div
                          class={styles()!["_left"]}
                        >
                          {lesson()?.room?.name || "-"}
                        </div>
                        <div class={styles()!["_left"]}>
                          {(() => {
                            const tRaw =
                              lesson()?.teacher ?? lesson()?.teachers;

                            if (!tRaw) return "-";

                            const teachersArray: (
                              | string
                              | {
                                id: number | string;
                                title?: string;
                                forename?: string;
                                surname?: string;
                              }
                            )[] = Array.isArray(tRaw)
                                ? tRaw.flatMap((t) =>
                                  Array.isArray(t) ? t : [t],
                                )
                                : [tRaw];

                            return teachersArray
                              .map((teacher) => {
                                if (typeof teacher === "string") return teacher;
                                return `${teacher.title ?? ""} ${teacher.forename ?? ""} ${teacher.surname ?? ""}`.trim();
                              })
                              .join(", ");
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
      </Show >
    </Transition >
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
