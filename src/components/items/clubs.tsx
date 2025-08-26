import { onMount, onCleanup, createSignal, For, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { makePersisted } from "@solid-primitives/storage";
import type { ClubsResponse } from "../../types/api/clubs";
import { useToast } from "../toast";
import { FaSolidPersonRunning } from "solid-icons/fa";
import { Transition } from "solid-transition-group";
import DOMPurify from "dompurify";
import { IoCheckmarkCircleOutline } from "solid-icons/io";
import { ImCross } from "solid-icons/im";

function Clubs(props: {
  setProgress: (value: number) => void;
  progress: () => number;
  edulink: any;
  setOverlay: any;
}) {
  let styleElement: HTMLLinkElement;
  const toast = useToast();
  const [state, setState] = createStore<{
    clubs: ClubsResponse.ClubType[];
    allClubs: ClubsResponse.ClubType[];
    previewClub: ClubsResponse.ClubType[];
    activePage: "My Clubs" | "All Clubs";
  }>({
    clubs: [],
    allClubs: [],
    previewClub: [],
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

    const response = await props.edulink.getClubs(
      true,
      sessionData()?.user?.id,
      sessionData()?.authtoken,
      apiUrl(),
    );

    if (response.result.success) {
      setState("clubs", response.result.clubs);
      props.setProgress(1);
      const allClubsResponse = await props.edulink.getClubs(
        false,
        sessionData()?.user?.id,
        sessionData()?.authtoken,
        apiUrl(),
      );

      if (allClubsResponse.result.success) {
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

  function formatDate({
    date,
    time = false,
    fullFormat = false,
  }: {
    date: string | Date;
    time?: boolean;
    fullFormat?: boolean;
  }): string {
    const d = new Date(
      typeof date === "string" ? date.replace(" ", "T") : date,
    );

    const weekday = d.toLocaleDateString(undefined, { weekday: "long" });
    const day = d.getDate().toString().padStart(2, "0");
    const month = d.toLocaleDateString(undefined, { month: "long" });

    if (fullFormat) {
      const timeString = d.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      return `${timeString} ${weekday}, ${day} ${month}`;
    }

    if (time) {
      return d.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    }

    return `${weekday}, ${day} ${month}`;
  }

  const handleClubPreview = async (club_id: number | string) => {
    props.setOverlay(
      <div class="bg-white rounded-2xl p-6 w-[90%] max-w-lg relative">
        <button
          type="button"
          onClick={() => props.setOverlay(null)}
          class="absolute top-2 right-2 text-gray-500 hover:text-black"
        >
          ✕
        </button>
        <h2 class="text-xl text-center">Loading...</h2>
      </div>,
    );

    const clubData = await props.edulink.getClub(
      club_id,
      sessionData()?.authtoken,
      apiUrl(),
    );

    if (clubData.result.success) {
      props.setOverlay(
        <div class="bg-white rounded-2xl p-6 w-[90%] max-w-xl relative max-h-[50vh] flex flex-col">
          <button
            type="button"
            onClick={() => props.setOverlay(null)}
            class="absolute top-1 right-2 text-xl text-gray-500 hover:text-black"
          >
            ✕
          </button>
          <h2 class="absolute top-4 left-4 text-xs text-capitalise text-gray-400">
            CLUB DETAILS
          </h2>
          <h2 class="text-center text-xl mt-4">{clubData.result.club.name}</h2>
          <h2 class="text-center text-sm">
            {clubData.result.club.location} -{" "}
            {Array.isArray(clubData.result.club.leaders_names)
              ? clubData.result.club.leaders_names.join(", ")
              : clubData.result.club.leaders_names}{" "}
          </h2>
          <h2 class="text-sm">
            <span class="font-bold">Description:</span>
            <br />
            <span
              innerHTML={DOMPurify.sanitize(clubData.result.club.description)}
            ></span>
          </h2>
          <br />
          <h2 class="text-sm font-bold">All Times:</h2>
          <br />
          <div
            class="t-clubs"
            style={{ display: "flex", "flex-direction": "column" }}
          >
            <div class="t-club-header">
              <span class="t-header__title _name">Name</span>
              <span class="t-header__title _location">Attendance</span>
              <span class="t-header__title _capacity">Start</span>
              <span class="t-header__title _session">End</span>
            </div>
            <div class="t-body mt-2">
              <For each={clubData.result.club.sessions}>
                {(data) => (
                  <div class="t-club-row cursor-pointer">
                    <span class="t-timetable__text _date">
                      {formatDate({ date: data.start_time }) || "-"}
                    </span>
                    <span class="t-timetable__text _attend">
                      {data.attended ? (
                        data.attended ? (
                          <IoCheckmarkCircleOutline size="32" color="green" />
                        ) : (
                          <ImCross color="red" size="20" />
                        )
                      ) : (
                        <ImCross color="red" size="20" />
                      )}
                    </span>
                    <span class="t-timetable__text _start">
                      {formatDate({ date: data.start_time, time: true })}
                    </span>
                    <span class="t-timetable__text _end">
                      {formatDate({ date: data.end_time, time: true })}
                    </span>
                  </div>
                )}
              </For>
            </div>
          </div>
        </div>,
      );
    }
  };

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
          <div class="flex items-center justify-end w-full pr-[10px] z">
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
                  <div
                    class="t-row cursor-pointer"
                    onClick={() => handleClubPreview(club.id)}
                  >
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
                      {formatDate({
                        date: club.next_session,
                        fullFormat: true,
                      }) || "-"}
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
