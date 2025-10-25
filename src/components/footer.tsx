import { onMount, createSignal, Show } from "solid-js";
import { Icon } from "@iconify-icon/solid";
import { useNavigate } from "@solidjs/router";
import type { ClubsResponse } from "../types/api/clubs";
import type { StatusResponse, SessionData } from "../types/auth";
import type { EdulinkAPI } from "../api/main";
import type { Setter, Accessor } from "solid-js";
import {
  isPermissionGranted,
  sendNotification
} from '@tauri-apps/plugin-notification'

export default function Footer(props: Readonly<{
  sessionData: Accessor<SessionData>;
  setSession: Setter<SessionData | null>;
  edulink: EdulinkAPI;
  loadItemPage: (id: string, name: string, forceOpenNav?: boolean) => void;
  styles: { [key: string]: string } | null;
  clubData: ClubsResponse.ClubType[];
  status: StatusResponse["result"] | null;
}>) {
  const navigate = useNavigate();
  const [status, setStatus] = createSignal<any>({});
  const [notificationPermission, setNotifPermission] = createSignal<boolean>(false);
  let lastMessageCount = 0;
  let lastFormCount = 0;
  let sessionTimeout: ReturnType<typeof setTimeout> | null = null;
  const notifiedEvents = new Set<string>();
  const plural = (n?: number) => (n && n > 1 ? "s" : "");

  const isWithinFiveMinutes = (date: Date) => {
    const diff = date.getTime() - Date.now();
    return diff > 0 && diff <= 5 * 60 * 1000;
  };

  const notifyOnce = (key: string, title: string, body: string) => {
    if (notifiedEvents.has(key)) return;
    sendNotification({ title, body });
    notifiedEvents.add(key);
  };

  // eslint-disable-next-line sonarjs/cognitive-complexity
  const handleNotifications = async (data: StatusResponse["result"]) => {
    if (!data) return;
    if (notificationPermission() === false) return;

    const hasNewMessages = !!(data.new_messages && data.new_messages !== lastMessageCount);
    const hasNewForms = !!(data.new_forms && data.new_forms !== lastFormCount);

    if (hasNewMessages || hasNewForms) {
      const msgCount = data.new_messages ?? 0;
      const formCount = data.new_forms ?? 0;

      const msgPart = hasNewMessages
        ? `${msgCount} unread message${plural(msgCount)}`
        : "";
      const formPart = hasNewForms
        ? `${formCount} undone form${plural(formCount)}`
        : "";

      const joinedParts = [msgPart, formPart].filter(Boolean).join(" and ");
      const body = `You have ${joinedParts}.`;

      const titleParts = [];
      if (hasNewMessages) titleParts.push(`Message${plural(msgCount)}`);
      if (hasNewForms) titleParts.push(`Form${plural(formCount)}`);

      sendNotification({
        title: `Openlink - New ${titleParts.join(" and ")}!`,
        body,
      });

      if (hasNewMessages) lastMessageCount = msgCount;
      if (hasNewForms) lastFormCount = formCount;
    }

    const nextLesson = data.lessons?.next;
    const startTime = nextLesson?.start_time;
    if (startTime) {
      const [h, m] = startTime.split(":").map(Number);
      const lessonDate = new Date();
      lessonDate.setHours(h, m, 0, 0);

      if (isWithinFiveMinutes(lessonDate)) {
        notifyOnce(
          `lesson-${lessonDate.toISOString()}`,
          nextLesson.teaching_group.subject,
          `${nextLesson.teaching_group.subject} / ${nextLesson.room.name} in 5 minutes.`,
        );
      }
    }

    for (const club of props.clubData ?? []) {
      const session = club.next_session;
      if (!session) continue;

      const sessionDate = new Date(session);
      if (!isWithinFiveMinutes(sessionDate)) continue;

      notifyOnce(
        `club-${sessionDate.toISOString()}`,
        club.name,
        `${club.name} / ${club.location} starts in 5 minutes.`,
      );
    }
  };

  const fetchStatus = async () => {
    if(props.sessionData() === null) return;
    const result: StatusResponse = await props.edulink.getStatus(
      props.sessionData().authtoken,
      props.sessionData().apiUrl,
    );
    if (result.result.success) {
      setStatus(result.result);
      if (globalThis.__TAURI__ && await isPermissionGranted()) {
        const { load } = await import("@tauri-apps/plugin-store");
        const store = await load("config.json", { autoSave: false, defaults: {} });
        const configNotifications = await store.get("notifications");
        if (configNotifications) {
          handleNotifications(result.result)
        }
      }

      if (!sessionTimeout && result.result.session?.expires) {
        const expiresInMs = result.result.session.expires * 1000;
        sessionTimeout = setTimeout(() => {
          props.setSession(null);
          sessionTimeout = null;
          return navigate("/login");
        }, expiresInMs);
      }
      sessionTimeout ??= setTimeout(() => {
        props.setSession(null);
        sessionTimeout = null;
        return navigate("/login");
      }, 3600 * 1000);
    } else {
      props.setSession(null);
      return navigate("/login");
    }
  };

  onMount(async () => {
    const hasStatus = props.status != null;
    if (hasStatus) {
      setStatus(props.status);
      if (globalThis.__TAURI__ && await isPermissionGranted()) {
        if (globalThis.__TAURI__ && await isPermissionGranted()) {
          const { load } = await import("@tauri-apps/plugin-store");
          const store = await load("config.json", { autoSave: false, defaults: {} });
          const configNotifications = await store.get("notifications");
          if (configNotifications) {
            setNotifPermission(true)
            handleNotifications(props.status)
          }
        }
      }
    } else {
      fetchStatus();
    }
    setInterval(
      fetchStatus,
      (props.sessionData().miscellaneous.status_interval ?? 60) * 1000,
    );
  });

  return (
    <Show when={props.styles}>
      <div id="footer" class={props.styles!["openlink-s-footer"]}>
        <div class={props.styles!["openlink__footer-container"]}>
          <button
            class={props.styles!["openlink__footer-item"] + " text-left"}
            onClick={() => props.loadItemPage("timetable", "Timetable", true)}
          >
            {(() => {
              if (props.clubData?.length > 0) {
                const currentClub = props.clubData.find(
                  (club: ClubsResponse.ClubType) => {
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
                  },
                );

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
              }

              if (status().lessons?.current) {
                const lesson = status().lessons.current;
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
                        {lesson.teaching_group.subject} – {lesson.teaching_group.name}
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
          </button>

          <button
            class={props.styles!["openlink__footer-item"] + " text-left"}
            onClick={() => props.loadItemPage("timetable", "Timetable", true)}
          >
            {(() => {
              const nextLesson = status().lessons?.next;

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
                        {nextLesson.teaching_group.subject} –{" "}
                        {nextLesson.teaching_group.name}
                      </span>
                      <span class={props.styles!["openlink__footer"]}>
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
            class={props.styles!["openlink__footer-item"] + " text-left"}
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
                  {status().new_messages === 0 ? "No new messages" : `${status().new_messages} new messages`}
                </span>
              </span>
            </div>
          </button>
        </div>
      </div>
    </Show>
  );
}
