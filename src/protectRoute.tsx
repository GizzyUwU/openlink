import { onMount, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { makePersisted } from "@solid-primitives/storage";
import { useEdulink } from "./api/edulink";

const ProtectedRoute = (props: any) => {
  const navigate = useNavigate();
  const edulink = useEdulink();
  const [sessionData, setSession] = makePersisted(createSignal<any>({}), {
    storage: sessionStorage,
    name: "sessionData",
  });

  const [apiUrl, setApiUrl] = makePersisted(createSignal<any>(""), {
    storage: sessionStorage,
    name: "apiUrl",
  });

  onMount(async () => {
    if (
      !sessionData() ||
      Object.keys(sessionData()).length === 0 ||
      !apiUrl()
    ) {
      setSession(null);
      setApiUrl(null);
      throw navigate("/login");
    }

    const result = await edulink.getStatus(sessionData()?.authtoken, apiUrl());
    if (!result.result.success) {
      throw navigate("/login");
    }
  });

  return <>{props.children}</>;
};

export default ProtectedRoute;
