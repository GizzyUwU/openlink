import { onMount, createSignal, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { Transition } from "solid-transition-group";
import { useToast } from "../toast";
import { RiSystemErrorWarningLine } from "solid-icons/ri";
import { BehaviourResponse } from "../../types/api/behaviour";
import { ABLookupResponse } from "../../types/api/ablookup";
import type { SessionData } from "../../types/auth";
import type { EdulinkAPI } from "../../api/main";
import { formatDate } from "../../lib/formatDate";

function BehaviourComponent(props: {
  setProgress: (value: number) => void;
  sessionData: () => SessionData;
  progress: () => number;
  edulink: EdulinkAPI;
  theme: string;
}) {
  const toast = useToast();
  const [styles, setStyles] = createSignal<{ [key: string]: string } | null>(
    null,
  );
  const [state, setState] = createStore<{
    behaviour: BehaviourResponse.BehaviourType[];
    detentions: BehaviourResponse.DetentionsType[];
    employees: BehaviourResponse.EmployeesType[];
    activePage: "behaviour" | "detentions";
    totalPoints: number;
    behaviourTypes: ABLookupResponse.behaviourType[];
    behaviourLocations: ABLookupResponse.behaviourLocationsType[];
    behaviourStatuses: ABLookupResponse.behaviourStatusesType[];
    behaviourActions: ABLookupResponse.behaviourActions[];
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
      `../../public/assets/css/${props.theme}/behaviour.module.css`
    );
    const normalized: { [key: string]: string } = {
      ...cssModule.default,
      ...cssModule,
    };
    setStyles(normalized);
    const behaviourPromise = props.edulink.getBehaviour(
      props.sessionData()?.user?.id,
      props.sessionData()?.authtoken,
      props.sessionData()?.apiUrl,
      window.toast
    );

    const lookupPromise = props.edulink.getABLookup(
      props.sessionData()?.authtoken,
      props.sessionData()?.apiUrl,
      window.toast
    );

    behaviourPromise.then((behaviourResponse: BehaviourResponse) => {
      if (behaviourResponse.result.success) {
        const total = (behaviourResponse.result.behaviour || []).reduce(
          (sum, b) => sum + (isNaN(Number(b.points)) ? 0 : Number(b.points)),
          0,
        );

        setState(() => ({
          ...(behaviourResponse.result.behaviour?.length && {
            behaviour: behaviourResponse.result.behaviour,
          }),
          ...(behaviourResponse.result.detentions?.length && {
            detentions: behaviourResponse.result.detentions,
          }),
          ...(behaviourResponse.result.employees?.length && {
            employees: behaviourResponse.result.employees,
          }),
          totalPoints: total,
        }));

        props.setProgress(Math.max(props.progress(), 0.9));
      } else {
        toast.showToast(
          "Error",
          behaviourResponse.result.error ?? "Unknown error",
          "error",
        );
      }
    });

    lookupPromise.then((lookupResponse: ABLookupResponse) => {
      if (lookupResponse.result.success) {
        setState({
          behaviourTypes: lookupResponse.result.behaviour_types,
          behaviourLocations: lookupResponse.result.behaviour_locations,
          behaviourStatuses: lookupResponse.result.behaviour_statuses,
          behaviourActions: lookupResponse.result.behaviour_actions_taken,
        });
      } else {
        toast.showToast(
          "Error",
          lookupResponse.result.error ?? "Unknown error",
          "error",
        );
      }

      props.setProgress(Math.max(props.progress(), 1));
    });
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
      <Show when={props.progress() === 0.9 || props.progress() === 1}>
        <div class={styles()!["box-container"]}>
          <div
            class="flex items-center justify-end w-full pr-[10px]"
            style="max-width: calc(100vw - 185px);"
          >
            <div class="flex space-x-4 mb-2">
              <button
                type="button"
                onClick={() => setState("activePage", "behaviour")}
                class={`text-sm text-white cursor-pointer ${state.activePage === "behaviour"
                  ? "border-b border-blue-400"
                  : ""
                  }`}
              >
                Behaviour
              </button>
              <button
                type="button"
                onClick={() => setState("activePage", "detentions")}
                class={`text-sm font-medium text-white  cursor-pointer ${state.activePage === "detentions"
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
                    <div class={styles()!["_left"]}>
                      <div
                        style={{ display: "flex", "flex-direction": "column" }}
                      >
                        <div class={styles()!["_grey"]}>
                          {formatDate({ date: behaviour.date, short: true })}
                        </div>
                        <div>
                          {getLookupName(
                            behaviour.type_ids?.[0],
                            state.behaviourTypes,
                          ) || "-"}
                        </div>
                      </div>
                    </div>
                    <div class={styles()!["_left"]}>
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
                    <div class={styles()!["_left"]}>
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
                    <div class={styles()!["_left"]}>
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
                    <div>
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
                    {state.totalPoints || "0"}
                  </div>
                </div>
              </div>
            </div>
          </Show>
          <Show when={state.activePage === "detentions"}>
            <div class={styles()!["t-detentions"]}>
              <div class={styles()!["t-header"]}>
                <div class={styles()!["_left"]}>Date</div>
                <div class={styles()!["_left"]}>Type</div>
                <div class={styles()!["_left"]}>Location</div>
                <div>Start time</div>
                <div>End time</div>
                <div>Attended</div>
              </div>
              <div class={styles()!["t-body"]}>
                {state.detentions.map(
                  (detention: BehaviourResponse.DetentionsType) => (
                    <div class={styles()!["t-row"]}>
                      <div class={styles()!["_left"]}>
                        {formatDate({ date: detention.date, short: true })}
                      </div>
                      <div class={styles()!["_left"]}>
                        {detention.description || "-"}
                      </div>
                      <div class={styles()!["_left"]}>
                        {detention.location || "-"}
                      </div>
                      <div>
                        {detention.start_time || "-"}
                      </div>
                      <div>
                        {detention.end_time || "-"}
                      </div>
                      <div>
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
