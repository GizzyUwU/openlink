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
}) {
  let styleElement: HTMLLinkElement;
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
    const styleUrl = new URL("../../assets/css/messages.css", import.meta.url)
      .href;
    styleElement = document.createElement("link");
    styleElement.rel = "preload";
    styleElement.as = "style";
    styleElement.href = `${styleUrl}?t=${Date.now()}`;
    styleElement.onload = () => {
      styleElement.rel = "stylesheet";
    };
    document.getElementById("item-box")?.appendChild(styleElement);

    const inboxPromise = props.edulink.getCommunicator(
      "inbox",
      1,
      state.pagination.itemsPerPage,
      sessionData()?.authtoken,
      apiUrl(),
    );

    const inboxData: InboxResponse = await inboxPromise;
    if (inboxData.result.success) {
      setState("messages", inboxData.result.messages);
      setState({
        messages: inboxData.result.messages,
        pagination: {
          ...state.pagination,
          currentPage: state.pagination.currentPage + 1,
          totalPages: inboxData.result.pagination.total_pages,
        },
      });
      const employeeIds = inboxData.result.messages
        .map((message: CommunicatorResponse.MessagesType) => message.sender.id)
        .filter((id): id is string => Boolean(id));
      const uniqueEmployeeIds = [...new Set(employeeIds)];
      if (uniqueEmployeeIds.length > 0) {
        try {
          const photos = await props.edulink.getTeacherPhotos(
            uniqueEmployeeIds,
            sessionData()?.authtoken,
            apiUrl(),
          );
          setState("photos", photos.result.employee_photos);
          props.setProgress(1);
        } catch (err) {
          toast.showToast("Error", "Failed to load teacher photos", "error");
        }
      }
    } else {
      toast.showToast(
        "Error",
        inboxData.result.error ?? "Unknown error",
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
          <div class="t-container">
            <div class="b-messages">
              <ul class="l-messages__items">
                <For each={state.messages}>
                  {(message) => (
                    <li
                      class="__item"
                      onClick={() => setState("openedMessage", [message])}
                    >
                      <div class="l-messages__photos">
                        <ul class="l-photos">
                          <li
                            class="l-photos__item"
                            ref={(el) => {
                              if (!el) return;

                              const img = new Image();
                              img.crossOrigin = "anonymous";
                              img.src = `data:image/png;base64,${state.photos.find((p) => p.id === message.sender.id)?.photo}`;

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
                              class="l-photos__photo"
                              style={{
                                "background-image": `url(data:image/png;base64,${state.photos.find((p) => p.id === message.sender.id)?.photo}`,
                              }}
                            ></div>
                          </li>
                        </ul>
                      </div>
                      <div class="l-messages__info">
                        <div class="l-messages__data">
                          <div class="l-messages__name text-black text-base">
                            {message.sender.name || "-"}
                          </div>
                          <div class="l-messages__text text-[14px]">
                            {message.subject}
                          </div>
                        </div>
                        <div class="l-messages__description">
                          <div class="l-messages__date text-sm">
                            {formatDate(message.date) || "-"}
                          </div>
                          <div class="l-messages__type text-sm">
                            {message.type || "-"}
                          </div>
                        </div>
                      </div>
                    </li>
                  )}
                </For>
              </ul>
              <div class="l-messages__content">
                <div class="__content">
                  <Show when={state.openedMessage.length > 0}>
                    <div class="__header">
                      <div class="l-messages__photos">
                        <ul class="l-photos">
                          <li
                            class="l-photos__item"
                            ref={(el) => {
                              if (!el) return;

                              const img = new Image();
                              img.crossOrigin = "anonymous";
                              img.src = `data:image/png;base64,${state.photos.find((p) => p.id === state.openedMessage[0].sender.id)?.photo}`;

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
                              class="l-photos__photo"
                              style={{
                                "background-image": `url(data:image/png;base64,${state.photos.find((p) => p.id === state.openedMessage[0].sender.id)?.photo}`,
                              }}
                            ></div>
                          </li>
                        </ul>
                      </div>
                      <div class="__info">
                        <div class="__info-item">
                          <div class="__name">
                            {state.openedMessage[0].sender.name}
                          </div>
                          <div class="__time text-sm">
                            {state.openedMessage[0].date}
                          </div>
                        </div>
                        <div class="__info-item">
                          <div class="__subject text-sm">
                            {state.openedMessage[0].subject}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      class="__body"
                      innerHTML={DOMPurify.sanitize(
                        state.openedMessage[0].body,
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
