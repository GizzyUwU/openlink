import { createContext, useContext, ParentComponent } from "solid-js";
import { EdulinkAPI as API } from "./main";

const EdulinkContext = createContext<API>();

export const Edulink: ParentComponent = (props) => {
  const edulinkAPI = new API();

  return (
    <EdulinkContext.Provider value={edulinkAPI}>
      {props.children}
    </EdulinkContext.Provider>
  );
};

export const useEdulink = () => {
  const context = useContext(EdulinkContext);
  if (!context)
    throw new Error("useEdulink must be used within an EdulinkProvider");
  return context;
};

export { EdulinkContext };
