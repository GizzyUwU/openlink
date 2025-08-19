import { onMount, onCleanup, createSignal } from "solid-js";
import { makePersisted } from "@solid-primitives/storage";
import { useEdulink } from "../../api/edulink";
import { Transition } from "solid-transition-group";
import { useToast } from "../toast";
import { RiSystemErrorWarningLine } from "solid-icons/ri";

function BehaviourComponent(props: {
  setProgress: (value: number) => void;
  progress: () => number;
}) {
  let styleElement: HTMLLinkElement;
  const edulink = useEdulink();
  const [sessionData] = makePersisted(createSignal<any>(null), {
    storage: sessionStorage,
    name: "sessionData",
  });
  const [apiUrl] = makePersisted(createSignal<any>(null), {
    storage: sessionStorage,
    name: "apiUrl",
  });

  const [behaviours, setBehaviours] = createSignal<any>([]);
  const [detentions, setDetentions] = createSignal<any>([]);
  const [employees, setEmployees] = createSignal<any>([]);
  const [totalPoints, setTotalPoints] = createSignal<number>(0);
  const [behaviourTypes, setBehaviourTypes] = createSignal<any>([]);
  const [behaviourLocations, setBehaviourLocations] = createSignal<any[]>([]);
  const [behaviourStatuses, setBehaviourStatuses] = createSignal<any[]>([]);
  const [behaviourActions, setBehaviourActions] = createSignal<any[]>([]);
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
    console.log(lookup, "quack", id);
    return lookup ? lookup.name || lookup.description : "-";
  };

  onMount(async () => {
    styleElement = document.createElement("link");
    styleElement.rel = "preload";
    styleElement.as = "style";
    styleElement.href = "/src/assets/css/behaviour.css";
    styleElement.onload = () => {
      styleElement.rel = "stylesheet";
    };
    document.getElementById("item-box")?.appendChild(styleElement);

    const userId = sessionData()?.user?.id;
    const token = sessionData()?.authtoken;
    const url = apiUrl();

    const [behaviourResponse, lookupResponse] = await Promise.all([
      edulink.getBehaviour(userId, token, url),
      edulink.getABLookup(token, url),
    ]);

    if (behaviourResponse.result.success) {
      setBehaviours(behaviourResponse.result.behaviour || []);
      setDetentions(behaviourResponse.result.detentions || []);
      setEmployees(behaviourResponse.result.employees || []);
      props.setProgress(0.7);
    } else {
      toast.showToast(
        "Error",
        behaviourResponse.result.error ?? "Unknown error",
        "error",
      );
      props.setProgress(0);
    }

    if (lookupResponse.result.success) {
      setBehaviourTypes(lookupResponse.result.behaviour_types || []);
      setBehaviourLocations(lookupResponse.result.behaviour_locations || []);
      setBehaviourStatuses(lookupResponse.result.behaviour_statuses || []);
      setBehaviourActions(lookupResponse.result.behaviour_actions_taken || []);

      const total = (behaviourResponse.result.behaviour || []).reduce(
        (sum: number, behaviour: any) => {
          const points = Number(behaviour.points);
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
    // styleElement.remove();
    props.setProgress(0);
  });

  return (
    <>
      {props.progress() === 1 && (
        <Transition
          onEnter={(el, done) => {
            const a = el.animate(
              [
                {
                  opacity: 0,
                  transform: "translate3d(-50%, 0, 0) scale(0.8)",
                },
                {
                  opacity: 1,
                  transform: "translate3d(-50%, 0, 0) scale(1)",
                },
              ],
              {
                duration: 200,
                easing: "ease",
              },
            );
            a.finished.then(done);
          }}
          onExit={(el, done) => {
            const a = el.animate(
              [
                {
                  opacity: 1,
                  transform: "translate3d(-50%, 0, 0) scale(1)",
                },
                {
                  opacity: 0,
                  transform: "translate3d(-50%, 0, 0) scale(0.8)",
                },
              ],
              {
                duration: 200,
                easing: "ease",
              },
            );
            a.finished.then(done);
          }}
        >
          <div class="box-container">
            <div class="t-behaviour">
              <div
                class="t-behaviour"
                style={{ display: "flex", "flex-direction": "column" }}
              >
                <div class="t-header">
                  <span class="t-header__title _type_date">Type & Date</span>
                  <span class="t-header__title _comment_teacher">
                    Comment & Teacher
                  </span>
                  <span class="t-header__title _action_info">
                    Action & Info
                  </span>
                  <span class="t-header__title _loc_status">
                    Location & Status
                  </span>
                  <span class="t-header__title _points">Points</span>
                </div>
                <div class="t-body">
                  {behaviours().map((behaviour: any) => (
                    <div class="t-row">
                      <span class="t-behaviour__text_type_date">
                        <div
                          style={{
                            display: "flex",
                            "flex-direction": "column",
                          }}
                        >
                          <span class="_grey">
                            {formatDate(behaviour.date)}
                          </span>
                          <span>
                            {getLookupName(
                              behaviour.type_ids?.[0],
                              behaviourTypes(),
                            ) || "-"}
                          </span>
                        </div>
                      </span>
                      <span class="t-behaviour__text _comment_teacher">
                        <div
                          style={{
                            display: "flex",
                            "flex-direction": "column",
                          }}
                        >
                          <span class="_grey">
                            {(() => {
                              const employeeId =
                                behaviour.recorded?.employee_id ??
                                behaviour.action_taken?.employee_id;

                              const employee = employees().find(
                                (emp: any) => emp.id === String(employeeId),
                              );

                              return employee
                                ? `${employee.title} ${employee.forename} ${employee.surname}`
                                : "-";
                            })()}
                          </span>
                          <span>{behaviour.comments || "-"}</span>
                        </div>
                      </span>
                      <span class="t-behaviour__text _action_info">
                        <div
                          style={{
                            display: "flex",
                            "flex-direction": "column",
                          }}
                        >
                          <span class="_grey">
                            {getLookupName(
                              behaviour.action_taken?.id,
                              behaviourActions(),
                            ) || "-"}
                          </span>
                          <span>{behaviour.lesson_information}</span>
                        </div>
                      </span>
                      <span class="t-behaviour__text _loc_status">
                        <div
                          style={{
                            display: "flex",
                            "flex-direction": "column",
                          }}
                        >
                          <span class="_grey">
                            {getLookupName(
                              behaviour.location_id,
                              behaviourLocations(),
                            ) || "-"}
                          </span>
                          <span>
                            {getLookupName(
                              behaviour.status_id,
                              behaviourStatuses(),
                            ) || "-"}
                          </span>
                        </div>
                      </span>
                      <span class="t-behaviour__text">
                        <span class="_points">{behaviour.points || "-"}</span>
                      </span>
                    </div>
                  ))}
                </div>
                <div class="b-points-badge">
                  <div class="__label">
                    <span class="__label-text">Total Negative Points</span>
                    <span class="__total-points">{totalPoints() || "-"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      )}
    </>
  );
}

export default {
  name: "Behaviour",
  icon: () => {
    return <RiSystemErrorWarningLine size={36} />;
  },
  component: BehaviourComponent,
};
