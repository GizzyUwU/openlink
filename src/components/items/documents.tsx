import { onMount, onCleanup, createSignal, Show } from "solid-js";
import { makePersisted } from "@solid-primitives/storage";
import { useEdulink } from "../../api/edulink";
import { AiOutlineDownload } from "solid-icons/ai";
import { useToast } from "../toast";
import { AiOutlineFileText } from "solid-icons/ai";
import { Transition } from "solid-transition-group";

function Documents(props: {
  setProgress: (value: number) => void;
  progress: () => number;
  theme: string;
}) {
  const [styles, setStyles] = createSignal<{ [key: string]: string } | null>(
    null,
  );
  const edulink = useEdulink();
  const toast = useToast();

  const [sessionData] = makePersisted(createSignal<any>(null), {
    storage: sessionStorage,
    name: "sessionData",
  });
  const [apiUrl] = makePersisted(createSignal<any>(null), {
    storage: sessionStorage,
    name: "apiUrl",
  });

  const [documents, setDocuments] = createSignal<any[]>([]);

  onMount(async () => {
    const cssModule = await import(
      `../../public/assets/css/${props.theme}/documents.module.css`
    );
    const normalized: { [key: string]: string } = {
      ...cssModule.default,
      ...cssModule,
    };
    setStyles(normalized);

    const response = await edulink.getDocuments(
      sessionData()?.user?.id,
      sessionData()?.authtoken,
      apiUrl(),
    );

    if (response.result.success) {
      setDocuments(response.result.documents || []);
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
          <div class={styles()!["t-container"]}>
            <div
              class={styles()!["t-documents"]}
              style={{ display: "flex", "flex-direction": "column" }}
            >
              <div class={styles()!["t-header"]}>
                <div>File Name</div>
                <div>Type</div>
                <div>Date</div>
                <div>Download</div>
              </div>
              <div class={styles()!["t-body"]}>
                {documents().map((doc) => (
                  <div class={styles()!["t-row"]}>
                    <div class={`${styles()!["_name"]} _grey"`}>
                      {doc.attachments?.[0]?.name ||
                        doc.summary ||
                        doc.filename ||
                        "-"}
                    </div>
                    <div class={styles()!["_type"]}>{doc.type || "-"}</div>
                    <div class={styles()!["_date"]}>{doc.date || "-"}</div>
                    <div class={styles()!["_download"]}>
                      {doc.attachments?.[0]?.identifier ? (
                        <a
                          href={`/api/documents/download/${doc.attachments[0].identifier}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          class={styles()!["t-documents__download-link"]}
                        >
                          <AiOutlineDownload size={22} />
                        </a>
                      ) : (
                        "-"
                      )}
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
  name: "Documents",
  icon: () => {
    return <AiOutlineFileText size={36} />;
  },
  pos: 2,
  component: Documents,
};
