import { onMount, onCleanup, createSignal, Show, For } from "solid-js";
import { createStore } from "solid-js/store";
import { makePersisted } from "@solid-primitives/storage";
import { useEdulink } from "../../api/edulink";
import { Transition } from "solid-transition-group";
import { useToast } from "../toast";
import { AiOutlineTrophy } from "solid-icons/ai";
import { AchievementResponse } from "../../types/api/achievement";
import { ABLookupResponse } from "../../types/api/ablookup";
function AchievementComponent(props: {
  setProgress: (value: number) => void;
  progress: () => number;
  theme: string;
}) {
  const [styles, setStyles] = createSignal<{ [key: string]: string } | null>(
    null,
  );
  const edulink = useEdulink();
  const [sessionData] = makePersisted(createSignal<any>(null), {
    storage: sessionStorage,
    name: "sessionData",
  });
  const [apiUrl] = makePersisted(createSignal<any>(null), {
    storage: sessionStorage,
    name: "apiUrl",
  });

  const [state, setState] = createStore<{
    achievements: AchievementResponse.AchievementType[];
    employees: AchievementResponse.EmployeesType[];
    totalPoints: number;
    achievementTypes: ABLookupResponse.achievementType[];
    achievementAwards: ABLookupResponse.achievementAwards[];
    achievementActivities: ABLookupResponse.achievementActvities[];
  }>({
    achievements: [],
    employees: [],
    totalPoints: 0,
    achievementTypes: [],
    achievementAwards: [],
    achievementActivities: [],
  });
  const toast = useToast();

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getLookupName = (
    id: string | number | undefined,
    lookupArray: any[],
  ): string => {
    if (!id) return "-";

    const lookup = lookupArray.find((item) => {
      const idAsInt = typeof id === "string" ? parseInt(id, 10) : id;
      const itemIdAsInt =
        typeof item.id === "string" ? parseInt(item.id, 10) : item.id;
      return idAsInt === itemIdAsInt;
    });
    return lookup ? lookup.name || lookup.description : "-";
  };

  onMount(async () => {
    props.setProgress(0.6);
    const cssModule = await import(
      `../../public/assets/css/${props.theme}/achievement.module.css`
    );
    const normalized: { [key: string]: string } = {
      ...cssModule.default,
      ...cssModule,
    };
    setStyles(normalized);
    const userId = sessionData()?.user?.id;
    const token = sessionData()?.authtoken;
    const url = apiUrl();

    const [achievementResponse, lookupResponse] = await Promise.all([
      edulink.getAchievement(userId, token, url),
      edulink.getABLookup(token, url),
    ]);

    if (achievementResponse.result.success) {
      props.setProgress(0.8);
      const total = (achievementResponse.result.achievement || []).reduce(
        (sum: number, achievement: any) => {
          const points = Number(achievement.points);
          return sum + (isNaN(points) ? 0 : points);
        },
        0,
      );
      setState({
        achievements: achievementResponse.result.achievement || [],
        employees: achievementResponse.result.employees || [],
        totalPoints: total,
      });
    } else {
      toast.showToast(
        "Error",
        achievementResponse.result.error ?? "Unknown error",
        "error",
      );
      props.setProgress(0);
    }

    if (lookupResponse.result.success) {
      props.setProgress(0.9);
      setState({
        achievementTypes: lookupResponse.result.achievement_types || [],
        achievementActivities:
          lookupResponse.result.achievement_activity_types || [],
        achievementAwards: lookupResponse.result.achievement_award_types || [],
      });
      props.setProgress(1);
    } else {
      toast.showToast(
        "Error",
        lookupResponse.result.error ?? "Unknown error",
        "error",
      );
      props.setProgress(0);
    }
  });

  onCleanup(() => {
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
          <div class={styles()!["t-container"]}>
            <div
              class={styles()!["t-achievement"]}
              style={{ display: "flex", "flex-direction": "column" }}
            >
              <div class={styles()!["t-header"]}>
                <div>Type & Date</div>
                <div>Comment & Teacher</div>
                <div>Action & Info</div>
                <div>Award</div>
                <div>Points</div>
              </div>
              <div class={styles()!["t-body"]}>
                <For each={state.achievements}>
                  {(achievement: any) => (
                    <div class={styles()!["t-row"]}>
                      <div>
                        <div
                          style={{
                            display: "flex",
                            "flex-direction": "column",
                          }}
                        >
                          <div class="_grey">
                            {formatDate(achievement.date)}
                          </div>
                          <div>
                            {getLookupName(
                              achievement.type_ids?.[0],
                              state.achievementTypes,
                            ) || "-"}
                          </div>
                        </div>
                      </div>
                      <div class={styles()!["_comment_teacher"]}>
                        <div
                          style={{
                            display: "flex",
                            "flex-direction": "column",
                          }}
                        >
                          <div class="_grey">
                            {(() => {
                              const employeeId =
                                achievement.recorded?.employee_id ??
                                achievement.action_taken?.employee_id;

                              const employee = state.employees.find(
                                (emp: any) => emp.id === String(employeeId),
                              );

                              return employee
                                ? `${employee.title} ${employee.forename} ${employee.surname}`
                                : "-";
                            })()}
                          </div>
                          <div>{achievement.comments || "-"}</div>
                        </div>
                      </div>
                      <div class={styles()!["_action_info"]}>
                        <div
                          style={{
                            display: "flex",
                            "flex-direction": "column",
                          }}
                        >
                          <div class="_grey">
                            {getLookupName(
                              achievement.activity_id,
                              state.achievementActivities,
                            ) || "-"}
                          </div>
                          <div>{achievement.lesson_information || "-"}</div>
                        </div>
                      </div>
                      <div class={styles()!["_award"]}>
                        <div
                          style={{
                            display: "flex",
                            "flex-direction": "column",
                          }}
                        >
                          <div class="_grey">
                            {getLookupName(
                              achievement.award?.id,
                              state.achievementAwards,
                            ) || "-"}
                          </div>
                          <div>Achievement Award</div>
                        </div>
                      </div>
                      <div>
                        <div class={styles()!["_points"]}>
                          {achievement.points || "-"}
                        </div>
                      </div>
                    </div>
                  )}
                </For>
              </div>
              <div class={styles()!["b-points-badge"]}>
                <div class={styles()!["__label"]}>
                  <div class={styles()!["__label-text"]}>
                    Total Achievement Points
                  </div>
                  <div class={styles()!["__total-points"]}>
                    {state.totalPoints || "-"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Show>
    </Transition>
  );
}

export default {
  name: "Achievement",
  icon: () => {
    return <AiOutlineTrophy size={36} />;
  },
  pos: 5,
  component: AchievementComponent,
};
