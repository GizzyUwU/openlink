import { onMount, createSignal, Show } from "solid-js";
import { Icon } from "@iconify-icon/solid";
import type { ClubsResponse } from "../types/api/clubs";
import type { StatusResponse, SessionData } from "../types/auth";
import type { EdulinkAPI } from "../api/main";
import type { Setter, Accessor } from "solid-js";

export default function Footer(props: Readonly<{
  sessionData: Accessor<SessionData>;
  setSession: Setter<SessionData | null>;
  edulink: EdulinkAPI;
  loadItemPage: (id: string, name: string, forceOpenNav?: boolean) => void;
  clubData: ClubsResponse.ClubType[];
  status: StatusResponse["result"] | undefined;
  theme: string;
  notificationPermission: Accessor<{
    in_app: boolean; desktop: boolean, type: "Immediately even when window/tab is focused" |
    "As soon as window/tab is unfocused" |
    "No Mouse/Keyboard input or unfocused for 1 minute" |
    "No Mouse/Keyboard input or unfocused for 2 minutes" |
    "No Mouse/Keyboard input or unfocused for 5 minutes" |
    "No Mouse/Keyboard input or unfocused for 10 minutes" |
    "No Mouse/Keyboard input or unfocused for 15 minutes" |
    "No Mouse/Keyboard input or unfocused for 20 minutes" |
    "No Mouse/Keyboard input or unfocused for 25 minutes" |
    "No Mouse/Keyboard input or unfocused for 30 minutes";
    allowlist: { id: string; enabled: boolean }[];
  }>;
}>) {
  const [styles, setStyles] = createSignal<{ [key: string]: string } | null>(
    null,
  );

  onMount(async () => {
    const cssModule = await import(
      `../public/assets/css/${props.theme}/footer.module.css`
    );
    setStyles({ ...cssModule.default, ...cssModule });
  });

  return (
    <Show when={styles()}>
      <div id="footer" class={styles()!["s-footer"]}>
        <div class={styles()!["__footer-container"]}>
          <button
            class={styles()!["__footer-item"] + " text-left"}
            onClick={() => props.loadItemPage("timetable", "Timetable", true)}
          >
            {(() => {
              if (props.clubData?.length > 0) {
                const currentClub = props.clubData.find(
                  (club: ClubsResponse.ClubType) => {
                    if (!club.next_session) return false;
                    const nextLesson = props.status?.lessons?.current;
                    if (!nextLesson?.start_time) return false;

                    const [lessonHour, lessonMinute] = nextLesson.start_time
                      .split(":")
                      .map(Number);

                    const now = new Date();
                    const lessonDate = new Date(
                      now.getFullYear(),
                      now.getMonth(),
                      now.getDate(),
                      lessonHour,
                      lessonMinute,
                      0,
                      0,
                    );

                    const sessionDate = new Date(club.next_session);
                    const sameDay =
                      sessionDate.getFullYear() === lessonDate.getFullYear() &&
                      sessionDate.getMonth() === lessonDate.getMonth() &&
                      sessionDate.getDate() === lessonDate.getDate();

                    if (!sameDay) return false;
                    return sessionDate.getTime() < lessonDate.getTime();
                  },
                );

                if (currentClub) {
                  return (
                    <div class={styles()!["pr-couple"]}>
                      <span
                        class={styles()!["__footer-icon"]}
                        style="background-image: linear-gradient(135deg, rgb(30, 175, 178), rgb(30, 179, 158));"
                      >
                        <Icon icon="mdi:clock-outline" width="24" height="24" />
                      </span>
                      <span class={styles()!["__footer-content"]}>
                        <span class={styles()!["__footer-title"]}>
                          Current Club
                        </span>
                        <span class={styles()!["__footer-body"]}>
                          {currentClub.name}
                        </span>
                        <span class={styles()!["__footer"]}>
                          Location: {currentClub.location}
                        </span>
                      </span>
                    </div>
                  );
                }
              }

              if (props.status?.lessons?.current) {
                const lesson = props.status?.lessons.current;
                const teachers = lesson.teachers || lesson.teacher;
                let teacherNames = "";

                if (Array.isArray(teachers)) {
                  teacherNames = teachers
                    .map((t) =>
                      typeof t === "string"
                        ? t
                        : [t?.title, t?.forename, t?.surname].filter(Boolean).join(" ")
                    )
                    .join(", ");
                } else if (typeof teachers === "string") {
                  teacherNames = teachers;
                } else if (teachers) {
                  teacherNames = [teachers.title, teachers.forename, teachers.surname]
                    .filter(Boolean)
                    .join(" ");
                }

                return (
                  <div class={styles()!["pr-couple"]}>
                    <span
                      class={styles()!["__footer-icon"]}
                      style="background-image: linear-gradient(135deg, rgb(30, 175, 178), rgb(30, 179, 158));"
                    >
                      <Icon icon="mdi:clock-outline" width="24" height="24" />
                    </span>
                    <span class={styles()!["__footer-content"]}>
                      <span class={styles()!["__footer-title"]}>
                        Current Lesson
                      </span>
                      <span class={styles()!["__footer-body"]}>
                        {lesson.teaching_group.subject} – {lesson.teaching_group.name}
                      </span>
                      <span class={styles()!["__footer"]}>
                        {lesson.room.name} / {teacherNames}
                      </span>
                    </span>
                  </div>
                );
              }

              return null;
            })()}
          </button>

          <button
            class={styles()!["__footer-item"] + " text-left"}
            onClick={() => props.loadItemPage("timetable", "Timetable", true)}
          >
            {(() => {
              const nextLesson = props.status?.lessons?.next;

              let currentClub: ClubsResponse.ClubType | null = null;
              if (props.clubData?.length > 0 && nextLesson?.start_time) {
                currentClub = props.clubData.find((club) => {
                  if (!club.next_session) return false;

                  const [lessonHour, lessonMinute] = nextLesson.start_time
                    .split(":")
                    .map(Number);

                  const sessionDate = new Date(club.next_session);
                  return (
                    sessionDate.getHours() === lessonHour &&
                    sessionDate.getMinutes() === lessonMinute &&
                    sessionDate.getDate() === new Date().getDate() &&
                    sessionDate.getMonth() === new Date().getMonth() &&
                    sessionDate.getFullYear() === new Date().getFullYear()
                  );
                }) || null;
              }

              if (currentClub) {
                return (
                  <div class={styles()!["pr-couple"]}>
                    <span
                      class={styles()!["__footer-icon"]}
                      style="background-image: linear-gradient(to top left, #ebb326, #eb9e3d);"
                    >
                      <Icon
                        icon="streamline:fastforward-clock-remix"
                        width="20"
                        height="20"
                      />
                    </span>
                    <span class={styles()!["__footer-content"]}>
                      <span class={styles()!["__footer-title"]}>
                        Next Club
                      </span>
                      <span class={styles()!["__footer-body"]}>
                        {currentClub.name}
                      </span>
                      <span class={styles()!["__footer"]}>
                        Location: {currentClub.location}
                      </span>
                    </span>
                  </div>
                );
              }

              if (nextLesson) {
                const teachers = nextLesson.teachers || nextLesson.teacher;
                let teacherNames = "";

                if (Array.isArray(teachers)) {
                  teacherNames = teachers
                    .map((t) =>
                      typeof t === "string"
                        ? t
                        : [t?.title, t?.forename, t?.surname].filter(Boolean).join(" ")
                    )
                    .join(", ");
                } else if (typeof teachers === "string") {
                  teacherNames = teachers;
                } else if (teachers) {
                  teacherNames = [teachers.title, teachers.forename, teachers.surname]
                    .filter(Boolean)
                    .join(" ");
                }

                return (
                  <div class={styles()!["pr-couple"]}>
                    <span
                      class={styles()!["__footer-icon"]}
                      style="background-image: linear-gradient(to top left, #ebb326, #eb9e3d);"
                    >
                      <Icon
                        icon="streamline:fastforward-clock-remix"
                        width="20"
                        height="20"
                      />
                    </span>
                    <span class={styles()!["__footer-content"]}>
                      <span class={styles()!["__footer-title"]}>
                        Next Lesson
                      </span>
                      <span class={styles()!["__footer-body"]}>
                        {nextLesson.teaching_group.subject} –{" "}
                        {nextLesson.teaching_group.name}
                      </span>
                      <span class={styles()!["__footer"]}>
                        {nextLesson.room.name} / {teacherNames}
                      </span>
                    </span>
                  </div>
                );
              }

              return null;
            })()}
          </button>
          <button
            class={styles()!["__footer-item"] + " text-left"}
            onClick={() => props.loadItemPage("messages", "Messages", true)}
          >
            <div class={styles()!["pr-couple"]}>
              <span
                class={styles()!["__footer-icon"]}
                style="background-image: linear-gradient(135deg, rgb(253, 107, 92), rgb(235, 87, 86));"
              >
                <Icon icon="ic:outline-email" width="24" height="24" />
              </span>
              <span class={styles()!["__footer-content"]}>
                <span class={styles()!["__footer-title"]}>
                  Messages
                </span>
                <span class={styles()!["__footer-body"]}>
                  {props.status?.new_messages === 0 ? "No new messages" : `${props.status?.new_messages} new messages`}
                </span>
              </span>
            </div>
          </button>
        </div>
      </div>
    </Show>
  );
}
