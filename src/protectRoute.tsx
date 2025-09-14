import { onMount, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { makePersisted } from "@solid-primitives/storage";
import { useEdulink } from "./api/edulink";
import type { StatusResponse } from "./types/auth";

const ProtectedRoute = (props: any) => {
  const navigate = useNavigate();
  const edulink = useEdulink();

  const [status, setStatus] = createSignal<StatusResponse | null>(null);

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
      sessionData() &&
      Object.keys(sessionData()).length > 0 &&
      apiUrl() &&
      apiUrl().length > 0
    ) {
      const result = await edulink.getStatus(
        sessionData()?.authtoken,
        apiUrl(),
      );
      if (!result.result.success) {
        console.log(
          "[INFO] Authentication Check failed. Redirecting to /login",
        );
        navigate("/login", { replace: true });
        return;
      }
      setStatus(result.result);
    } else {
      setSession(null);
      setApiUrl(null);
      navigate("/login", { replace: true });
      return;
    }
  });

  return <>{props.children({ status: status() })}</>;
};

export default ProtectedRoute;
