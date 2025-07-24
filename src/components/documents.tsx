import { onMount, createSignal } from "solid-js";
import { makePersisted } from "@solid-primitives/storage";
import { useEdulink } from "../api/edulink";
import { AiOutlineDownload } from 'solid-icons/ai'

function Documents() {
    let styleElement: HTMLLinkElement;
    const edulink = useEdulink();
    const [sessionData] = makePersisted(createSignal<any>(null), {
        storage: sessionStorage,
        name: "sessionData"
    });
    const [apiUrl] = makePersisted(createSignal<any>(null), {
        storage: sessionStorage,
        name: "apiUrl"
    });

    const [documents, setDocuments] = createSignal<any[]>([]);

    onMount(async () => {
        styleElement = document.createElement("link");
        styleElement.rel = "stylesheet";
        styleElement.href = "/src/assets/css/documents.css";
        document.head.appendChild(styleElement);

        const response = await edulink.getDocuments(
            sessionData()?.user?.id,
            sessionData()?.authtoken,
            apiUrl()
        );
        setDocuments(response.result.documents || []);
    });

    return (
        <div class="box-container">
            <div class="t-container">
                <div class="t-documents" style={{ display: "flex", "flex-direction": "column" }}>
                    <div class="t-header">
                        <span class="t-header__title _name">File Name</span>
                        <span class="t-header__title _type">Type</span>
                        <span class="t-header__title _date">Date</span>
                        <span class="t-header__title _download">Download</span>
                    </div>
                    <div class="t-body">
                        {documents().map(doc => (
                            <div class="t-row">
                                <span class="t-documents__text _name _grey">
                                    {/* Use attachment name if available, else summary, else filename, else "-" */}
                                    {doc.attachments?.[0]?.name || doc.summary || doc.filename || "-"}
                                </span>
                                <span class="t-documents__text _type">{doc.type || "-"}</span>
                                <span class="t-documents__text _date">{doc.date || "-"}</span>
                                <span class="t-documents__text _download">
                                    {doc.attachments?.[0]?.identifier ? (
                                        <a
                                            href={`/api/documents/download/${doc.attachments[0].identifier}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            class="t-documents__download-link"
                                        >
                                            <AiOutlineDownload size={22} />
                                        </a>
                                    ) : "-"}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Documents;