import { createSignal, onMount, Show } from "solid-js";
import { useEdulink } from "../api/edulink";
import { useToast } from "../components/toast";
import { makePersisted } from "@solid-primitives/storage";
import { createStore } from "solid-js/store";
import { useNavigate } from "@solidjs/router";
import { callApi } from "../api/fetch";
import { SchoolDetailsResponse } from "../types/auth";
import { CgMicrosoft, CgGoogle } from "solid-icons/cg";

declare global {
  interface Window {
    __TAURI__?: any;
  }
}

let storeModule: typeof import("@tauri-apps/plugin-store") | null = null;
let keyring: typeof import("tauri-plugin-keyring-api") | null = null;

async function getKeyring(): Promise<
  typeof import("tauri-plugin-keyring-api") | null
> {
  if (!window.__TAURI__) return null;
  if (!keyring) {
    keyring = await import("tauri-plugin-keyring-api");
  }
  return keyring;
}

async function getStore(): Promise<
  typeof import("@tauri-apps/plugin-store") | null
> {
  if (!window.__TAURI__) return null;
  if (!storeModule) {
    storeModule = await import("@tauri-apps/plugin-store");
  }
  return storeModule;
}

async function getTheme() {
  if (window.__TAURI__) {
    const loadStore = await getStore();
    if (!loadStore) {
      return;
    }
    const { load } = loadStore;
    const store = await load("users.json", { autoSave: false, defaults: {} });
    const theme = await store.get("theme");
    if (typeof theme !== "string" || theme.length === 0) return "default";
    return theme;
  } else {
    const [theme] = makePersisted(createSignal<any>({}), {
      storage: localStorage,
      name: "theme",
    });
    if (typeof theme() !== "string" || theme().length === 0) return "default";
    return theme();
  }
}

