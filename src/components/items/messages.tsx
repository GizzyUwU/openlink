import { onMount, onCleanup, createSignal, For, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { makePersisted } from "@solid-primitives/storage";
import type {
  CommunicatorResponse,
  InboxResponse,
} from "../../types/api/communicator";
import { useToast } from "../toast";
let dropdownRef: HTMLDivElement | undefined;
import { Transition } from "solid-transition-group";

function Messages(props: {
  setProgress: (value: number) => void;
  progress: () => number;
  edulink: any;
}) {
  let styleElement: HTMLLinkElement;
  let messageRef: HTMLDivElement | undefined;
  const toast = useToast();
  const [state, setState] = createStore<{
    messages: CommunicatorResponse.MessagesType[];
    activePage: "inbox" | "outbox";
    pagination: {
      itemsPerPage: number | string;
      currentPage: number;
      totalPages: number | string;
    };
  }>({
    messages: [],
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
      state.pagination.currentPage,
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
      props.setProgress(1);
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
                    <li class="__item">
                      <div class="l-messages__photos">
                        <ul class="l-photos">
                          <li
                            class="l-photos__item"
                            ref={(el) => {
                              if (el) return;

                              const img = new Image();
                              img.crossOrigin = "anonymous";
                              img.src = `data:image/png;base64,/9j/4AAQSkZJRgABAQAAAQABAAD//gA+Q1JFQVRPUjogZ2QtanBlZyB2MS4wICh1c2luZyBJSkcgSlBFRyB2OTApLCBkZWZhdWx0IHF1YWxpdHkK/9sAQwAIBgYHBgUIBwcHCQkICgwUDQwLCwwZEhMPFB0aHx4dGhwcICQuJyAiLCMcHCg3KSwwMTQ0NB8nOT04MjwuMzQy/9sAQwEJCQkMCwwYDQ0YMiEcITIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIy/8AAEQgAoAB4AwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/aAAwDAQACEQMRAD8A9+paKKAEqlf6nBYod2Xkxwi9TTNR1BbdWRHVWA+Zz0Qf415j4o8ZW9nHJFa4OfvOxG5z7n+lZzqKJpTpuR0GqeIrqaN3uL6LTrYd93zN9MDNefal4z0GF2X7Re3TjJ3pIVx78nNcdfz6h4gmMk1wY4M9dx/yaqG1srJlRFaWUdEzyfr6Vkqnc6OS2x3Ok+N8zK9ublo88PIxJ+ma9I8PeMYL2DF1N+97M3B+leBfbLiMEyGGBcdAoJFPt9caAs6MxXu7HA/WrjMmUEz6cm1u0Rw7XEaqBnLNhRx61Vi8Uwzv+48lkP3WeTZu9wK8EtvFsd1lHR3A5ZyxwB+PWrh1SSdC6Xsluo53Kecep9v85rW5n7NH0DbaqkuBLGYmPuGH5itAEEZHIr5vt9ev7IrPZaxNJGOWEi/IfoP89a9B8MfEi3do4NQk2FxknsOcZHf8KXOiXTfQ9PpajilSaNZI3DIwyGByCKkqjMSilooASq97ci1tXl7gcVYri/HmvR6Xp5UsN5GFTPUmpnLljcuEeaVjkfGXiMRI8ayk45fn7zGvN2jkvbhXus5xxH7ep9B7VeuTNcSLLPh5nJKKeg/2j7Cq11dQ2UO0N5kr8sScZPv7e1cPM279TuskrDbrC/LGVUKPvdAg9vesiZxGp8k7QesrDr9O5qpd6s7yHYQT7j+Qql5lzctkkjP8R6mtY0+5nKa6EsrBDl3G71kOT+AqFiJTuJZsfxNwB9Kkj0/cd7EsP5012JfZCu5hxn+EVat0Id+o5ZNg3HgdQKtxeZcqqu5SNuWB6kD/AD0quloVw0pyx5+tXpoZI7dFXKu44PoKOZD5WW5tRj8n7PFgBCPm7Z64qUXKGZFA4X5cjoazPsZt7TZ1YKW+p/yKr6ZM0biKQFkzk+3PUfSm9UGqep7J4K8az6RMlpds81lJjGTkxmvZoJo7iFJoXDxuMqwPBr5lsldU3bgxUAsB/EOxH1/xr1T4fa+wb7BLIWjcZjz2/wA/0pU6lnysmrTuuZHpNFAORkUV0HMRXMqwW8krnCqpJrwfxDqDa7rc11Kd0MBxGnYn/P8AnivVPHuqHT/D0iRsFlm+UE9h3PvXjrjybRIRkzOvmPu7Dtn+f4+9ceJnqonXh46cxkarerZQtuw08mCxHb0FctKJp5PMmbbu5C9/qavalOiXBkLb26IDzn3rMe6wxw26Q9fainGyKnK7JRbxou5gFUdz1NNM6r8saEn+83+FQTXLn5APqTRE24gbvritPUj0J2lkmTYxIT+6B1qaC3kLhY02gckkZxWhpelTXZDJGQv949BXVWWhRwFWbLEc5NYzqqOhvCk3qYlno7vtkkUk9s9TVi7tAjoG5Kjn/D+VdFcCK0j3uenIUd6oWtlPeSiV1xzkbvX1I/kKw529WbcqWiKFvpvmNll5xyPc9vy/nWTf6WLSfzUGODXocVgsEY4yT1Y9TWJq9p5pCgY4JJqqdR3JnBWM3Q5RJAEbgouzOex/wNdHo8kunX8TpgDdvj9j3H6/zriNJnMV/wCWSQDhT+Of/rV2dhILkGMsN3DJ7Ef5/WrqaO6Ijqj3PTrlbuzSVehHT0orC8FXZuNM2k5KcGiu6L5opnnzjyyaOT8dXYv9YaIHcltjKjvjt+f8q8z8RaibJCkZ3XD/AH2J4zXX6pdzfZL+7kUKCxK55LNk/wD1q8k1KYzXcrvIWjj44/iauBLnqNs7m+SCSKMsrySl2Ys5PJ96VV8vDMOg4FRKxOXwMdABzRGsk7dgOgArq2MB8cbXDfe+XuTXXaBo9jIys8sbEevSr3hHwel/F9o1BCID9yIcZHqa62bwfoRGEj8sgdFkP8hWE5p6G8IW1LVjptuqDa6dOxq5LYSSJ+6IX/axzXLjwgiSlrO/mUqd2A/I/Cu20sMbYKzlyBgk1zOKvodCk+pijRYYf38x3sBkvIc4rLl8R6fbyGG0ikuZVOMIvH512GpRA2bqwBXHINcxIlhpsXmiKIHqTwqqPUmlFa2YSemhDHDruqqW8yO0QjhBywqve2upWMTC5UToRjzU+8nuR3pw8e6ZA8cax3Moc4V44eDg44Gcmt/T9YsNWTMMiuucHIwyH0ZTyK35GtWjLnT2Z5TeL5GsfuvuNIMfTHFaWk6mDfyKrnIxID7Dg/41oeNdHe2Mt1CmBlmXH0rz6x1M2V3DPn7rAOPVSRmtVHnRlKXKz6c8AT+a1yeMMoOB2Pf/AD70VifDa/A1PyS2Vlj+U+vcfpRW9H4LHPX+M5zxkw07SngB+cuVGepOf8n64ryC++VxCpztOWPvXrPxRDtes0Y3IkjjAPfP/wCqvJLj/RwTJ9/qfrXPRjZs3qO6RFtLFFxjjgegrqvD3h83cyF1PlA5Y46+1crpjtd6zDGejNivddC02K3s4xtHIzSrycdCqEVLUz9VuL2zsUj022aQjggcZ9vpXK31p4gldGa/kcOoLRq3lCI55wMjOK9ZhhjVdoRB3qKaxhkfcQCR/s1nCXKjWUL7nG6XZ6jbmHE8l2u3LmU8ofRT3Ht7V19irQyDrtapobIIBjCqPQYqwEwR7VM3ccFYLuIzW8ijklTXOT6QLkxliNikHy2XIJHc8811kP3xuHBqK4tEVs8gHuKcVbUJa6Hn/wDwihj1b7VbWqI2cglvl65HGPX3rprDw7bxXT3srF7l+DJk5IxgA+wrQaFx91sj3pyGRONw+gFPnYuQp6npIu9PuEcBvlOOM18z3qmG/nhJP7uQp+Rr60gXzI2zzkfnXynrYV/EOolPum5kx/30a6aC1uc9fZHsfw5vn8zS7heTHgP9P/1E/lRVL4XsvnWsbdBIoOfQ8H+dFVTvd27mdW2l+xY8SXJv5WiQAsbpRyM8EZJ/MV5d4jh8jU5lOcg4FegXV0bTxxeW7MNok8rH1yM/mP51xfjWEx6qZD0NYUbqdmbVdY3RiaU5h1G3lHVXBr6J0WRbnTY2U9VHSvCbDSmuFjmhZeRnB71654PmeO0SNuVI/Kiu02mXh01dHZRrwBiphEPQUzcAOKGn2Lya53ZHRuLK6xoSTxRCS4DEYFZ0u69k2htqCs291LWYL3ZFDEbYDnIIP4H/AOtUp3YNWOpPBFWLjzGsC8YDMoyR6iuTt9bMm3zHCc4IY4P5VNPc3lxeRzQXLLAqlREOB9T6mrjJWZLjdo04Z0mUEHrUqoGOKxVY2rDsh4+ladpN5jCojK7szRrS6NJ3Sz06e4bpFGz/AJDNfJjK0twzNyzuWY++a+qNfk8rwtqjdNtpIf8Ax0180Q24N6ckDaM59WIyB+tehB2OCqrnovwz3DWrVNvH2lV/Laf60VvfB/RpLm/ivMZgtizMx7uRxRV0luzGs9UjmvH+lz6b46v5UVhmUTA/7JIwf/HqxfF0K30Ec6YIZdwI6c8/zyK9p+LeiRTaUmrINs8QMRYdx1H8iPxrw6zu0ntH0+c8puaP1xnJH4dfzrKS5ZXXQ2g1KNu5F4VWePTzNJA/2ZJthlPQZ7fnXpPh2aKRiYSDGSdv4GvIr+G7hjeOGdgmdzIrcN6EV23w2uWaw8pySySnr78/41nWjdc6Loys+VnpxnZcLj8arXVwwZU6sxwBVplPl5AyRzVWaATfvFJDrnoccVxzudcWXLfEKAd+9SOqSrhgPxrBk0icgSWuo3EXqhbIP9f1qP8Asq+cjF4JGPZ1P+NaRV1oHLdmlNpkDPvZVwO+eKnga2RQBNHgf7VYg0nWCxV5YVUfexGRVm20t3/cvcvI57KAAKahZ7FOOmrNG+ksigDTxZYcDcMmjRFbzShJZQSAaZHoVrZo7ooaVvvSHkn2+laOlRrEvTBqbe+jO65XYb4plWHwZrEzJuVbZ8r0yMYxXhFpb/27qomt7ZbWBFDMBzjA6/WvZPiJdfZfAk9vuIe8lSBcdcbtx/RSPxrn/hx4bh1G+8iSMiBYw74/iGcYP1wfzrtgtPM5JPVt7Hp/w90hdJ8LQfu9jXBMpz1wen6UV1SqEUKoAUDAA7UV0xVlY45O7uc548thdeDNRj7hAw9iCK+T9TmFvPC0bbJVAJI4wcn+mK+ytQs01DTri0c4WaMpn0yOtfKHjvwne6PqEpnhKgEk8cH3B9KiS965pB+7Y5t7p5++x++Dx/8AWrofA2oCz1ZYZ5NiyMNpzhd3vXJWZhjv4PtW77PvAk2nnFe52XgXRbmwikh+eKRQyPnk++a0WH9pFq4vbcjudZA6ywKR3FVpo2VtyVWRZNMRLeRySowrn+L/AOvTv7SUAhuPrXl16coS5ZLU9KlNSV0WYlKjHUGo7izaXlSVPqDTre6jmXg81cSVfasrGiZjnS7puGupCp7ZrUsoTAu3v696nMyeopYXV5ABVJWejBttalpoN0XI60y2iImAHQDFXDkx/KMntXlvj34jnRzcaNo7Z1A5jmuB0g9Qvq3v2rpVO7VjmdRJO5R+IviWK/8AEcdhC++GyzGoB4aQ/eY/TAH4H1r1H4TaTJZ+Fl1C5QrPeneMjnYOn9f0rxj4b+BrvxPrME8sUi2ER3SzEcH/AGQe5NfUkcaRRrHGoVEAVVAwAB2rrhGxyVJ3VhaKWirMSOaaK3heaZ1jiQFndzgKB1JNfNvxb+I8fiW5GlaUf+JbA2WlxgzsO/8Aujt+fpXd/Fn4geHX8KXmiWuoLd3lztUfZn3LHhgcsw47YwK+bXcknNMaGPzXs3wj8RC802XRbh8zW3zQ57oe34H+deME1o+H9Zl0HXLXUYSf3T/Oo/iU9R+VXTlyyFJXR9M3dol7bMj/AHl6Hv7VysiSRStBOu7b0I6keo/wrqrK9iu44LmFg0M6AhvUHkVBqmlpdYZWKSKcqw7GrxOHVaOm62/yHh63s5a7HNgNGQ8MnHarCX0p4IO76042zB2R1Ecw+8Oze4oWAq3K14bXSSPVT6okF3I3DbR75rUsAzSKS+c+lYctuS2a3dCjbeuexoio32CTdjrbK23vFHjg8n6VWk+HHhOS8ku30O0eaRi7s6k5J6nrXPeIPE0una1aW1m43QgSSge/AB/X9K77SdTi1WwjuY+CR8y56GvUhC0OY86o3cmtLO3sbdILaFIokGFRFAAHsBViiimZBRRRQB8KMxJyeahJqSom+8aYxDSUtJSA9l+F3iE3uiSaVM376ywY+eSh6fkePyr1KGVZ4VcdSOa+X/C2rNoviK1u9xEZbZL7qeD+XX8K9y1TxE+g+HL+8iAeaOMGHIyNzHAJ9gTmu2k+aHoYyVma+u6jo2nrEupX8NpNIf3IYnJ/Ac49+gqBkZG2t1/mOx+leJaXHd+JtUkur+Z7i6Y5Z3OSfT8PavW/D0jCxj0y8bZJHxayOeD/ALBPp6en0rPGYDmh7WPxG+GxXLLklsX2Ukgd61baeLTbCa7uGCxQoZHb0AGTWaGCybW4ZTgg9Qa5r4m64LXwm1lC2JLshDj+6Ov9K8WnG8j0qkrRMPRNVm1fVbjUp8l7mUvg9geg/AcV6roOvW+hFFvZlitpOFdugPoa8n8JQES28fp81ekpBb30UltPHviYbWBH8v519EqUYpRlseVOTauj1G3uIbuBJ7eVJYnGVdDkH8alrjPh9p82kW+o6cVH2WOcSQOO4Ycj68frXZ1xVYKE3FO6FF3V2FFJRWZR/9k=`;

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
                                "background-image":
                                  "url(data:image/png;base64,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)",
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
                <div class="__content"></div>
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
