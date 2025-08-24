import { onMount, onCleanup, createSignal, For, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { makePersisted } from "@solid-primitives/storage";
import type { ClubsResponse } from "../../types/api/clubs";
import { useToast } from "../toast";
import { FaSolidPersonRunning } from "solid-icons/fa";
import { Transition } from "solid-transition-group";

function Clubs(props: {
  setProgress: (value: number) => void;
  progress: () => number;
  edulink: any;
}) {
  let styleElement: HTMLLinkElement;
  const toast = useToast();
  const [state, setState] = createStore<{
    clubs: ClubsResponse.ClubType[];
    allClubs: ClubsResponse.ClubType[];
    activePage: "My Clubs" | "All Clubs";
  }>({
    clubs: [],
    allClubs: [],
    activePage: "My Clubs",
  });
  const [sessionData] = makePersisted(createSignal<any>(null), {
    storage: sessionStorage,
    name: "sessionData",
  });
  const [apiUrl] = makePersisted(createSignal<any>(null), {
    storage: sessionStorage,
    name: "apiUrl",
  });

  onMount(async () => {
    const styleUrl = new URL("../../assets/css/clubs.css", import.meta.url)
      .href;
    styleElement = document.createElement("link");
    styleElement.rel = "preload";
    styleElement.as = "style";
    styleElement.href = `${styleUrl}?t=${Date.now()}`;
    styleElement.onload = () => {
      styleElement.rel = "stylesheet";
    };
    document.getElementById("item-box")?.appendChild(styleElement);

    const clubsPromise = props.edulink.getClubs(
      true,
      sessionData()?.user?.id,
      sessionData()?.authtoken,
      apiUrl(),
    );

    const response: ClubsResponse = await clubsPromise;
    if (response.result.success) {
      setState("clubs", response.result.clubs);
      props.setProgress(1);
      const allClubsPromise = props.edulink.getClubs(
        false,
        sessionData()?.user?.id,
        sessionData()?.authtoken,
        apiUrl(),
      );

      const allClubsResponse: ClubsResponse = await allClubsPromise;
      if (response.result.success) {
        setState("allClubs", allClubsResponse.result.clubs);
      }
    } else {
      toast.showToast(
        "Error",
        response.result.error ?? "Unknown error",
        "error",
      );
      props.setProgress(0);
    }
  });

  onCleanup(() => {
    if (styleElement) {
      styleElement.remove();
    }
    props.setProgress(0);
  });

  function formatDate(date: string): string {
    const d = new Date(date.replace(" ", "T"));

    const time = d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const weekday = d.toLocaleDateString(undefined, { weekday: "long" });
    const day = d.getDate();
    const month = d.toLocaleDateString(undefined, { month: "long" });

    return `${time} ${weekday}, ${day} ${month}`;
  }

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
              <For each={["My Clubs", "All Clubs"] as const}>
                {(name) => (
                  <button
                    type="button"
                    onClick={() => {
                      if (state.activePage === name) return;
                      setState("activePage", name);
                    }}
                    class={`text-sm text-white cursor-pointer ${
                      state.activePage === name
                        ? "border-b border-blue-400"
                        : ""
                    }`}
                  >
                    {name}
                  </button>
                )}
              </For>
            </div>
          </div>
          <div class="t-container">
            <div
              class="t-clubs"
              style={{ display: "flex", "flex-direction": "column" }}
            >
              <div class="t-header">
                <span class="t-header__title _name">Name</span>
                <span class="t-header__title _location">Location</span>
                <span class="t-header__title _capacity">Capacity</span>
                <span class="t-header__title _session">Next Session</span>
              </div>
              <div class="t-body">
                {(state.activePage === "My Clubs"
                  ? state.clubs
                  : state.allClubs
                )?.map((club) => (
                  <div class="t-row">
                    <span class="t-timetable__text _name">
                      {club.name || "-"}
                    </span>
                    <span class="t-timetable__text _location">
                      {club.location || "-"}
                    </span>
                    <span class="t-timetable__text _capacity">
                      {club.capacity?.maximum
                        ? `${club.capacity.bookings}/${club.capacity.maximum}`
                        : "-"}
                    </span>
                    <span class="t-timetable__text _session">
                      {formatDate(club.next_session) || "-"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Show>
    </Transition>
  );
}

export default {
  name: "Clubs",
  icon: () => {
    return <FaSolidPersonRunning size={36} />;
  },
  pos: 10,
  component: Clubs,
};
