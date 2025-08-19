import {
  createContext,
  useContext,
  createResource,
  ParentComponent,
  Show,
} from "solid-js";
import { EdulinkAPI as API } from "./main.ts";

const EdulinkContext = createContext<API>();

export const Edulink: ParentComponent = (props) => {
  const [edulink] = createResource(async () => {
    const api = new API();
    await api.ready;
    return api;
  });

  return (
    <Show when={edulink()}>
      <EdulinkContext.Provider value={edulink()!}>
        {props.children}
      </EdulinkContext.Provider>
    </Show>
  );
};

export const useEdulink = () => {
  const context = useContext(EdulinkContext);
  if (!context)
    throw new Error("useEdulink must be used within an EdulinkProvider");
  return context;
};

export { EdulinkContext };
