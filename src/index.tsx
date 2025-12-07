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
import { logger } from "./lib/logger";

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
    <svg
      width="64"
      height="64"
      viewBox="0 0 24 24"
      style={{ filter: "invert(1)" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <style>
        {`
      .spinner { animation: spin 1.05s infinite; }
      .spinner.delay1 { animation-delay: 0.1s; }
      .spinner.delay2 { animation-delay: 0.2s; }
      @keyframes spin {
        0%, 57.14% { animation-timing-function: cubic-bezier(0.33,.66,.66,1); transform: translate(0); }
        28.57% { animation-timing-function: cubic-bezier(0.33,0,.66,.33); transform: translateY(-6px); }
        100% { transform: translate(0); }
      }
    `}
      </style>
      <circle class="spinner" cx="4" cy="12" r="3" />
      <circle class="spinner delay1" cx="12" cy="12" r="3" />
      <circle class="spinner delay2" cx="20" cy="12" r="3" />
    </svg>
  </div>
);

// Object.defineProperty(window, "location", {
//   configurable: false,
//   get() {
//     return {
//       assign() {},
//       replace() {},
//       reload() {}
//     };
//   }
// });

// block direct reload()
window.reload = () => {};
window.logger = logger;

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
