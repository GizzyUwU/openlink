import { onMount, onCleanup, createSignal, Show, For } from "solid-js";
import { makePersisted } from "@solid-primitives/storage";
import { useEdulink } from "../../api/edulink";
import { useToast } from "../toast";
import { HiSolidLink } from "solid-icons/hi";
import { Transition } from "solid-transition-group";
import { createStore } from "solid-js/store";
import type { LinksResponse } from "../../types/api/links";

function Links(props: {
  setProgress: (value: number) => void;
  progress: () => number;
}) {
  let styleElement: HTMLLinkElement;
  const edulink = useEdulink();
  const toast = useToast();
  const [state, setState] = createStore<{
    links: LinksResponse.LinksType[];
  }>({
    links: [],
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
    const styleUrl = new URL("../../assets/css/links.css", import.meta.url)
      .href;
    styleElement = document.createElement("link");
    styleElement.rel = "preload";
    styleElement.as = "style";
    styleElement.href = `${styleUrl}?t=${Date.now()}`;
    styleElement.onload = () => {
      styleElement.rel = "stylesheet";
    };
    document.getElementById("item-box")?.appendChild(styleElement);

    const response = await edulink.getExternalLinks(
      sessionData()?.authtoken,
      apiUrl(),
    );

    if (response.result.success) {
      setState({
        links: response.result.links,
      });
      props.setProgress(1);
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
          <div class="t-container">
            {state.links.length > 0 ? (
              <div class="t-links">
                <For each={state.links}>
                  {(link) => (
                    <ul>
                      <li class="__links-item">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          class="block"
                        >
                          <div class="__title">{link.name || "-"}</div>
                          <div
                            class="__image"
                            style={{ "background-image": `url(${link.icon})` }}
                          ></div>
                        </a>
                      </li>
                    </ul>
                  )}
                </For>
              </div>
            ) : (
              <div class="t-links flex items-center justify-center h-full">
                <h1 class="text-center font-bold text-xl">No Data</h1>
              </div>
            )}
          </div>
        </div>
      </Show>
    </Transition>
  );
}

export default {
  name: "Links",
  icon: () => {
    return <HiSolidLink size={36} />;
  },
  pos: 9,
  component: Links,
};
