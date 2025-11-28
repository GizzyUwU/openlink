import { onMount, createSignal, For, Show, Accessor, createResource } from "solid-js";
import { createStore } from "solid-js/store";
import type { ClubsResponse } from "../../types/api/clubs";
import { useToast } from "../toast";
import { FaSolidPersonRunning } from "solid-icons/fa";
import { Transition } from "solid-transition-group";
import DOMPurify from "dompurify";
import { IoCheckmarkCircleOutline } from "solid-icons/io";
import { ImCross } from "solid-icons/im";
import type { SessionData } from "../../types/auth";
import type { EdulinkAPI } from "../../api/main";
import { formatDate } from "../../lib/formatDate";
import type { ToastContextType } from "../toast";

function ClubOverlay(props: Readonly<{
  sessionData: () => SessionData;
  edulink: EdulinkAPI;
  club_id: number;
  close: () => void;
  activePage: string;
  toast: ToastContextType;
  setActivePage: (page: "My Clubs" | "All Clubs") => void;
  theme: string;
}>) {
  const [styles, setStyles] = createSignal<{ [key: string]: string } | null>(
    null,
  );
  const [clubData] = createResource(
    () => props.club_id,
    async (id) =>
      (await props.edulink.getClub(id, props.sessionData()?.authtoken, props.sessionData()?.apiUrl), window.toast)
  );

  onMount(async () => {
    const cssModule = await import(
      `../../public/assets/css/${props.theme}/club.module.css`
    );
    const normalized: { [key: string]: string } = {
      ...cssModule.default,
      ...cssModule,
    };
    setStyles(normalized);
  })

  async function attendClub(club_id: string | number, attend: boolean) {
    if (!club_id) throw new Error("Club ID needed to identify the club");
    if (attend === undefined || attend === null)
      throw new Error(
        "Attend Bool needed to see if should leave or join a club",
      );

    const res = await props.edulink.attendClub(
      club_id,
      props.sessionData()?.user?.id,
      attend,
      props.sessionData()?.authtoken,
      props.sessionData()?.apiUrl,
      window.toast
    );

    if (res.result.success) {
      props.toast.showToast(
        "Success",
        `${props.activePage === "My Clubs" ? "Left" : "Joined"} the club.`,
        "success",
      );
      props.setActivePage("My Clubs");
    }
  }

  return (
    <Show when={styles()}>
      <div
        class={`${styles()!["club"]} rounded-2xl p-6 w-[90%] max-w-lg relative`}
      >
        <button
          type="button"
          onClick={() => props.close()}
          class={`${styles()!["club-cross"]} absolute top-2 right-2 cursor-pointer`}
        >
          ✕
        </button>
        <Show
          when={clubData()}
          fallback={<h2 class="text-xl text-center">Loading...</h2>}
        >
          {(data) => {
            if (!data().result.success) {
              return (
                <h2 class="text-xl text-center text-red-500">
                  Failed to load club data. Please try again later.
                </h2>
              );
            }

            return (
              <>
                <h2 class={`absolute top-4 left-4 text-xs text-capitalise ${styles()!["overlay-title"]}`}>
                  CLUB DETAILS
                </h2>
                <div class="mt-6 flex-1 min-h-0 overflow-y-auto">
                  <h2 class="text-center text-xl">{data().result.club.name}</h2>
                  <h2 class="text-center text-sm">
                    {data().result.club.location} -{" "}
                    {Array.isArray(data().result.club.leaders_names)
                      ? data().result.club.leaders_names.join(", ")
                      : data().result.club.leaders_names}
                  </h2>
                  <Show when={data().result.club.description}>
                    <h2 class="text-sm">
                      <div class="font-bold">Description:</div>
                      <div innerHTML={DOMPurify.sanitize(data().result.club.description)}></div>
                    </h2>
                  </Show>
                  <div class={styles()!["t-club"]} style={{ display: "flex", "flex-direction": "column" }}>
                    <div class={styles()!["t-header"]}>
                      <div>Date</div>
                      <div>Attendance</div>
                      <div>Start</div>
                      <div>End</div>
                    </div>
                    <div class={styles()!["t-body"]}>
                      <For each={data().result.club.sessions}>
                        {(session) => (
                          <div class={styles()!["t-row"]}>
                            <div class={styles()!["_left"]}>
                              {formatDate({ date: session.start_time }) || "-"}
                            </div>
                            <div>
                              {session.attended ? (
                                <IoCheckmarkCircleOutline size="32" color="green" />
                              ) : (
                                <ImCross color="red" size="20" />
                              )}
                            </div>
                            <div>{formatDate({ date: session.start_time, time: true })}</div>
                            <div>{formatDate({ date: session.end_time, time: true })}</div>
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                  <div class="mt-4 flex flex-1 min-h-0 items-center justify-center">
                    <button
                      class={`${styles()!["attending"]} ${props.activePage === "My Clubs" ? styles()!["unbook"] : styles()!["attend"]}`}
                      onClick={() => attendClub(props.club_id, props.activePage === "My Clubs" ? false : true)}
                    >
                      {props.activePage === "My Clubs" ? "Unbook" : "Attend"}
                    </button>
                  </div>
                </div>
              </>
            );
          }}
        </Show>
      </div>
    </Show>
  );
}

function Clubs(props: {
  setProgress: (value: number) => void;
  sessionData: () => SessionData;
  progress: () => number;
  edulink: EdulinkAPI;
  setOverlay: any;
  theme: string;
}) {
  const [styles, setStyles] = createSignal<{ [key: string]: string } | null>(
    null,
  );
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


  onMount(async () => {
    props.setProgress(0.6);

    const cssModule = await import(
      `../../public/assets/css/${props.theme}/clubs.module.css`
    );
    const normalized: { [key: string]: string } = {
      ...cssModule.default,
      ...cssModule,
    };
    setStyles(normalized);
    const clubsPromise = props.edulink.getClubs(
      true,
      props.sessionData()?.user?.id,
      props.sessionData()?.authtoken,
      props.sessionData()?.apiUrl,
      window.toast
    );

    const allClubsPromise = props.edulink.getClubs(
      false,
      props.sessionData()?.user?.id,
      props.sessionData()?.authtoken,
      props.sessionData()?.apiUrl,
      window.toast
    );

    const [response, allClubsResponse] = await Promise.all([
      clubsPromise,
      allClubsPromise,
    ]);
    if (response.result.success) {
      setState("clubs", response.result.clubs);
      props.setProgress(props.progress() === 0.8 ? 1 : 0.8);
    } else {
      toast.showToast(
        "Error",
        response.result.error ?? "Unknown error",
        "error",
      );
      props.setProgress(0);
    }

    if (allClubsResponse.result.success) {
      props.setProgress(props.progress() === 0.8 ? 1 : 0.8);
      setState("allClubs", allClubsResponse.result.clubs);
    } else {
      toast.showToast(
        "Error",
        response.result.error ?? "Unknown error",
        "error",
      );
      props.setProgress(0);
    }
  });

  // async function attendClub(club_id: string | number, attend: boolean) {
  //   if (!club_id) throw new Error("Club ID needed to identify the club");
  //   console.log(attend);
  //   if (attend === undefined || attend === null)
  //     throw new Error(
  //       "Attend Bool needed to see if should leave or join a club",
  //     );

  //   const res = await props.edulink.attendClub(
  //     club_id,
  //     props.sessionData()?.user?.id,
  //     attend,
  //     props.sessionData()?.authtoken,
  //     props.sessionData()?.apiUrl,
  //   );

  //   if (res.result.success) {
  //     toast.showToast(
  //       "Success",
  //       `${state.activePage === "My Clubs" ? "Left" : "Joined"} the club.`,
  //       "success",
  //     );
  //     setState("activePage", "My Clubs");
  //   }
  // }

  // const handleClubPreview = async (club_id: number | string) => {
  //   props.setOverlay(
  //     <div
  //       class={`${styles()!["club"]} rounded-2xl p-6 w-[90%] max-w-lg relative`}
  //     >
  //       <button
  //         type="button"
  //         onClick={() => props.setOverlay(null)}
  //         class={`${styles()!["club-cross"]} absolute top-2 right-2 cursor-pointer`}
  //       >
  //         ✕
  //       </button>
  //       <h2 class="text-xl text-center">Loading...</h2>
  //     </div>,
  //   );

  //   const clubData = await props.edulink.getClub(
  //     club_id,
  //     props.sessionData()?.authtoken,
  //     props.sessionData()?.apiUrl,
  //   );

  //   if (clubData.result.success) {
  //     props.setOverlay(
  //       <div
  //         class={`${styles()!["club"]} rounded-2xl p-6 w-[90%] max-w-xl relative max-h-[50vh] flex flex-col`}
  //       >
  //         <button
  //           type="button"
  //           onClick={() => props.setOverlay(null)}
  //           class={`${styles()!["club-cross"]} absolute top-2 right-2 cursor-pointer`}
  //         >
  //           ✕
  //         </button>
  //         <h2
  //           class={`absolute top-4 left-4 text-xs text-capitalise ${styles()!["overlay-title"]}`}
  //         >
  //           CLUB DETAILS
  //         </h2>
  //         <div class="mt-6 flex-1 min-h-0 overflow-y-auto">
  //           <h2 class="text-center text-xl">{clubData.result.club.name}</h2>
  //           <h2 class="text-center text-sm">
  //             {clubData.result.club.location} -{" "}
  //             {Array.isArray(clubData.result.club.leaders_names)
  //               ? clubData.result.club.leaders_names.join(", ")
  //               : clubData.result.club.leaders_names}{" "}
  //           </h2>
  //           <Show when={clubData.result.club.description !== null}>
  //             <h2 class="text-sm">
  //               <div class="font-bold">Description:</div>
  //               <div
  //                 innerHTML={DOMPurify.sanitize(
  //                   clubData.result.club.description,
  //                 )}
  //               ></div>
  //             </h2>
  //           </Show>
  //           <br />
  //           <div
  //             class={styles()!["t-clubs"]}
  //             style={{ display: "flex", "flex-direction": "column" }}
  //           >
  //             <div class={styles()!["t-club-header"]}>
  //               <div>Name</div>
  //               <div>Attendance</div>
  //               <div>Start</div>
  //               <div>End</div>
  //             </div>
  //             <div class={`${styles()!["t-body"]} mt-2`}>
  //               <For each={clubData.result.club.sessions}>
  //                 {(data) => (
  //                   <div class={`${styles()!["t-club-row"]} cursor-pointer`}>
  //                     <div class={styles()!["_date"]}>
  //                       {formatDate({ date: data.start_time }) || "-"}
  //                     </div>
  //                     <div>
  //                       {data.attended ? (
  //                         data.attended ? (
  //                           <IoCheckmarkCircleOutline size="32" color="green" />
  //                         ) : (
  //                           <ImCross color="red" size="20" />
  //                         )
  //                       ) : (
  //                         <ImCross color="red" size="20" />
  //                       )}
  //                     </div>
  //                     <div>
  //                       {formatDate({ date: data.start_time, time: true })}
  //                     </div>
  //                     <div>
  //                       {formatDate({ date: data.end_time, time: true })}
  //                     </div>
  //                   </div>
  //                 )}
  //               </For>
  //             </div>
  //           </div>
  //         </div>
  //         <div class="mt-4 flex flex-1 min-h-0 items-center justify-center">
  //           <button
  //             class={`${styles()!["attending"]} ${state.activePage === "My Clubs" ? styles()!["unbook"] : styles()!["attend"]}`}
  //             onClick={() =>
  //               attendClub(
  //                 club_id,
  //                 state.activePage === "My Clubs" ? false : true,
  //               )
  //             }
  //           >
  //             {state.activePage === "My Clubs" ? "Unbook" : "Attend"}
  //           </button>
  //         </div>
  //       </div>,
  //     );
  //   }
  // };

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
        const a = el.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 100,
          easing: "ease",
          composite: "accumulate",
        });
        a.finished.then(done);
      }}
    >
      <Show when={props.progress() === 1 && styles()}>
        <div class={styles()!["box-container"]}>
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
                    class={`text-sm text-white cursor-pointer ${state.activePage === name
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
          <div class={styles()!["t-container"]}>
            <div
              class={styles()!["t-clubs"]}
              style={{ display: "flex", "flex-direction": "column" }}
            >
              <div class={styles()!["t-header"]}>
                <div class={styles()!["_left"]}>Name</div>
                <div>
                  Location
                </div>
                <div>
                  Capacity
                </div>
                <div>
                  Next Session
                </div>
              </div>
              <div class={styles()!["t-body"]}>
                {(state.activePage === "My Clubs"
                  ? state.clubs
                  : state.allClubs
                )?.map((club) => (
                  <div
                    class={`${styles()!["t-row"]} cursor-pointer`}
                    onClick={() => props.setOverlay(
                      <ClubOverlay
                        sessionData={props.sessionData as Accessor<SessionData>}
                        edulink={props.edulink}
                        club_id={Number(club.id)}
                        close={() => props.setOverlay(null)}
                        activePage={state.activePage}
                        toast={toast}
                        theme={props.theme}
                        setActivePage={(page: "My Clubs" | "All Clubs") => setState("activePage", page)}
                      />
                    )}
                  >
                    <div class={styles()!["_left"]}>{club.name || "-"}</div>
                    <div>
                      {club.location || "-"}
                    </div>
                    <div>
                      {club.capacity?.maximum
                        ? `${club.capacity.bookings}/${club.capacity.maximum}`
                        : "-"}
                    </div>
                    <div>
                      {club.next_session === null
                        ? "-"
                        : formatDate({
                          date: club.next_session,
                          fullFormat: true,
                        })}
                    </div>
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
