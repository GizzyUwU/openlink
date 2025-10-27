import { createResource, createSignal, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { makePersisted } from "@solid-primitives/storage";
import { useEdulink } from "./api/edulink";
import type { StatusResponse } from "./types/auth";

const ProtectedRoute = (props: any) => {
  const navigate = useNavigate();
  const edulink = useEdulink();

  const [sessionData, setSession] = makePersisted(createSignal<any>(null), {
    storage: sessionStorage,
    name: "sessionData",
  });

  const session = sessionData();
  const validSession =
    session &&
    typeof session.apiUrl === "string" &&
    session.apiUrl.length > 0 &&
    typeof session.authtoken === "string" &&
    session.authtoken.length > 0;

  if (!validSession) {
    setSession(null);
    navigate("/login", { replace: true });
    return null;
  }

  const [status] = createResource(async () => {
    const result = await edulink.getStatus(session.authtoken, session.apiUrl);
    if (!result.result.success) {
      console.log("[INFO] Authentication Check failed. Redirecting to /login");
      setSession(null);
      navigate("/login", { replace: true });
      return null;
    }
    return result.result as StatusResponse["result"];
  });

  return (
    <Show when={status()}>
      {props.children({ status: status()! })}
    </Show>
  );
};

export default ProtectedRoute;
