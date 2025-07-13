/* @refresh reload */

import { lazy } from "solid-js";
import { render } from "solid-js/web";
import { Router, Route } from "@solidjs/router";
import { ParentComponent } from "solid-js";
import "./assets/css/index.css";
import { Edulink } from "./api/edulink.tsx";
import { Toast } from "./components/toast.tsx";
const Login = lazy(() => import("./pages/login.tsx"));

const App: ParentComponent = (props) => <>{props.children}</>;

render(
  () => (
    <Toast>
      <Edulink>
        <Router root={App}>
          <Route path="/" component={Login} />
        </Router>
      </Edulink>
    </Toast>
  ),
  document.getElementById("root") as HTMLElement,
);
