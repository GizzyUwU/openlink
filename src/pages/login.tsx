import { createSignal, createEffect, onMount, onCleanup } from "solid-js";
import { useEdulink } from "../api/edulink";
import { useToast } from "../components/toast";
import { makePersisted } from "@solid-primitives/storage";
import { createStore } from "solid-js/store";

declare global {
  interface Window {
    __TAURI_?: any;
  }
}

import { useNavigate } from "@solidjs/router";
import { callApi } from "../api/fetch";

function Login() {
  const edulink = useEdulink();
  const navigate = useNavigate();
  const toast = useToast();
  const [state, setState] = createStore<{
    code: string;
    username: string;
    password: string;
    schoolData: any;
    loading: boolean;
    schoolFound: boolean;
    hasText: boolean;
    hasLoginText: boolean;
    demo: boolean;
  }>({
    code: "",
    username: "",
    password: "",
    schoolData: {},
    loading: true,
    schoolFound: false,
    hasText: false,
    hasLoginText: false,
    demo: false,
  });

  const [, setSession] = makePersisted(createSignal<any>(null), {
    storage: sessionStorage,
    name: "sessionData",
  });

  const [apiUrl, setApiUrl] = makePersisted(createSignal<any>(null), {
    storage: sessionStorage,
    name: "apiUrl",
  });

  let styleElement: HTMLLinkElement;
  let store: any;

  createEffect(() => {
    setState("hasText", state.code.trim().length > 0);
    setState(
      "hasLoginText",
      state.username.trim().length > 0 && state.password.trim().length > 0,
    );
  });

  onMount(async () => {
    styleElement = document.createElement("link");
    styleElement.rel = "stylesheet";
    styleElement.href = "/src/assets/css/login.css";
    document.head.appendChild(styleElement);

    if (window.__TAURI_) {
      const { load } = await import("@tauri-apps/plugin-store");
      store = await load("users.json", { autoSave: false });
      const users = await store.get("users");
      if (!new URLSearchParams(window.location.search).has("logout")) {
        if (users?.length > 0) {
          const user = users[0];
          const { getPassword } = await import("tauri-plugin-keyring-api");
          const userData = await getPassword("EduLink", user.name);

          if (userData) {
            const data = JSON.parse(userData);
            if (data.apiUrl && data.id && data.password) {
              const accountData = await edulink.accountSignin(
                user.name,
                data.password,
                data.id,
                data.apiUrl,
              );

              if (accountData.result.success) {
                setSession(accountData.result);
                setApiUrl(data.apiUrl);
                throw navigate("/", { replace: true });
              }
            }
          }
        }
      }
    }
    setState("loading", false);
  });

  onCleanup(() => {
    styleElement.remove();
  });

  async function findCode() {
    if (!state.code) {
      toast.showToast("Error", "Please fill the field", "error");
      return;
    }

    const data = await edulink.findSchoolFromCode(state.code);
    if (data.result.success) {
      setApiUrl(data.result.school.server);
      const school = await edulink.schoolLookup(
        data.result.school.school_id,
        data.result.school.server,
      );
      if (school.result.success) {
        setState("schoolData", school.result);
        setState("schoolFound", true);
      } else {
        toast.showToast("Error", "Failed to fetch school details", "error");
      }
    } else {
      toast.showToast("Error", data.result.error ?? "Unknown error", "error");
    }
  }

  async function accountLogin() {
    if (!state.schoolData) {
      toast.showToast(
        "Error",
        "How did we end up here? Find a school first",
        "error",
      );
      return;
    }

    if (!state.username || !state.password) {
      toast.showToast("Error", "Please fill all fields", "error");
      return;
    }

    const account = await edulink.accountSignin(
      state.username,
      state.password,
      state.schoolData.establishment.id,
      apiUrl(),
    );

    if (account.result.success) {
      const userData = {
        id: state.schoolData.establishment.id,
        apiUrl: apiUrl(),
        password: state.password,
      };
      if (window.__TAURI_) {
        const usersResult = await store.get("users");
        const usersArray = usersResult?.value || [];
        const { setPassword } = await import("tauri-plugin-keyring-api");
        await store.set("users", [
          ...usersArray,
          { name: state.username, data: userData },
        ]);
        await setPassword("EduLink", state.username, JSON.stringify(userData));
      }
      setSession(account.result);
      throw navigate("/", { replace: true });
    } else {
      toast.showToast(
        `Request Id ${account.result.metrics.uniqid}`,
        account.result.error ?? "Unknown error",
        "error",
      );
    }
  }

  function resetSchool() {
    setState("schoolData", null);
    setState("schoolFound", false);
    setState("code", "");
    setState("username", "");
    setState("password", "");
  }

  const handleDemo = async (type: "parent" | "employee" | "learner") => {
    if (!type) return;
    const [, setDemo] = makePersisted(createSignal<any>(null), {
      storage: sessionStorage,
      name: "demo",
    });

    setDemo({
      enabled: true,
      type,
    });

    const account = await callApi(`demo/${type}?method=EduLink.Login`);
    console.log(account);
    setApiUrl(`demo/${type}`);
    setSession(account.demo.result);
    throw navigate("/", { replace: true });
  };

  return (
    <>
      {state.loading ? null : (
        <div class="login-container">
          {state.schoolFound && (
            <>
              <div
                class="__logo"
                style={{
                  "background-size": "70%",
                  "background-repeat": "no-repeat",
                  "background-position": "50%",
                  "background-image": state.schoolData?.establishment?.logo
                    ? `url(data:image/webp;base64,${state.schoolData.establishment.logo})`
                    : undefined,
                }}
              ></div>
              <span class="text-white text-[21px] __school-title">
                {state.schoolData?.establishment?.name || ""}
              </span>
            </>
          )}
          {!state.demo ? (
            <>
              {!state.schoolFound ? (
                <div
                  class="f-login"
                  classList={{
                    "has-text": state.schoolFound
                      ? state.hasLoginText
                      : state.hasText,
                  }}
                  style="max-height: 159px;"
                >
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      findCode();
                    }}
                  >
                    <div class="__row">
                      <label class="__label">
                        <input
                          type="text"
                          class="__field"
                          placeholder=" "
                          onInput={(e) =>
                            setState("code", e.currentTarget.value)
                          }
                        />
                        <span class="__label-text">School ID or Postcode</span>
                      </label>
                    </div>
                    <div class="__button">
                      <button class="__submit" type="submit">
                        Next
                      </button>
                    </div>
                  </form>
                  <div class="__button">
                    <button
                      class="__demo"
                      type="button"
                      onClick={() => setState("demo", true)}
                    >
                      DEMO
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  class="f-login"
                  classList={{
                    "has-text": state.schoolFound
                      ? state.hasLoginText
                      : state.hasText,
                  }}
                >
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                    }}
                  >
                    <div class="__row">
                      <label class="__label">
                        <input
                          type="text"
                          class="__field"
                          placeholder=" "
                          onInput={(e) =>
                            setState("username", e.currentTarget.value)
                          }
                        />
                        <span class="__label-text">Username</span>
                      </label>
                    </div>
                    <br />
                    <div class="__row">
                      <label class="__label">
                        <input
                          type="password"
                          class="__field"
                          placeholder=" "
                          onInput={(e) =>
                            setState("password", e.currentTarget.value)
                          }
                        />
                        <span class="__label-text">Password</span>
                      </label>
                    </div>
                    <div class="__row">
                      <label class="__label">
                        <div class="__checkbox">
                          <label class="__checkbox-wrapper">
                            <input type="checkbox" />
                            <span class="__checkbox-custom"></span>
                            <span class="__checkbox-label">Remember me</span>
                          </label>
                          <label class="__checkbox-wrapper">
                            <button
                              type="button"
                              class="__checkbox-label"
                              disabled
                            >
                              Reset Login
                            </button>
                          </label>
                        </div>
                      </label>
                    </div>
                    <div class="__button">
                      <button
                        class="__submit"
                        type="submit"
                        onClick={accountLogin}
                      >
                        Log In
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </>
          ) : (
            <>
              <div class="f-demo">
                <div class="select">
                  <ul class="select__list">
                    <li class="__item">
                      <button
                        type="button"
                        class="__title"
                        onClick={() => handleDemo("parent")}
                      >
                        Parent (DEMO)
                      </button>
                    </li>
                    <li class="__item">
                      <button
                        type="button"
                        class="__title"
                        onClick={() => handleDemo("employee")}
                      >
                        Teacher (DEMO)
                      </button>
                    </li>
                    <li class="__item">
                      <button
                        type="button"
                        class="__title"
                        onClick={() => handleDemo("learner")}
                      >
                        Student (DEMO)
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

export default Login;
