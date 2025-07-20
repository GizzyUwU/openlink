import { createSignal, createEffect, onMount, onCleanup } from "solid-js";
import { useEdulink } from "../api/edulink";
import { useToast } from "../components/toast";
import { makePersisted } from "@solid-primitives/storage";
import { getPassword, setPassword as storePassword } from "tauri-plugin-keyring-api";
import { load } from '@tauri-apps/plugin-store';
import { useNavigate } from "@solidjs/router";

function Login() {
  let styleElement: HTMLLinkElement;
  const edulink = useEdulink();
  const [code, setCode] = createSignal<string>("");
  const [username, setUsername] = createSignal<string>("");
  const [password, setPassword] = createSignal<string>("");
  const [initialized, setInitialized] = createSignal<boolean>(false);
  const [schoolData, setSchoolData] = createSignal<any>(null);
  const navigate = useNavigate();
  let store: any;
  const [, setSession] = makePersisted(createSignal<any>(null), {
    storage: sessionStorage,
    name: "sessionData"
  });
  const [apiUrl, setApiUrl] = makePersisted(createSignal<any>(null), {
    storage: sessionStorage,
    name: "apiUrl"
  });

  const [schoolFound, setFound] = createSignal<boolean>(!!schoolData());
  const [hasText, setHasText] = createSignal<boolean>(false);
  const [hasLoginText, setHasLoginText] = createSignal<boolean>(false);
  const toast = useToast();

  createEffect(() => {
    setHasText(code().trim().length > 0);
    setHasLoginText(username().trim().length > 0 && password().trim().length > 0);
  });

  onMount(async () => {
    styleElement = document.createElement("link");
    styleElement.rel = "stylesheet";
    styleElement.href = "/src/assets/css/login.css";
    document.head.appendChild(styleElement);
    store = await load('users.json', { autoSave: false });
    if (!initialized()) {
      console.log("Initializing user data from store...");
      const users = await store.get('users');
      if(users && users.length > 0) {
        const user = users[0];
        if (user && user.name && user.data) {
          setUsername(user.name);
          const userData = await getPassword("EduLink", user.name);
          if(userData) {
            const data = JSON.parse(userData);
            console.log(data)
            if(data.id && data.password) {
              const accountData = await edulink.accountSignIn(user.name, data.password, data.id, apiUrl());
              if(accountData.result.success) {
                setSession(accountData.result);
                throw navigate("/dash", { replace: true });
              }
              console.log("Found saved user data:", data);
            }
          }
        }
      }
      setInitialized(true);
    }
  });

  onCleanup(() => {
    styleElement.remove();
  });

  async function findCode() {
    if (!code())
      return toast.showToast("Error", "Please fill the field", "error");
    const data = await edulink.findSchoolFromCode(code());
    if (data.result.success) {
      setApiUrl(data.result.school.server);
      const school = await edulink.schoolLookup(data.result.school.school_id, data.result.school.server);
      if(school.result.success) {
        setSchoolData(school.result);
        setFound(true);
      } else {
        toast.showToast("Error", "Failed to fetch school details", "error");
      }
    } else {
      toast.showToast("Error", "No School found with that id", "error");
    }
  }

  async function accountLogin() {
    if(!schoolData()) {
      setFound(false);
      toast.showToast("Error", "How did we end up here? Find a school first", "error");
      return;
    }
    if(!username() || !password()) return toast.showToast("Error", "Please fill all fields", "error");
    console.log(apiUrl())
    const account = await edulink.accountSignIn(username(), password(), schoolData().establishment.id, apiUrl());
    console.log(account)
    if (account.result.success) {
      const userData = {
        id: schoolData().establishment.id,
        password: password()
      };
      const usersResult = await store.get('users');
      const usersArray = usersResult && usersResult.value ? usersResult.value : [];
      await store.set('users', [...usersArray, { name: username(), data: userData }]);
      await storePassword("EduLink", username(), JSON.stringify(userData));
      setSession(account.result)
      console.log("Login successful, redirecting to dashboard...");
      throw navigate("/dash", { replace: true });
    } else {
      toast.showToast("Error", "Login failed. Please check your credentials.", "error");
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
    <div class="login-container">
      {schoolFound() && (
        <button
          type="button"
          onClick={resetSchool}
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            width: "40px",
            height: "40px",
            "border-radius": "50%",
            background: "white",
            border: "none",
            cursor: "pointer",
            display: "flex",
            "align-items": "center",
            "justify-content": "center",
            "z-index": "1000",
            "box-shadow": "0 2px 8px rgba(0, 0, 0, 0.2)"
          }}
          title="Change School"
        >
          <span style={{ "font-size": "30px", color: "#333", "font-weight": "300", "line-height": "1", "margin-left": "-2px" }}>‹</span>
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
              "background-image": schoolData()?.establishment?.logo ? `url(data:image/webp;base64,${schoolData().establishment.logo})` : undefined
            }}
          ></div>
          <span class="text-white text-[21px] __school-title">
            {schoolData()?.establishment?.name || ""}
          </span>
        </>
      )}
      <div class="f-login" classList={{ "has-text": schoolFound() ? hasLoginText() : hasText() }}>
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
              <button class="__submit" type="submit" onClick={accountLogin}>
                Log In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default Login;
