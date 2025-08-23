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
    if (sessionData() && Object.keys(sessionData()).length > 0 && apiUrl()) {
      console.log(apiUrl());
      const result = await edulink.getStatus(
        sessionData()?.authtoken,
        apiUrl(),
      );
      if (!result.result.success) {
        navigate("/login", { replace: true });
        return;
      }
    } else {
      setSession(null);
      setApiUrl(null);
      navigate("/login", { replace: true });
      return;
    }
  });

  return <>{props.children}</>;
};

export default ProtectedRoute;
