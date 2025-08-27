/* @refresh reload */

import { lazy, Suspense } from "solid-js";
import { render } from "solid-js/web";
import { Router, Route } from "@solidjs/router";
import { ParentComponent } from "solid-js";
import "./public/assets/css/index.css";
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
      src="data:image/svg+xml,%3csvg%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%20xmlns='http://www.w3.org/2000/svg'%3e%3cstyle%3e.spinner_qM83{animation:spinner_8HQG%201.05s%20infinite}.spinner_oXPr{animation-delay:.1s}.spinner_ZTLf{animation-delay:.2s}@keyframes%20spinner_8HQG{0%25,57.14%25{animation-timing-function:cubic-bezier(0.33,.66,.66,1);transform:translate(0)}28.57%25{animation-timing-function:cubic-bezier(0.33,0,.66,.33);transform:translateY(-6px)}100%25{transform:translate(0)}}%3c/style%3e%3ccircle%20class='spinner_qM83'%20cx='4'%20cy='12'%20r='3'/%3e%3ccircle%20class='spinner_qM83%20spinner_oXPr'%20cx='12'%20cy='12'%20r='3'/%3e%3ccircle%20class='spinner_qM83%20spinner_ZTLf'%20cx='20'%20cy='12'%20r='3'/%3e%3c/svg%3e"
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
