import { onMount, onCleanup, createSignal, Show } from "solid-js";
import { Icon } from "@iconify-icon/solid";
import { useNavigate } from "@solidjs/router";
import type { ClubsResponse } from "../types/api/clubs";
export default function Footer(props: {
  sessionData: any;
  apiUrl: any;
  setSession: any;
  setApiUrl: any;
  edulink: any;
  loadItemPage: (id: string, name: string, forceOpenNav?: boolean) => void;
  styles: { [key: string]: string } | null;
  clubData: ClubsResponse.ClubType[];
}) {
  const navigate = useNavigate();
  const [status, setStatus] = createSignal<any>({});

  onMount(() => {
    const fetchStatus = async () => {
      const result = await props.edulink.getStatus(
        props.sessionData()?.authtoken,
        props.apiUrl(),
      );
      if (result.result.success) {
        setStatus(result.result);
      } else {
        props.setSession(null);
        props.setApiUrl(null);
        throw navigate("/login");
      }
    };

    fetchStatus();

    const checkStatus = setInterval(
      fetchStatus,
      (props.sessionData().miscellaneous.status_interval ?? 60) * 1000,
    );
    onCleanup(() => clearInterval(checkStatus));
  });

  return (
    <Show when={props.styles}>
      <div class={props.styles!["openlink-s-footer"]}>
        <div class={props.styles!["openlink__footer-container"]}>
          <div
            class={props.styles!["openlink__footer-item"]}
            onClick={() => props.loadItemPage("timetable", "Timetable", true)}
          >
            {props.clubData?.length > 0 &&
              (() => {
                const currentClub = props.clubData.find((club) => {
                  if (!club.next_session) return false;
                  const nextLesson = status().lessons?.current;
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
                });

                if (currentClub) {
                  return (
                    <div class={props.styles!["openlink-pr-couple"]}>
                      <span
                        class={props.styles!["openlink__footer-icon"]}
                        style="background-image: linear-gradient(135deg, rgb(30, 175, 178), rgb(30, 179, 158));"
                      >
                        <Icon icon="mdi:clock-outline" width="24" height="24" />
                      </span>
                      <span class={props.styles!["openlink__footer-content"]}>
                        <span class={props.styles!["openlink__footer-title"]}>
                          Current Club
                        </span>
                        <span class={props.styles!["openlink__footer-body"]}>
                          {currentClub.name}
                        </span>
                        <span class={props.styles!["openlink__footer"]}>
                          Location: {currentClub.location}
                        </span>
                      </span>
                    </div>
                  );
                }

                if (status().lessons?.current) {
                  const lesson = status().lessons.current;
                  const teachers = lesson.teachers || lesson.teacher;

                  const teacherNames = (() => {
                    if (!teachers) return "";
                    if (Array.isArray(teachers)) {
                      return teachers
                        .map((t) => {
                          if (typeof t === "string") return t;
                          if (t && typeof t === "object") {
                            const { title, forename, surname } = t;
                            return [title, forename, surname]
                              .filter(Boolean)
                              .join(" ");
                          }
                          return "";
                        })
                        .join(", ");
                    }
                    if (typeof teachers === "string") return teachers;
                    if (teachers && typeof teachers === "object") {
                      const { title, forename, surname } = teachers;
                      return [title, forename, surname]
                        .filter(Boolean)
                        .join(" ");
                    }
                    return "";
                  })();

                  return (
                    <div class={props.styles!["openlink-pr-couple"]}>
                      <span
                        class={props.styles!["openlink__footer-icon"]}
                        style="background-image: linear-gradient(135deg, rgb(30, 175, 178), rgb(30, 179, 158));"
                      >
                        <Icon icon="mdi:clock-outline" width="24" height="24" />
                      </span>
                      <span class={props.styles!["openlink__footer-content"]}>
                        <span class={props.styles!["openlink__footer-title"]}>
                          Current Lesson
                        </span>
                        <span class={props.styles!["openlink__footer-body"]}>
                          {lesson.teaching_group.subject} –{" "}
                          {lesson.teaching_group.name}
                        </span>
                        <span class={props.styles!["openlink__footer"]}>
                          {lesson.room.name} / {teacherNames}
                        </span>
                      </span>
                    </div>
                  );
                }

                return null;
              })()}
          </div>

          <div
            class={props.styles!["openlink__footer-item"]}
            onClick={() => props.loadItemPage("timetable", "Timetable", true)}
          >
            {props.clubData?.length > 0 &&
              (() => {
                const currentClub = props.clubData.find((club) => {
                  if (!club.next_session) return false;
                  const nextLesson = status().lessons?.next;
                  if (!nextLesson?.start_time) return false;

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
                });

                if (currentClub) {
                  return (
                    <div class={props.styles!["openlink-pr-couple"]}>
                      <span
                        class={props.styles!["openlink__footer-icon"]}
                        style="background-image: linear-gradient(to top left, #ebb326, #eb9e3d);"
                      >
                        <Icon
                          icon="streamline:fastforward-clock-remix"
                          width="20"
                          height="20"
                        />
                      </span>
                      <span class={props.styles!["openlink__footer-content"]}>
                        <span class={props.styles!["openlink__footer-title"]}>
                          Next Club
                        </span>
                        <span class={props.styles!["openlink__footer-body"]}>
                          {currentClub.name}
                        </span>
                        <span class={props.styles!["openlink__footer"]}>
                          Location: {currentClub.location}
                        </span>
                      </span>
                    </div>
                  );
                }

                if (status().lessons?.next) {
                  const lesson = status().lessons.next;
                  const teachers = lesson.teachers || lesson.teacher;

                  const teacherNames = (() => {
                    if (!teachers) return "";
                    if (Array.isArray(teachers)) {
                      return teachers
                        .map((t) => {
                          if (typeof t === "string") return t;
                          if (t && typeof t === "object") {
                            const { title, forename, surname } = t;
                            return [title, forename, surname]
                              .filter(Boolean)
                              .join(" ");
                          }
                          return "";
                        })
                        .join(", ");
                    }
                    if (typeof teachers === "string") return teachers;
                    if (teachers && typeof teachers === "object") {
                      const { title, forename, surname } = teachers;
                      return [title, forename, surname]
                        .filter(Boolean)
                        .join(" ");
                    }
                    return "";
                  })();

                  return (
                    <div class={props.styles!["openlink-pr-couple"]}>
                      <span
                        class={props.styles!["openlink__footer-icon"]}
                        style="background-image: linear-gradient(to top left, #ebb326, #eb9e3d);"
                      >
                        <Icon
                          icon="streamline:fastforward-clock-remix"
                          width="20"
                          height="20"
                        />
                      </span>
                      <span class={props.styles!["openlink__footer-content"]}>
                        <span class={props.styles!["openlink__footer-title"]}>
                          Next Lesson
                        </span>
                        <span class={props.styles!["openlink__footer-body"]}>
                          {lesson.teaching_group.subject} –{" "}
                          {lesson.teaching_group.name}
                        </span>
                        <span class={props.styles!["openlink__footer"]}>
                          {lesson.room.name} / {teacherNames}
                        </span>
                      </span>
                    </div>
                  );
                }

                return null;
              })()}
          </div>

          <div
            class={props.styles!["openlink__footer-item"]}
            onClick={() => props.loadItemPage("messages", "Messages", true)}
          >
            <div class={props.styles!["openlink-pr-couple"]}>
              <span
                class={props.styles!["openlink__footer-icon"]}
                style="background-image: linear-gradient(135deg, rgb(253, 107, 92), rgb(235, 87, 86));"
              >
                <Icon icon="ic:outline-email" width="24" height="24" />
              </span>
              <span class={props.styles!["openlink__footer-content"]}>
                <span class={props.styles!["openlink__footer-title"]}>
                  Messages
                </span>
                <span class={props.styles!["openlink__footer-body"]}>
                  {status().new_messages || 0} new message
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
}
