/* @refresh reload */

import { Suspense } from "solid-js";
import { render } from "solid-js/web";
import { Router, Route } from "@solidjs/router";
import { ParentComponent } from "solid-js";
import { Edulink } from "./api/edulink.tsx";
import { Toast } from "./components/toast.tsx";
import type { StatusResponse } from "./types/auth.ts";
import Login from "./pages/login.tsx";
import Main from "./pages/dash.tsx";
import ProtectedRoute from "./protectRoute.tsx";
import "./public/assets/css/index.css";

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

const originalWarn = console.warn;

console.warn = (...args: any[]) => {
  const message = args.join(" ");
  const err = new Error(message);
  originalWarn.call(console, err);
};

render(
  () => (
    <Toast>
      <Edulink>
        <Suspense fallback={<LoadingFallback />}>
          <Router root={App}>
            <Route
              path="/"
              component={() => (
                <ProtectedRoute>
                  {({ status }: { status: StatusResponse["result"] | null }) => (
                    <Main status={status} />
                  )}
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
