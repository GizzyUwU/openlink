import { onMount, createSignal, Show } from "solid-js";
import { AiOutlineDownload } from "solid-icons/ai";
import { useToast } from "../toast";
import { AiOutlineFileText } from "solid-icons/ai";
import { Transition } from "solid-transition-group";
import type { SessionData } from "../../types/auth";
import type { EdulinkAPI } from "../../api/main";

function base64ToUint8Array(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function Documents(props: {
  setProgress: (value: number) => void;
  sessionData: () => SessionData;
  progress: () => number;
  edulink: EdulinkAPI;
  theme: string;
}) {
  const [styles, setStyles] = createSignal<{ [key: string]: string } | null>(
    null,
  );
  const toast = useToast();
  const [documents, setDocuments] = createSignal<any[]>([]);

  onMount(async () => {
    props.setProgress(0.6);
    const cssModule = await import(
      `../../public/assets/css/${props.theme}/documents.module.css`
    );
    const normalized: { [key: string]: string } = {
      ...cssModule.default,
      ...cssModule,
    };
    setStyles(normalized);

    const response = await props.edulink.getDocuments(
      props.sessionData()?.user?.id,
      props.sessionData()?.authtoken,
      props.sessionData()?.apiUrl,
    );

    if (response.result.success) {
      props.setProgress(0.8);
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

  const handleDownload = async (file: string, documentId: string) => {
    try {
      const res = await props.edulink.getDocument(
        file,
        documentId,
        props.sessionData()?.authtoken,
        props.sessionData()?.apiUrl,
      );

      if (!res.result.success) {
        toast.showToast("Error", res.result.error ?? "Unknown error", "error");
        console.error(res.result.error);
        return;
      }

      const { url, document } = res.result.result;
      if (!url && !document) {
        toast.showToast("Error", "Missing File URL/Document Data", "error");
        console.error("Missing File URL/Document Data");
        return;
      }
      const data = url ?? document;

      if (data.startsWith("http")) {
        if (window.__TAURI__) {
          const { openUrl } = await import("@tauri-apps/plugin-opener");
          await openUrl(data);
        } else {
          window.open(data, "_blank");
        }
      } else {
        const fileBytes = base64ToUint8Array(await data);
        const blob = new Blob([fileBytes], {
          type: "application/octet-stream",
        });
        const link = window.document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = file;
        window.document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(link.href);
        toast.showToast(
          "Download Successful",
          `${file} downloaded successfully`,
          "success",
        );
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : String(err ?? "Unknown error");
      toast.showToast("Error", message, "error");
      console.error(err);
      return;
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
                    <div class={styles()!["_left"]}>
                      {doc.attachments?.[0]?.name ||
                        doc.summary ||
                        doc.filename ||
                        "-"}
                    </div>
                    <div class={styles()!["_left"]}>{doc.type || "-"}</div>
                    <div class={styles()!["_left"]}>{doc.date || "-"}</div>
                    <div class="cursor-pointer">
                      {doc.attachments?.[0]?.identifier ? (
                        <a
                          title="Download"
                          onClick={() =>
                            handleDownload(
                              doc.attachments?.[0]?.identifier,
                              doc.id,
                            )
                          }
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
