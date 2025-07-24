import { createSignal, createEffect, onMount, onCleanup } from "solid-js";
import { useEdulink } from "../api/edulink";
import { useToast } from "../components/toast";
import { makePersisted } from "@solid-primitives/storage";
import {
  getPassword,
  setPassword as storePassword,
} from "tauri-plugin-keyring-api";
import { load } from "@tauri-apps/plugin-store";
import { useNavigate } from "@solidjs/router";

function Login() {
  const edulink = useEdulink();
  const navigate = useNavigate();
  const toast = useToast();
  const [code, setCode] = createSignal<string>("");
  const [username, setUsername] = createSignal<string>("");
  const [password, setPassword] = createSignal<string>("");
  const [schoolData, setSchoolData] = createSignal<any>(null);
  const [loading, setLoading] = createSignal(true);
  const [schoolFound, setFound] = createSignal<boolean>(false);
  const [hasText, setHasText] = createSignal<boolean>(false);
  const [hasLoginText, setHasLoginText] = createSignal<boolean>(false);

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
    setHasText(code().trim().length > 0);
    setHasLoginText(
      username().trim().length > 0 && password().trim().length > 0,
    );
  });

  onMount(async () => {
    styleElement = document.createElement("link");
    styleElement.rel = "stylesheet";
    styleElement.href = "/src/assets/css/login.css";
    document.head.appendChild(styleElement);

    store = await load("users.json", { autoSave: false });
    const users = await store.get("users");

    if (users?.length > 0) {
      const user = users[0];
      const userData = await getPassword("EduLink", user.name);

      if (userData) {
        const data = JSON.parse(userData);
        if (data.apiUrl && data.id && data.password) {
          const accountData = await edulink.accountSignIn(
            user.name,
            data.password,
            data.id,
            data.apiUrl,
          );

          if (accountData.result.success) {
            setSession(accountData.result);
            setApiUrl(data.apiUrl);
            navigate("/dash", { replace: true });
            return;
          }
        }
      }
    }
    setLoading(false);
  });

  onCleanup(() => {
    styleElement.remove();
  });

  async function findCode() {
    if (!code()) {
      toast.showToast("Error", "Please fill the field", "error");
      return;
    }

    const data = await edulink.findSchoolFromCode(code());
    if (data.result.success) {
      setApiUrl(data.result.school.server);
      const school = await edulink.schoolLookup(
        data.result.school.school_id,
        data.result.school.server,
      );
      if (school.result.success) {
        setSchoolData(school.result);
        setFound(true);
      } else {
        toast.showToast("Error", "Failed to fetch school details", "error");
      }
    } else {
      toast.showToast("Error", data.result.error ?? "Unknown error", "error");
    }
  }

  async function accountLogin() {
    if (!schoolData()) {
      toast.showToast(
        "Error",
        "How did we end up here? Find a school first",
        "error",
      );
      return;
    }

    if (!username() || !password()) {
      toast.showToast("Error", "Please fill all fields", "error");
      return;
    }

    const account = await edulink.accountSignIn(
      username(),
      password(),
      schoolData().establishment.id,
      apiUrl(),
    );

    if (account.result.success) {
      const userData = {
        id: schoolData().establishment.id,
        apiUrl: apiUrl(),
        password: password(),
      };

      const usersResult = await store.get("users");
      const usersArray = usersResult?.value || [];
      await store.set("users", [
        ...usersArray,
        { name: username(), data: userData },
      ]);
      await storePassword("EduLink", username(), JSON.stringify(userData));

      setSession(account.result);
      navigate("/dash", { replace: true });
    } else {
      toast.showToast(
        `Request Id ${account.result.metrics.uniqid}`,
        account.result.error ?? "Unknown error",
        "error",
      );
    }
  }

  function resetSchool() {
    setSchoolData(null);
    setFound(false);
    setCode("");
    setUsername("");
    setPassword("");
  }

  return (
    <>
      {loading() ? null : (
        <div class="login-container">
          {schoolFound() && (
            <button
              type="button"
              onClick={resetSchool}
              class="reset-school-button"
              title="Change School"
            >
              <span class="reset-school-icon">‹</span>
            </button>
          )}
          {schoolFound() && (
            <>
              <div
                class="__logo"
                style={{
                  "background-size": "70%",
                  "background-repeat": "no-repeat",
                  "background-position": "50%",
                  "background-image": schoolData()?.establishment?.logo
                    ? `url(data:image/webp;base64,${schoolData().establishment.logo})`
                    : undefined,
                }}
              ></div>
              <span class="text-white text-[21px] __school-title">
                {schoolData()?.establishment?.name || ""}
              </span>
            </>
          )}
          <div
            class="f-login"
            classList={{
              "has-text": schoolFound() ? hasLoginText() : hasText(),
            }}
          >
            {!schoolFound() ? (
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
                      onInput={(e) => setCode(e.currentTarget.value)}
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
            ) : (
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
                      onInput={(e) => setUsername(e.currentTarget.value)}
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
                      onInput={(e) => setPassword(e.currentTarget.value)}
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
                        <button type="button" class="__checkbox-label" disabled>
                          Reset Login
                        </button>
                      </label>
                    </div>
                  </label>
                </div>
                <div class="__button">
                  <button class="__submit" type="submit" onClick={accountLogin}>
                    Log In
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default Login;
