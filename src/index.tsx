/* @refresh reload */

import { lazy, Suspense } from "solid-js";
import { render } from "solid-js/web";
import { Router, Route } from "@solidjs/router";
import { ParentComponent } from "solid-js";
import "./assets/css/index.css";
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
      src="/src/assets/img/loader.svg"
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
            <Route
              path="*404"
              component={() => {
                return "404 not found";
              }}
            />
          </Router>
        </Suspense>
      </Edulink>
    </Toast>
  ),
  document.getElementById("root") as HTMLElement,
);
