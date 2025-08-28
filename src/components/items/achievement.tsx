import { onMount, onCleanup, createSignal, Show, For } from "solid-js";
import { makePersisted } from "@solid-primitives/storage";
import { useEdulink } from "../../api/edulink";
import { Transition } from "solid-transition-group";
import { useToast } from "../toast";
import { AiOutlineTrophy } from "solid-icons/ai";

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

  const [achievements, setAchievements] = createSignal<any>([]);
  const [employees, setEmployees] = createSignal<any>([]);
  const [totalPoints, setTotalPoints] = createSignal<number>(0);
  const [achievementTypes, setAchievementTypes] = createSignal<any>([]);
  const [achievementAwards, setAchievementAwards] = createSignal<any[]>([]);
  const [achievementActivities, setAchievementActivityTypes] = createSignal<
    any[]
  >([]);
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
      setAchievements(achievementResponse.result.achievement || []);
      setEmployees(achievementResponse.result.employees || []);
      props.setProgress(0.7);
    } else {
      toast.showToast(
        "Error",
        achievementResponse.result.error ?? "Unknown error",
        "error",
      );
      props.setProgress(0);
    }

    if (lookupResponse.result.success) {
      setAchievementTypes(lookupResponse.result.achievement_types || []);
      setAchievementActivityTypes(
        lookupResponse.result.achievement_activity_types || [],
      );
      setAchievementAwards(lookupResponse.result.achievement_award_types || []);

      const total = (achievementResponse.result.achievement || []).reduce(
        (sum: number, achievement: any) => {
          const points = Number(achievement.points);
          return sum + (isNaN(points) ? 0 : points);
        },
        0,
      );
      setTotalPoints(total);
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
    if (document.getElementById("item-styling")) {
      document.getElementById("item-styling")?.remove();
    }
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
                <For each={achievements()}>
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
                              achievementTypes(),
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

                              const employee = employees().find(
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
                              achievementActivities(),
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
                              achievementAwards(),
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
                    {totalPoints() || "-"}
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