function Login() {
  const edulink = useEdulink();
  const navigate = useNavigate();
  const toast = useToast();
  const [state, setState] = createStore<{
    code: string;
    username: string;
    password: string;
    schoolData: SchoolDetailsResponse | null;
    loading: boolean;
    hasText: boolean;
    hasLoginText: boolean;
    demo: boolean;
    styles: { [key: string]: string } | null;
  }>({
    code: "",
    username: "",
    password: "",
    schoolData: null,
    loading: true,
    hasText: false,
    hasLoginText: false,
    demo: false,
    styles: null,
  });

  const [session, setSession] = makePersisted(createSignal<any>(null), {
    storage: sessionStorage,
    name: "sessionData",
  });

  async function encryptUserData(state: { username: string; data: string }) {
    const keyring = await getKeyring();
    if (!keyring) {
      return;
    }
    const { getPassword, setPassword } = keyring;
    const bytesToHex = (bytes: Uint8Array | ArrayBuffer) => {
      const arr = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
      return Array.from(arr)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    };
    const hexToBytes = (hex: string) =>
      new Uint8Array(hex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
    let encryptKey = await getPassword("edulinkKey", state.username);
    if (!encryptKey) {
      const keyArray = crypto.getRandomValues(new Uint8Array(32));
      encryptKey = bytesToHex(keyArray);
      await setPassword("edulinkKey", state.username, encryptKey);
    }
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      hexToBytes(encryptKey),
      "AES-GCM",
      false,
      ["encrypt", "decrypt"],
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(state.data);
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      cryptoKey,
      encoded,
    );
    const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.byteLength);
    return bytesToHex(combined);
  }

  async function decryptUserData(state: {
    username: string;
    encryptedData: string;
  }) {
    const keyring = await getKeyring();
    if (!keyring) {
      return;
    }
    const { getPassword } = keyring;
    const hexToBytes = (hex?: string) => {
      if (!hex) throw new Error("Invalid hex string");
      const matches = hex.match(/.{1,2}/g);
      if (!matches) throw new Error("Hex string has invalid format");
      return new Uint8Array(matches.map((b) => parseInt(b, 16)));
    };

    const encryptKey = await getPassword("edulinkKey", state.username);
    if (!encryptKey) return;
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      hexToBytes(encryptKey),
      "AES-GCM",
      false,
      ["encrypt", "decrypt"],
    );
    if (!state.encryptedData) return;

    try {
      const combined = hexToBytes(state.encryptedData);
      const iv = combined.slice(0, 12);
      const ciphertext = combined.slice(12);
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        cryptoKey,
        ciphertext,
      );

      return new TextDecoder().decode(decryptedBuffer);
    } catch (e) {
      if (e instanceof Error) {
        toast.showToast("Error", e.message, "error");
      } else {
        toast.showToast("Error", String(e), "error");
      }
      return;
    }
  }

  onMount(async () => {
    const cssModule = await import(
      `../public/assets/css/${await getTheme()}/login.module.css`
    );
    const normalized: { [key: string]: string } = {
      ...cssModule.default,
      ...cssModule,
    };
    setState("styles", normalized);
    if (window.__TAURI__) {
      await Promise.all([getStore(), getKeyring()]);
      const loadStore = await getStore();
      if (!loadStore) {
        return;
      }
      const { load } = loadStore;
      const store = await load("users.json", { autoSave: false, defaults: {} });
      const users =
        (await store.get<{ name: string; userData: string }[]>("users")) ?? [];
      if (!new URLSearchParams(window.location.search).has("logout")) {
        if (users?.length > 0) {
          const user = users[0];
          const userData = await decryptUserData({
            username: user.name,
            encryptedData: user.userData,
          });
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
                setSession({
                  ...accountData.result,
                  apiUrl: data.apiUrl
                })
                navigate("/", { replace: true });
                return;
              }
            }
          } else {
            toast.showToast(
              "Error",
              "Decrypted Data contains no data on the end user.",
              "error",
            );
          }
        }
      } else {
        if (users?.length > 0) {
          await store.set("users", {});
          await store.save();
        }
      }
    }
    if (new URLSearchParams(window.location.search).has("code")) {
      const code = new URLSearchParams(window.location.search).get("code") ?? "";

      setState({
        code,
        hasText: code.trim().length > 0,
      });
      findCode();
    }

    setState("loading", false);
  });

  async function findCode() {
    if (!state.code) {
      toast.showToast("Error", "Please fill the field", "error");
      return;
    }

    const data = await edulink.findSchoolFromCode(state.code);
    if (data.result.success) {
      setSession(prev => ({
        ...prev,
        apiUrl: data.result.school.server
      }))
      const school: SchoolDetailsResponse = await edulink.schoolLookup(
        data.result.school.school_id,
        data.result.school.server,
      );
      if (school.result.success) {
        // if (school.result.establishment.idp_login.microsoftonline) {
        //   if (window.__TAURI__) {
        //     const data = await window.__TAURI__.core.invoke("run_oauth", {
        //       url: school.result.establishment.idp_login.microsoftonline,
        //     });

        //     console.log(data);
        //   }
        // }
        setState("schoolData", school);
      } else {
        toast.showToast("Error", "Failed to fetch school details", "error");
      }
    } else {
      toast.showToast("Error", data.result.error ?? "Unknown error", "error");
    }
  }

  async function accountLogin(remember: boolean) {
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

    setState("loading", true);

    const account = await edulink.accountSignin(
      state.username,
      state.password,
      state.schoolData.result.establishment.id,
      session().apiUrl,
    );

    if (account.result.success) {
      const userData = {
        id: state.schoolData.result.establishment.id,
        apiUrl: session().apiUrl,
        password: state.password,
      };
      if (window.__TAURI__) {
        if (remember) {
          const loadStore = await getStore();
          if (!loadStore) {
            return;
          }
          const { load } = loadStore;
          const store = await load("users.json", {
            autoSave: false,
            defaults: {},
          });
          const encrypted = await encryptUserData({
            username: state.username,
            data: JSON.stringify(userData),
          });
          await store.set("users", [
            { name: state.username, userData: encrypted },
          ]);
          await store.save();
        }
      }
      setSession(prev => ({
        ...prev,
        ...account.result
      }));
      navigate("/", { replace: true });
      return;
    } else {
      setState("loading", false);
      toast.showToast(
        `Request Id ${account.result.metrics.uniqid}`,
        account.result.error ?? "Unknown error",
        "error",
      );
    }
  }

  async function handleIDP(idp_id: "microsoftonline" | "google") {
    if (state.schoolData === null) {
      toast.showToast(
        "Error",
        "How did we end up here? Find a school first",
        "error",
      );
      return;
    }
    console.log("a");

    const idpUrl = state.schoolData?.result?.establishment?.idp_login?.[idp_id];
    setState("loading", true);

    const idpData: {
      idp_token: string;
      server: string;
    } = await window.__TAURI__.core.invoke("run_oauth", {
      url: idpUrl,
    });

    const account = await edulink.loginFromIDP(idpData.idp_token, session().apiUrl);

    if (account.result.success) {
      setSession(prev => ({
        ...prev,
        ...account.result
      }));
      navigate("/", { replace: true });
      return;
    } else {
      setState("loading", false);
      toast.showToast(
        `Request Id ${account.result.metrics.uniqid}`,
        account.result.error ?? "Unknown error",
        "error",
      );
    }
  }

  // function resetSchool() {
  //   setState("schoolData", null);
  //   setState("code", "");
  //   setState("username", "");
  //   setState("password", "");
  // }

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
    setState("loading", true);
    setSession({
      ...account.demo.result,
      apiUrl: `demo/${type}`
    });
    navigate("/", { replace: true });
    return;
  };

  return (
    <>
      <Show when={!state.loading}>
        <div class={state.styles!["login-container"]}>
          <Show when={!state.demo}>
            <Show
              when={
                state.schoolData === null ||
                Object.keys(state.schoolData?.result).length === 0
              }
            >
              <div
                class={`${state.styles!["f-login"]} ${state.hasText ? state.styles!["has-text"] : ""}`}
                style="max-height: 159px;"
              >
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    findCode();
                  }}
                >
                  <div class={state.styles!["__row"]}>
                    <label class={state.styles!["__label"]}>
                      <input
                        type="text"
                        class={state.styles!["__field"]}
                        placeholder=" "
                        onInput={(e) =>
                          setState({
                            code: e.currentTarget.value,
                            hasText: state.code.trim().length > 0,
                          })
                        }
                      />
                      <span class={state.styles!["__label-text"]}>
                        School ID or Postcode
                      </span>
                    </label>
                  </div>
                  <div class={state.styles!["__button"]}>
                    <button class={state.styles!["__submit"]} type="submit">
                      Next
                    </button>
                  </div>
                </form>
                <div class={state.styles!["__button"]}>
                  <button
                    class={state.styles!["__demo"]}
                    type="button"
                    onClick={() => setState("demo", true)}
                  >
                    DEMO
                  </button>
                </div>
              </div>
            </Show>
            <Show
              when={
                state.schoolData !== null &&
                Object.keys(state.schoolData).length > 0
              }
            >
              <div class="login-wrapper">
                <div
                  class={state.styles!["__logo"]}
                  style={{
                    "background-size": "70%",
                    "background-repeat": "no-repeat",
                    "background-position": "50%",
                    "background-image": state.schoolData?.result?.establishment
                      ?.logo
                      ? `url(data:image/*;base64,${state.schoolData.result.establishment.logo})`
                      : undefined,
                  }}
                ></div>
                <span
                  class={`text-white text-[21px] ${state.styles!["__school-title"]}`}
                >
                  {state.schoolData?.result.establishment?.name || "a"}
                </span>
                <div
                  class={`${state.styles!["f-login"]} ${state.hasLoginText ? state.styles!["has-text"] : ""}`}
                >
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      accountLogin(formData.get("remember") === "on");
                    }}
                  >
                    <div class={state.styles!["__row"]}>
                      <label class={state.styles!["__label"]}>
                        <input
                          type="text"
                          class={state.styles!["__field"]}
                          placeholder=" "
                          onInput={(e) =>
                            setState({
                              username: e.currentTarget.value,
                              hasLoginText:
                                state.username.trim().length > 0 &&
                                state.password.trim().length > 0,
                            })
                          }
                        />
                        <span class={state.styles!["__label-text"]}>
                          Username
                        </span>
                      </label>
                    </div>
                    <br />
                    <div class={state.styles!["__row"]}>
                      <label class={state.styles!["__label"]}>
                        <input
                          type="password"
                          class={state.styles!["__field"]}
                          placeholder=" "
                          onInput={(e) =>
                            setState({
                              password: e.currentTarget.value,
                              hasLoginText:
                                state.username.trim().length > 0 &&
                                state.password.trim().length > 0,
                            })
                          }
                        />
                        <span class={state.styles!["__label-text"]}>
                          Password
                        </span>
                      </label>
                    </div>
                    <div class={state.styles!["__row"]}>
                      <label class={state.styles!["__label"]}>
                        <div class={state.styles!["__checkbox"]}>
                          <label class={state.styles!["__checkbox-wrapper"]}>
                            <label class="flex items-center cursor-pointer relative">
                              <input type="checkbox" name="remember" class="peer h-6 w-6 cursor-pointer transition-all appearance-none rounded shadow hover:shadow-md border border-slate-300 checked:bg-slate-800 checked:border-slate-800" id="check" />
                              <span class="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor" stroke="currentColor" stroke-width="1">
                                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                </svg>
                              </span>
                            </label>
                            <span
                              class={state.styles!["__checkbox-custom"]}
                            ></span>
                            <span class={state.styles!["__checkbox-label"]}>
                              Remember me
                            </span>
                          </label>
                          <label class={state.styles!["__checkbox-wrapper"]}>
                            <button
                              type="button"
                              class={state.styles!["__checkbox-label"]}
                              disabled
                            >
                              Reset Login
                            </button>
                          </label>
                        </div>
                      </label>
                    </div>
                    <Show
                      when={
                        state.schoolData !== null &&
                        Object.keys(
                          state.schoolData.result.establishment.idp_login,
                        ).length > 0 &&
                        window.__TAURI__
                      }
                    >
                      <div class={state.styles!["__idp-row"]}>
                        <Show
                          when={
                            state.schoolData?.result.establishment.idp_login
                              .microsoftonline
                          }
                        >
                          <div class={state.styles!["__idp-label"]}>
                            <button
                              type="button"
                              onClick={() => handleIDP("microsoftonline")}
                              class={state.styles!["idp_btn"]}
                            >
                              <div class={state.styles!["idp_logo"]}>
                                <CgMicrosoft />
                              </div>
                              <div class={state.styles!["idp_text"]}>
                                Microsoft
                              </div>
                            </button>
                          </div>
                        </Show>
                        <Show
                          when={
                            state.schoolData?.result.establishment.idp_login
                              .google
                          }
                        >
                          <div class={state.styles!["__idp-label"]}>
                            <button
                              type="button"
                              onClick={() => handleIDP("google")}
                              class={state.styles!["idp_btn"]}
                            >
                              <div class={state.styles!["idp_logo"]}>
                                <CgGoogle />
                              </div>
                              <div class={state.styles!["idp_text"]}>
                                Google
                              </div>
                            </button>
                          </div>
                        </Show>
                      </div>
                    </Show>

                    <div class={state.styles!["__button"]}>
                      <button class={state.styles!["__submit"]} type="submit">
                        Log In
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </Show>
          </Show>
          <Show when={state.demo}>
            <div class={state.styles!["f-demo"]}>
              <div class={state.styles!["select"]}>
                <ul class={state.styles!["select__list"]}>
                  <li class={state.styles!["__item"]}>
                    <button
                      type="button"
                      class={state.styles!["__title"]}
                      onClick={() => handleDemo("parent")}
                    >
                      Parent (DEMO)
                    </button>
                  </li>
                  <li class={state.styles!["__item"]}>
                    <button
                      type="button"
                      class={state.styles!["__title"]}
                      onClick={() => handleDemo("employee")}
                    >
                      Teacher (DEMO)
                    </button>
                  </li>
                  <li class={state.styles!["__item"]}>
                    <button
                      type="button"
                      class={state.styles!["__title"]}
                      onClick={() => handleDemo("learner")}
                    >
                      Student (DEMO)
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </Show>
        </div>
      </Show>
      <Show when={state.loading}>
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
      </Show>
    </>
  );
}

export default Login;
