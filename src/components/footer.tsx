import { onMount, onCleanup, createSignal, Show } from "solid-js";
import { Icon } from "@iconify-icon/solid";
import { useNavigate } from "@solidjs/router";

export default function Footer(props: {
  sessionData: any;
  apiUrl: any;
  setSession: any;
  setApiUrl: any;
  edulink: any;
  loadItemPage: (id: string, name: string, forceOpenNav?: boolean) => void;
  styles: { [key: string]: string } | null;
}) {
  const navigate = useNavigate();
  onMount(() => {
    const fetchStatus = async () => {
      const result = await props.edulink.getStatus(
        props.sessionData()?.authtoken,
        props.apiUrl(),
      );
      if (result.result.success) {
        setStatus(result.result);
        console.log(result.result);
      } else {
        props.setSession(null);
        props.setApiUrl(null);
        throw navigate("/login");
      }
    };

    fetchStatus();
    const checkStatus = setInterval(fetchStatus, 60 * 1000);
    onCleanup(() => clearInterval(checkStatus));
  });
  const [status, setStatus] = createSignal<any>({});

  return (
    <Show when={props.styles}>
      <div class={props.styles!["openlink-s-footer"]}>
        <div class={props.styles!["openlink__footer-container"]}>
          <div
            class={props.styles!["openlink__footer-item"]}
            onClick={() => props.loadItemPage("timetable", "Timetable", true)}
          >
            {status().lessons?.current && (
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
                    {status().lessons.current.teaching_group.subject} -{" "}
                    {status().lessons.current.teaching_group.name}
                  </span>
                  <span class={props.styles!["openlink__footer"]}>
                    {status().lessons.current.room.name}
                    {" / "}
                    {(() => {
                      const lesson = status().lessons.current;
                      const teachers = lesson.teachers || lesson.teacher;

                      if (!teachers) return "";

                      if (Array.isArray(teachers)) {
                        return teachers
                          .map((t) => {
                            if (typeof t === "string") return t;
                            if (typeof t === "object" && t !== null) {
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

                      if (typeof teachers === "object" && teachers !== null) {
                        const { title, forename, surname } = teachers;
                        return [title, forename, surname]
                          .filter(Boolean)
                          .join(" ");
                      }

                      return "";
                    })()}
                  </span>
                </span>
              </div>
            )}
          </div>

          <div
            class={props.styles!["openlink__footer-item"]}
            onClick={() => props.loadItemPage("timetable", "Timetable", true)}
          >
            {status().lessons?.next && (
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
                    {status().lessons.next.teaching_group.subject} -{" "}
                    {status().lessons.next.teaching_group.name}
                  </span>
                  <span class={props.styles!["openlink__footer"]}>
                    {status().lessons.next.room.name}
                    {" / "}
                    {(() => {
                      const lesson = status().lessons.next;
                      const teachers = lesson.teachers || lesson.teacher;

                      if (!teachers) return "";

                      if (Array.isArray(teachers)) {
                        return teachers
                          .map((t) => {
                            if (typeof t === "string") return t;
                            if (typeof t === "object" && t !== null) {
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

                      if (typeof teachers === "object" && teachers !== null) {
                        const { title, forename, surname } = teachers;
                        return [title, forename, surname]
                          .filter(Boolean)
                          .join(" ");
                      }

                      return "";
                    })()}
                  </span>
                </span>
              </div>
            )}
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
