import { onMount, onCleanup, createSignal, Show } from "solid-js";
import { makePersisted } from "@solid-primitives/storage";
import { useEdulink } from "../../api/edulink";
import { createStore } from "solid-js/store";
import { Transition } from "solid-transition-group";
import { useToast } from "../toast";
import { RiSystemErrorWarningLine } from "solid-icons/ri";
import { BehaviourResponse } from "../../types/api/behaviour";

function BehaviourComponent(props: {
  setProgress: (value: number) => void;
  progress: () => number;
  theme: string;
}) {
  const [styles, setStyles] = createSignal<{ [key: string]: string } | null>(
    null,
  );
  const edulink = useEdulink();
  const [state, setState] = createStore<{
    behaviour: BehaviourResponse.BehaviourType[];
    detentions: BehaviourResponse.DetentionsType[];
    employees: BehaviourResponse.EmployeesType[];
    activePage: "behaviour" | "detentions";
    totalPoints: number;
    behaviourTypes: any[];
    behaviourLocations: any[];
    behaviourStatuses: any[];
    behaviourActions: any[];
  }>({
    behaviour: [],
    detentions: [],
    employees: [],
    activePage: "behaviour",
    totalPoints: 0,
    behaviourTypes: [],
    behaviourLocations: [],
    behaviourStatuses: [],
    behaviourActions: [],
  });

  const [sessionData] = makePersisted(createSignal<any>(null), {
    storage: sessionStorage,
    name: "sessionData",
  });
  const [apiUrl] = makePersisted(createSignal<any>(null), {
    storage: sessionStorage,
    name: "apiUrl",
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
    console.log(lookup, "quack", id);
    return lookup ? lookup.name || lookup.description : "-";
  };

  onMount(async () => {
    const cssModule = await import(
      `../../public/assets/css/${props.theme}/behaviour.module.css`
    );
    const normalized: { [key: string]: string } = {
      ...cssModule.default,
      ...cssModule,
    };
    setStyles(normalized);

    const userId = sessionData()?.user?.id;
    const token = sessionData()?.authtoken;
    const url = apiUrl();

    const [behaviourResponse, lookupResponse] = await Promise.all([
      edulink.getBehaviour(userId, token, url),
      edulink.getABLookup(token, url),
    ]);

    if (behaviourResponse.result.success) {
      setState({
        behaviour: behaviourResponse.result.behaviour,
        detentions: behaviourResponse.result.detentions,
        employees: behaviourResponse.result.employees,
      });
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
      setState("behaviourTypes", lookupResponse.result.behaviour_types);
      setState("behaviourLocations", lookupResponse.result.behaviour_locations);
      setState("behaviourStatuses", lookupResponse.result.behaviour_statuses);
      setState(
        "behaviourActions",
        lookupResponse.result.behaviour_actions_taken,
      );

      const total = (behaviourResponse.result.behaviour || []).reduce(
        (sum: number, behaviour: any) => {
          const points = Number(behaviour.points);
          return sum + (isNaN(points) ? 0 : points);
        },
        0,
      );
      setState("totalPoints", total);
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
      <Show when={props.progress() === 1}>
        <div class={styles()!["box-container"]}>
          <div class="flex items-center justify-end w-full pr-[10px]">
            <div class="flex space-x-4 mb-2">
              <button
                type="button"
                onClick={() => setState("activePage", "behaviour")}
                class={`text-sm text-white cursor-pointer ${
                  state.activePage === "behaviour"
                    ? "border-b border-blue-400"
                    : ""
                }`}
              >
                Behaviour
              </button>
              <button
                type="button"
                onClick={() => setState("activePage", "detentions")}
                class={`text-sm font-medium text-white  cursor-pointer ${
                  state.activePage === "detentions"
                    ? "border-b border-blue-400"
                    : ""
                }`}
              >
                Detentions
              </button>
            </div>
          </div>

          <Show when={state.activePage === "behaviour"}>
            <div class={styles()!["t-behaviour"]}>
              <div class={styles()!["t-header"]}>
                <div>Type & Date</div>
                <div>Comment & Teacher</div>
                <div>Action & Info</div>
                <div>Location & Status</div>
                <div>Points</div>
              </div>
              <div class={styles()!["t-body"]}>
                {state.behaviour.map((behaviour: any) => (
                  <div class={styles()!["t-row"]}>
                    <div>
                      <div
                        style={{ display: "flex", "flex-direction": "column" }}
                      >
                        <div class={styles()!["_grey"]}>
                          {formatDate(behaviour.date)}
                        </div>
                        <div>
                          {getLookupName(
                            behaviour.type_ids?.[0],
                            state.behaviourTypes,
                          ) || "-"}
                        </div>
                      </div>
                    </div>
                    <div class={styles()!["_comment_teacher"]}>
                      <div
                        style={{ display: "flex", "flex-direction": "column" }}
                      >
                        <div class={styles()!["_grey"]}>
                          {(() => {
                            const employeeId =
                              behaviour.recorded?.employee_id ??
                              behaviour.action_taken?.employee_id;
                            const employee = state.employees.find(
                              (emp: any) => emp.id === String(employeeId),
                            );
                            return employee
                              ? `${employee.title} ${employee.forename} ${employee.surname}`
                              : "-";
                          })()}
                        </div>
                        <div>{behaviour.comments || "-"}</div>
                      </div>
                    </div>
                    <div class={styles()!["_action_info"]}>
                      <div
                        style={{ display: "flex", "flex-direction": "column" }}
                      >
                        <div class={styles()!["_grey"]}>
                          {getLookupName(
                            behaviour.action_taken?.id,
                            state.behaviourActions,
                          ) || "-"}
                        </div>
                        <div>{behaviour.lesson_information}</div>
                      </div>
                    </div>
                    <div class={styles()!["_loc_status"]}>
                      <div
                        style={{ display: "flex", "flex-direction": "column" }}
                      >
                        <div class={styles()!["_grey"]}>
                          {getLookupName(
                            behaviour.location_id,
                            state.behaviourLocations,
                          ) || "-"}
                        </div>
                        <div>
                          {getLookupName(
                            behaviour.status_id,
                            state.behaviourStatuses,
                          ) || "-"}
                        </div>
                      </div>
                    </div>
                    <div class={styles()!["t-behaviour__text"]}>
                      <div class={styles()!["_points"]}>
                        {behaviour.points || "-"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div class={styles()!["b-points-badge"]}>
                <div class={styles()!["__label"]}>
                  <div class={styles()!["__label-text"]}>
                    Total Negative Points
                  </div>
                  <div class={styles()!["__total-points"]}>
                    {state.totalPoints || "-"}
                  </div>
                </div>
              </div>
            </div>
          </Show>
          <Show when={state.activePage === "detentions"}>
            <div class={styles()!["t-behaviour"]}>
              <div class={styles()!["t-detentions-header"]}>
                <div class={styles()!["_date"]}>Date</div>
                <div class={styles()!["_type"]}>Type</div>
                <div class={styles()!["_loc"]}>Location</div>
                <div class={styles()!["_start"]}>Start time</div>
                <div class={styles()!["_end"]}>End time</div>
                <div class={styles()!["_attended"]}>Attended</div>
              </div>
              <div class={styles()!["t-body"]}>
                {state.detentions.map(
                  (detention: BehaviourResponse.DetentionsType) => (
                    <div class={styles()!["t-detentions-row"]}>
                      <div class={styles()!["_date"]}>
                        {formatDate(detention.date)}
                      </div>
                      <div class={styles()!["_type"]}>
                        {detention.description || "-"}
                      </div>
                      <div class={styles()!["_loc"]}>
                        {detention.location || "-"}
                      </div>
                      <div class={styles()!["_start"]}>
                        {detention.start_time || "-"}
                      </div>
                      <div class={styles()!["_end"]}>
                        {detention.end_time || "-"}
                      </div>
                      <div class={styles()!["_attended"]}>
                        {detention.attended || "-"}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          </Show>
        </div>
      </Show>
    </Transition>
  );
}

export default {
  name: "Behaviour",
  icon: () => {
    return <RiSystemErrorWarningLine size={36} />;
  },
  pos: 4,
  component: BehaviourComponent,
};
