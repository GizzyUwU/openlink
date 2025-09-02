import { onMount, onCleanup, createSignal, For, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { makePersisted } from "@solid-primitives/storage";
import type {
  CommunicatorResponse,
  InboxResponse,
} from "../../types/api/communicator";
import type { TeacherPhotosResponse } from "../../types/api/teacherPhotos";
import { useToast } from "../toast";
import { Transition } from "solid-transition-group";
import DOMPurify from "dompurify";

function Messages(props: {
  setProgress: (value: number) => void;
  progress: () => number;
  edulink: any;
  theme: string;
}) {
  const [styles, setStyles] = createSignal<{ [key: string]: string } | null>(
    null,
  );
  let loadMoreRef: HTMLDivElement | undefined;
  const toast = useToast();
  const [state, setState] = createStore<{
    messages: CommunicatorResponse.MessagesType[];
    photos: TeacherPhotosResponse.PhotoType[];
    openedMessage: CommunicatorResponse.MessagesType[];
    activePage: "inbox" | "outbox";
    pagination: {
      itemsPerPage: number | string;
      currentPage: number;
      totalPages: number | string;
    };
    defaultImage: string;
  }>({
    messages: [],
    photos: [],
    openedMessage: [],
    activePage: "inbox",
    pagination: {
      itemsPerPage: 10,
      currentPage: 0,
      totalPages: 0,
    },
    defaultImage:
      "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",
  });
  const [sessionData] = makePersisted(createSignal<any>(null), {
    storage: sessionStorage,
    name: "sessionData",
  });
  const [apiUrl] = makePersisted(createSignal<any>(null), {
    storage: sessionStorage,
    name: "apiUrl",
  });

  const handlePagination = async (page: number) => {
    try {
      const inboxData: InboxResponse = await props.edulink.getCommunicator(
        "inbox",
        page,
        state.pagination.itemsPerPage,
        sessionData()?.authtoken,
        apiUrl(),
      );

      if (!inboxData.result.success) {
        toast.showToast(
          "Error",
          inboxData.result.error ?? "Unknown error",
          "error",
        );
        props.setProgress(0);
        return;
      }

      const employeeIds = inboxData.result.messages
        .map((msg) => msg.sender.id)
        .filter((id): id is string => Boolean(id));
      const uniqueEmployeeIds = [...new Set(employeeIds)];

      let photos: TeacherPhotosResponse.PhotoType[] = [];
      if (uniqueEmployeeIds.length > 0) {
        const photosData = await props.edulink.getTeacherPhotos(
          uniqueEmployeeIds,
          sessionData()?.authtoken,
          apiUrl(),
        );
        photos = photosData.result.employee_photos;
      }

      setState({
        messages: [...state.messages, ...inboxData.result.messages],
        photos: [...state.photos, ...photos],
        pagination: {
          ...state.pagination,
          currentPage: state.pagination.currentPage + 1,
          totalPages: Number(inboxData.result.pagination.total_pages),
        },
      });

      props.setProgress(1);
    } catch (err) {
      toast.showToast("Error", "Failed to load messages or photos", "error");
      props.setProgress(0);
    }
  };

  onMount(async () => {
    props.setProgress(0.6);
    const cssModule = await import(
      `../../public/assets/css/${props.theme}/messages.module.css`
    );
    const normalized: { [key: string]: string } = {
      ...cssModule.default,
      ...cssModule,
    };
    setStyles(normalized);
    await handlePagination(1);
    if (loadMoreRef) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (
            entries[0].isIntersecting &&
            Number(state.pagination.totalPages) >
              Number(state.pagination.currentPage)
          ) {
            handlePagination(state.pagination.currentPage + 1);
          }
        },
        { threshold: 1.0 },
      );
      observer.observe(loadMoreRef);

      onCleanup(() => observer.disconnect());
    }
  });

  onCleanup(() => {
    if (document.getElementById("item-styling")) {
      document.getElementById("item-styling")?.remove();
    }
    props.setProgress(0);
  });

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
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
        const a = el.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 100,
          easing: "ease",
          composite: "accumulate",
        });
        a.finished.then(done);
      }}
    >
      <Show
        when={
          props.progress() === 1 &&
          state.photos.length > 0 &&
          state.messages.length > 0 &&
          styles()
        }
      >
        <div class={styles()!["box-container"]}>
          <div class={styles()!["t-container"]}>
            <div class={styles()!["b-messages"]}>
              <ul class={styles()!["l-messages__items"]}>
                <For each={state.messages}>
                  {(message) => (
                    <li
                      class={styles()!["__item"]}
                      onClick={() => setState("openedMessage", [message])}
                    >
                      <div class={styles()!["l-messages__photos"]}>
                        <ul class={styles()!["l-photos"]}>
                          <li
                            class={styles()!["l-photos__item"]}
                            ref={(el) => {
                              if (!el) return;
                              const img = new Image();
                              img.crossOrigin = "anonymous";
                              img.src = `data:image/*;base64,${
                                state.photos.find(
                                  (p) => p.id === message.sender.id,
                                )?.photo || state.defaultImage
                              }`;
                              img.onload = () => {
                                const canvas = document.createElement("canvas");
                                const ctx = canvas.getContext("2d");
                                if (!ctx) return;

                                canvas.width = img.width;
                                canvas.height = img.height;
                                ctx.drawImage(img, 0, 0);

                                const { data } = ctx.getImageData(
                                  0,
                                  0,
                                  canvas.width,
                                  canvas.height,
                                );

                                const width = canvas.width;
                                const height = canvas.height;
                                const corners = [
                                  0,
                                  0,
                                  width - 1,
                                  0,
                                  0,
                                  height - 1,
                                  width - 1,
                                  height - 1,
                                ];

                                let hasTransparentBackground = false;
                                for (let i = 0; i < corners.length; i += 2) {
                                  const x = corners[i];
                                  const y = corners[i + 1];
                                  const alpha = data[(y * width + x) * 4 + 3];
                                  if (alpha < 255) {
                                    hasTransparentBackground = true;
                                    break;
                                  }
                                }
                                if (hasTransparentBackground) return;

                                const colorCounts: Record<string, number> = {};
                                let maxColor = "";
                                let maxCount = 0;

                                for (let i = 0; i < data.length; i += 4) {
                                  const r = data[i];
                                  const g = data[i + 1];
                                  const b = data[i + 2];
                                  const a = data[i + 3];
                                  if (a === 0) continue;
                                  const key = `${r},${g},${b}`;
                                  colorCounts[key] =
                                    (colorCounts[key] || 0) + 1;
                                  if (colorCounts[key] > maxCount) {
                                    maxCount = colorCounts[key];
                                    maxColor = key;
                                  }
                                }
                                if (maxColor)
                                  el.style.backgroundColor = `rgb(${maxColor})`;
                              };
                            }}
                          >
                            <div
                              class={styles()!["l-photos__photo"]}
                              style={{
                                "background-image": `url(data:image/*;base64,${
                                  state.photos.find(
                                    (p) => p.id === message.sender.id,
                                  )?.photo || state.defaultImage
                                })`,
                              }}
                            ></div>
                          </li>
                        </ul>
                      </div>
                      <div class={styles()!["l-messages__info"]}>
                        <div class={styles()!["l-messages__data"]}>
                          <div class={styles()!["l-messages__name"]}>
                            {message.sender.name || "-"}
                          </div>
                          <div class={styles()!["l-messages__text"]}>
                            {message.subject}
                          </div>
                        </div>
                        <div class={styles()!["l-messages__description"]}>
                          <div class={styles()!["l-messages__date"]}>
                            {formatDate(message.date) || "-"}
                          </div>
                          <div class={styles()!["l-messages__type"]}>
                            {message.type || "-"}
                          </div>
                        </div>
                      </div>
                    </li>
                  )}
                </For>
                <div ref={loadMoreRef} style={{ height: "1px" }}></div>
              </ul>
              <div class={styles()!["l-messages__content"]}>
                <div class={styles()!["__content"]}>
                  <Show when={state.openedMessage.length > 0}>
                    <div class={styles()!["__header"]}>
                      <div class={styles()!["l-messages__photos"]}>
                        <ul class={styles()!["l-photos"]}>
                          <li
                            class={styles()!["l-photos__item"]}
                            ref={(el) => {
                              if (!el) return;
                              const img = new Image();
                              img.crossOrigin = "anonymous";
                              img.src = `data:image/*;base64,${
                                state.photos.find(
                                  (p) =>
                                    p.id === state.openedMessage[0].sender.id,
                                )?.photo || state.defaultImage
                              }`;
                              img.onload = () => {
                                const canvas = document.createElement("canvas");
                                const ctx = canvas.getContext("2d");
                                if (!ctx) return;

                                canvas.width = img.width;
                                canvas.height = img.height;
                                ctx.drawImage(img, 0, 0);

                                const { data } = ctx.getImageData(
                                  0,
                                  0,
                                  canvas.width,
                                  canvas.height,
                                );
                                const width = canvas.width;
                                const height = canvas.height;
                                const corners = [
                                  0,
                                  0,
                                  width - 1,
                                  0,
                                  0,
                                  height - 1,
                                  width - 1,
                                  height - 1,
                                ];

                                let hasTransparentBackground = false;
                                for (let i = 0; i < corners.length; i += 2) {
                                  const x = corners[i];
                                  const y = corners[i + 1];
                                  const alpha = data[(y * width + x) * 4 + 3];
                                  if (alpha < 255) {
                                    hasTransparentBackground = true;
                                    break;
                                  }
                                }
                                if (hasTransparentBackground) return;

                                const colorCounts: Record<string, number> = {};
                                let maxColor = "";
                                let maxCount = 0;

                                for (let i = 0; i < data.length; i += 4) {
                                  const r = data[i];
                                  const g = data[i + 1];
                                  const b = data[i + 2];
                                  const a = data[i + 3];
                                  if (a === 0) continue;
                                  const key = `${r},${g},${b}`;
                                  colorCounts[key] =
                                    (colorCounts[key] || 0) + 1;
                                  if (colorCounts[key] > maxCount) {
                                    maxCount = colorCounts[key];
                                    maxColor = key;
                                  }
                                }
                                if (maxColor)
                                  el.style.backgroundColor = `rgb(${maxColor})`;
                              };
                            }}
                          >
                            <div
                              class={styles()!["l-photos__photo"]}
                              style={{
                                "background-image": `url(data:image/*;base64,${
                                  state.photos.find(
                                    (p) =>
                                      p.id === state.openedMessage[0].sender.id,
                                  )?.photo || state.defaultImage
                                })`,
                              }}
                            ></div>
                          </li>
                        </ul>
                      </div>
                      <div class={styles()!["__info"]}>
                        <div class={styles()!["__info-item"]}>
                          <div class={styles()!["__name"]}>
                            {state.openedMessage[0].sender.name}
                          </div>
                          <div class={styles()!["__time"]}>
                            {state.openedMessage[0].date}
                          </div>
                        </div>
                        <div class={styles()!["__info-item"]}>
                          <div class={styles()!["__subject"]}>
                            {state.openedMessage[0].subject}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      class={styles()!["__body"]}
                      innerHTML={DOMPurify.sanitize(
                        state.openedMessage[0].body.replace(/\n/g, "<br>"),
                      )}
                    ></div>
                  </Show>
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
  component: Messages,
  pos: 1,
};
