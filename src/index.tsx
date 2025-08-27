/* @refresh reload */

import { lazy, Suspense } from "solid-js";
import { render } from "solid-js/web";
import { Router, Route } from "@solidjs/router";
import { ParentComponent } from "solid-js";
import "./public/assets/css/index.css";
import loaderImg from "./public/assets/img/loader.svg";
import { Edulink } from "./api/edulink.tsx";
import { Toast } from "./components/toast.tsx";
const ProtectedRoute = lazy(() => import("./protectRoute.tsx"));
const Login = lazy(() => import("./pages/login.tsx"));
const Main = lazy(() => import("./pages/dash.tsx"));
const App: ParentComponent = (props) => <>{props.children}</>;
const LoadingFallback = () => (
  <div
    style={{
      display: "flex",
      "justify-content": "center",
      "align-items": "center",
      height: "100vh",
      color: "white",
      "font-size": "1.5rem",
    }}
  >
    <img
      src={loaderImg}
      alt="Loading..."
      style={{
        width: "64px",
        height: "64px",
        filter: "invert(1)",
      }}
    />
  </div>
);

render(
  () => (
    <Toast>
      <Edulink>
        <Suspense fallback={<LoadingFallback />}>
          <Router root={App} preload={true}>
            <Route
              path="/"
              component={() => (
                <ProtectedRoute>
                  <Main />
                </ProtectedRoute>
              )}
            />
            <Route path="/login" component={Login} />
          </Router>
        </Suspense>
      </Edulink>
    </Toast>
  ),
  document.getElementById("root") as HTMLElement,
);
