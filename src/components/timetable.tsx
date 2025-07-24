import { onMount, createSignal } from "solid-js";
import { makePersisted } from "@solid-primitives/storage";
import { useEdulink } from "../api/edulink";
import type { TimetableResponse } from "../types/api/timetable";

function Timetable() {
    let styleElement: HTMLLinkElement;
    const edulink = useEdulink();
    const [sessionData] = makePersisted(createSignal<any>(null), {
        storage: sessionStorage,
        name: "sessionData"
    });
    const [apiUrl] = makePersisted(createSignal<any>(null), {
        storage: sessionStorage,
        name: "apiUrl"
    });

    const [dayPeriods, setDayPeriods] = createSignal<any[]>([]);
    const [dayLessons, setDayLessons] = createSignal<any[]>([]);
    const [dayName, setDayName] = createSignal<string>("");

    onMount(async () => {
        styleElement = document.createElement("link");
        styleElement.rel = "stylesheet";
        styleElement.href = "/src/assets/css/timetable.css";
        document.head.appendChild(styleElement);

        const timetablePromise = edulink.getTimetable(
            sessionData()?.user?.id,
            sessionData()?.authtoken,
            apiUrl()
        );

        const timetable: TimetableResponse = await timetablePromise;

        const currentWeek = timetable.result.weeks.find(w => w.is_current) || timetable.result.weeks[0];
        const currentDay = currentWeek.days.find(d => d.is_current) || currentWeek.days[0];
        console.log("Current Day:", currentDay.lessons);
        console.log("Current Periods:", currentDay.periods);
        setDayName(currentDay.name);
        setDayPeriods(currentDay.periods);
        setDayLessons(currentDay.lessons || []);
    });

    function getLessonForPeriod(periodId: number | string) {
        return dayLessons().find(l => l.period_id == periodId);
    }

    return (
        <div class="box-container">
            {/* <div class="__nav">{dayName()}</div> */}
            <div class="t-container">
                <div class="t-timetable" style={{ display: "flex", "flex-direction": "column" }}>
                    <div class="t-header">
                        <span class="t-header__title _period">Period</span>
                        <span class="t-header__title _subject">Subject</span>
                        <span class="t-header__title _room">Room</span>
                        <span class="t-header__title _teacher">Teacher</span>
                        <span class="t-header__title _start">Start</span>
                        <span class="t-header__title _end">End</span>
                    </div>
                    <div class="t-body">
                        {dayPeriods().map(period => {
                            const lesson = getLessonForPeriod(period.id);
                            console.log(lesson)
                            return (
                                <div class="t-row">
                                    <span class="t-timetable__text _period _grey">{period.name}</span>
                                    <span class="t-timetable__text _subject">
                                        <div style={{ display: "flex", "flex-direction": "column", }}>
                                            <span>{lesson?.teaching_group?.subject || "-"}</span>
                                            <span class="_grey">
                                                {lesson?.teaching_group?.name ? `(${lesson.teaching_group.name})` : ""}
                                            </span>
                                        </div>
                                    </span>
                                    <span class="t-timetable__text _room">
                                        {lesson?.room?.name || "-"}
                                    </span>
                                    <span class="t-timetable__text _teacher">
                                        {lesson?.teacher
                                            ? `${lesson.teacher.title} ${lesson.teacher.forename} ${lesson.teacher.surname}`
                                            : "-"}
                                    </span>
                                    <span class="t-timetable__text _start">{period.start_time}</span>
                                    <span class="t-timetable__text _end">{period.end_time}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Timetable;