import { createSignal, createEffect } from "solid-js";
import { useEdulink } from "../api/edulink";
import "../assets/css/login.css";
import { useToast } from "../components/toast";

function Login() {
  const edulink = useEdulink();
  const [code, setCode] = createSignal<string>("");
  const [schoolFound, setFound] = createSignal<boolean>(false);
  const [hasText, setHasText] = createSignal<boolean>(false);
  const toast = useToast();
  createEffect(() => {
    setHasText(code().trim().length > 0);
    setFound(true);
  });

  async function findCode() {
    if (!code())
      return toast.showToast("Error", "Please fill the field", "error");
    const data = await edulink.findSchoolFromCode(code());
    if (data.result.success) {
      setFound(true);
    }
  }

  return (
    <div class="container">
      {schoolFound() && (
        <>
          <div
            class="__logo"
            style="background-size: 70%; background-repeat: no-repeat; background-position: 50%;"
          ></div>
          <span class="text-white text-[21px] __school-title"></span>
        </>
      )}
      <div class="f-login" classList={{ "has-text": hasText() }}>
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
                  onInput={(e) => setCode(e.currentTarget.value)}
                />
                <span class="__label-text">Username</span>
              </label>
            </div>
            <br />
            <div class="__row">
              <label class="__label">
                <input
                  type="text"
                  class="__field"
                  placeholder=" "
                  onInput={(e) => setCode(e.currentTarget.value)}
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
                </div>
              </label>
            </div>
            <div class="__button">
              <button class="__submit" type="submit">
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
