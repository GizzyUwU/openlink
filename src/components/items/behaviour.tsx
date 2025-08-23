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
}) {
  let styleElement: HTMLLinkElement;
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
    const styleUrl = new URL("../../assets/css/behaviour.css", import.meta.url)
      .href;
    styleElement = document.createElement("link");
    styleElement.rel = "preload";
    styleElement.as = "style";
    styleElement.href = `${styleUrl}?t=${Date.now()}`;
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
    styleElement.remove();
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
        <div class="box-container">
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
            <div
              class="t-behaviour"
              style={{ display: "flex", "flex-direction": "column" }}
            >
              <div class="t-header bg-[#ececec]">
                <span class="t-header__title _type_date">Type & Date</span>
                <span class="t-header__title _comment_teacher">
                  Comment & Teacher
                </span>
                <span class="t-header__title _action_info">Action & Info</span>
                <span class="t-header__title _loc_status">
                  Location & Status
                </span>
                <span class="t-header__title _points">Points</span>
              </div>
              <div class="t-body">
                {state.behaviour.map((behaviour: any) => (
                  <div class="t-row">
                    <span class="t-behaviour__text_type_date">
                      <div
                        style={{
                          display: "flex",
                          "flex-direction": "column",
                        }}
                      >
                        <span class="_grey">{formatDate(behaviour.date)}</span>
                        <span>
                          {getLookupName(
                            behaviour.type_ids?.[0],
                            state.behaviourTypes,
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

                            const employee = state.employees.find(
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
                            state.behaviourActions,
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
                            state.behaviourLocations,
                          ) || "-"}
                        </span>
                        <span>
                          {getLookupName(
                            behaviour.status_id,
                            state.behaviourStatuses,
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
                  <span class="__total-points">{state.totalPoints || "-"}</span>
                </div>
              </div>
            </div>
          </Show>
          <Show when={state.activePage === "detentions"}>
            <div
              class="t-behaviour"
              style={{ display: "flex", "flex-direction": "column" }}
            >
              <div class="t-detentions-header bg-[#ececec] rounded-l rounded-r">
                <span class="t-header__title _date">Date</span>
                <span class="t-header__title _type">Type</span>
                <span class="t-header__title _loc">Location</span>
                <span class="t-header__title _start">Start time</span>
                <span class="t-header__title _end">End time</span>
                <span class="t-header__title _attended">Attended</span>
              </div>
              <div class="t-body">
                {state.detentions.map(
                  (detention: BehaviourResponse.DetentionsType) => (
                    <div class="t-detentions-row">
                      <span class="t-behaviour__text _date">
                        {formatDate(detention.date)}
                      </span>
                      <span class="t-behaviour__text _type">
                        {detention.description || "-"}
                      </span>
                      <span class="t-behaviour__text _loc">
                        {detention.location || "-"}
                      </span>
                      <span class="t-behaviour__text _start">
                        {detention.start_time || "-"}
                      </span>
                      <span class="t-behaviour__text _end">
                        {detention.end_time || "-"}
                      </span>
                      <span class="t-behaviour__text _attended">
                        {detention.attended || "-"}
                      </span>
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
